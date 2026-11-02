import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "./buildApp.js";

// Entrada da Vercel: ela procura src/app.*, src/index.* e src/server.* (nessa ordem) e exige que o
// arquivo escolhido exporte uma função (ou um servidor) como default.
// Por isso a API fica em buildApp.ts (sem default) e este arquivo expõe o handler serverless.
// Em desenvolvimento local (npm run dev / npm start) o servidor sobe por src/server.ts.

let pronto: ReturnType<typeof iniciar> | undefined;

async function iniciar() {
  const app = await buildApp();
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
