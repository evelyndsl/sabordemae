import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarPedidoSchema } from "../src/schemas/pedido.js";
import { criarApp, encerrar, obterPrisma } from "./helpers.js";

const cliente = { nomeCliente: "Maria Silva", telefone: "(11) 91234-5678", formaPagamento: "DINHEIRO" };
const entrega = { ...cliente, tipoEntrega: "ENTREGA", endereco: "Rua das Flores, 123" };

let app: FastifyInstance;
const codigosCriados: string[] = [];

async function criarPedido(payload: object) {
  const res = await app.inject({ method: "POST", url: "/pedido", payload });
  if (res.statusCode === 201) codigosCriados.push(res.json().codigo);
  return res;
}
const consultar = (codigo: string) => app.inject({ method: "GET", url: `/pedido/${codigo}` });
const mensagens = (entrada: unknown) => {
  const r = criarPedidoSchema.safeParse(entrada);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

beforeAll(async () => {
  app = await criarApp();
});

afterAll(async () => {
  await (await obterPrisma()).pedido.deleteMany({ where: { codigo: { in: codigosCriados } } });
  await encerrar(app);
});

describe("sabores: só escolher ou definir a quantidade de cada um", () => {
  it("só escolher os sabores (sem quantidade) é aceito e a quantidade de cada item fica nula", async () => {
    const res = await criarPedido({ ...entrega, quantidade: 50, sabores: [{ saborId: 1 }, { saborId: 4 }, { saborId: 6 }] });

    expect(res.statusCode).toBe(201);
    expect(res.json().itens).toEqual([
      { sabor: "Coxinha de frango", quantidade: null },
      { sabor: "Bolinha de queijo", quantidade: null },
      { sabor: "Kibe de carne", quantidade: null },
    ]);
    expect(res.json().quantidadeTotal).toBe(50);
    expect((await consultar(res.json().codigo)).json().itens).toHaveLength(3);
  });

  it("misturar sabores com e sem quantidade volta 400", () => {
    const base = { ...entrega, quantidade: 50 };
    const misturado = [{ saborId: 1, quantidade: 30 }, { saborId: 4 }];

    expect(mensagens({ ...base, sabores: misturado })).toContain("Informe a quantidade de todos os sabores ou de nenhum.");
  });

  it("sem quantidade por sabor não exige soma; com quantidade a soma continua obrigatória", () => {
    const base = { ...entrega, quantidade: 50 };

    expect(mensagens({ ...base, sabores: [{ saborId: 1 }, { saborId: 2 }] })).toEqual([]);
    expect(mensagens({ ...base, sabores: [{ saborId: 1, quantidade: 20 }, { saborId: 2, quantidade: 20 }] })[0]).toContain(
      "A soma dos sabores (40)",
    );
  });

  it("sabor repetido continua sendo recusado também sem quantidade", () => {
    expect(mensagens({ ...entrega, quantidade: 10, sabores: [{ saborId: 1 }, { saborId: 1 }] })).toContain("Sabor repetido no pedido.");
  });
});

describe("ponto de referência da entrega", () => {
  it("é salvo na entrega e aparece na consulta do pedido", async () => {
    const res = await criarPedido({ ...entrega, quantidade: 10, pontoReferencia: "  Portão azul, ao lado da padaria " });

    expect(res.statusCode).toBe(201);
    expect(res.json().pontoReferencia).toBe("Portão azul, ao lado da padaria");
    expect((await consultar(res.json().codigo)).json().pontoReferencia).toBe("Portão azul, ao lado da padaria");
  });

  it("é opcional (ausente ou vazio vira nulo), é ignorado na retirada e tem limite de 200 caracteres", async () => {
    const sem = await criarPedido({ ...entrega, quantidade: 10 });
    const vazio = await criarPedido({ ...entrega, quantidade: 10, pontoReferencia: "   " });
    const retirada = await criarPedido({ ...cliente, tipoEntrega: "RETIRADA", quantidade: 10, pontoReferencia: "não deve salvar" });
    const longo = await criarPedido({ ...entrega, quantidade: 10, pontoReferencia: "x".repeat(201) });

    expect(sem.json().pontoReferencia).toBeNull();
    expect(vazio.json().pontoReferencia).toBeNull();
    expect(retirada.statusCode).toBe(201);
    expect(retirada.json().pontoReferencia).toBeNull();
    expect(longo.statusCode).toBe(400);
  });
});
