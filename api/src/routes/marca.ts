import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { logoQuerySchema, marcaRespostaSchema } from "../schemas/marca.js";
import { obterLogo, obterMarca } from "../services/marca.js";

export const marcaRoutes: FastifyPluginAsyncZod = async (app) => {
  // Nome, versão da logo e cores: o front aplica tudo ao abrir.
  app.get("/marca", { schema: { response: { 200: marcaRespostaSchema } } }, async () => obterMarca());

  // Sem schema de resposta: a resposta é binária (imagem), não JSON.
  // ?modo=escuro devolve a logo do modo escuro; sem o parâmetro, a logo normal (modo claro).
  app.get("/marca/logo", { schema: { querystring: logoQuerySchema.extend({ v: z.string().optional() }) } }, async (request, reply) => {
    const logo = await obterLogo(request.query.modo);
    if (!logo) return reply.status(404).send({ mensagem: "Nenhuma logo cadastrada." });

    return (
      reply
        .header("content-type", logo.tipo)
        // A URL leva ?v=<versão>: cada logo nova tem outra URL, então o cache pode ser longo.
        .header("cache-control", "public, max-age=31536000, immutable")
        .header("x-content-type-options", "nosniff")
        // Se alguém abrir o arquivo direto, nada ativo roda (vale para SVG).
        .header("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox")
        // O front fica em outro domínio e exibe a imagem com <img>.
        .header("cross-origin-resource-policy", "cross-origin")
        .send(logo.dados)
    );
  });
};
