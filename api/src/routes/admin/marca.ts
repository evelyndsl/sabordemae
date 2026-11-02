import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { atualizarMarcaSchema, enviarLogoSchema, marcaRespostaSchema } from "../../schemas/marca.js";
import { atualizarMarca, removerLogo, salvarLogo } from "../../services/marca.js";

export const adminMarcaRoutes: FastifyPluginAsyncZod = async (app) => {
  app.put(
    "/marca",
    { schema: { body: atualizarMarcaSchema, response: { 200: marcaRespostaSchema } } },
    async (request) => atualizarMarca(request.body),
  );

  // Logo em PNG ou SVG enviada como JSON (base64): evita um plugin de upload e funciona em serverless.
  app.put(
    "/marca/logo",
    {
      bodyLimit: 1024 * 1024,
      schema: { body: enviarLogoSchema, response: { 200: marcaRespostaSchema } },
    },
    async (request) => salvarLogo(request.body.tipo, request.body.dados),
  );

  app.delete("/marca/logo", { schema: { response: { 200: marcaRespostaSchema } } }, async () => removerLogo());
};
