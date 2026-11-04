import { describe, expect, it } from "vitest";
import { criarPedidoSchema } from "../src/schemas/pedido.js";
import { horarioFuturo } from "./helpers.js";

const base = {
  nomeCliente: "Ana Souza",
  telefone: "(11) 91234-5678",
  formaPagamento: "PIX",
  tipoEntrega: "ENTREGA",
  endereco: "Rua das Flores, 123",
  cep: "87140000",
  quantidade: 50,
};

const mensagens = (entrada: unknown) => {
  const resultado = criarPedidoSchema.safeParse(entrada);
  return resultado.success ? [] : resultado.error.issues.map((i) => i.message);
};

describe("criarPedidoSchema", () => {
  it("aceita pedido misto (sem sabores)", () => {
    const r = criarPedidoSchema.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.data?.sabores).toEqual([]);
  });

  it("aceita sabores que somam a quantidade", () => {
    const sabores = [
      { saborId: 1, quantidade: 15 },
      { saborId: 2, quantidade: 35 },
    ];
    expect(criarPedidoSchema.safeParse({ ...base, sabores }).success).toBe(true);
  });

  it("aceita entrega de qualquer quantidade, inclusive abaixo de 50", () => {
    expect(criarPedidoSchema.safeParse({ ...base, quantidade: 10 }).success).toBe(true);
  });

  it("guarda só os dígitos do telefone", () => {
    expect(criarPedidoSchema.parse(base).telefone).toBe("11912345678");
  });

  it("rejeita telefone sem DDD", () => {
    expect(mensagens({ ...base, telefone: "91234" })).toContain("Informe um telefone com DDD.");
  });

  it("rejeita sabores cuja soma difere da quantidade", () => {
    const m = mensagens({ ...base, sabores: [{ saborId: 1, quantidade: 10 }] });
    expect(m).toContain("A soma dos sabores (10) deve ser igual à quantidade do pedido (50).");
  });

  it("rejeita sabor repetido", () => {
    const sabores = [
      { saborId: 1, quantidade: 25 },
      { saborId: 1, quantidade: 25 },
    ];
    expect(mensagens({ ...base, sabores })).toContain("Sabor repetido no pedido.");
  });

  it.each([25, 1010, 0, 5])("rejeita a quantidade %i", (quantidade) => {
    expect(mensagens({ ...base, quantidade }).length).toBeGreaterThan(0);
  });

  it("entrega exige endereço", () => {
    expect(mensagens({ ...base, endereco: undefined })).toContain("Informe o endereço de entrega.");
  });

  it("entrega e retirada aceitam ficar sem horário (para quando ficar pronto)", () => {
    expect(criarPedidoSchema.safeParse(base).success).toBe(true);
    expect(criarPedidoSchema.safeParse({ ...base, tipoEntrega: "RETIRADA", endereco: undefined }).success).toBe(true);
  });

  it("não aceita horário no passado", () => {
    const passado = new Date(Date.now() - 3600_000).toISOString();
    expect(mensagens({ ...base, tipoEntrega: "RETIRADA", horarioAgendado: passado })).toContain(
      "O horário escolhido deve ser no futuro.",
    );
  });

  it("aceita entrega e retirada com horário futuro", () => {
    const r = criarPedidoSchema.safeParse({ ...base, tipoEntrega: "RETIRADA", horarioAgendado: horarioFuturo() });
    expect(r.success).toBe(true);
    expect(criarPedidoSchema.safeParse({ ...base, horarioAgendado: horarioFuturo() }).success).toBe(true);
  });

  it("rejeita forma de pagamento e tipo de entrega desconhecidos", () => {
    expect(mensagens({ ...base, formaPagamento: "BOLETO" }).length).toBeGreaterThan(0);
    expect(mensagens({ ...base, tipoEntrega: "DRONE" }).length).toBeGreaterThan(0);
  });
});
