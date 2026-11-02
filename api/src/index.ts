import type { IncomingMessage, ServerResponse } from "node:http";
import Fastify from "fastify";
import { configurarApp, opcoesFastify } from "./buildApp.js";

// Entrada da Vercel. Duas exigências dela, vistas nos erros de deploy:
//  1. o arquivo de entrada precisa importar o "fastify" diretamente (por isso o Fastify é criado aqui);
//  2. o export default precisa ser uma função (ou servidor).
// As rotas e plugins ficam em buildApp.ts (sem export default, para a Vercel não escolhê-lo como entrada).
// Em desenvolvimento local (npm run dev / npm start) o servidor sobe por src/server.ts.

let pronto: ReturnType<typeof iniciar> | undefined;

async function iniciar() {
  const app = Fastify(opcoesFastify);
  await configurarApp(app);
  await app.ready();
  return app;
}

// A instância do Fastify é criada uma vez por container e reaproveitada nas próximas requisições.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    pronto ??= iniciar();
    const app = await pronto;
    app.server.emit("request", req, res);
  } catch (err) {
    // Se a inicialização falhar, não guarda o erro: a próxima requisição tenta de novo.
    pronto = undefined;
    console.error("Falha ao iniciar a API:", err);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ mensagem: "Erro interno do servidor." }));
  }
}
