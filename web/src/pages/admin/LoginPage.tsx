import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Brand } from '@/components/brand'
import { useBrand } from '@/context/brand'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth'

export default function LoginPage() {
  const { marca } = useBrand()
  const { isAdmin, login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAdmin) return <Navigate to="/admin/dashboard" replace />

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError('')
    setLoading(true)
    try {
      await login(String(form.get('usuario') ?? '').trim(), String(form.get('senha') ?? ''))
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="login-card">
        <div className="login-card__head">
          <Brand to="/pedido" showName={false} />
          <h1 className="login-card__title">Área do lojista</h1>
          <p className="login-card__text">{marca.nome} · entre para acompanhar os pedidos.</p>
        </div>
        <form onSubmit={submit} className="stack">
          <div className="field">
            <Label htmlFor="usuario">Usuário</Label>
            <Input id="usuario" name="usuario" autoComplete="username" required />
          </div>
          <div className="field">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
          </div>
          {error && <p role="alert" className="alert alert--error">{error}</p>}
          <Button type="submit" className="h-10" disabled={loading}>
            <Lock /> {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
