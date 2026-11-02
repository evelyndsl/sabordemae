import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { StatusPedido } from "../../generated/prisma/enums.js";
import { paraRespostaAdmin, pedidoAdminRespostaSchema } from "../../schemas/pedido.js";
import { atualizarStatusPedido, definirTempoPreparoPedido, listarPedidos } from "../../services/pedidos.js";

export const adminPedidosRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/pedidos",
    {
      schema: {
        querystring: z.object({
          status: z.enum(StatusPedido).optional(),
          de: z.iso.date().optional(),
          ate: z.iso.date().optional(),
        }),
        response: { 200: z.array(pedidoAdminRespostaSchema) },
      },
    },
    async (request) => {
      const pedidos = await listarPedidos(request.query);
      return pedidos.map(paraRespostaAdmin);
    },
  );

  app.put(
    "/pedido/:codigo/status",
    {
      schema: {
        params: z.object({ codigo: z.string().length(8).transform((v) => v.toUpperCase()) }),
        body: z.object({ status: z.enum(StatusPedido) }),
        response: { 200: pedidoAdminRespostaSchema },
      },
    },
    async (request) => {
      const pedido = await atualizarStatusPedido(request.params.codigo, request.body.status);
      return paraRespostaAdmin(pedido);
    },
  );
  // Pedidos sem horário agendado: o admin informa quanto tempo o preparo vai levar.
  app.put(
    "/pedido/:codigo/tempo-preparo",
    {
      schema: {
        params: z.object({ codigo: z.string().length(8).transform((v) => v.toUpperCase()) }),
        body: z.object({ minutos: z.number().int().min(1).max(1440) }),
        response: { 200: pedidoAdminRespostaSchema },
      },
    },
    async (request) => {
      const pedido = await definirTempoPreparoPedido(request.params.codigo, request.body.minutos);
      return paraRespostaAdmin(pedido);
    },
  );
};
