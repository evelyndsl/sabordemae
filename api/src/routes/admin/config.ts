import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  atualizarEnderecoRetiradaSchema,
  atualizarFuncionamentoSchema,
  atualizarPixSchema,
  atualizarTaxasEntregaSchema,
  atualizarTempoPreparoSchema,
  atualizarValoresSchema,
  funcionamentoRespostaSchema,
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
import { atualizarEnderecoRetirada, atualizarFuncionamento } from "../../services/funcionamento.js";

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
    "/funcionamento",
    {
      schema: {
        body: atualizarFuncionamentoSchema,
        response: { 200: funcionamentoRespostaSchema },
      },
    },
    async (request) => atualizarFuncionamento(request.body),
  );

  app.put(
    "/endereco-retirada",
    {
      schema: {
        body: atualizarEnderecoRetiradaSchema,
        response: { 200: funcionamentoRespostaSchema },
      },
    },
    async (request) => atualizarEnderecoRetirada(request.body.enderecoRetirada),
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
