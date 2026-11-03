import { describe, expect, it, vi } from "vitest";
import { enviarNtfy, montarAviso } from "../src/services/notificacao.js";
import type { PedidoComItens } from "../src/services/pedidos.js";

const pedido = {
  codigo: "ABC12345",
  quantidadeTotal: 50,
  tipoEntrega: "RETIRADA",
  formaPagamento: "DINHEIRO",
  total: { toFixed: (n: number) => (39).toFixed(n) },
  horarioAgendado: null,
  nomeCliente: "Maria da Silva",
  telefone: "11912345678",
  endereco: "Rua Secreta, 1",
} as unknown as PedidoComItens;

describe("aviso de novo pedido (ntfy)", () => {
  it("resume o pedido sem dados pessoais do cliente", () => {
    const aviso = montarAviso(pedido, "https://app.exemplo.com/");

    expect(aviso.title).toBe("🔔 Novo pedido - ABC12345");
    expect(aviso.message).toBe("50 un. | Retirada | R$ 39,00");
    expect(aviso.click).toBe("https://app.exemplo.com/admin/dashboard");
    expect(JSON.stringify(aviso)).not.toMatch(/Maria|11912345678|Secreta/);
  });

  it("mostra Entrega para pedidos de entrega", () => {
    const entrega = { ...pedido, tipoEntrega: "ENTREGA" } as PedidoComItens;
    expect(montarAviso(entrega).message).toBe("50 un. | Entrega | R$ 39,00");
  });

  it("publica o JSON no servidor do ntfy", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const ok = await enviarNtfy({ topic: "meu-topico", fetchImpl }, { title: "Novo pedido X", message: "ação" });

    expect(ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://ntfy.sh");
    expect(JSON.parse(init.body)).toMatchObject({ topic: "meu-topico", title: "Novo pedido X", message: "ação" });
  });

  it("falha de rede ou resposta de erro não lança e devolve false", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await enviarNtfy({ topic: "t", fetchImpl: vi.fn().mockRejectedValue(new Error("sem rede")) }, { title: "a", message: "b" })).toBe(false);
    expect(await enviarNtfy({ topic: "t", fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 500 }) }, { title: "a", message: "b" })).toBe(false);

    erro.mockRestore();
  });
});
