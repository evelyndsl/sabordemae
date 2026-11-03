import { TipoEntrega } from "../generated/prisma/enums.js";
import { RegraDeNegocioError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { obterConfiguracao } from "./catalogo.js";
import { diaEmBrasilia } from "./prazoPix.js";

// Funcionamento do estabelecimento (tudo no horário de Brasília):
// - horário de atendimento diário (abertura e fechamento; sem horário = sem restrição);
// - "estabelecimento fechado": fecha de vez, até o admin desativar, independente do horário;
// - entrega desligada só no dia vigente: o cliente ainda pode agendar entrega para outro dia.
//
// Regras para novos pedidos:
// - fechado manualmente: nenhum pedido;
// - fora do horário: só pedidos agendados para dentro do horário de atendimento;
// - sempre que houver horário definido, o horário agendado precisa cair dentro dele;
// - entrega desligada hoje: entrega só com agendamento para outro dia.

export type MotivoFechado = "FECHADO_MANUAL" | "FORA_DO_HORARIO";

export type DadosFuncionamento = {
  horarioAbertura: string | null;
  horarioFechamento: string | null;
  estabelecimentoFechado: boolean;
  entregaSuspensaEm: string | null;
};

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

/** Sem horário definido, está sempre dentro. O fechamento é exclusivo (às 18:00 em ponto já fechou). */
export function dentroDoHorario(config: DadosFuncionamento, data: Date): boolean {
  if (!config.horarioAbertura || !config.horarioFechamento) return true;

  const abertura = paraMinutos(config.horarioAbertura);
  const fechamento = paraMinutos(config.horarioFechamento);
  const agora = minutosNoDiaEmBrasilia(data);

  return abertura < fechamento
    ? agora >= abertura && agora < fechamento
    : agora >= abertura || agora < fechamento; // passa da meia-noite
}

/** A entrega só fica desligada no dia marcado; em qualquer outro dia está disponível. */
export const entregaDisponivelNoDia = (config: DadosFuncionamento, data: Date) =>
  config.entregaSuspensaEm !== diaEmBrasilia(data);

export function situacao(config: DadosFuncionamento, agora: Date) {
  const motivoFechado: MotivoFechado | null = config.estabelecimentoFechado
    ? "FECHADO_MANUAL"
    : dentroDoHorario(config, agora)
      ? null
      : "FORA_DO_HORARIO";

  return {
    horarioAbertura: config.horarioAbertura,
    horarioFechamento: config.horarioFechamento,
    estabelecimentoFechado: config.estabelecimentoFechado,
    aberto: motivoFechado === null,
    motivoFechado,
    entregaHoje: entregaDisponivelNoDia(config, agora),
  };
}

const textoHorario = (config: DadosFuncionamento) =>
  `${config.horarioAbertura} às ${config.horarioFechamento}`;

/** Lança RegraDeNegocioError (400) se o pedido não puder ser feito agora. */
export function validarPedidoNoFuncionamento(
  config: DadosFuncionamento,
  pedido: { tipoEntrega: TipoEntrega; horarioAgendado: Date | null },
  agora: Date,
) {
  if (config.estabelecimentoFechado) {
    throw new RegraDeNegocioError("Estamos fechados no momento e não estamos aceitando pedidos. Tente novamente mais tarde.");
  }

  const { horarioAgendado, tipoEntrega } = pedido;

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
}) {
  await prisma.configuracao.update({
    where: { id: 1 },
    data: {
      horarioAbertura: dados.horarioAbertura,
      horarioFechamento: dados.horarioFechamento,
      estabelecimentoFechado: dados.estabelecimentoFechado,
      entregaSuspensaEm: dados.entregaHoje ? null : diaEmBrasilia(new Date()),
    },
  });
  return obterFuncionamento();
}
