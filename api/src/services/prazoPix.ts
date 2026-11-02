import { LIMITE_TABELA } from "./preco.js";

// Regra de pagamento do Pix (antes de o pedido ser iniciado):
// - pedido para hoje (ou "para quando ficar pronto"): pagar no ato do pedido;
// - pedido agendado para um dia seguinte: pagar com X horas de antecedência em relação ao horário
//   agendado (X é editável pelo admin; vale uma antecedência até 100 unidades e outra acima disso).
// Se o limite calculado já passou (ex.: pedido às 23h50 para 00h30), também é "pagar agora".

export type PrazoPix = {
  /** true = pagar no ato do pedido. */
  imediato: boolean;
  /** Antecedência exigida, em horas (nulo quando o pagamento é imediato). */
  horasAntecedencia: number | null;
  /** Limite para o pagamento (nulo quando o pagamento é imediato). */
  pagarAte: Date | null;
};

const formatadorDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Dia (AAAA-MM-DD) no horário de Brasília. */
export const diaEmBrasilia = (data: Date) => formatadorDia.format(data);

export function calcularPrazoPix(params: {
  agora: Date;
  horarioAgendado: Date | null;
  quantidade: number;
  horasAteLimite: number;
  horasAcimaLimite: number;
}): PrazoPix {
  const { agora, horarioAgendado, quantidade, horasAteLimite, horasAcimaLimite } = params;
  const imediato: PrazoPix = { imediato: true, horasAntecedencia: null, pagarAte: null };

  if (!horarioAgendado) return imediato;
  if (diaEmBrasilia(horarioAgendado) === diaEmBrasilia(agora)) return imediato;

  const horas = quantidade <= LIMITE_TABELA ? horasAteLimite : horasAcimaLimite;
  const pagarAte = new Date(horarioAgendado.getTime() - horas * 3600_000);
  if (pagarAte.getTime() <= agora.getTime()) return imediato;

  return { imediato: false, horasAntecedencia: horas, pagarAte };
}
