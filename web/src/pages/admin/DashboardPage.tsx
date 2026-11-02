import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChefHat, ClipboardList, Clock, DollarSign, Eye, Hourglass, MapPin, Phone, Store } from 'lucide-react'
import { ErrorState, LoadingState } from '@/components/state-views'
import { StatusBadge } from '@/components/status-badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useStatusUpdate } from '@/hooks/use-status-update'
import { useFetch } from '@/hooks/use-fetch'
import { api } from '@/lib/api'
import { allStatuses, formatDateTime, formatPhone, formatPrice, formatTime, nextStatus, paymentLabels, QUANDO_PRONTO, statusLabels, tipoLabels, todayISO } from '@/lib/format'
import type { PedidoAdmin, StatusPedido } from '@/types/types'

function OrderCard({
  pedido,
  busy,
  onAdvance,
}: {
  pedido: PedidoAdmin
  busy: boolean
  onAdvance: (status: StatusPedido) => void
}) {
  const next = nextStatus(pedido)
  return (
    <li>
      <article className="order-card">
        <div className="order-card__head">
          <div>
            <p className="order-card__title">{pedido.nomeCliente}</p>
            <p className="order-card__meta">
              {pedido.codigo} · {formatTime(pedido.criadoEm)} · {tipoLabels[pedido.tipoEntrega]} · {paymentLabels[pedido.formaPagamento]}
            </p>
          </div>
          <StatusBadge status={pedido.status} />
        </div>
        <ul className="order-card__items">
          {pedido.itens.map((i) => (
            <li key={i.sabor}>
              <span>{i.quantidade}× {i.sabor}</span>
            </li>
          ))}
        </ul>
        <div className="order-card__info">
          {pedido.tipoEntrega === 'ENTREGA' ? <p><MapPin /> {pedido.endereco}</p> : <p><Store /> Retirada no local</p>}
          <p>
            <Clock />
            {pedido.horarioAgendado
              ? formatDateTime(pedido.horarioAgendado)
              : pedido.previsaoEm
                ? `${QUANDO_PRONTO} · previsão ${formatTime(pedido.previsaoEm)}`
                : `${QUANDO_PRONTO} · defina o tempo de preparo`}
          </p>
          <p><Phone /> {formatPhone(pedido.telefone)}</p>
        </div>
        <div className="order-card__foot">
          <span className="order-card__total">{formatPrice(pedido.total)}</span>
          <div className="order-card__actions">
            <Link to={`/admin/pedidos/${pedido.codigo}`} className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'h-8' })}>
              <Eye /> Visualizar
            </Link>
            {next && (
              <Button size="sm" className="h-8" disabled={busy} onClick={() => onAdvance(next)}>
                {busy ? 'Salvando...' : `Marcar: ${statusLabels[next]}`}
              </Button>
            )}
          </div>
        </div>
      </article>
    </li>
  )
}

export default function DashboardPage() {
  const [dia, setDia] = useState(todayISO())
  const [filtro, setFiltro] = useState<StatusPedido | 'todos'>('todos')

  const pedidos = useFetch(() => api.pedidosAdmin(dia ? { de: dia, ate: dia } : {}), [dia], 30_000)
  const { update, busy, error } = useStatusUpdate((atualizado) =>
    pedidos.mutate((lista) => lista.map((p) => (p.codigo === atualizado.codigo ? atualizado : p))),
  )

  const lista = pedidos.data ?? []
  const count = (s: StatusPedido) => lista.filter((p) => p.status === s).length
  const faturamento = lista.filter((p) => p.status === 'FINALIZADO').reduce((sum, p) => sum + parseFloat(p.total), 0)
  const kpis = [
    { label: dia ? 'Pedidos do dia' : 'Pedidos', value: String(lista.length), icon: ClipboardList },
    { label: 'Aguardando pagamento', value: String(count('AGUARDANDO_PAGAMENTO')), icon: Hourglass },
    { label: 'Em produção', value: String(count('EM_PRODUCAO')), icon: ChefHat },
    { label: 'Faturamento (finalizados)', value: formatPrice(faturamento), icon: DollarSign },
  ]
  const visiveis = lista.filter((p) => filtro === 'todos' || p.status === filtro)

  return (
    <div className="admin-content">
      <section className="kpi-grid" aria-label="Resumo">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="kpi">
            <div className="min-w-0">
              <p className="kpi__label">{label}</p>
              <p className="kpi__value">{value}</p>
            </div>
            <span className="kpi__icon"><Icon className="size-4" /></span>
          </div>
        ))}
      </section>

      <section aria-label="Pedidos" className="stack">
        <div className="toolbar">
          <h2 className="toolbar__title">Pedidos</h2>
          <div className="toolbar__date">
            <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} aria-label="Dia" className="w-auto" />
            <button className="chip" aria-pressed={dia === ''} onClick={() => setDia(dia === '' ? todayISO() : '')}>
              Todos os dias
            </button>
          </div>
        </div>

        <div className="chip-row chip-row--scroll">
          {(['todos', ...allStatuses] as const).map((f) => (
            <button key={f} className="chip" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
              {f === 'todos' ? 'Todos' : statusLabels[f]}
            </button>
          ))}
        </div>

        {error && <p role="alert" className="alert alert--error">{error}</p>}

        {pedidos.loading && !pedidos.data ? (
          <LoadingState label="Carregando pedidos..." />
        ) : !pedidos.data ? (
          <ErrorState error={pedidos.error} onRetry={pedidos.reload} title="Não conseguimos carregar os pedidos" />
        ) : visiveis.length === 0 ? (
          <div className="state-box">Nenhum pedido {filtro === 'todos' ? 'neste período' : 'neste status'}.</div>
        ) : (
          <ul className="order-grid">
            {visiveis.map((p) => (
              <OrderCard key={p.codigo} pedido={p} busy={busy === p.codigo} onAdvance={(s) => update(p.codigo, s)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
