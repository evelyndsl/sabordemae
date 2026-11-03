import type { Funcionamento, TipoEntrega } from '@/types/types'

// Espelha as regras da API (api/src/services/funcionamento.ts) só para avisar o cliente antes de enviar.
// Quem decide é sempre a API. Tudo no horário de Brasília.

type Horario = Pick<Funcionamento, 'horarioAbertura' | 'horarioFechamento'>

const formatadorDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const formatadorHora = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** Dia (AAAA-MM-DD) no horário de Brasília. */
export const diaEmBrasilia = (data: Date) => formatadorDia.format(data)

const paraMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Minutos desde a meia-noite, no horário de Brasília. */
export function minutosEmBrasilia(data: Date) {
  const partes = formatadorHora.formatToParts(data)
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0)
  return valor('hour') * 60 + valor('minute')
}

/** Sem horário definido, nunca restringe. O fechamento é exclusivo. */
export function dentroDoHorario(f: Horario, data: Date) {
  if (!f.horarioAbertura || !f.horarioFechamento) return true
  const abertura = paraMinutos(f.horarioAbertura)
  const fechamento = paraMinutos(f.horarioFechamento)
  const agora = minutosEmBrasilia(data)
  return abertura < fechamento ? agora >= abertura && agora < fechamento : agora >= abertura || agora < fechamento
}

/** "08:00" -> "8h", "18:30" -> "18h30". */
export function formatarHora(hhmm: string) {
  const [h, m] = hhmm.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

/** "das 8h às 18h", ou null quando não há horário definido. */
export function textoHorario(f: Horario) {
  if (!f.horarioAbertura || !f.horarioFechamento) return null
  return `das ${formatarHora(f.horarioAbertura)} às ${formatarHora(f.horarioFechamento)}`
}

/** Mensagem de erro para um pedido agendado (undefined = tudo certo). */
export function erroDeAgendamento(f: Funcionamento, tipo: TipoEntrega | null, horario: Date, agora = new Date()) {
  if (!dentroDoHorario(f, horario)) return `Escolha um horário dentro do atendimento (${textoHorario(f)}).`
  if (tipo === 'ENTREGA' && !f.entregaHoje && diaEmBrasilia(horario) === diaEmBrasilia(agora)) {
    return 'Hoje não estamos fazendo entregas. Escolha outro dia ou a retirada.'
  }
  return undefined
}
