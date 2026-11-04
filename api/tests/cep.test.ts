import { afterEach, describe, expect, it, vi } from "vitest";
import { criarPedidoSchema } from "../src/schemas/pedido.js";
import { CepIndisponivelError, cepEmPaicandu, validarCepDeEntrega } from "../src/services/cep.js";

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } }));

// fetch que respeita o AbortSignal, como o de verdade: nunca responde e rejeita quando o timeout dispara.
const fetchQueNuncaResponde = vi.fn((_url: string, init?: RequestInit) => {
  return new Promise<Response>((_, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("faixa de CEP de Paiçandu (sem rede)", () => {
  it.each(["87140000", "87140001", "87145970", "87149999"])("%s é de Paiçandu", (cep) => {
    expect(cepEmPaicandu(cep)).toBe(true);
  });

  it.each(["87139999", "87150000", "87020000", "87005000"])("%s não é de Paiçandu", (cep) => {
    expect(cepEmPaicandu(cep)).toBe(false);
  });

  it("CEP da faixa nem chama o ViaCEP", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(validarCepDeEntrega("87140000")).resolves.toBeUndefined();
    await expect(validarCepDeEntrega("87145970")).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ViaCEP para CEPs fora da faixa (fetch mockado)", () => {
  it("aceita um CEP de Paiçandu que a faixa não previu", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({ cep: "87150-000", localidade: "Paiçandu", uf: "PR" })));
    await expect(validarCepDeEntrega("87150000")).resolves.toBeUndefined();
  });

  it("recusa CEP de outra cidade (Maringá)", async () => {
    const fetchMock = vi.fn(() => json({ cep: "87020-025", localidade: "Maringá", uf: "PR" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(validarCepDeEntrega("87020025")).rejects.toThrow("entregamos apenas em Paiçandu/PR");
    expect(fetchMock).toHaveBeenCalledWith("https://viacep.com.br/ws/87020025/json/", expect.anything());
  });

  it("recusa CEP de outra cidade (Água Boa/MT)", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({ cep: "78635-000", localidade: "Água Boa", uf: "MT" })));
    await expect(validarCepDeEntrega("78635000")).rejects.toThrow("entregamos apenas em Paiçandu/PR");
  });

  it("recusa cidade homônima em outro estado", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({ localidade: "Paiçandu", uf: "SP" })));
    await expect(validarCepDeEntrega("12345678")).rejects.toThrow("entregamos apenas em Paiçandu/PR");
  });

  it("recusa CEP inexistente ({ erro: true })", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({ erro: true })));
    await expect(validarCepDeEntrega("99999999")).rejects.toThrow("CEP não encontrado");
  });

  it("aceita { erro: \"true\" } como inexistente (formato antigo do ViaCEP)", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({ erro: "true" })));
    await expect(validarCepDeEntrega("99999999")).rejects.toThrow("CEP não encontrado");
  });

  it("recusa quando o ViaCEP demora além do timeout", async () => {
    vi.stubGlobal("fetch", fetchQueNuncaResponde);

    const inicio = Date.now();
    const erro = await validarCepDeEntrega("87020025", 30).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(CepIndisponivelError);
    expect((erro as Error).message).toContain("Não conseguimos confirmar o CEP");
    expect(Date.now() - inicio).toBeLessThan(1000);
  });

  it("recusa quando o ViaCEP está fora do ar (erro de rede)", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("fetch failed"))));
    await expect(validarCepDeEntrega("87020025")).rejects.toBeInstanceOf(CepIndisponivelError);
  });

  it("recusa quando o ViaCEP responde 5xx", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({}, 503)));
    await expect(validarCepDeEntrega("87020025")).rejects.toBeInstanceOf(CepIndisponivelError);
  });
});

describe("cep no criarPedidoSchema", () => {
  const base = {
    nomeCliente: "Ana Souza",
    telefone: "(44) 91234-5678",
    formaPagamento: "PIX",
    tipoEntrega: "ENTREGA",
    endereco: "Rua das Flores, 123",
    quantidade: 50,
  };
  const mensagens = (entrada: unknown) => {
    const r = criarPedidoSchema.safeParse(entrada);
    return r.success ? [] : r.error.issues.map((i) => i.message);
  };

  it("aceita 8 dígitos", () => {
    expect(criarPedidoSchema.safeParse({ ...base, cep: "87140000" }).success).toBe(true);
  });

  it.each(["87140-000", "8714000", "871400000", "abcdefgh", " 87140000", ""])("rejeita %j", (cep) => {
    expect(mensagens({ ...base, cep }).length).toBeGreaterThan(0);
  });

  it("entrega exige CEP", () => {
    expect(mensagens(base)).toContain("Informe o CEP de entrega.");
  });

  it("retirada não exige CEP", () => {
    expect(criarPedidoSchema.safeParse({ ...base, tipoEntrega: "RETIRADA", endereco: undefined }).success).toBe(true);
  });
});
