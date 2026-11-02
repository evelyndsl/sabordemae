import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { autenticar, criarApp, criarPedidoDireto, encerrar, obterPrisma, salvarConfiguracao } from "./helpers.js";

let app: FastifyInstance;
let headers: { authorization: string };
let restaurarConfiguracao: () => Promise<void>;
const codigosCriados: string[] = [];

const put = (url: string, payload: unknown) => app.inject({ method: "PUT", url, payload: payload as object, headers });

type Dados = Parameters<typeof criarPedidoDireto>[0];
async function novoPedido(dados: Dados) {
  const pedido = await criarPedidoDireto(dados);
  codigosCriados.push(pedido.codigo);
  return pedido;
}

const emHoras = (h: number) => new Date(Date.now() + h * 3600_000);

beforeAll(async () => {
  app = await criarApp();
  headers = await autenticar(app);
  restaurarConfiguracao = await salvarConfiguracao();
});

afterAll(async () => {
  await restaurarConfiguracao();
  await (await obterPrisma()).pedido.deleteMany({ where: { codigo: { in: codigosCriados } } });
  await encerrar(app);
});

describe("status inicial", () => {
  it("Pix começa em AGUARDANDO_PAGAMENTO e as demais formas em AGUARDANDO", async () => {
    const pix = await novoPedido({ quantidade: 10, tipoEntrega: "ENTREGA", formaPagamento: "PIX" });
    const dinheiro = await novoPedido({ quantidade: 10, tipoEntrega: "ENTREGA", formaPagamento: "DINHEIRO" });
    const cartao = await novoPedido({ quantidade: 10, tipoEntrega: "RETIRADA", formaPagamento: "CARTAO" });

    expect(pix.status).toBe("AGUARDANDO_PAGAMENTO");
    expect(dinheiro.status).toBe("AGUARDANDO");
    expect(cartao.status).toBe("AGUARDANDO");
  });
});

describe("fluxo de status do Pix", () => {
  it("AGUARDANDO_PAGAMENTO -> PAGAMENTO_APROVADO -> EM_PRODUCAO -> EM_ROTA_ENTREGA -> FINALIZADO", async () => {
    const pedido = await novoPedido({ quantidade: 20, tipoEntrega: "ENTREGA", formaPagamento: "PIX" });

    for (const status of ["PAGAMENTO_APROVADO", "EM_PRODUCAO", "EM_ROTA_ENTREGA", "FINALIZADO"]) {
      const res = await put(`/pedido/${pedido.codigo}/status`, { status });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe(status);
    }
  });

  it("retirada com Pix usa PRONTO_RETIRADA", async () => {
    const pedido = await novoPedido({ quantidade: 20, tipoEntrega: "RETIRADA", formaPagamento: "PIX" });

    expect((await put(`/pedido/${pedido.codigo}/status`, { status: "PRONTO_RETIRADA" })).statusCode).toBe(200);
    expect((await put(`/pedido/${pedido.codigo}/status`, { status: "EM_ROTA_ENTREGA" })).statusCode).toBe(400);
  });

  it("pedido com Pix não usa AGUARDANDO", async () => {
    const pedido = await novoPedido({ quantidade: 20, tipoEntrega: "ENTREGA", formaPagamento: "PIX" });
    await put(`/pedido/${pedido.codigo}/status`, { status: "EM_PRODUCAO" });

    expect((await put(`/pedido/${pedido.codigo}/status`, { status: "AGUARDANDO" })).statusCode).toBe(400);
  });

  it("pedido sem Pix não passa por aguardando pagamento nem pagamento aprovado", async () => {
    const pedido = await novoPedido({ quantidade: 20, tipoEntrega: "ENTREGA", formaPagamento: "DINHEIRO" });

    expect((await put(`/pedido/${pedido.codigo}/status`, { status: "AGUARDANDO_PAGAMENTO" })).statusCode).toBe(400);
    expect((await put(`/pedido/${pedido.codigo}/status`, { status: "PAGAMENTO_APROVADO" })).statusCode).toBe(400);
  });
});

describe("prazo de pagamento do Pix", () => {
  it("sem horário ou para hoje: pagar no ato do pedido", async () => {
    const pedido = await novoPedido({ quantidade: 50, tipoEntrega: "ENTREGA", formaPagamento: "PIX" });
    const res = await app.inject({ method: "GET", url: `/pedido/${pedido.codigo}` });

    expect(res.json().instrucaoPix).toEqual({ imediato: true, horasAntecedencia: null, pagarAte: null });
    expect(res.json().horarioAgendado).toBeNull();
  });

  it("dia seguinte, até 100 unidades: 2 horas antes; acima de 100: 4 horas antes", async () => {
    const horario = emHoras(30);
    const pequeno = await novoPedido({ quantidade: 100, tipoEntrega: "ENTREGA", formaPagamento: "PIX", horarioAgendado: horario });
    const grande = await novoPedido({ quantidade: 110, tipoEntrega: "RETIRADA", formaPagamento: "PIX", horarioAgendado: horario });

    const a = (await app.inject({ method: "GET", url: `/pedido/${pequeno.codigo}` })).json();
    const b = (await app.inject({ method: "GET", url: `/pedido/${grande.codigo}` })).json();

    expect(a.instrucaoPix).toMatchObject({ imediato: false, horasAntecedencia: 2 });
    expect(new Date(a.instrucaoPix.pagarAte).getTime()).toBe(horario.getTime() - 2 * 3600_000);
    expect(b.instrucaoPix).toMatchObject({ imediato: false, horasAntecedencia: 4 });
    expect(new Date(b.instrucaoPix.pagarAte).getTime()).toBe(horario.getTime() - 4 * 3600_000);
  });

  it("pedidos sem Pix não têm instrução de pagamento", async () => {
    const pedido = await novoPedido({ quantidade: 10, tipoEntrega: "ENTREGA", formaPagamento: "DINHEIRO", horarioAgendado: emHoras(30) });
    const res = await app.inject({ method: "GET", url: `/pedido/${pedido.codigo}` });

    expect(res.json().instrucaoPix).toBeNull();
  });

  it("o prazo fica gravado no pedido: mudar a configuração depois não altera pedidos antigos", async () => {
    const horario = emHoras(30);
    const pedido = await novoPedido({ quantidade: 50, tipoEntrega: "ENTREGA", formaPagamento: "PIX", horarioAgendado: horario });
    await put("/pix", { tipo: "CPF", chave: "529.982.247-25", antecedenciaAteLimiteHoras: 6 });

    const res = await app.inject({ method: "GET", url: `/pedido/${pedido.codigo}` });
    expect(res.json().instrucaoPix.horasAntecedencia).toBe(2);

    const novo = await novoPedido({ quantidade: 50, tipoEntrega: "ENTREGA", formaPagamento: "PIX", horarioAgendado: horario });
    const resNovo = await app.inject({ method: "GET", url: `/pedido/${novo.codigo}` });
    expect(resNovo.json().instrucaoPix.horasAntecedencia).toBe(6);
  });
});

describe("horário de entrega e retirada", () => {
  it("entrega aceita horário agendado; retirada aceita ficar sem horário", async () => {
    const horario = emHoras(5);
    const entrega = await novoPedido({ quantidade: 10, tipoEntrega: "ENTREGA", formaPagamento: "DINHEIRO", horarioAgendado: horario });
    const retirada = await novoPedido({ quantidade: 10, tipoEntrega: "RETIRADA", formaPagamento: "DINHEIRO", horarioAgendado: null });

    const a = (await app.inject({ method: "GET", url: `/pedido/${entrega.codigo}` })).json();
    const b = (await app.inject({ method: "GET", url: `/pedido/${retirada.codigo}` })).json();

    expect(new Date(a.horarioAgendado).getTime()).toBe(horario.getTime());
    expect(b.horarioAgendado).toBeNull();
  });
});

describe("PUT /pedido/:codigo/tempo-preparo", () => {
  it("define o tempo e a previsão de pedidos sem horário agendado", async () => {
    const pedido = await novoPedido({ quantidade: 30, tipoEntrega: "ENTREGA", formaPagamento: "DINHEIRO" });
    const antes = Date.now();

    const res = await put(`/pedido/${pedido.codigo}/tempo-preparo`, { minutos: 45 });

    expect(res.statusCode).toBe(200);
    expect(res.json().tempoPreparoMin).toBe(45);
    const previsao = new Date(res.json().previsaoEm).getTime();
    expect(previsao).toBeGreaterThanOrEqual(antes + 45 * 60_000);
    expect(previsao).toBeLessThan(antes + 46 * 60_000 + 5000);
  });

  it("recusa pedidos com horário agendado, tempo inválido e código inexistente", async () => {
    const agendado = await novoPedido({ quantidade: 30, tipoEntrega: "RETIRADA", formaPagamento: "DINHEIRO", horarioAgendado: emHoras(5) });
    const semHorario = await novoPedido({ quantidade: 30, tipoEntrega: "ENTREGA", formaPagamento: "DINHEIRO" });

    expect((await put(`/pedido/${agendado.codigo}/tempo-preparo`, { minutos: 30 })).statusCode).toBe(400);
    expect((await put(`/pedido/${semHorario.codigo}/tempo-preparo`, { minutos: 0 })).statusCode).toBe(400);
    expect((await put(`/pedido/${semHorario.codigo}/tempo-preparo`, { minutos: 10.5 })).statusCode).toBe(400);
    expect((await put("/pedido/ZZZZZZZZ/tempo-preparo", { minutos: 30 })).statusCode).toBe(404);
  });

  it("exige autenticação", async () => {
    const res = await app.inject({ method: "PUT", url: "/pedido/ZZZZZZZZ/tempo-preparo", payload: { minutos: 30 } });
    expect(res.statusCode).toBe(401);
  });
});

describe("PUT /pix: dados do estabelecimento", () => {
  const base = { tipo: "CPF", chave: "529.982.247-25" };

  it("salva titular, banco, WhatsApp e antecedência; a rota pública reflete", async () => {
    const res = await put("/pix", {
      ...base,
      titular: "  Maria da Silva ",
      banco: "Nubank",
      whatsapp: "+55 (11) 91234-5678",
      antecedenciaAteLimiteHoras: 3,
      antecedenciaAcimaLimiteHoras: 6,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      titular: "Maria da Silva",
      banco: "Nubank",
      whatsapp: "11912345678",
      antecedencia: { ateLimiteHoras: 3, acimaLimiteHoras: 6, limiteUnidades: 100 },
    });
    expect((await app.inject({ method: "GET", url: "/pix" })).json()).toEqual(res.json());
  });

  it("campos ausentes não alteram o que já estava salvo; vazio apaga", async () => {
    await put("/pix", { ...base, titular: "Maria", banco: "Itaú", whatsapp: "11912345678" });

    const mantem = await put("/pix", base);
    expect(mantem.json()).toMatchObject({ titular: "Maria", banco: "Itaú", whatsapp: "11912345678" });

    const apaga = await put("/pix", { ...base, banco: "", whatsapp: "" });
    expect(apaga.json()).toMatchObject({ titular: "Maria", banco: null, whatsapp: null });
  });

  it("rejeita WhatsApp inválido e antecedência fora do limite", async () => {
    expect((await put("/pix", { ...base, whatsapp: "12345" })).statusCode).toBe(400);
    expect((await put("/pix", { ...base, antecedenciaAteLimiteHoras: -1 })).statusCode).toBe(400);
    expect((await put("/pix", { ...base, antecedenciaAcimaLimiteHoras: 1.5 })).statusCode).toBe(400);
    expect((await put("/pix", { ...base, antecedenciaAcimaLimiteHoras: 200 })).statusCode).toBe(400);
  });
});
