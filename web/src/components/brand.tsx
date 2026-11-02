import { UtensilsCrossed } from 'lucide-react'
import { Link } from 'react-router-dom'

export const BRAND_NAME = 'Sabor de Mãe'

export function Brand({ to = '/pedido', showName = true }: { to?: string; showName?: boolean }) {
  return (
    <Link to={to} className="brand">
      <span className="brand__logo">
        <UtensilsCrossed className="size-5" />
      </span>
      {showName && <span className="brand__name">{BRAND_NAME}</span>}
    </Link>
  )
}
