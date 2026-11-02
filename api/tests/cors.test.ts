import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarApp, encerrar } from "./helpers.js";

let app: FastifyInstance;
let origemPermitida: string;

beforeAll(async () => {
  app = await criarApp();
  origemPermitida = (await import("../src/lib/env.js")).env.WEB_URL;
});

afterAll(() => encerrar(app));

const preflight = (metodo: string, origin: string) =>
  app.inject({
    method: "OPTIONS",
    url: "/pix",
    headers: {
      origin,
      "access-control-request-method": metodo,
      "access-control-request-headers": "authorization,content-type",
    },
  });

describe("CORS (preflight do navegador)", () => {
  // O painel do admin usa PUT e PATCH: se o preflight não os liberar, o navegador nem envia a requisição.
  it.each(["GET", "POST", "PUT", "PATCH", "DELETE"])("libera %s para a origem do front", async (metodo) => {
    const res = await preflight(metodo, origemPermitida);

    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(origemPermitida);
    expect(String(res.headers["access-control-allow-methods"]).split(",").map((m) => m.trim())).toContain(metodo);
  });

  it("não libera outras origens (o navegador só aceita a origem configurada)", async () => {
    const res = await preflight("PUT", "http://site-malicioso.com");

    expect(res.headers["access-control-allow-origin"]).not.toBe("http://site-malicioso.com");
  });
});
