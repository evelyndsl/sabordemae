import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { env } from "./lib/env.js";
import { registrarTratadorDeErros } from "./plugins/erros.js";
import { routes } from "./routes/index.js";

export async function buildApp() {
  // trustProxy: atrás da Vercel o IP real do cliente vem no x-forwarded-for (rate-limit).
  const app = Fastify({
    logger: env.NODE_ENV !== "test",
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registrarTratadorDeErros(app);

  // O padrão do @fastify/cors libera só GET, HEAD e POST: sem listar PUT e PATCH, o navegador
  // barra no preflight todas as edições do admin (status, preços, Pix, sabores...).
  await app.register(cors, {
    origin: env.WEB_URL,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "OPTIONS"],
  });
  await app.register(rateLimit, { global: false });
  await app.register(jwt, { secret: env.JWT_SECRET, sign: { expiresIn: "12h" } });
  await app.register(routes);

  return app;
}
