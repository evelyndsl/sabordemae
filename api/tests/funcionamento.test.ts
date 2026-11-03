import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RegraDeNegocioError } from "../src/lib/errors.js";
import {
  dentroDoHorario,
  diaDaSemanaEmBrasilia,
  entregaDisponivelNoDia,
  minutosNoDiaEmBrasilia,
  situacao,
  validarPedidoNoFuncionamento,
  textoDias,
  type DadosFuncionamento,
} from "../src/services/funcionamento.js";
import { autenticar, criarApp, encerrar, obterPrisma, salvarConfiguracao } from "./helpers.js";

const base: DadosFuncionamento = {
  horarioAbertura: "08:00",
  horarioFechamento: "18:00",
  estabelecimentoFechado: false,
  entregaSuspensaEm: null,
  diasAtendimento: [0, 1, 2, 3, 4, 5, 6],
};

// Brasília é UTC-3 o ano todo (sem horário de verão).
const em = (iso: string) => new Date(`${iso}-03:00`);
const meioDia = em("2026-11-03T12:00:00");

describe("horário de atendimento (regras puras)", () => {
  it("converte para minutos no horário de Brasília", () => {
    expect(minutosNoDiaEmBrasilia(new Date("2026-11-03T15:30:00Z"))).toBe(12 * 60 + 30);
    expect(minutosNoDiaEmBrasilia(em("2026-11-03T00:05:00"))).toBe(5);
  });

  it("dentro do horário: abertura inclusiva e fechamento exclusivo", () => {
    expect(dentroDoHorario(base, em("2026-11-03T07:59:00"))).toBe(false);
    expect(dentroDoHorario(base, em("2026-11-03T08:00:00"))).toBe(true);
    expect(dentroDoHorario(base, em("2026-11-03T17:59:00"))).toBe(true);
    expect(dentroDoHorario(base, em("2026-11-03T18:00:00"))).toBe(false);
  });

  it("sem horário definido nunca restringe", () => {
    const livre = { ...base, horarioAbertura: null, horarioFechamento: null };
    expect(dentroDoHorario(livre, em("2026-11-03T03:00:00"))).toBe(true);
  });

  it("aceita atendimento que passa da meia-noite", () => {
    const noite = { ...base, horarioAbertura: "18:00", horarioFechamento: "02:00" };
    expect(dentroDoHorario(noite, em("2026-11-03T23:00:00"))).toBe(true);
    expect(dentroDoHorario(noite, em("2026-11-04T01:59:00"))).toBe(true);
    expect(dentroDoHorario(noite, em("2026-11-04T02:00:00"))).toBe(false);
    expect(dentroDoHorario(noite, em("2026-11-03T12:00:00"))).toBe(false);
  });

  it("situacao: fechado manual vale mesmo dentro do horário", () => {
    const s = situacao({ ...base, estabelecimentoFechado: true }, meioDia);
    expect(s).toMatchObject({ aberto: false, motivoFechado: "FECHADO_MANUAL" });
  });

  it("situacao: fora do horário e aberto", () => {
    expect(situacao(base, em("2026-11-03T20:00:00"))).toMatchObject({ aberto: false, motivoFechado: "FORA_DO_HORARIO" });
    expect(situacao(base, meioDia)).toMatchObject({ aberto: true, motivoFechado: null, entregaHoje: true });
  });

  it("a entrega desligada vale só para o dia marcado", () => {
    const suspensa = { ...base, entregaSuspensaEm: "2026-11-03" };
    expect(entregaDisponivelNoDia(suspensa, meioDia)).toBe(false);
    expect(entregaDisponivelNoDia(suspensa, em("2026-11-04T12:00:00"))).toBe(true);
    // 23h30 ainda é o mesmo dia em Brasília, mesmo já sendo o dia seguinte em UTC.
    expect(entregaDisponivelNoDia(suspensa, em("2026-11-03T23:30:00"))).toBe(false);
  });
});

describe("validarPedidoNoFuncionamento", () => {
  const validar = (config: DadosFuncionamento, tipoEntrega: "ENTREGA" | "RETIRADA", horarioAgendado: Date | null, agora = meioDia) =>
    validarPedidoNoFuncionamento(config, { tipoEntrega, horarioAgendado }, agora);

  it("aceita pedido dentro do horário", () => {
    expect(() => validar(base, "RETIRADA", null)).not.toThrow();
    expect(() => validar(base, "ENTREGA", em("2026-11-04T10:00:00"))).not.toThrow();
  });

  it("estabelecimento fechado recusa qualquer pedido, até os agendados", () => {
    const fechado = { ...base, estabelecimentoFechado: true };
    expect(() => validar(fechado, "RETIRADA", null)).toThrow(/fechados/);
    expect(() => validar(fechado, "RETIRADA", em("2026-11-04T10:00:00"))).toThrow(/fechados/);
  });

  it("fora do horário recusa 'assim que ficar pronto', mas aceita agendar para dentro do horário", () => {
    const noite = em("2026-11-03T21:00:00");
    expect(() => validar(base, "RETIRADA", null, noite)).toThrow(/fora do horário de atendimento \(08:00 às 18:00\)/);
    expect(() => validar(base, "RETIRADA", em("2026-11-04T09:00:00"), noite)).not.toThrow();
  });

  it("recusa horário agendado fora do atendimento", () => {
    expect(() => validar(base, "RETIRADA", em("2026-11-04T19:00:00"))).toThrow(/fora do atendimento/);
    expect(() => validar(base, "RETIRADA", em("2026-11-04T07:00:00"))).toThrow(/fora do atendimento/);
  });

  it("entrega desligada hoje: recusa entrega agora e agendada para hoje, aceita retirada e outro dia", () => {
    const semEntrega = { ...base, entregaSuspensaEm: "2026-11-03" };
    expect(() => validar(semEntrega, "ENTREGA", null)).toThrow(/apenas com retirada/);
    expect(() => validar(semEntrega, "ENTREGA", em("2026-11-03T16:00:00"))).toThrow(/Hoje não estamos fazendo entregas/);
    expect(() => validar(semEntrega, "RETIRADA", null)).not.toThrow();
    expect(() => validar(semEntrega, "ENTREGA", em("2026-11-04T10:00:00"))).not.toThrow();
  });

  it("os erros são regras de negócio (400)", () => {
    expect(() => validar({ ...base, estabelecimentoFechado: true }, "RETIRADA", null)).toThrow(RegraDeNegocioError);
  });
});

describe("dias de atendimento (regras puras)", () => {
  // 2026-11-03 é terça; 2026-11-07 é sábado; 2026-11-08 é domingo.
  const seg_a_sex = { ...base, diasAtendimento: [1, 2, 3, 4, 5] };

  it("dia não selecionado fecha o dia todo", () => {
    expect(dentroDoHorario(seg_a_sex, em("2026-11-03T12:00:00"))).toBe(true);
    expect(dentroDoHorario(seg_a_sex, em("2026-11-07T12:00:00"))).toBe(false);
    expect(dentroDoHorario(seg_a_sex, em("2026-11-08T12:00:00"))).toBe(false);
  });

  it("sem horário definido, vale o dia inteiro nos dias selecionados", () => {
    const semHorario = { ...seg_a_sex, horarioAbertura: null, horarioFechamento: null };
    expect(dentroDoHorario(semHorario, em("2026-11-03T03:00:00"))).toBe(true);
    expect(dentroDoHorario(semHorario, em("2026-11-07T03:00:00"))).toBe(false);
  });

  it("atendimento que passa da meia-noite: a madrugada pertence ao dia em que começou", () => {
    const noite = { ...base, horarioAbertura: "18:00", horarioFechamento: "02:00", diasAtendimento: [5] }; // só sexta
    expect(dentroDoHorario(noite, em("2026-11-06T22:00:00"))).toBe(true); // sexta 22h
    expect(dentroDoHorario(noite, em("2026-11-07T01:00:00"))).toBe(true); // sábado 1h (turno de sexta)
    expect(dentroDoHorario(noite, em("2026-11-07T22:00:00"))).toBe(false); // sábado 22h
    expect(dentroDoHorario(noite, em("2026-11-06T01:00:00"))).toBe(false); // sexta 1h (turno de quinta)
  });

  it("situação informa dia fechado e a mensagem cita os dias", () => {
    expect(situacao(seg_a_sex, em("2026-11-07T12:00:00")).aberto).toBe(false);
    expect(() => validarPedidoNoFuncionamento(seg_a_sex, { tipoEntrega: "RETIRADA", horarioAgendado: null }, em("2026-11-07T12:00:00"))).toThrow(/seg a sex/);
  });

  it("texto dos dias", () => {
    expect(textoDias([0, 1, 2, 3, 4, 5, 6])).toBeNull();
    expect(textoDias([1, 2, 3, 4, 5])).toBe("seg a sex");
    expect(textoDias([1, 3, 5])).toBe("seg, qua e sex");
    expect(textoDias([6, 0])).toBe("dom e sáb");
  });
});

describe("API de funcionamento", () => {
  let app: FastifyInstance;
  let headers: { authorization: string };
  let restaurarConfiguracao: () => Promise<void>;

  const get = () => app.inject({ method: "GET", url: "/funcionamento" });
  const put = (payload: unknown, comToken = true) =>
    app.inject({ method: "PUT", url: "/funcionamento", payload: payload as object, headers: comToken ? headers : {} });
  const estado = (extra: Record<string, unknown> = {}) => ({
    horarioAbertura: null,
    horarioFechamento: null,
    estabelecimentoFechado: false,
    entregaHoje: true,
    ...extra,
  });

  // Horário que cobre (ou não) o momento atual, mesmo perto da meia-noite (aceita passar da meia-noite).
  const hhmm = (minutos: number) => {
    const m = ((minutos % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };
  const agoraMin = () => minutosNoDiaEmBrasilia(new Date());
  const horarioQueCobreAgora = () => ({ horarioAbertura: hhmm(agoraMin() - 120), horarioFechamento: hhmm(agoraMin() + 240) });
  const horarioQueNaoCobreAgora = () => ({ horarioAbertura: hhmm(agoraMin() + 120), horarioFechamento: hhmm(agoraMin() + 240) });

  async function criar(dados: { tipoEntrega: "ENTREGA" | "RETIRADA"; horarioAgendado?: Date }) {
    const { criarPedido } = await import("../src/services/pedidos.js");
    return criarPedido({
      nomeCliente: "Cliente de Teste",
      telefone: "11912345678",
      formaPagamento: "DINHEIRO",
      quantidade: 10,
      sabores: [],
      tipoEntrega: dados.tipoEntrega,
      endereco: dados.tipoEntrega === "ENTREGA" ? "Rua das Flores, 123" : undefined,
      horarioAgendado: dados.horarioAgendado,
    });
  }

  beforeAll(async () => {
    app = await criarApp();
    headers = await autenticar(app);
    restaurarConfiguracao = await salvarConfiguracao();
  });

  afterAll(async () => {
    await restaurarConfiguracao();
    await encerrar(app);
  });

  beforeEach(async () => {
    expect((await put(estado())).statusCode).toBe(200);
  });

  it("GET é público e começa sem restrições", async () => {
    const res = await get();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      horarioAbertura: null,
      horarioFechamento: null,
      diasAtendimento: [0, 1, 2, 3, 4, 5, 6],
      enderecoRetirada: null,
      estabelecimentoFechado: false,
      aberto: true,
      motivoFechado: null,
      entregaHoje: true,
    });
  });

  it("PUT exige autenticação", async () => {
    expect((await put(estado(), false)).statusCode).toBe(401);
  });

  it("salva horário, estabelecimento fechado e entrega do dia", async () => {
    const res = await put(estado({ ...horarioQueCobreAgora(), estabelecimentoFechado: true, entregaHoje: false }));

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ estabelecimentoFechado: true, aberto: false, motivoFechado: "FECHADO_MANUAL", entregaHoje: false });
    expect((await get()).json()).toMatchObject({ estabelecimentoFechado: true, entregaHoje: false });
  });

  it("estabelecimento fechado continua fechado dentro do horário até ser desativado", async () => {
    await put(estado({ ...horarioQueCobreAgora(), estabelecimentoFechado: true }));
    expect((await get()).json()).toMatchObject({ aberto: false, motivoFechado: "FECHADO_MANUAL" });

    await put(estado({ ...horarioQueCobreAgora(), estabelecimentoFechado: false }));
    expect((await get()).json()).toMatchObject({ aberto: true, motivoFechado: null });
  });

  it("fora do horário aparece como fechado por horário", async () => {
    await put(estado(horarioQueNaoCobreAgora()));

    expect((await get()).json()).toMatchObject({ aberto: false, motivoFechado: "FORA_DO_HORARIO" });
  });

  it("a entrega desligada de ontem não vale hoje", async () => {
    const prisma = await obterPrisma();
    await prisma.configuracao.update({ where: { id: 1 }, data: { entregaSuspensaEm: "2020-01-01" } });

    expect((await get()).json()).toMatchObject({ entregaHoje: true });
  });

  it("dia de hoje desmarcado fecha por horário; marcar de novo reabre", async () => {
    const hoje = diaDaSemanaEmBrasilia(new Date());
    const outros = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== hoje);

    const fechado = await put(estado({ diasAtendimento: outros }));
    expect(fechado.json()).toMatchObject({ aberto: false, motivoFechado: "FORA_DO_HORARIO", diasAtendimento: outros });

    const aberto = await put(estado({ diasAtendimento: [0, 1, 2, 3, 4, 5, 6] }));
    expect(aberto.json()).toMatchObject({ aberto: true, motivoFechado: null });
  });

  it("recusa selecionar nenhum dia ou dia inválido", async () => {
    expect((await put(estado({ diasAtendimento: [] }))).statusCode).toBe(400);
    expect((await put(estado({ diasAtendimento: [7] }))).statusCode).toBe(400);
  });

  it("endereço de retirada: salva, aparece no GET e fica registrado no pedido de retirada", async () => {
    const salvar = (enderecoRetirada: string) =>
      app.inject({ method: "PUT", url: "/endereco-retirada", payload: { enderecoRetirada }, headers });

    const res = await salvar("  Rua das Palmeiras, 45 - Centro  ");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ enderecoRetirada: "Rua das Palmeiras, 45 - Centro" });
    expect((await get()).json()).toMatchObject({ enderecoRetirada: "Rua das Palmeiras, 45 - Centro" });

    const retirada = await criar({ tipoEntrega: "RETIRADA", horarioAgendado: new Date(Date.now() + 3 * 3600_000) });
    expect(retirada.enderecoRetirada).toBe("Rua das Palmeiras, 45 - Centro");
    const entrega = await criar({ tipoEntrega: "ENTREGA", horarioAgendado: new Date(Date.now() + 3 * 3600_000) });
    expect(entrega.enderecoRetirada).toBeNull();

    // Vazio apaga.
    expect((await salvar("   ")).json()).toMatchObject({ enderecoRetirada: null });
  });

  it.each([
    ["horário sem formato HH:MM", estado({ horarioAbertura: "8h", horarioFechamento: "18:00" })],
    ["hora inexistente", estado({ horarioAbertura: "24:00", horarioFechamento: "18:00" })],
    ["só a abertura", estado({ horarioAbertura: "08:00" })],
    ["só o fechamento", estado({ horarioFechamento: "18:00" })],
    ["abertura igual ao fechamento", estado({ horarioAbertura: "08:00", horarioFechamento: "08:00" })],
    ["campo faltando", { horarioAbertura: null, horarioFechamento: null, estabelecimentoFechado: false }],
  ])("recusa %s", async (_nome, payload) => {
    expect((await put(payload)).statusCode).toBe(400);
  });

  it("fechado: o pedido é recusado com mensagem clara", async () => {
    await put(estado({ estabelecimentoFechado: true }));

    await expect(criar({ tipoEntrega: "RETIRADA" })).rejects.toThrow(/fechados/);
  });

  it("fora do horário: só aceita pedido agendado para dentro do horário", async () => {
    await put(estado(horarioQueNaoCobreAgora()));

    await expect(criar({ tipoEntrega: "RETIRADA" })).rejects.toThrow(/fora do horário de atendimento/);

    // Daqui a 3h cai dentro de [agora+2h, agora+4h).
    const pedido = await criar({ tipoEntrega: "RETIRADA", horarioAgendado: new Date(Date.now() + 3 * 3600_000) });
    expect(pedido.status).toBe("AGUARDANDO");
  });

  it("dentro do horário: pedido normal funciona", async () => {
    await put(estado(horarioQueCobreAgora()));

    expect((await criar({ tipoEntrega: "RETIRADA" })).codigo).toHaveLength(8);
  });

  it("sem entrega hoje: recusa entrega para agora, aceita retirada e entrega agendada para outro dia", async () => {
    await put(estado({ entregaHoje: false }));

    await expect(criar({ tipoEntrega: "ENTREGA" })).rejects.toThrow(/apenas com retirada/);
    expect((await criar({ tipoEntrega: "RETIRADA" })).tipoEntrega).toBe("RETIRADA");

    const amanha = await criar({ tipoEntrega: "ENTREGA", horarioAgendado: new Date(Date.now() + 36 * 3600_000) });
    expect(amanha.tipoEntrega).toBe("ENTREGA");
  });

  it("a rota POST /pedido responde 400 quando fechado", async () => {
    await put(estado({ estabelecimentoFechado: true }));

    const res = await app.inject({
      method: "POST",
      url: "/pedido",
      payload: {
        nomeCliente: "Cliente de Teste",
        telefone: "11912345678",
        quantidade: 10,
        sabores: [],
        tipoEntrega: "RETIRADA",
        formaPagamento: "DINHEIRO",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().mensagem).toMatch(/fechados/);
  });
});
