import { TreePalm } from 'lucide-react'
import { textoPeriodo } from '@/lib/funcionamento'
import type { Ferias } from '@/types/types'

// Repetições do texto em cada grupo: o suficiente para encher telas largas.
const REPETICOES = 6

/**
 * Faixa de aviso das férias, rolando na horizontal. São dois grupos iguais, um atrás do outro, para a
 * rolagem não ter emenda. Estilo em styles/components/faixa-ferias.css.
 */
export function FaixaFerias({ ferias, emAndamento }: { ferias: Ferias; emAndamento: boolean }) {
  const texto = `${emAndamento ? 'Estamos de férias! Fechados' : 'Férias à vista! Estaremos fechados'} ${textoPeriodo(ferias)}`

  return (
    <aside className="faixa-ferias" aria-label="Aviso de férias">
      {/* Leitores de tela recebem o aviso uma vez só; a rolagem é apenas visual. */}
      <p className="sr-only">{texto}</p>
      {[0, 1].map((grupo) => (
        <div key={grupo} className="faixa-ferias__grupo" aria-hidden="true">
          {Array.from({ length: REPETICOES }, (_, i) => (
            <span key={i} className="faixa-ferias__item">
              <TreePalm className="size-4 shrink-0" />
              {texto}
            </span>
          ))}
        </div>
      ))}
    </aside>
  )
}
