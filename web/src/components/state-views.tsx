import { Loader2, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="state-box" role="status">
      <Loader2 className="spinner" />
      <p>{label}</p>
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
  title = 'Algo deu errado',
  children,
}: {
  error?: Error
  onRetry?: () => void
  title?: string
  children?: ReactNode
}) {
  return (
    <div className="state-box" role="alert">
      <TriangleAlert className="size-8 text-destructive" />
      <p className="state-box__title">{title}</p>
      <p>{error?.message ?? 'Não foi possível carregar os dados.'}</p>
      {children}
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
