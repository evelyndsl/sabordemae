import type { FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import { ConflitoError, NaoEncontradoError, RegraDeNegocioError } from "../lib/errors.js";

export function registrarTratadorDeErros(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        mensagem: "Dados inválidos.",
        erros: error.validation.map((v) => ({
          campo: v.instancePath.replace(/^\//, "").replaceAll("/", "."),
          mensagem: v.message,
        })),
      });
    }

    if (error instanceof RegraDeNegocioError) {
      return reply.status(400).send({ mensagem: error.message });
    }
    if (error instanceof NaoEncontradoError) {
      return reply.status(404).send({ mensagem: error.message });
    }
    if (error instanceof ConflitoError) {
      return reply.status(409).send({ mensagem: error.message });
    }

    const status = (error as { statusCode?: number }).statusCode;
    if (status && status < 500) {
      return reply.status(status).send({ mensagem: (error as Error).message });
    }

    request.log.error(error);
    return reply.status(500).send({ mensagem: "Erro interno. Tente novamente em instantes." });
  });
}
