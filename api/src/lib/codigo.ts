import { randomInt } from "node:crypto";

// Sem I, L, O, 0 e 1 para não confundir quando o código for ditado ou digitado.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const TAMANHO = 8;

export function gerarCodigoPedido(): string {
  let codigo = "";
  for (let i = 0; i < TAMANHO; i++) {
    codigo += ALFABETO[randomInt(ALFABETO.length)];
  }
  return codigo;
}
