import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="grid min-h-svh place-items-center px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <p className="text-6xl font-bold text-accent">404</p>
        <h1 className="text-xl font-semibold">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">O endereço que você tentou acessar não existe.</p>
        <Link to="/pedido" className={buttonVariants()}>Ir para o pedido</Link>
      </div>
    </div>
  )
}
