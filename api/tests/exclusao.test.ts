import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { autenticar, criarApp, criarPedidoDireto, encerrar, obterPrisma } from "./helpers.js";

let app: FastifyInstance;
let headers: { authorization: string };
const codigosCriados: string[] = [];

const excluir = (codigo: string, comToken = true) =>
  app.inject({ method: "DELETE", url: `/pedido/${codigo}`, headers: comToken ? headers : {} });

async function novoPedido() {
  const pedido = await criarPedidoDireto({ quantidade: 20, tipoEntrega: "ENTREGA" });
  codigosCriados.push(pedido.codigo);
  return pedido;
}

beforeAll(async () => {
  app = await criarApp();
  headers = await autenticar(app);
});

afterAll(async () => {
  await (await obterPrisma()).pedido.deleteMany({ where: { codigo: { in: codigosCriados } } });
  await encerrar(app);
});

describe("DELETE /pedido/:codigo (admin)", () => {
  it("exclui o pedido: responde 204 e ele some da consulta e da lista do admin", async () => {
    const pedido = await novoPedido();

    const res = await excluir(pedido.codigo);

    expect(res.statusCode).toBe(204);
    expect((await app.inject({ method: "GET", url: `/pedido/${pedido.codigo}` })).statusCode).toBe(404);
    const lista = (await app.inject({ method: "GET", url: "/pedidos", headers })).json();
    expect(lista.map((p: { codigo: string }) => p.codigo)).not.toContain(pedido.codigo);
  });

  it("apaga também os itens do pedido", async () => {
    const pedido = await novoPedido();
    const prisma = await obterPrisma();
    expect(await prisma.itemPedido.count({ where: { pedidoId: pedido.id } })).toBeGreaterThan(0);

    await excluir(pedido.codigo);

    expect(await prisma.itemPedido.count({ where: { pedidoId: pedido.id } })).toBe(0);
  });

  it("aceita o código em minúsculas e devolve 404 para pedido inexistente ou já excluído", async () => {
    const pedido = await novoPedido();

    expect((await excluir(pedido.codigo.toLowerCase())).statusCode).toBe(204);
    expect((await excluir(pedido.codigo)).statusCode).toBe(404);
    expect((await excluir("ZZZZZZZZ")).statusCode).toBe(404);
  });

  it("exige autenticação: sem token (ou com token inválido) volta 401 e o pedido continua existindo", async () => {
    const pedido = await novoPedido();

    expect((await excluir(pedido.codigo, false)).statusCode).toBe(401);
    expect(
      (await app.inject({ method: "DELETE", url: `/pedido/${pedido.codigo}`, headers: { authorization: "Bearer abc" } })).statusCode,
    ).toBe(401);
    expect((await app.inject({ method: "GET", url: `/pedido/${pedido.codigo}` })).statusCode).toBe(200);
  });

  it("recusa código com tamanho inválido", async () => {
    expect((await excluir("ABC")).statusCode).toBe(400);
  });
});
