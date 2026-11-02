import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Clock, Minus, Plus, Search, ShoppingBag, Store, Truck } from 'lucide-react'
import { ErrorState, LoadingState } from '@/components/state-views'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFetch } from '@/hooks/use-fetch'
import { ApiError, api } from '@/lib/api'
import { formatDateTime, formatPhone, formatPrice, paymentLabels, QUANDO_PRONTO, toLocalInputValue } from '@/lib/format'
import { calcularPreco, quantidadeValida } from '@/lib/preco'
import { previaPrazoPix, textoPrazoPix } from '@/lib/prazo-pix'
import { cn } from '@/lib/utils'
import { BRAND_NAME } from '@/components/brand'
import type { Catalogo, CriarPedidoBody, FormaPagamento, TipoEntrega } from '@/types/types'

type Erros = Record<string, string>

const QUICK_QUANTITIES = [10, 20, 30, 50, 100, 200]

const paymentDescriptions: Record<FormaPagamento, string> = {
  DINHEIRO: 'Pague na entrega ou na retirada.',
  CARTAO: 'Débito ou crédito, na entrega ou na retirada.',
  PIX: 'Copie a chave e pague pelo seu banco.',
}

function TrackOrder() {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const c = codigo.trim().toUpperCase()
    if (c.length === 8) navigate(`/pedido/${c}`)
  }

  return (
    <form onSubmit={submit} className="hero__track">
      <Input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        maxLength={8}
        placeholder="Código do pedido"
        aria-label="Código do pedido"
        className="bg-background uppercase"
      />
      <Button type="submit" variant="outline" disabled={codigo.trim().length !== 8}>
        <Search /> Acompanhar
      </Button>
    </form>
  )
}

function OrderForm({ catalogo }: { catalogo: Catalogo }) {
  const { sabores, valores, tempo, taxas, pix } = catalogo
  const navigate = useNavigate()

  const [qtdText, setQtdText] = useState('50')
  const [escolherSabores, setEscolherSabores] = useState(false)
  const [selecao, setSelecao] = useState<Record<number, number>>({})
  const [tipo, setTipo] = useState<TipoEntrega>('ENTREGA')
  const [endereco, setEndereco] = useState('')
  const [quando, setQuando] = useState<'pronto' | 'agendar'>('pronto')
  const [horario, setHorario] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [pagamento, setPagamento] = useState<FormaPagamento>('DINHEIRO')
  const [erros, setErros] = useState<Erros>({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const qtd = Number(qtdText)
  const qtdOk = quantidadeValida(qtd, valores)
  const somaSabores = Object.values(selecao).reduce((a, b) => a + b, 0)
  const restante = qtdOk ? qtd - somaSabores : 0

  const preco = useMemo(
    () => (qtdOk ? calcularPreco(qtd, tipo, valores, taxas) : null),
    [qtd, qtdOk, tipo, valores, taxas],
  )
  const faltaParaGratis = taxas.entregaGratisAPartirDe - (qtdOk ? qtd : 0)

  const formasPagamento = (['DINHEIRO', 'CARTAO', 'PIX'] as FormaPagamento[]).filter((f) => f !== 'PIX' || pix.configurada)

  function bump(delta: number) {
    const base = qtdOk ? qtd : valores.quantidadeMinima
    const next = Math.min(valores.quantidadeMaxima, Math.max(valores.quantidadeMinima, base + delta))
    setQtdText(String(next))
  }

  function changeFlavor(id: number, delta: number) {
    setSelecao((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta)
      const copy = { ...prev, [id]: next }
      if (next === 0) delete copy[id]
      return copy
    })
  }

  function validar(): Erros {
    const e: Erros = {}
    if (!qtdOk) e.quantidade = `Escolha de ${valores.quantidadeMinima} a ${valores.quantidadeMaxima} unidades, de ${valores.passo} em ${valores.passo}.`
    if (escolherSabores && qtdOk && somaSabores !== qtd) {
      e.sabores = `A soma dos sabores (${somaSabores}) deve ser igual a ${qtd}.`
    }
    if (nome.trim().length < 2) e.nomeCliente = 'Informe seu nome.'
    if (!/^\d{10,11}$/.test(telefone.replace(/\D/g, ''))) e.telefone = 'Informe um telefone com DDD.'
    if (tipo === 'ENTREGA' && endereco.trim().length < 5) e.endereco = 'Informe o endereço de entrega.'
    if (quando === 'agendar') {
      if (!horario) e.horarioAgendado = 'Escolha a data e o horário.'
      else if (new Date(horario).getTime() <= Date.now()) e.horarioAgendado = 'O horário escolhido deve ser no futuro.'
    }
    return e
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    setErroGeral('')
    const e = validar()
    setErros(e)
    if (Object.keys(e).length) return

    const body: CriarPedidoBody = {
      nomeCliente: nome.trim(),
      telefone: telefone.replace(/\D/g, ''),
      quantidade: qtd,
      sabores: escolherSabores ? Object.entries(selecao).map(([id, q]) => ({ saborId: Number(id), quantidade: q })) : [],
      tipoEntrega: tipo,
      endereco: tipo === 'ENTREGA' ? endereco.trim() : undefined,
      horarioAgendado: quando === 'agendar' ? new Date(horario).toISOString() : undefined,
      formaPagamento: pagamento,
    }

    setEnviando(true)
    try {
      const pedido = await api.criarPedido(body)
      navigate(`/pedido/${pedido.codigo}`, { state: { novo: true } })
    } catch (err) {
      if (err instanceof ApiError && err.erros.length) {
        const mapped: Erros = {}
        for (const item of err.erros) mapped[item.campo.split('.')[0]] ??= item.mensagem
        setErros(mapped)
      }
      setErroGeral(err instanceof Error ? err.message : 'Não foi possível enviar o pedido.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="page-columns">
      <div className="stack">
        {/* 1. Quantidade */}
        <section className="section">
          <h2 className="section__title"><span className="section__step">1</span> Quantas unidades?</h2>
          <p className="section__hint">Mini salgados em múltiplos de {valores.passo}. Quanto maior o pedido, menor o preço por unidade.</p>
          <div className="qty">
            <Button type="button" variant="outline" size="icon-lg" aria-label={`Diminuir ${valores.passo} unidades`} onClick={() => bump(-valores.passo)}>
              <Minus />
            </Button>
            <Input
              inputMode="numeric"
              value={qtdText}
              onChange={(e) => setQtdText(e.target.value.replace(/\D/g, ''))}
              aria-label="Quantidade de unidades"
              aria-invalid={!!erros.quantidade || (qtdText !== '' && !qtdOk)}
              className="qty__input"
            />
            <Button type="button" variant="outline" size="icon-lg" aria-label={`Aumentar ${valores.passo} unidades`} onClick={() => bump(valores.passo)}>
              <Plus />
            </Button>
            <span className="qty__unit">unidades</span>
          </div>
          <div className="chip-row mt-3">
            {QUICK_QUANTITIES.filter((q) => q >= valores.quantidadeMinima && q <= valores.quantidadeMaxima).map((q) => (
              <button key={q} type="button" className="chip" aria-pressed={qtdOk && qtd === q} onClick={() => setQtdText(String(q))}>
                {q}
              </button>
            ))}
          </div>
          {(erros.quantidade || (qtdText !== '' && !qtdOk)) && (
            <p className="field__error mt-2">
              Escolha de {valores.quantidadeMinima} a {valores.quantidadeMaxima} unidades, de {valores.passo} em {valores.passo}.
            </p>
          )}
        </section>

        {/* 2. Sabores */}
        <section className="section">
          <h2 className="section__title"><span className="section__step">2</span> Sabores</h2>
          <p className="section__hint">Deixe misto ou escolha quantos de cada sabor.</p>
          <div className="option-grid">
            <button type="button" className="option" aria-pressed={!escolherSabores} onClick={() => setEscolherSabores(false)}>
              <span className="option__title">Misto</span>
              <span className="option__desc">A gente monta uma variedade para você.</span>
            </button>
            <button type="button" className="option" aria-pressed={escolherSabores} onClick={() => setEscolherSabores(true)}>
              <span className="option__title">Escolher sabores</span>
              <span className="option__desc">Defina a quantidade de cada um.</span>
            </button>
          </div>

          {escolherSabores && (
            <>
              <ul className="flavor-list">
                {sabores.map((s) => {
                  const q = selecao[s.id] ?? 0
                  return (
                    <li key={s.id} className="flavor" data-active={q > 0}>
                      <span className="flavor__name">{s.nome}</span>
                      <div className="flavor__controls">
                        <Button type="button" variant="outline" size="icon-sm" aria-label={`Menos ${s.nome}`} disabled={q === 0} onClick={() => changeFlavor(s.id, -1)}>
                          <Minus />
                        </Button>
                        <span className="flavor__count">{q}</span>
                        <Button type="button" variant="outline" size="icon-sm" aria-label={`Mais ${s.nome}`} disabled={qtdOk && restante <= 0} onClick={() => changeFlavor(s.id, 1)}>
                          <Plus />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="flavor-progress" data-state={!qtdOk ? undefined : restante === 0 ? 'ok' : restante < 0 ? 'over' : undefined}>
                {!qtdOk
                  ? 'Defina a quantidade primeiro.'
                  : restante === 0
                    ? `Tudo certo: ${qtd} de ${qtd} unidades.`
                    : restante > 0
                      ? `Faltam ${restante} unidades para completar ${qtd}.`
                      : `Você passou ${-restante} unidades do total de ${qtd}.`}
              </p>
              {erros.sabores && <p className="field__error mt-1">{erros.sabores}</p>}
            </>
          )}
        </section>

        {/* 3. Entrega ou retirada */}
        <section className="section">
          <h2 className="section__title"><span className="section__step">3</span> Entrega ou retirada</h2>
          <div className="option-grid">
            <button type="button" className="option" aria-pressed={tipo === 'ENTREGA'} onClick={() => setTipo('ENTREGA')}>
              <span className="option__title"><Truck className="size-4" /> Entrega</span>
              <span className="option__desc">
                {taxas.entregaGratisAPartirDe}+ unidades: grátis. Até 49: {formatPrice(taxas.taxaAte49)}. De 50 a {taxas.entregaGratisAPartirDe - 1}: {formatPrice(taxas.taxaDe50a199)}.
              </span>
            </button>
            <button type="button" className="option" aria-pressed={tipo === 'RETIRADA'} onClick={() => setTipo('RETIRADA')}>
              <span className="option__title"><Store className="size-4" /> Retirada no local</span>
              <span className="option__desc">Sem taxa. Você busca com a gente.</span>
            </button>
          </div>
          {tipo === 'ENTREGA' && (
            <div className="field mt-4">
              <Label htmlFor="endereco">Endereço de entrega</Label>
              <Input id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} autoComplete="street-address" placeholder="Rua, número, bairro" aria-invalid={!!erros.endereco} />
              {erros.endereco && <p className="field__error">{erros.endereco}</p>}
            </div>
          )}

          <h3 className="mt-5 mb-2 text-sm font-medium">{tipo === 'ENTREGA' ? 'Entregar' : 'Retirar'} quando?</h3>
          <div className="option-grid">
            <button type="button" className="option" aria-pressed={quando === 'pronto'} onClick={() => setQuando('pronto')}>
              <span className="option__title"><Clock className="size-4" /> {QUANDO_PRONTO}</span>
              <span className="option__desc">Para quando finalizar o preparo ({tempo.minimoMin} a {tempo.maximoMin} min).</span>
            </button>
            <button type="button" className="option" aria-pressed={quando === 'agendar'} onClick={() => setQuando('agendar')}>
              <span className="option__title"><CalendarClock className="size-4" /> Data e hora específicas</span>
              <span className="option__desc">Escolha o dia e o horário.</span>
            </button>
          </div>
          {quando === 'agendar' && (
            <div className="field mt-3">
              <Label htmlFor="horario">Data e horário</Label>
              <Input id="horario" type="datetime-local" value={horario} min={toLocalInputValue(new Date())} onChange={(e) => setHorario(e.target.value)} aria-invalid={!!erros.horarioAgendado} />
              {erros.horarioAgendado && <p className="field__error">{erros.horarioAgendado}</p>}
            </div>
          )}
        </section>

        {/* 4. Dados */}
        <section className="section">
          <h2 className="section__title"><span className="section__step">4</span> Seus dados</h2>
          <div className="stack mt-3">
            <div className="field">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" aria-invalid={!!erros.nomeCliente} />
              {erros.nomeCliente && <p className="field__error">{erros.nomeCliente}</p>}
            </div>
            <div className="field">
              <Label htmlFor="telefone">Telefone / WhatsApp</Label>
              <Input id="telefone" type="tel" inputMode="tel" value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))} autoComplete="tel" placeholder="(11) 99999-9999" aria-invalid={!!erros.telefone} />
              {erros.telefone && <p className="field__error">{erros.telefone}</p>}
            </div>
          </div>
        </section>

        {/* 5. Pagamento */}
        <section className="section">
          <h2 className="section__title"><span className="section__step">5</span> Pagamento</h2>
          <div className={cn('option-grid mt-3', formasPagamento.length === 3 && 'option-grid--3')}>
            {formasPagamento.map((f) => (
              <button key={f} type="button" className="option" aria-pressed={pagamento === f} onClick={() => setPagamento(f)}>
                <span className="option__title">{paymentLabels[f]}</span>
                <span className="option__desc">{paymentDescriptions[f]}</span>
              </button>
            ))}
          </div>
          {pagamento === 'PIX' && (
            <div className="alert alert--info mt-3 grid gap-1">
              <p>Depois de enviar o pedido você verá a chave Pix para copiar, o valor e o botão para enviar o comprovante por WhatsApp.</p>
              <p className="font-medium">
                {textoPrazoPix(
                  previaPrazoPix(quando === 'agendar' && horario ? new Date(horario) : null, qtdOk ? qtd : 0, pix.antecedencia),
                  formatDateTime,
                )}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Resumo */}
      <aside className="summary">
        <h2 className="summary__title"><ShoppingBag className="size-5" /> Resumo do pedido</h2>
        <dl className="summary__rows">
          <div className="summary__row">
            <dt>Unidades</dt>
            <dd>{qtdOk ? `${qtd} (${escolherSabores ? `${Object.keys(selecao).length} sabores` : 'misto'})` : '—'}</dd>
          </div>
          <div className="summary__row">
            <dt>Subtotal</dt>
            <dd>{preco ? formatPrice(preco.subtotal) : '—'}</dd>
          </div>
          <div className="summary__row">
            <dt>{tipo === 'ENTREGA' ? 'Entrega' : 'Retirada'}</dt>
            <dd>{!preco ? '—' : preco.taxa === 0 ? 'Grátis' : formatPrice(preco.taxa)}</dd>
          </div>
          <div className="summary__row summary__row--total">
            <dt>Total</dt>
            <dd>{preco ? formatPrice(preco.total) : '—'}</dd>
          </div>
        </dl>
        {tipo === 'ENTREGA' && qtdOk && faltaParaGratis > 0 && (
          <p className="summary__note">Faltam {faltaParaGratis} unidades para a entrega ser grátis.</p>
        )}
        <p className="summary__note flex items-center gap-1.5">
          <Clock className="size-3.5" /> Preparo em {tempo.minimoMin} a {tempo.maximoMin} min.
        </p>
        {erroGeral && <p role="alert" className="alert alert--error mb-3">{erroGeral}</p>}
        <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={enviando}>
          {enviando ? 'Enviando...' : `Fazer pedido${preco ? ` · ${formatPrice(preco.total)}` : ''}`}
        </Button>
        <p className="summary__note mt-2 text-center">O valor final é confirmado pelo sistema ao enviar.</p>
      </aside>
    </form>
  )
}

export default function OrderPage() {
  const catalogo = useFetch(api.catalogo, [])

  return (
    <>
      <SiteHeader />
      <main className="page">
        <section className="hero">
          <p className="hero__eyebrow">
            <Clock className="size-4" />
            {catalogo.data ? `Preparo em ${catalogo.data.tempo.minimoMin} a ${catalogo.data.tempo.maximoMin} min` : 'Mini salgados feitos com carinho'}
          </p>
          <h1 className="hero__title">{BRAND_NAME}: salgadinhos para qualquer festa</h1>
          <p className="hero__text">Escolha a quantidade, os sabores e como quer receber. A gente cuida do resto.</p>
          <TrackOrder />
        </section>

        {catalogo.loading && !catalogo.data ? (
          <LoadingState label="Carregando cardápio..." />
        ) : catalogo.data ? (
          <OrderForm catalogo={catalogo.data} />
        ) : (
          <ErrorState error={catalogo.error} onRetry={catalogo.reload} title="Não conseguimos abrir o cardápio" />
        )}
      </main>
    </>
  )
}
