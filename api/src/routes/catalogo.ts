import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  funcionamentoRespostaSchema,
  pixRespostaSchema,
  saborRespostaSchema,
  taxasEntregaRespostaSchema,
  tempoPreparoRespostaSchema,
  valoresRespostaSchema,
} from "../schemas/catalogo.js";
import {
  listarSabores,
  obterPix,
  obterTaxasEntrega,
  obterTempoPreparo,
  obterValores,
} from "../services/catalogo.js";
import { obterFuncionamento } from "../services/funcionamento.js";

export const catalogoRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/sabores",
    { schema: { response: { 200: z.array(saborRespostaSchema) } } },
    async () => listarSabores(),
  );

  app.get("/valores", { schema: { response: { 200: valoresRespostaSchema } } }, async () =>
    obterValores(),
  );

  app.get(
    "/tempo-preparo",
    { schema: { response: { 200: tempoPreparoRespostaSchema } } },
    async () => obterTempoPreparo(),
  );

  app.get(
    "/taxa-entrega",
    { schema: { response: { 200: taxasEntregaRespostaSchema } } },
    async () => obterTaxasEntrega(),
  );

  app.get(
    "/funcionamento",
    { schema: { response: { 200: funcionamentoRespostaSchema } } },
    async () => obterFuncionamento(),
  );

  app.get("/pix", { schema: { response: { 200: pixRespostaSchema } } }, async () => obterPix());
};
