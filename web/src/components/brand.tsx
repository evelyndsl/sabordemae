import { UtensilsCrossed } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBrand } from '@/context/brand'
import { logoUrl } from '@/lib/api'

// Com logo cadastrada, ela substitui o ícone e o nome; sem logo, mostra o ícone e o nome da marca.
export function Brand({ to = '/pedido', showName = true }: { to?: string; showName?: boolean }) {
  const { marca } = useBrand()

  return (
    <Link to={to} className="brand" aria-label={marca.nome}>
      {marca.logoVersao ? (
        <img src={logoUrl(marca.logoVersao)} alt={marca.nome} className="brand__image" />
      ) : (
        <>
          <span className="brand__logo">
            <UtensilsCrossed className="size-5" />
          </span>
          {showName && <span className="brand__name">{marca.nome}</span>}
        </>
      )}
    </Link>
  )
}
