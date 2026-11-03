import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { criarPedidoSchema, paraResposta, pedidoRespostaSchema } from "../schemas/pedido.js";
import { notificarNovoPedido } from "../services/notificacao.js";
import { buscarPedidoPorCodigo, criarPedido } from "../services/pedidos.js";

export const pedidosRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/pedido",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: { body: criarPedidoSchema, response: { 201: pedidoRespostaSchema } },
    },
    async (request, reply) => {
      const pedido = await criarPedido(request.body);
      // Aguarda o aviso (tem tempo limite e nunca lança erro): na Vercel a função encerra junto com a resposta.
      await notificarNovoPedido(pedido);
      return reply.status(201).send(paraResposta(pedido));
    },
  );

  app.get(
    "/pedido/:codigo",
    {
      schema: {
        params: z.object({ codigo: z.string().length(8).transform((v) => v.toUpperCase()) }),
        response: { 200: pedidoRespostaSchema, 404: z.object({ mensagem: z.string() }) },
      },
    },
    async (request, reply) => {
      const pedido = await buscarPedidoPorCodigo(request.params.codigo);
      if (!pedido) return reply.status(404).send({ mensagem: "Pedido não encontrado." });
      return paraResposta(pedido);
    },
  );
};
