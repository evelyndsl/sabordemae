import { describe, expect, it } from "vitest";
import { calcularPrazoPix, diaEmBrasilia } from "../src/services/prazoPix.js";

const em = (iso: string) => new Date(iso);
const regras = { horasAteLimite: 2, horasAcimaLimite: 4 };

describe("diaEmBrasilia", () => {
  it("usa o fuso de Brasília (UTC-3), não o UTC", () => {
    // 01h UTC de 03/11 ainda é 22h de 02/11 em Brasília.
    expect(diaEmBrasilia(em("2026-11-03T01:00:00Z"))).toBe("2026-11-02");
    expect(diaEmBrasilia(em("2026-11-03T03:00:00Z"))).toBe("2026-11-03");
  });
});

describe("calcularPrazoPix", () => {
  const agora = em("2026-11-02T12:00:00-03:00");

  it("sem horário (para quando ficar pronto): paga no ato do pedido", () => {
    const r = calcularPrazoPix({ agora, horarioAgendado: null, quantidade: 50, ...regras });
    expect(r).toEqual({ imediato: true, horasAntecedencia: null, pagarAte: null });
  });

  it("agendado para o mesmo dia: paga no ato do pedido", () => {
    const r = calcularPrazoPix({ agora, horarioAgendado: em("2026-11-02T18:00:00-03:00"), quantidade: 50, ...regras });
    expect(r.imediato).toBe(true);
  });

  it("dia seguinte, até 100 unidades: pagar 2h antes do horário", () => {
    const r = calcularPrazoPix({ agora, horarioAgendado: em("2026-11-03T10:00:00-03:00"), quantidade: 100, ...regras });
    expect(r.imediato).toBe(false);
    expect(r.horasAntecedencia).toBe(2);
    expect(r.pagarAte?.toISOString()).toBe(em("2026-11-03T08:00:00-03:00").toISOString());
  });

  it("dia seguinte, acima de 100 unidades: pagar 4h antes do horário", () => {
    const r = calcularPrazoPix({ agora, horarioAgendado: em("2026-11-03T10:00:00-03:00"), quantidade: 110, ...regras });
    expect(r.horasAntecedencia).toBe(4);
    expect(r.pagarAte?.toISOString()).toBe(em("2026-11-03T06:00:00-03:00").toISOString());
  });

  it("respeita as horas configuradas pelo admin", () => {
    const r = calcularPrazoPix({
      agora,
      horarioAgendado: em("2026-11-05T10:00:00-03:00"),
      quantidade: 50,
      horasAteLimite: 6,
      horasAcimaLimite: 12,
    });
    expect(r.horasAntecedencia).toBe(6);
  });

  it("se o limite calculado já passou, paga no ato do pedido", () => {
    const tarde = em("2026-11-02T23:50:00-03:00");
    const r = calcularPrazoPix({ agora: tarde, horarioAgendado: em("2026-11-03T00:30:00-03:00"), quantidade: 50, ...regras });
    expect(r.imediato).toBe(true);
  });
});
