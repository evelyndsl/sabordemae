import { TipoEntrega } from "../generated/prisma/enums.js";
import { RegraDeNegocioError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { obterConfiguracao } from "./catalogo.js";
import { diaEmBrasilia } from "./prazoPix.js";

// Funcionamento do estabelecimento (tudo no horário de Brasília):
// - horário de atendimento diário (abertura e fechamento; sem horário = sem restrição);
// - "estabelecimento fechado": fecha de vez, até o admin desativar, independente do horário;
// - entrega desligada só no dia vigente: o cliente ainda pode agendar entrega para outro dia;
// - férias: período (do primeiro ao último dia, inclusive) em que fica fechado. Passado o fim, volta sozinho.
//
// Regras para novos pedidos:
// - fechado manualmente ou de férias: nenhum pedido;
// - antes das férias: não dá para agendar para um dia dentro delas;
// - fora do horário: só pedidos agendados para dentro do horário de atendimento;
// - sempre que houver horário definido, o horário agendado precisa cair dentro dele;
// - entrega desligada hoje: entrega só com agendamento para outro dia.

export type MotivoFechado = "FECHADO_MANUAL" | "FERIAS" | "FORA_DO_HORARIO";

export type DadosFuncionamento = {
  horarioAbertura: string | null;
  horarioFechamento: string | null;
  estabelecimentoFechado: boolean;
  entregaSuspensaEm: string | null;
  feriasInicio: string | null;
  feriasFim: string | null;
  // 0 = domingo ... 6 = sábado. Dia fora da lista = fechado o dia todo.
  diasAtendimento: number[];
  enderecoRetirada?: string | null;
};

const formatadorDiaSemana = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" });
const NUMERO_DO_DIA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Dia da semana no horário de Brasília (0 = domingo ... 6 = sábado). */
export const diaDaSemanaEmBrasilia = (data: Date) => NUMERO_DO_DIA[formatadorDiaSemana.format(data)]!;

const ABREVIACOES = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "seg a sex", "seg, qua e sex"; null quando atende todos os dias. */
export function textoDias(dias: number[]): string | null {
  const ordenados = [...new Set(dias)].sort((a, b) => a - b);
  if (ordenados.length >= 7) return null;
  if (ordenados.length === 0) return "nenhum dia";

  const grupos: number[][] = [];
  for (const d of ordenados) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo[ultimo.length - 1] === d - 1) ultimo.push(d);
    else grupos.push([d]);
  }
  const partes = grupos.flatMap((g) =>
    g.length >= 3 ? [`${ABREVIACOES[g[0]!]} a ${ABREVIACOES[g[g.length - 1]!]}`] : g.map((d) => ABREVIACOES[d]!),
  );
  return partes.length === 1 ? partes[0]! : `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

export const paraMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
};

const formatadorHora = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Minutos desde a meia-noite, no horário de Brasília. */
export function minutosNoDiaEmBrasilia(data: Date): number {
  const partes = formatadorHora.formatToParts(data);
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  return valor("hour") * 60 + valor("minute");
}

/**
 * Dentro do atendimento: o dia precisa estar selecionado e, havendo horário, o momento precisa cair nele.
 * Sem horário definido, vale o dia todo. O fechamento é exclusivo (às 18:00 em ponto já fechou).
 * Num atendimento que passa da meia-noite, a madrugada pertence ao dia em que o atendimento começou.
 */
export function dentroDoHorario(config: DadosFuncionamento, data: Date): boolean {
  const dias = config.diasAtendimento;
  const dia = diaDaSemanaEmBrasilia(data);

  if (!config.horarioAbertura || !config.horarioFechamento) return dias.includes(dia);

  const abertura = paraMinutos(config.horarioAbertura);
  const fechamento = paraMinutos(config.horarioFechamento);
  const agora = minutosNoDiaEmBrasilia(data);

  if (abertura < fechamento) return dias.includes(dia) && agora >= abertura && agora < fechamento;

  // Passa da meia-noite.
  if (agora >= abertura) return dias.includes(dia);
  if (agora < fechamento) return dias.includes((dia + 6) % 7);
  return false;
}

/**
 * Dia (AAAA-MM-DD) do atendimento a que o momento pertence: num atendimento que passa da meia-noite,
 * a madrugada pertence ao dia anterior (mesma regra dos dias de atendimento).
 */
export function diaDoAtendimento(config: DadosFuncionamento, data: Date): string {
  const { horarioAbertura, horarioFechamento } = config;
  const madrugada =
    !!horarioAbertura &&
    !!horarioFechamento &&
    paraMinutos(horarioAbertura) > paraMinutos(horarioFechamento) &&
    minutosNoDiaEmBrasilia(data) < paraMinutos(horarioFechamento);
  return diaEmBrasilia(madrugada ? new Date(data.getTime() - 24 * 3600_000) : data);
}

export function emFerias(config: DadosFuncionamento, data: Date): boolean {
  if (!config.feriasInicio || !config.feriasFim) return false;
  const dia = diaDoAtendimento(config, data);
  return dia >= config.feriasInicio && dia <= config.feriasFim;
}

/** Férias em andamento ou marcadas para depois; null quando não há ou já acabaram. */
function feriasVigentes(config: DadosFuncionamento, agora: Date) {
  const { feriasInicio: inicio, feriasFim: fim } = config;
  return inicio && fim && fim >= diaDoAtendimento(config, agora) ? { inicio, fim } : null;
}

/** "2026-12-20" -> "20/12/2026". */
const formatarDia = (dia: string) => dia.split("-").reverse().join("/");

const textoFerias = (config: DadosFuncionamento) =>
  `de ${formatarDia(config.feriasInicio!)} a ${formatarDia(config.feriasFim!)}`;

/** A entrega só fica desligada no dia marcado; em qualquer outro dia está disponível. */
export const entregaDisponivelNoDia = (config: DadosFuncionamento, data: Date) =>
  config.entregaSuspensaEm !== diaEmBrasilia(data);

export function situacao(config: DadosFuncionamento, agora: Date) {
  const motivoFechado: MotivoFechado | null = config.estabelecimentoFechado
    ? "FECHADO_MANUAL"
    : emFerias(config, agora)
      ? "FERIAS"
      : dentroDoHorario(config, agora)
        ? null
        : "FORA_DO_HORARIO";

  return {
    horarioAbertura: config.horarioAbertura,
    horarioFechamento: config.horarioFechamento,
    diasAtendimento: [...config.diasAtendimento].sort((a, b) => a - b),
    enderecoRetirada: config.enderecoRetirada ?? null,
    estabelecimentoFechado: config.estabelecimentoFechado,
    aberto: motivoFechado === null,
    motivoFechado,
    entregaHoje: entregaDisponivelNoDia(config, agora),
    ferias: feriasVigentes(config, agora),
  };
}

const textoHorario = (config: DadosFuncionamento) => {
  const horario =
    config.horarioAbertura && config.horarioFechamento ? `${config.horarioAbertura} às ${config.horarioFechamento}` : null;
  return [horario, textoDias(config.diasAtendimento)].filter(Boolean).join(", ");
};

/** Lança RegraDeNegocioError (400) se o pedido não puder ser feito agora. */
export function validarPedidoNoFuncionamento(
  config: DadosFuncionamento,
  pedido: { tipoEntrega: TipoEntrega; horarioAgendado: Date | null },
  agora: Date,
) {
  if (config.estabelecimentoFechado) {
    throw new RegraDeNegocioError("Estamos fechados no momento e não estamos aceitando pedidos. Tente novamente mais tarde.");
  }

  if (emFerias(config, agora)) {
    throw new RegraDeNegocioError(
      `Estamos de férias ${textoFerias(config)} e não estamos aceitando pedidos nesse período.`,
    );
  }

  const { horarioAgendado, tipoEntrega } = pedido;

  if (horarioAgendado && emFerias(config, horarioAgendado)) {
    throw new RegraDeNegocioError(`Estaremos de férias ${textoFerias(config)}. Escolha uma data fora desse período.`);
  }

  if (!horarioAgendado && !dentroDoHorario(config, agora)) {
    throw new RegraDeNegocioError(
      `Estamos fora do horário de atendimento (${textoHorario(config)}). Agende o pedido para um horário dentro do atendimento.`,
    );
  }

  if (horarioAgendado && !dentroDoHorario(config, horarioAgendado)) {
    throw new RegraDeNegocioError(`O horário escolhido está fora do atendimento (${textoHorario(config)}).`);
  }

  if (tipoEntrega === TipoEntrega.ENTREGA) {
    const dia = horarioAgendado ?? agora;
    if (!entregaDisponivelNoDia(config, dia)) {
      throw new RegraDeNegocioError(
        horarioAgendado
          ? "Hoje não estamos fazendo entregas. Agende a entrega para outro dia ou escolha retirada."
          : "Hoje estamos apenas com retirada. Escolha retirada ou agende a entrega para outro dia.",
      );
    }
  }
}

export async function obterFuncionamento() {
  return situacao(await obterConfiguracao(), new Date());
}

export async function atualizarFuncionamento(dados: {
  horarioAbertura: string | null;
  horarioFechamento: string | null;
  estabelecimentoFechado: boolean;
  entregaHoje: boolean;
  diasAtendimento?: number[];
}) {
  await prisma.configuracao.update({
    where: { id: 1 },
    data: {
      horarioAbertura: dados.horarioAbertura,
      horarioFechamento: dados.horarioFechamento,
      ...(dados.diasAtendimento && {
        diasAtendimento: { set: [...new Set(dados.diasAtendimento)].sort((a, b) => a - b) },
      }),
      estabelecimentoFechado: dados.estabelecimentoFechado,
      entregaSuspensaEm: dados.entregaHoje ? null : diaEmBrasilia(new Date()),
    },
  });
  return obterFuncionamento();
}

/** Define o período de férias; os dois nulos removem. */
export async function atualizarFerias(dados: { inicio: string | null; fim: string | null }) {
  if (dados.fim && dados.fim < diaEmBrasilia(new Date())) {
    throw new RegraDeNegocioError("O último dia das férias não pode estar no passado.");
  }
  await prisma.configuracao.update({ where: { id: 1 }, data: { feriasInicio: dados.inicio, feriasFim: dados.fim } });
  return obterFuncionamento();
}

export async function atualizarEnderecoRetirada(endereco: string | null) {
  await prisma.configuracao.update({ where: { id: 1 }, data: { enderecoRetirada: endereco } });
  return obterFuncionamento();
}
