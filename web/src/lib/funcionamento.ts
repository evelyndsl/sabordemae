import type { Funcionamento, TipoEntrega } from '@/types/types'

// Espelha as regras da API (api/src/services/funcionamento.ts) só para avisar o cliente antes de enviar.
// Quem decide é sempre a API. Tudo no horário de Brasília.

// diasAtendimento ausente = todos os dias.
type Horario = Pick<Funcionamento, 'horarioAbertura' | 'horarioFechamento'> & { diasAtendimento?: number[] }

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

const formatadorDiaSemana = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' })
const NUMERO_DO_DIA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** Dia da semana no horário de Brasília (0 = domingo ... 6 = sábado). */
export const diaDaSemanaEmBrasilia = (data: Date) => NUMERO_DO_DIA[formatadorDiaSemana.format(data)]

export const NOMES_DOS_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const ABREVIACOES = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** "seg a sex", "seg, qua e sex"; null quando atende todos os dias. */
export function textoDias(dias: number[]) {
  const ordenados = [...new Set(dias)].sort((a, b) => a - b)
  if (ordenados.length >= 7) return null
  if (ordenados.length === 0) return 'nenhum dia'
  const grupos: number[][] = []
  for (const d of ordenados) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo[ultimo.length - 1] === d - 1) ultimo.push(d)
    else grupos.push([d])
  }
  const partes = grupos.flatMap((g) => (g.length >= 3 ? [`${ABREVIACOES[g[0]]} a ${ABREVIACOES[g[g.length - 1]]}`] : g.map((d) => ABREVIACOES[d])))
  return partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`
}

/**
 * Dentro do atendimento: o dia precisa estar selecionado e, havendo horário, o momento precisa cair nele.
 * O fechamento é exclusivo. Se passa da meia-noite, a madrugada pertence ao dia em que o atendimento começou.
 */
export function dentroDoHorario(f: Horario, data: Date) {
  const dias = f.diasAtendimento ?? [0, 1, 2, 3, 4, 5, 6]
  const dia = diaDaSemanaEmBrasilia(data)
  if (!f.horarioAbertura || !f.horarioFechamento) return dias.includes(dia)
  const abertura = paraMinutos(f.horarioAbertura)
  const fechamento = paraMinutos(f.horarioFechamento)
  const agora = minutosEmBrasilia(data)
  if (abertura < fechamento) return dias.includes(dia) && agora >= abertura && agora < fechamento
  if (agora >= abertura) return dias.includes(dia)
  if (agora < fechamento) return dias.includes((dia + 6) % 7)
  return false
}

/** "08:00" -> "8h", "18:30" -> "18h30". */
export function formatarHora(hhmm: string) {
  const [h, m] = hhmm.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

/** "das 8h às 18h", "das 8h às 18h, seg a sex" ou "seg a sex"; null quando atende sempre (sem horário, todos os dias). */
export function textoHorario(f: Horario) {
  const horas = f.horarioAbertura && f.horarioFechamento ? `das ${formatarHora(f.horarioAbertura)} às ${formatarHora(f.horarioFechamento)}` : null
  const dias = f.diasAtendimento ? textoDias(f.diasAtendimento) : null
  return [horas, dias].filter(Boolean).join(', ') || null
}

/** Mensagem de erro para um pedido agendado (undefined = tudo certo). */
export function erroDeAgendamento(f: Funcionamento, tipo: TipoEntrega | null, horario: Date, agora = new Date()) {
  if (!dentroDoHorario(f, horario)) return `Escolha um horário dentro do atendimento (${textoHorario(f)}).`
  if (tipo === 'ENTREGA' && !f.entregaHoje && diaEmBrasilia(horario) === diaEmBrasilia(agora)) {
    return 'Hoje não estamos fazendo entregas. Escolha outro dia ou a retirada.'
  }
  return undefined
}
