import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarApp, criarPedidoDireto, encerrar, obterPrisma, salvarConfiguracao } from "./helpers.js";

let app: FastifyInstance;
let restaurarConfiguracao: () => Promise<void>;
const codigosCriados: string[] = [];

// Pedido só pode ser criado com a loja aberta.
const ABERTO = {
  estabelecimentoFechado: false,
  horarioAbertura: null,
  horarioFechamento: null,
  diasAtendimento: [0, 1, 2, 3, 4, 5, 6],
  entregaSuspensaEm: null,
};

async function pedidoNoStatus(
  tipoEntrega: "ENTREGA" | "RETIRADA",
  status: "EM_PRODUCAO" | "EM_ROTA_ENTREGA" | "PRONTO_RETIRADA",
) {
  const prisma = await obterPrisma();
  await prisma.configuracao.update({ where: { id: 1 }, data: ABERTO });
  const pedido = await criarPedidoDireto({ quantidade: 30, tipoEntrega });
  codigosCriados.push(pedido.codigo);
  await prisma.pedido.update({ where: { codigo: pedido.codigo }, data: { status } });
  return pedido.codigo;
}

const statusDe = async (codigo: string) =>
  (await (await obterPrisma()).pedido.findUniqueOrThrow({ where: { codigo } })).status;

beforeAll(async () => {
  app = await criarApp();
  restaurarConfiguracao = await salvarConfiguracao();
});

afterAll(async () => {
  await restaurarConfiguracao();
  await (await obterPrisma()).pedido.deleteMany({ where: { codigo: { in: codigosCriados } } });
  await encerrar(app);
});

describe("finalização automática (cron das 23h)", () => {
  it("finaliza pedidos em rota e prontos para retirada e preserva os demais", async () => {
    const { finalizarPedidosEmAberto } = await import("../src/services/pedidos.js");
    const entrega = await pedidoNoStatus("ENTREGA", "EM_ROTA_ENTREGA");
    const retirada = await pedidoNoStatus("RETIRADA", "PRONTO_RETIRADA");
    const emProducao = await pedidoNoStatus("RETIRADA", "EM_PRODUCAO");

    const finalizados = await finalizarPedidosEmAberto();

    expect(finalizados).toBeGreaterThanOrEqual(2);
    expect(await statusDe(entrega)).toBe("FINALIZADO");
    expect(await statusDe(retirada)).toBe("FINALIZADO");
    expect(await statusDe(emProducao)).toBe("EM_PRODUCAO");
  });
});

describe("GET /cron/finalizar-pedidos", () => {
  it("recusa chamadas sem o segredo correto", async () => {
    const semHeader = await app.inject({ method: "GET", url: "/cron/finalizar-pedidos" });
    const errado = await app.inject({
      method: "GET",
      url: "/cron/finalizar-pedidos",
      headers: { authorization: "Bearer segredo-errado-qualquer" },
    });

    expect(semHeader.statusCode).toBe(401);
    expect(errado.statusCode).toBe(401);
  });
});
