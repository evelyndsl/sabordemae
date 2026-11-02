// Erros de negócio e como a API responde a cada um (ver plugins/erros.ts).

/** 400: a requisição é válida, mas fere uma regra do negócio. */
export class RegraDeNegocioError extends Error {}

/** 404 */
export class NaoEncontradoError extends Error {}

/** 409: conflita com algo que já existe (ex.: nome de sabor repetido). */
export class ConflitoError extends Error {}

export function codigoErroPrisma(err: unknown): string | undefined {
  return typeof err === "object" && err !== null && "code" in err && typeof err.code === "string"
    ? err.code
    : undefined;
}
