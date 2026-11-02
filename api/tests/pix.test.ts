import { describe, expect, it } from "vitest";
import { TipoChavePix } from "../src/generated/prisma/enums.js";
import { PIX_CHAVE_PADRAO, chaveParaCopiar, normalizarChavePix } from "../src/lib/pix.js";

const { CPF, CNPJ, TELEFONE, ALEATORIA } = TipoChavePix;

describe("normalizarChavePix", () => {
  describe("CPF", () => {
    it("aceita com ou sem máscara e guarda só os dígitos", () => {
      expect(normalizarChavePix(CPF, "529.982.247-25")).toBe("52998224725");
      expect(normalizarChavePix(CPF, "52998224725")).toBe("52998224725");
    });

    it.each(["52998224726", "11111111111", PIX_CHAVE_PADRAO, "123", "abc"])("rejeita %s", (chave) => {
      expect(normalizarChavePix(CPF, chave)).toBeNull();
    });
  });

  describe("CNPJ", () => {
    it("aceita com ou sem máscara", () => {
      expect(normalizarChavePix(CNPJ, "11.222.333/0001-81")).toBe("11222333000181");
    });

    it.each(["11222333000182", "00000000000000", "123"])("rejeita %s", (chave) => {
      expect(normalizarChavePix(CNPJ, chave)).toBeNull();
    });
  });

  describe("telefone", () => {
    it.each(["(11) 91234-5678", "+55 11 91234-5678", "5511912345678", "11912345678"])(
      "aceita %s e guarda DDD + número",
      (chave) => {
        expect(normalizarChavePix(TELEFONE, chave)).toBe("11912345678");
      },
    );

    it("aceita telefone fixo (10 dígitos)", () => {
      expect(normalizarChavePix(TELEFONE, "(11) 3456-7890")).toBe("1134567890");
    });

    it.each(["123", "0112345678", "11812345678", "919123456"])("rejeita %s", (chave) => {
      expect(normalizarChavePix(TELEFONE, chave)).toBeNull();
    });
  });

  describe("chave aleatória", () => {
    it("aceita UUID e guarda em minúsculas", () => {
      expect(normalizarChavePix(ALEATORIA, "123E4567-E89B-42D3-A456-426614174000")).toBe(
        "123e4567-e89b-42d3-a456-426614174000",
      );
    });

    it.each(["abc", "123e4567e89b42d3a456426614174000", "123e4567-e89b-42d3-a456-42661417400z"])(
      "rejeita %s",
      (chave) => {
        expect(normalizarChavePix(ALEATORIA, chave)).toBeNull();
      },
    );
  });
});

describe("chaveParaCopiar", () => {
  it("acrescenta +55 ao telefone", () => {
    expect(chaveParaCopiar(TELEFONE, "11912345678")).toBe("+5511912345678");
  });

  it("não altera os outros tipos", () => {
    expect(chaveParaCopiar(CPF, "52998224725")).toBe("52998224725");
  });
});
