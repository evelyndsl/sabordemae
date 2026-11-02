import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { autenticarAdmin } from "../services/auth.js";

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/auth/login",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        body: z.object({
          usuario: z.string().trim().min(1).max(60),
          senha: z.string().min(1).max(200),
        }),
        response: {
          200: z.object({ token: z.string() }),
          401: z.object({ mensagem: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const admin = await autenticarAdmin(request.body.usuario, request.body.senha);
      if (!admin) return reply.status(401).send({ mensagem: "Usuário ou senha inválidos." });

      const token = await reply.jwtSign({ sub: String(admin.id), usuario: admin.usuario });
      return { token };
    },
  );
};
