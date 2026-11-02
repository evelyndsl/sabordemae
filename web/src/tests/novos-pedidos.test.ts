import { describe, expect, it } from 'vitest'
import { encontrarNovos } from '@/lib/novos-pedidos'

const pedido = (codigo: string) => ({ codigo })

describe('encontrarNovos', () => {
  it('devolve só os pedidos cujo código ainda não foi visto', () => {
    const vistos = new Set(['AAAA2222', 'BBBB3333'])

    const novos = encontrarNovos(vistos, [pedido('CCCC4444'), pedido('AAAA2222'), pedido('DDDD5555')])

    expect(novos.map((p) => p.codigo)).toEqual(['CCCC4444', 'DDDD5555'])
  })

  it('não devolve nada quando todos já foram vistos ou a lista está vazia', () => {
    expect(encontrarNovos(new Set(['AAAA2222']), [pedido('AAAA2222')])).toEqual([])
    expect(encontrarNovos(new Set(), [])).toEqual([])
  })
})
