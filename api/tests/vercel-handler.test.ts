import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { obterPrisma } from "./helpers.js";

// A Vercel carrega src/index.ts e chama o export default como handler (req, res).
// Aqui o mesmo handler é ligado a um servidor HTTP comum para provar que ele atende de verdade.

let servidor: Server;
let base: string;

beforeAll(async () => {
  const { default: handler } = await import("../src/index.js");
  servidor = createServer(handler);
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((ok) => servidor.close(ok));
  await (await obterPrisma()).$disconnect();
});

describe("entrada da Vercel (src/index.ts)", () => {
  it("exporta uma função como default (exigência da Vercel)", async () => {
    const modulo = await import("../src/index.js");
    expect(typeof modulo.default).toBe("function");
  });

  // A Vercel só aceita como entrada um arquivo que importe o fastify diretamente, e escolhe src/app.*
  // antes de src/index.*: sem estas duas garantias o deploy quebra (BUILD_FAILED ou 500).
  it("a entrada importa o fastify e não existe src/app.* disputando a escolha", () => {
    expect(readFileSync(new URL("../src/index.ts", import.meta.url), "utf8")).toMatch(/from\s+["']fastify["']/);
    for (const ext of ["ts", "js", "mts", "cts", "mjs", "cjs"]) {
      expect(existsSync(new URL(`../src/app.${ext}`, import.meta.url))).toBe(false);
    }
  });

  it("responde GET /health pelo handler", async () => {
    const res = await fetch(`${base}/health`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("mantém rotas, validação e CORS funcionando pelo handler", async () => {
    const sabores = await fetch(`${base}/sabores`);
    expect(sabores.status).toBe(200);
    expect((await sabores.json()).length).toBeGreaterThan(0);

    const invalido = await fetch(`${base}/pedido`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(invalido.status).toBe(400);

    const cors = await fetch(`${base}/pix`, {
      method: "OPTIONS",
      headers: { origin: "http://localhost:5173", "access-control-request-method": "PUT" },
    });
    expect(cors.headers.get("access-control-allow-methods")).toContain("PUT");
  });
});
