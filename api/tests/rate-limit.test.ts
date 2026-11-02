import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarApp, encerrar } from "./helpers.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await criarApp();
});

afterAll(() => encerrar(app));

// O limite conta toda requisição, mesmo as inválidas: enviar corpo vazio não grava nada no banco.
describe("limites de uso", () => {
  it("POST /pedido bloqueia a 11ª requisição no mesmo minuto", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await app.inject({ method: "POST", url: "/pedido", payload: {} })).statusCode);
    }

    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(400));
    expect(statuses[10]).toBe(429);
  });

  it("POST /auth/login bloqueia a 6ª tentativa no mesmo minuto", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await app.inject({ method: "POST", url: "/auth/login", payload: {} })).statusCode);
    }

    expect(statuses.slice(0, 5)).toEqual(Array(5).fill(400));
    expect(statuses[5]).toBe(429);
  });
});
