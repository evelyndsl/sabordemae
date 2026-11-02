import type { FormaPagamento, StatusPedido, TipoEntrega } from '@/types/types'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatPrice = (value: number | string) => brl.format(typeof value === 'string' ? parseFloat(value) : value)

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// Data local no formato AAAA-MM-DD (o que a API espera em ?de= e ?ate=).
export function todayISO() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Valor para <input type="datetime-local"> (horário local, sem fuso).
export function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatPhone(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export const statusLabels: Record<StatusPedido, string> = {
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  PAGAMENTO_APROVADO: 'Pagamento aprovado',
  AGUARDANDO: 'Aguardando',
  EM_PRODUCAO: 'Em produção',
  EM_ROTA_ENTREGA: 'Em rota de entrega',
  PRONTO_RETIRADA: 'Pronto para retirada',
  FINALIZADO: 'Finalizado',
}

export const allStatuses = Object.keys(statusLabels) as StatusPedido[]

type PedidoFluxo = { tipoEntrega: TipoEntrega; formaPagamento: FormaPagamento; status: StatusPedido }

// Etapas do pedido (mesmas regras da API):
// - entrega não tem "pronto para retirada" e retirada não tem "em rota";
// - Pix passa por "aguardando pagamento" e "pagamento aprovado" no lugar de "aguardando".
export function statusFlow(pedido: PedidoFluxo): StatusPedido[] {
  const inicio: StatusPedido[] =
    pedido.formaPagamento === 'PIX' ? ['AGUARDANDO_PAGAMENTO', 'PAGAMENTO_APROVADO'] : ['AGUARDANDO']
  const flow: StatusPedido[] = [
    ...inicio,
    'EM_PRODUCAO',
    pedido.tipoEntrega === 'ENTREGA' ? 'EM_ROTA_ENTREGA' : 'PRONTO_RETIRADA',
    'FINALIZADO',
  ]
  // Pedidos antigos podem estar num status que não existe mais no fluxo (ex.: Pix em "aguardando").
  return flow.includes(pedido.status) ? flow : [pedido.status, ...flow]
}

export function nextStatus(pedido: PedidoFluxo): StatusPedido | null {
  const flow = statusFlow(pedido)
  const i = flow.indexOf(pedido.status)
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null
}

// Pedido sem horário agendado ("para quando ficar pronto").
export const QUANDO_PRONTO = 'Assim que ficar pronto'

export const tipoLabels: Record<TipoEntrega, string> = {
  ENTREGA: 'Entrega',
  RETIRADA: 'Retirada',
}

export const paymentLabels: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão',
  PIX: 'Pix',
}

// Valores digitados em reais ("13,50" ou "13.5"). Retorna null se não for um número.
export function parseMoney(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export const hasMaxTwoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6

// "13.00" (API) -> "13,00" (campo de edição)
export const moneyToInput = (v: string) => v.replace('.', ',')

export const tipoPixLabels = {
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  TELEFONE: 'Telefone',
  ALEATORIA: 'Chave aleatória',
} as const

// Itens do pedido: "20 un." ou, quando o cliente só escolheu o sabor, "a dividir" (a loja divide as unidades).
export const formatQtdItem = (quantidade: number | null) => (quantidade === null ? 'a dividir' : `${quantidade} un.`)
export const temItemADividir = (itens: { quantidade: number | null }[]) => itens.some((i) => i.quantidade === null)
