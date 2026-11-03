import type { Marca } from '@/types/types'

export type ModoLogo = 'claro' | 'escuro'

/** Uma opção de exibição da marca: em qual tema aparece e qual imagem usa (null = ícone e nome). */
export interface VarianteLogo {
  aparece: 'claro' | 'escuro' | 'sempre'
  imagem: { modo: ModoLogo; versao: number } | null
}

/**
 * Decide o que mostrar no lugar do nome da marca.
 * - 'auto' (padrão): troca com o tema. Sem logo escura, a logo normal serve nos dois temas;
 *   só com a logo escura, o tema claro mostra o ícone e o nome.
 * - 'escuro' (barra lateral, que tem fundo sempre escuro): usa a logo escura, ou a normal se não houver.
 */
export function variantesDaLogo(marca: Pick<Marca, 'logoVersao' | 'logoEscuraVersao'>, tema: 'auto' | 'escuro' = 'auto'): VarianteLogo[] {
  const claro = marca.logoVersao ?? null
  const escuro = marca.logoEscuraVersao ?? null

  if (tema === 'escuro') {
    if (escuro) return [{ aparece: 'sempre', imagem: { modo: 'escuro', versao: escuro } }]
    if (claro) return [{ aparece: 'sempre', imagem: { modo: 'claro', versao: claro } }]
    return [{ aparece: 'sempre', imagem: null }]
  }

  if (claro && escuro) {
    return [
      { aparece: 'claro', imagem: { modo: 'claro', versao: claro } },
      { aparece: 'escuro', imagem: { modo: 'escuro', versao: escuro } },
    ]
  }
  if (claro) return [{ aparece: 'sempre', imagem: { modo: 'claro', versao: claro } }]
  if (escuro) {
    return [
      { aparece: 'claro', imagem: null },
      { aparece: 'escuro', imagem: { modo: 'escuro', versao: escuro } },
    ]
  }
  return [{ aparece: 'sempre', imagem: null }]
}
