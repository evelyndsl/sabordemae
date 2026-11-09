import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarPedidoSchema } from "../src/schemas/pedido.js";
import { criarApp, encerrar, obterPrisma } from "./helpers.js";

const base = {
  nomeCliente: "Maria Silva",
  telefone: "(11) 91234-5678",
  formaPagamento: "DINHEIRO",
  quantidade: 50,
  tipoEntrega: "ENTREGA",
  endereco: "Rua das Flores",
  numero: "123",
  bairro: "Centro",
};

const mensagens = (entrada: unknown) => {
  const r = criarPedidoSchema.safeParse(entrada);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe("endereço de entrega (schema)", () => {
  it("aceita rua, número e bairro e apara os espaços", () => {
    const r = criarPedidoSchema.parse({ ...base, endereco: "  Av. Brasil ", numero: " 45-B ", bairro: " Vila Nova " });
    expect(r).toMatchObject({ endereco: "Av. Brasil", numero: "45-B", bairro: "Vila Nova" });
  });

  it("aceita 'S/N' como número", () => {
    expect(criarPedidoSchema.safeParse({ ...base, numero: "S/N" }).success).toBe(true);
  });

  it("entrega sem número: pede o número da residência", () => {
    expect(mensagens({ ...base, numero: undefined })).toEqual(["Informe o número da residência."]);
  });

  it("entrega sem bairro: pede o bairro", () => {
    expect(mensagens({ ...base, bairro: undefined })).toEqual(["Informe o bairro."]);
  });

  it("entrega sem rua: pede o endereço", () => {
    expect(mensagens({ ...base, endereco: undefined })).toEqual(["Informe o endereço de entrega."]);
  });

  it("texto em branco conta como não informado", () => {
    expect(mensagens({ ...base, endereco: "   ", numero: "  ", bairro: "" })).toEqual([
      "Informe o endereço de entrega.",
      "Informe o número da residência.",
      "Informe o bairro.",
    ]);
  });

  it("rua curta demais é rejeitada", () => {
    expect(mensagens({ ...base, endereco: "Rua" })).toEqual(["Informe o endereço de entrega."]);
  });

  it("número e bairro acima do limite são rejeitados", () => {
    const erros = mensagens({ ...base, numero: "1".repeat(21), bairro: "b".repeat(101) });
    expect(erros).toEqual(["Use no máximo 20 caracteres.", "Use no máximo 100 caracteres."]);
  });

  it("retirada não exige endereço, número nem bairro", () => {
    const retirada = { ...base, tipoEntrega: "RETIRADA", endereco: undefined, numero: undefined, bairro: undefined };
    expect(criarPedidoSchema.safeParse(retirada).success).toBe(true);
  });

  it("o ponto de referência continua opcional", () => {
    expect(criarPedidoSchema.safeParse(base).success).toBe(true);
    expect(criarPedidoSchema.safeParse({ ...base, pontoReferencia: "Casa B, fundos" }).success).toBe(true);
  });
});

describe("POST /pedido: endereço de entrega", () => {
  let app: FastifyInstance;
  const codigosCriados: string[] = [];
  const postPedido = async (payload: object) => {
    const res = await app.inject({ method: "POST", url: "/pedido", payload });
    if (res.statusCode === 201) codigosCriados.push(res.json().codigo);
    return res;
  };

  beforeAll(async () => {
    app = await criarApp();
  });

  afterAll(async () => {
    await (await obterPrisma()).pedido.deleteMany({ where: { codigo: { in: codigosCriados } } });
    await encerrar(app);
  });

  it("guarda e devolve rua, número e bairro (também na consulta pública)", async () => {
    const res = await postPedido({ ...base, pontoReferencia: "Casa B" });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ endereco: "Rua das Flores", numero: "123", bairro: "Centro", pontoReferencia: "Casa B" });

    const consulta = await app.inject({ method: "GET", url: `/pedido/${res.json().codigo}` });
    expect(consulta.json()).toMatchObject({ endereco: "Rua das Flores", numero: "123", bairro: "Centro" });
  });

  it.each([
    ["número", "numero", "Informe o número da residência."],
    ["bairro", "bairro", "Informe o bairro."],
    ["endereço", "endereco", "Informe o endereço de entrega."],
  ])("entrega sem %s responde 400 apontando o campo", async (_nome, campo, mensagem) => {
    const res = await postPedido({ ...base, [campo]: undefined });

    expect(res.statusCode).toBe(400);
    expect(res.json().erros).toEqual([expect.objectContaining({ campo, mensagem })]);
  });

  it("entrega sem número nem bairro lista os dois erros", async () => {
    const res = await postPedido({ ...base, numero: "  ", bairro: "" });

    expect(res.statusCode).toBe(400);
    expect(res.json().erros.map((e: { campo: string }) => e.campo)).toEqual(["numero", "bairro"]);
  });

  it("retirada não guarda endereço, número nem bairro enviados", async () => {
    const res = await postPedido({ ...base, tipoEntrega: "RETIRADA" });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ endereco: null, numero: null, bairro: null });
  });
});
