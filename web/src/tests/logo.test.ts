import { describe, expect, it } from 'vitest'
import { variantesDaLogo } from '@/lib/logo'

const claro = { modo: 'claro', versao: 1 }
const escuro = { modo: 'escuro', versao: 2 }

describe('variantesDaLogo', () => {
  it('sem nenhuma logo mostra ícone e nome sempre', () => {
    expect(variantesDaLogo({ logoVersao: null, logoEscuraVersao: null })).toEqual([{ aparece: 'sempre', imagem: null }])
  })

  it('só a logo normal vale para os dois temas', () => {
    expect(variantesDaLogo({ logoVersao: 1, logoEscuraVersao: null })).toEqual([{ aparece: 'sempre', imagem: claro }])
  })

  it('com as duas logos, cada tema usa a sua', () => {
    expect(variantesDaLogo({ logoVersao: 1, logoEscuraVersao: 2 })).toEqual([
      { aparece: 'claro', imagem: claro },
      { aparece: 'escuro', imagem: escuro },
    ])
  })

  it('só a logo escura: tema claro mostra ícone e nome, tema escuro mostra a logo', () => {
    expect(variantesDaLogo({ logoVersao: null, logoEscuraVersao: 2 })).toEqual([
      { aparece: 'claro', imagem: null },
      { aparece: 'escuro', imagem: escuro },
    ])
  })

  it('cache antigo (sem o campo da logo escura) continua funcionando', () => {
    expect(variantesDaLogo({ logoVersao: 1 } as never)).toEqual([{ aparece: 'sempre', imagem: claro }])
  })

  describe('barra lateral (fundo sempre escuro)', () => {
    it('prefere a logo escura', () => {
      expect(variantesDaLogo({ logoVersao: 1, logoEscuraVersao: 2 }, 'escuro')).toEqual([{ aparece: 'sempre', imagem: escuro }])
    })

    it('sem logo escura usa a normal; sem nenhuma, ícone e nome', () => {
      expect(variantesDaLogo({ logoVersao: 1, logoEscuraVersao: null }, 'escuro')).toEqual([{ aparece: 'sempre', imagem: claro }])
      expect(variantesDaLogo({ logoVersao: null, logoEscuraVersao: null }, 'escuro')).toEqual([{ aparece: 'sempre', imagem: null }])
    })
  })
})
