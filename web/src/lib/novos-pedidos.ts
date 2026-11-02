/** Pedidos da lista cujo código ainda não foi visto (ou seja, que chegaram desde a última consulta). */
export function encontrarNovos<T extends { codigo: string }>(vistos: ReadonlySet<string>, lista: readonly T[]): T[] {
  return lista.filter((p) => !vistos.has(p.codigo))
}
