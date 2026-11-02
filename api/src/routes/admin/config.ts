import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  atualizarPixSchema,
  atualizarTaxasEntregaSchema,
  atualizarTempoPreparoSchema,
  atualizarValoresSchema,
  pixRespostaSchema,
  taxasEntregaRespostaSchema,
  tempoPreparoRespostaSchema,
  valoresRespostaSchema,
} from "../../schemas/catalogo.js";
import {
  atualizarPix,
  atualizarTaxasEntrega,
  atualizarTempoPreparo,
  atualizarValores,
} from "../../services/catalogo.js";

export const adminConfigRoutes: FastifyPluginAsyncZod = async (app) => {
  app.put(
    "/tempo-preparo",
    {
      schema: {
        body: atualizarTempoPreparoSchema,
        response: { 200: tempoPreparoRespostaSchema },
      },
    },
    async (request) => atualizarTempoPreparo(request.body),
  );

  app.put(
    "/taxa-entrega",
    {
      schema: {
        body: atualizarTaxasEntregaSchema,
        response: { 200: taxasEntregaRespostaSchema },
      },
    },
    async (request) => atualizarTaxasEntrega(request.body),
  );

  app.put(
    "/pix",
    { schema: { body: atualizarPixSchema, response: { 200: pixRespostaSchema } } },
    async (request) => atualizarPix(request.body),
  );

  app.put(
    "/valores",
    { schema: { body: atualizarValoresSchema, response: { 200: valoresRespostaSchema } } },
    async (request) => atualizarValores(request.body),
  );
};
