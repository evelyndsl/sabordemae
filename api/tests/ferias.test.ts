import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DadosFuncionamento } from "../src/services/funcionamento.js";
import { autenticar, criarApp, criarPedidoDireto, encerrar, obterPrisma, salvarConfiguracao } from "./helpers.js";

// Brasília é UTC-3 o ano todo.
const em = (iso: string) => new Date(`${iso}-03:00`);

const base: DadosFuncionamento = {
  horarioAbertura: "08:00",
  horarioFechamento: "18:00",
  estabelecimentoFechado: false,
  entregaSuspensaEm: null,
  feriasInicio: "2026-12-20",
  feriasFim: "2026-12-31",
  diasAtendimento: [0, 1, 2, 3, 4, 5, 6],
};

describe("férias (regra)", () => {
  // Import dinâmico: só depois de tests/setup.ts apontar para o banco de testes.
  const carregar = () => import("../src/services/funcionamento.js");

  it("fecha do primeiro ao último dia, inclusive, e reabre sozinho", async () => {
    const { situacao } = await carregar();
    expect(situacao(base, em("2026-12-19T12:00:00")).aberto).toBe(true);
    expect(situacao(base, em("2026-12-20T00:00:00")).motivoFechado).toBe("FERIAS");
    expect(situacao(base, em("2026-12-31T23:59:00")).motivoFechado).toBe("FERIAS");
    expect(situacao(base, em("2027-01-01T12:00:00")).aberto).toBe(true);
  });

  it("informa o período antes e durante as férias, e some depois do fim", async () => {
    const { situacao } = await carregar();
    const periodo = { inicio: "2026-12-20", fim: "2026-12-31" };
    expect(situacao(base, em("2026-12-01T12:00:00")).ferias).toEqual(periodo);
    expect(situacao(base, em("2026-12-25T12:00:00")).ferias).toEqual(periodo);
    expect(situacao(base, em("2027-01-01T12:00:00")).ferias).toBeNull();
  });

  it("a madrugada de um atendimento noturno pertence ao dia em que começou", async () => {
    const { situacao } = await carregar();
    const noite = { ...base, horarioAbertura: "18:00", horarioFechamento: "02:00" };
    expect(situacao(noite, em("2026-12-20T01:00:00")).aberto).toBe(true); // turno do dia 19
    expect(situacao(noite, em("2027-01-01T01:00:00")).motivoFechado).toBe("FERIAS"); // turno do dia 31
  });

  it("recusa pedidos durante as férias e agendamentos para dentro delas", async () => {
    const { validarPedidoNoFuncionamento } = await carregar();
    const validar = (agora: string, horarioAgendado: string | null) => () =>
      validarPedidoNoFuncionamento(
        base,
        { tipoEntrega: "RETIRADA", horarioAgendado: horarioAgendado ? em(horarioAgendado) : null },
        em(agora),
      );

    expect(validar("2026-12-25T12:00:00", "2027-01-05T10:00:00")).toThrow(/de 20\/12\/2026 a 31\/12\/2026/);
    expect(validar("2026-12-10T12:00:00", "2026-12-22T10:00:00")).toThrow(/fora desse período/);
    expect(validar("2026-12-10T12:00:00", "2027-01-05T10:00:00")).not.toThrow();
    expect(validar("2026-12-10T12:00:00", null)).not.toThrow();
  });
});

describe("PUT /ferias", () => {
  let app: FastifyInstance;
  let headers: { authorization: string };
  let restaurarConfiguracao: () => Promise<void>;

  const salvar = (payload: object) => app.inject({ method: "PUT", url: "/ferias", payload, headers });

  // Datas relativas a hoje, para o teste não vencer.
  const dia = (deslocamento: number) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
      new Date(Date.now() + deslocamento * 24 * 3600_000),
    );

  beforeAll(async () => {
    app = await criarApp();
    headers = await autenticar(app);
    restaurarConfiguracao = await salvarConfiguracao();
  });

  beforeEach(async () => {
    await (await obterPrisma()).configuracao.update({
      where: { id: 1 },
      data: { estabelecimentoFechado: false, feriasInicio: null, feriasFim: null },
    });
  });

  afterAll(async () => {
    await restaurarConfiguracao();
    await encerrar(app);
  });

  it("exige login", async () => {
    const res = await app.inject({ method: "PUT", url: "/ferias", payload: { inicio: dia(10), fim: dia(20) } });
    expect(res.statusCode).toBe(401);
  });

  it("salva o período, mostra no GET público e remove", async () => {
    const periodo = { inicio: dia(10), fim: dia(20) };

    const res = await salvar(periodo);
    expect(res.statusCode).toBe(200);
    expect(res.json().ferias).toEqual(periodo);
    expect((await app.inject({ method: "GET", url: "/funcionamento" })).json().ferias).toEqual(periodo);

    expect((await salvar({ inicio: null, fim: null })).json().ferias).toBeNull();
  });

  it("recusa período incompleto, invertido, no passado ou com data inválida", async () => {
    for (const corpo of [
      { inicio: dia(10), fim: null },
      { inicio: dia(20), fim: dia(10) },
      { inicio: dia(-20), fim: dia(-10) },
      { inicio: "2026-02-30", fim: dia(10) },
    ]) {
      expect((await salvar(corpo)).statusCode, JSON.stringify(corpo)).toBe(400);
    }
  });

  it("durante as férias a API não cria pedido", async () => {
    await salvar({ inicio: dia(0), fim: dia(5) });
    await expect(criarPedidoDireto({ quantidade: 30, tipoEntrega: "RETIRADA" })).rejects.toThrow(/férias/);
  });
});
