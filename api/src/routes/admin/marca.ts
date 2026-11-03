import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { atualizarMarcaSchema, enviarLogoSchema, logoQuerySchema, marcaRespostaSchema } from "../../schemas/marca.js";
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
    async (request) => salvarLogo(request.body.modo, request.body.tipo, request.body.dados),
  );

  // ?modo=escuro remove só a logo do modo escuro; sem o parâmetro, remove a logo normal.
  app.delete(
    "/marca/logo",
    { schema: { querystring: logoQuerySchema, response: { 200: marcaRespostaSchema } } },
    async (request) => removerLogo(request.query.modo),
  );
};
