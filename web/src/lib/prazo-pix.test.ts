import { describe, expect, it } from 'vitest'
import { MENSAGEM_PIX_IMEDIATO, previaPrazoPix, textoPrazoPix } from '@/lib/prazo-pix'

const antecedencia = { ateLimiteHoras: 2, acimaLimiteHoras: 4, limiteUnidades: 100 }
const agora = new Date('2026-11-02T12:00:00-03:00')
const em = (iso: string) => new Date(iso)

describe('previaPrazoPix', () => {
  it('sem horário ou para hoje: pagar no ato do pedido', () => {
    expect(previaPrazoPix(null, 50, antecedencia, agora).imediato).toBe(true)
    expect(previaPrazoPix(em('2026-11-02T18:00:00-03:00'), 50, antecedencia, agora).imediato).toBe(true)
  })

  it('dia seguinte: 2 horas antes até 100 unidades e 4 horas acima disso', () => {
    const horario = em('2026-11-03T10:00:00-03:00')

    const pequeno = previaPrazoPix(horario, 100, antecedencia, agora)
    const grande = previaPrazoPix(horario, 110, antecedencia, agora)

    expect(pequeno).toMatchObject({ imediato: false, horasAntecedencia: 2 })
    expect(new Date(pequeno.pagarAte!).toISOString()).toBe(em('2026-11-03T08:00:00-03:00').toISOString())
    expect(grande).toMatchObject({ imediato: false, horasAntecedencia: 4 })
  })

  it('usa o fuso de Brasília: 22h de hoje e 08h de amanhã não são o mesmo dia', () => {
    const noite = em('2026-11-02T22:00:00-03:00')
    expect(previaPrazoPix(em('2026-11-03T08:00:00-03:00'), 50, antecedencia, noite).imediato).toBe(false)
  })
})

describe('textoPrazoPix', () => {
  it('mostra a mensagem de pagamento imediato ou o prazo com as horas', () => {
    expect(textoPrazoPix({ imediato: true, horasAntecedencia: null, pagarAte: null }, String)).toBe(MENSAGEM_PIX_IMEDIATO)

    const texto = textoPrazoPix({ imediato: false, horasAntecedencia: 4, pagarAte: '2026-11-03T06:00:00-03:00' }, () => '03/11 06:00')
    expect(texto).toContain('4 horas de antecedência')
    expect(texto).toContain('03/11 06:00')
  })
})
