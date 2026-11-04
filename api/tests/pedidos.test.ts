import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarApp, criarPedidoDireto, encerrar, obterPrisma } from "./helpers.js";

let app: FastifyInstance;
const codigosCriados: string[] = [];

const cliente = { nomeCliente: "Cliente de Teste", telefone: "(11) 91234-5678", formaPagamento: "DINHEIRO" };
const entrega = (quantidade: number, extra: object = {}) => ({
  ...cliente,
  quantidade,
  tipoEntrega: "ENTREGA",
  endereco: "Rua das Flores, 123 - Centro",
  cep: "87140000",
  ...extra,
});

async function postPedido(payload: object) {
  const res = await app.inject({ method: "POST", url: "/pedido", payload });
  if (res.statusCode === 201) codigosCriados.push(res.json().codigo);
  return res;
}

beforeAll(async () => {
  app = await criarApp();
});

afterAll(async () => {
  const prisma = await obterPrisma();
  await prisma.pedido.deleteMany({ where: { codigo: { in: codigosCriados } } });
  await encerrar(app);
});

// O POST /pedido tem limite de 10 por minuto por IP: este bloco usa menos que isso.
describe("POST /pedido", () => {
  it("entrega de 10 unidades paga taxa de R$ 7,00 (total R$ 20,00)", async () => {
    const res = await postPedido(entrega(10));

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ subtotal: "13.00", taxaEntrega: "7.00", total: "20.00" });
  });

  it("entrega de 190 unidades paga taxa de R$ 5,00 (total R$ 126,60)", async () => {
    const res = await postPedido(entrega(190));

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ subtotal: "121.60", taxaEntrega: "5.00", total: "126.60" });
  });

  it("entrega de 200 unidades é gratuita (total R$ 128,00)", async () => {
    const res = await postPedido(entrega(200));

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ subtotal: "128.00", taxaEntrega: "0.00", total: "128.00" });
  });

  it("ignora valores enviados pelo cliente: o preço é calculado no servidor", async () => {
    const res = await postPedido(entrega(50, { subtotal: "1.00", taxaEntrega: "0.00", total: "1.00" }));

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ subtotal: "39.00", taxaEntrega: "5.00", total: "44.00" });
  });

  it("aceita sabores detalhados e devolve o nome de cada um", async () => {
    const sabores: { id: number; nome: string }[] = (await app.inject({ method: "GET", url: "/sabores" })).json();
    const [a, b] = sabores as [(typeof sabores)[number], (typeof sabores)[number]];

    const res = await postPedido(
      entrega(50, {
        sabores: [
          { saborId: a.id, quantidade: 15 },
          { saborId: b.id, quantidade: 35 },
        ],
      }),
    );

    expect(res.statusCode).toBe(201);
    const itens = res.json().itens;
    expect(itens).toHaveLength(2);
    expect(itens).toEqual(
      expect.arrayContaining([
        { sabor: a.nome, quantidade: 15 },
        { sabor: b.nome, quantidade: 35 },
      ]),
    );
  });

  it("rejeita sabor inexistente com 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/pedido",
      payload: entrega(50, { sabores: [{ saborId: 999_999, quantidade: 50 }] }),
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().mensagem).toBe("Um ou mais sabores não existem ou estão indisponíveis.");
  });

  it("rejeita soma de sabores diferente da quantidade, apontando o campo", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/pedido",
      payload: entrega(50, { sabores: [{ saborId: 1, quantidade: 10 }] }),
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().erros[0]).toMatchObject({ campo: "sabores" });
  });
});

describe("GET /pedido/:codigo", () => {
  it("devolve o pedido (aceita o código em minúsculas) sem expor o telefone", async () => {
    const pedido = await criarPedidoDireto({ quantidade: 30, tipoEntrega: "RETIRADA" });
    codigosCriados.push(pedido.codigo);

    const res = await app.inject({ method: "GET", url: `/pedido/${pedido.codigo.toLowerCase()}` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ codigo: pedido.codigo, status: "AGUARDANDO", total: "29.00" });
    expect(res.json()).not.toHaveProperty("telefone");
  });

  it("responde 404 para código inexistente", async () => {
    const res = await app.inject({ method: "GET", url: "/pedido/ZZZZZZZZ" });

    expect(res.statusCode).toBe(404);
    expect(res.json().mensagem).toBe("Pedido não encontrado.");
  });

  it("responde 400 para código com tamanho errado", async () => {
    const res = await app.inject({ method: "GET", url: "/pedido/123" });

    expect(res.statusCode).toBe(400);
  });
});
