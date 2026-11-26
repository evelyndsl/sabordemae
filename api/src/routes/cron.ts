import { timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { env } from "../lib/env.js";
import { finalizarPedidosEmAberto } from "../services/pedidos.js";

const confere = (recebido: string | undefined, esperado: string) => {
  const a = Buffer.from(recebido ?? "");
  const b = Buffer.from(`Bearer ${esperado}`);
  return a.length === b.length && timingSafeEqual(a, b);
};

// Chamadas pelo cron da Vercel (agendado no vercel.json), autenticadas por CRON_SECRET.
export const cronRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/cron/finalizar-pedidos",
    {
      schema: {
        response: { 200: z.object({ finalizados: z.number() }), 401: z.object({ mensagem: z.string() }) },
      },
    },
    async (request, reply) => {
      if (!env.CRON_SECRET || !confere(request.headers.authorization, env.CRON_SECRET)) {
        return reply.status(401).send({ mensagem: "Não autorizado." });
      }
      return { finalizados: await finalizarPedidosEmAberto() };
    },
  );
};
