import { UtensilsCrossed } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBrand } from '@/context/brand'
import { logoUrl } from '@/lib/api'
import { variantesDaLogo } from '@/lib/logo'

// Com logo cadastrada, ela substitui o ícone e o nome; sem logo, mostra o ícone e o nome da marca.
// A troca entre a logo clara e a escura é feita por CSS (classe .dark do <html>), sem piscar.
// tema="escuro": para fundos sempre escuros (barra lateral do admin), usa a logo escura e centraliza.
export function Brand({ to = '/pedido', showName = true, tema = 'auto' }: { to?: string; showName?: boolean; tema?: 'auto' | 'escuro' }) {
  const { marca } = useBrand()
  const variantes = variantesDaLogo(marca, tema)
  const comLogo = variantes.some((v) => v.imagem)

  return (
    <Link to={to} className="brand" data-logo={comLogo} aria-label={marca.nome}>
      {variantes.map(({ aparece, imagem }) => (
        <span key={aparece} className="brand__variante" data-aparece={aparece}>
          {imagem ? (
            <img src={logoUrl(imagem.versao, imagem.modo)} alt={marca.nome} className="brand__image" />
          ) : (
            <>
              <span className="brand__logo">
                <UtensilsCrossed className="size-5" />
              </span>
              {showName && <span className="brand__name">{marca.nome}</span>}
            </>
          )}
        </span>
      ))}
    </Link>
  )
}
