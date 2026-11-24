import { describe, expect, it } from "vitest";
import { lerConsentimento, salvarConsentimento } from "@/lib/consentimento";
import {
  apagarDados,
  carregarDados,
  DADOS_KEY,
  salvarDados,
} from "@/lib/dados-cliente";

function memoria() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

const dados = {
  nome: "Ana",
  telefone: "(44) 99999-9999",
  endereco: "Rua A",
  numero: "10",
  bairro: "Centro",
  pontoReferencia: "",
};

describe("consentimento", () => {
  it("começa sem escolha e guarda aceito/recusado", () => {
    const s = memoria();
    expect(lerConsentimento(s)).toBeNull();
    salvarConsentimento("aceito", s);
    expect(lerConsentimento(s)).toBe("aceito");
    salvarConsentimento("recusado", s);
    expect(lerConsentimento(s)).toBe("recusado");
  });

  it("ignora valor inválido", () => {
    const s = memoria();
    s.setItem("saborDeMae:cookies", "talvez");
    expect(lerConsentimento(s)).toBeNull();
  });
});

describe("dados do cliente salvos", () => {
  it("não grava nem lê sem consentimento", () => {
    const s = memoria();
    salvarDados(dados, s);
    expect(s.getItem(DADOS_KEY)).toBeNull();
    salvarConsentimento("recusado", s);
    salvarDados(dados, s);
    expect(carregarDados(s)).toBeNull();
  });

  it("grava e lê depois de aceitar; apagar remove", () => {
    const s = memoria();
    salvarConsentimento("aceito", s);
    salvarDados(dados, s);
    expect(carregarDados(s)).toEqual(dados);
    apagarDados(s);
    expect(carregarDados(s)).toBeNull();
  });

  it("revogar o consentimento esconde os dados que ficaram", () => {
    const s = memoria();
    salvarConsentimento("aceito", s);
    salvarDados(dados, s);
    salvarConsentimento("recusado", s);
    expect(carregarDados(s)).toBeNull();
  });

  it("tolera JSON corrompido e campos faltando", () => {
    const s = memoria();
    salvarConsentimento("aceito", s);
    s.setItem(DADOS_KEY, "{quebrado");
    expect(carregarDados(s)).toBeNull();
    s.setItem(DADOS_KEY, JSON.stringify({ nome: "Ana", telefone: 5 }));
    expect(carregarDados(s)).toEqual({
      ...dados,
      telefone: "",
      endereco: "",
      numero: "",
      bairro: "",
    });
  });
});
