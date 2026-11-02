import type { FastifyReply, FastifyRequest } from "fastify";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; usuario: string };
    user: { sub: string; usuario: string };
  }
}

// Use como preHandler nas rotas do admin.
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ mensagem: "Não autorizado." });
  }
}
