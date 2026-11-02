import { useState } from 'react'
import { Check, Pencil, Plus, X } from 'lucide-react'
import { FormStatus } from '@/components/form-status'
import { ErrorState, LoadingState } from '@/components/state-views'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFetch } from '@/hooks/use-fetch'
import { api } from '@/lib/api'
import type { SaborAdmin } from '@/types/types'

function FlavorRow({
  sabor,
  onChange,
  onError,
}: {
  sabor: SaborAdmin
  onChange: (s: SaborAdmin) => void
  onError: (msg: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [nome, setNome] = useState(sabor.nome)
  const [busy, setBusy] = useState(false)

  async function save(dados: { nome?: string; ativo?: boolean }) {
    setBusy(true)
    onError('')
    try {
      onChange(await api.atualizarSabor(sabor.id, dados))
      setEditing(false)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  function submitName(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nome.trim()
    if (trimmed.length < 2) return onError('O nome precisa ter ao menos 2 caracteres.')
    if (trimmed === sabor.nome) return setEditing(false)
    void save({ nome: trimmed })
  }

  return (
    <li className="flavor-admin__row" data-active={sabor.ativo}>
      {editing ? (
        <form onSubmit={submitName} className="flavor-admin__edit">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} aria-label="Nome do sabor" autoFocus />
          <Button type="submit" size="icon" disabled={busy} aria-label="Salvar nome"><Check /></Button>
          <Button type="button" size="icon" variant="outline" aria-label="Cancelar" onClick={() => { setNome(sabor.nome); setEditing(false) }}>
            <X />
          </Button>
        </form>
      ) : (
        <>
          <span className="flavor-admin__name">
            {sabor.nome}
            {!sabor.ativo && <Badge variant="secondary">Desativado</Badge>}
          </span>
          <div className="flavor-admin__actions">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil /> Renomear</Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => save({ ativo: !sabor.ativo })}>
              {sabor.ativo ? 'Desativar' : 'Ativar'}
            </Button>
          </div>
        </>
      )}
    </li>
  )
}

export default function FlavorsPage() {
  const sabores = useFetch(api.saboresAdmin, [])
  const [novo, setNovo] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const nome = novo.trim()
    if (nome.length < 2) return setError('O nome precisa ter ao menos 2 caracteres.')
    setAdding(true)
    setError('')
    setCreated(false)
    try {
      const criado = await api.criarSabor(nome)
      sabores.mutate((lista) => [...lista, criado])
      setNovo('')
      setCreated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o sabor.')
    } finally {
      setAdding(false)
    }
  }

  const lista = sabores.data ?? []
  const ativos = lista.filter((s) => s.ativo).length

  return (
    <div className="admin-content max-w-3xl">
      <div className="page-head">
        <div>
          <h2 className="page-head__title">Sabores</h2>
          <p className="page-head__text">
            Sabores desativados deixam de aparecer para o cliente, mas continuam nos pedidos antigos. Eles não podem ser apagados.
          </p>
        </div>
      </div>

      <form onSubmit={add} className="section">
        <h3 className="section__title mb-3">Novo sabor</h3>
        <div className="flavor-add">
          <Input value={novo} onChange={(e) => { setNovo(e.target.value); setCreated(false) }} maxLength={80} placeholder="Ex.: Empada de frango" aria-label="Nome do novo sabor" />
          <Button type="submit" disabled={adding}><Plus /> Adicionar</Button>
        </div>
        <div className="form-actions mt-3"><FormStatus error={error} saved={created} /></div>
      </form>

      {sabores.loading && !sabores.data ? (
        <LoadingState label="Carregando sabores..." />
      ) : !sabores.data ? (
        <ErrorState error={sabores.error} onRetry={sabores.reload} title="Não conseguimos carregar os sabores" />
      ) : (
        <section aria-label="Lista de sabores" className="stack">
          <p className="text-sm text-muted-foreground">{ativos} ativos de {lista.length}.</p>
          <ul className="flavor-admin">
            {lista.map((s) => (
              <FlavorRow
                key={s.id}
                sabor={s}
                onError={(m) => { setError(m); setCreated(false) }}
                onChange={(atualizado) => {
                  setError('')
                  sabores.mutate((l) => l.map((x) => (x.id === atualizado.id ? atualizado : x)))
                }}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
