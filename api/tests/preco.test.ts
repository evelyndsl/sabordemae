import { describe, expect, it } from "vitest";
import { TipoEntrega } from "../src/generated/prisma/enums.js";
import { QuantidadeInvalidaError, calcularPreco, paraCentavos } from "../src/services/preco.js";

const faixas = (
  [
    [10, "13.00"],
    [20, "20.00"],
    [30, "29.00"],
    [40, "35.00"],
    [50, "39.00"],
    [60, "44.00"],
    [70, "49.00"],
    [80, "55.00"],
    [90, "59.00"],
    [100, "64.00"],
  ] as const
).map(([quantidade, valor]) => ({ quantidade, valorCentavos: paraCentavos(valor) }));

const config = {
  valorUnidadeAcimaDe100Centavos: 64,
  taxaEntregaAte49Centavos: 700,
  taxaEntregaCentavos: 500,
  entregaGratisAPartirDe: 200,
};

const calcular = (quantidade: number, tipoEntrega: TipoEntrega) =>
  calcularPreco({ quantidade, tipoEntrega, faixas, config });

describe("calcularPreco", () => {
  const { RETIRADA, ENTREGA } = TipoEntrega;

  it.each([
    { quantidade: 10, tipo: RETIRADA, subtotal: 1300, taxa: 0 },
    { quantidade: 40, tipo: RETIRADA, subtotal: 3500, taxa: 0 },
    { quantidade: 110, tipo: RETIRADA, subtotal: 7040, taxa: 0 },
    { quantidade: 10, tipo: ENTREGA, subtotal: 1300, taxa: 700 },
    { quantidade: 40, tipo: ENTREGA, subtotal: 3500, taxa: 700 },
    { quantidade: 50, tipo: ENTREGA, subtotal: 3900, taxa: 500 },
    { quantidade: 100, tipo: ENTREGA, subtotal: 6400, taxa: 500 },
    { quantidade: 110, tipo: ENTREGA, subtotal: 7040, taxa: 500 },
    { quantidade: 190, tipo: ENTREGA, subtotal: 12160, taxa: 500 },
    { quantidade: 200, tipo: ENTREGA, subtotal: 12800, taxa: 0 },
    { quantidade: 1000, tipo: ENTREGA, subtotal: 64000, taxa: 0 },
  ])("$quantidade unidades ($tipo): subtotal $subtotal, taxa $taxa", ({ quantidade, tipo, subtotal, taxa }) => {
    expect(calcular(quantidade, tipo)).toEqual({
      subtotalCentavos: subtotal,
      taxaEntregaCentavos: taxa,
      totalCentavos: subtotal + taxa,
    });
  });

  it("a taxa muda entre as faixas de 40 e 50 unidades e entre 190 e 200 (frete grátis a partir de 200)", () => {
    expect(calcular(40, ENTREGA).taxaEntregaCentavos).toBe(700);
    expect(calcular(50, ENTREGA).taxaEntregaCentavos).toBe(500);
    expect(calcular(190, ENTREGA).taxaEntregaCentavos).toBe(500);
    expect(calcular(200, ENTREGA).taxaEntregaCentavos).toBe(0);
  });

  it("retirada nunca paga taxa", () => {
    for (const quantidade of [10, 50, 190, 200]) {
      expect(calcular(quantidade, RETIRADA).taxaEntregaCentavos).toBe(0);
    }
  });

  it.each([0, -10, 5, 25, 1010, 1.5, Number.NaN])("rejeita a quantidade %s", (quantidade) => {
    expect(() => calcular(quantidade, RETIRADA)).toThrow(QuantidadeInvalidaError);
  });

  it("falha com erro claro se a faixa da tabela não existe", () => {
    expect(() => calcularPreco({ quantidade: 10, tipoEntrega: RETIRADA, faixas: [], config })).toThrow(
      /não cadastrada/,
    );
  });
});

describe("paraCentavos", () => {
  it.each([
    ["13.00", 1300],
    ["0.1", 10],
    [0.64, 64],
    [7, 700],
    [{ toString: () => "5.5" }, 550],
  ])("converte %j para %i centavos", (valor, esperado) => {
    expect(paraCentavos(valor)).toBe(esperado);
  });
});
