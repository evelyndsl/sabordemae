import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  atualizarSaborSchema,
  criarSaborSchema,
  saborAdminRespostaSchema,
} from "../../schemas/catalogo.js";
import { atualizarSabor, criarSabor, listarTodosSabores } from "../../services/catalogo.js";

export const adminSaboresRoutes: FastifyPluginAsyncZod = async (app) => {
  // Lista também os sabores desativados (a rota pública GET /sabores só mostra os ativos).
  app.get(
    "/admin/sabores",
    { schema: { response: { 200: z.array(saborAdminRespostaSchema) } } },
    async () => listarTodosSabores(),
  );

  app.post(
    "/sabores",
    { schema: { body: criarSaborSchema, response: { 201: saborAdminRespostaSchema } } },
    async (request, reply) => {
      const sabor = await criarSabor(request.body.nome);
      return reply.status(201).send(sabor);
    },
  );

  app.patch(
    "/sabores/:id",
    {
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: atualizarSaborSchema,
        response: { 200: saborAdminRespostaSchema },
      },
    },
    async (request) => atualizarSabor(request.params.id, request.body),
  );
};
