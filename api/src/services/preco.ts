import { TipoEntrega } from "../generated/prisma/enums.js";
import { RegraDeNegocioError } from "../lib/errors.js";

export const QUANTIDADE_MINIMA = 10;
export const QUANTIDADE_MAXIMA = 1000;
export const PASSO_QUANTIDADE = 10;
// Até aqui o valor vem da tabela de faixas; acima, é preço por unidade.
export const LIMITE_TABELA = 100;
// Pedidos de até 49 unidades pagam a taxa de entrega menor faixa (taxaEntregaAte49).
export const LIMITE_TAXA_PEDIDO_PEQUENO = 49;

export class QuantidadeInvalidaError extends RegraDeNegocioError {}

export type FaixaPrecoCentavos = { quantidade: number; valorCentavos: number };

export type ConfigPrecoCentavos = {
  valorUnidadeAcimaDe100Centavos: number;
  // Entrega de até 49 unidades.
  taxaEntregaAte49Centavos: number;
  // Entrega de 50 a 199 unidades.
  taxaEntregaCentavos: number;
  // Entrega grátis a partir desta quantidade (inclusive).
  entregaGratisAPartirDe: number;
};

export type ResultadoPreco = {
  subtotalCentavos: number;
  taxaEntregaCentavos: number;
  totalCentavos: number;
};

// Aceita Decimal do Prisma, string ou number (ex.: "13.00") e devolve centavos inteiros.
export function paraCentavos(valor: { toString(): string } | number): number {
  return Math.round(Number(valor.toString()) * 100);
}

export function calcularPreco(params: {
  quantidade: number;
  tipoEntrega: TipoEntrega;
  faixas: FaixaPrecoCentavos[];
  config: ConfigPrecoCentavos;
}): ResultadoPreco {
  const { quantidade, tipoEntrega, faixas, config } = params;

  if (
    !Number.isInteger(quantidade) ||
    quantidade < QUANTIDADE_MINIMA ||
    quantidade > QUANTIDADE_MAXIMA ||
    quantidade % PASSO_QUANTIDADE !== 0
  ) {
    throw new QuantidadeInvalidaError(
      `A quantidade deve ser múltipla de ${PASSO_QUANTIDADE}, entre ${QUANTIDADE_MINIMA} e ${QUANTIDADE_MAXIMA}.`,
    );
  }

  let subtotalCentavos: number;

  if (quantidade <= LIMITE_TABELA) {
    const faixa = faixas.find((f) => f.quantidade === quantidade);
    if (!faixa) {
      throw new Error(`Faixa de preço para ${quantidade} unidades não cadastrada.`);
    }
    subtotalCentavos = faixa.valorCentavos;
  } else {
    subtotalCentavos = quantidade * config.valorUnidadeAcimaDe100Centavos;
  }

  let taxaEntregaCentavos = 0;
  if (tipoEntrega === TipoEntrega.ENTREGA && quantidade < config.entregaGratisAPartirDe) {
    taxaEntregaCentavos =
      quantidade <= LIMITE_TAXA_PEDIDO_PEQUENO
        ? config.taxaEntregaAte49Centavos
        : config.taxaEntregaCentavos;
  }

  return {
    subtotalCentavos,
    taxaEntregaCentavos,
    totalCentavos: subtotalCentavos + taxaEntregaCentavos,
  };
}
