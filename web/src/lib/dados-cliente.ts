import { armazenamentoPadrao, lerConsentimento, type Armazenamento } from '@/lib/consentimento'

// Dados do pedido que o cliente pode pedir para o app lembrar neste aparelho (sem criar conta).
// Só são lidos e gravados com o consentimento "aceito"; nunca guardamos pagamento, troco ou observação.
export interface DadosSalvos {
  nome: string
  telefone: string
  endereco: string
  numero: string
  bairro: string
  pontoReferencia: string
}

export const DADOS_KEY = 'saborDeMae:dadosCliente'

const CAMPOS: (keyof DadosSalvos)[] = ['nome', 'telefone', 'endereco', 'numero', 'bairro', 'pontoReferencia']

export function carregarDados(storage: Armazenamento | null = armazenamentoPadrao()): DadosSalvos | null {
  if (lerConsentimento(storage) !== 'aceito') return null
  try {
    const bruto = storage?.getItem(DADOS_KEY)
    if (!bruto) return null
    const obj = JSON.parse(bruto) as Record<string, unknown>
    const dados = {} as DadosSalvos
    for (const c of CAMPOS) dados[c] = typeof obj[c] === 'string' ? (obj[c] as string) : ''
    return dados
  } catch {
    return null // JSON corrompido ou editado à mão
  }
}

export function salvarDados(dados: DadosSalvos, storage: Armazenamento | null = armazenamentoPadrao()) {
  if (lerConsentimento(storage) !== 'aceito') return
  try {
    storage?.setItem(DADOS_KEY, JSON.stringify(dados))
  } catch { /* armazenamento cheio ou bloqueado: o pedido não depende disso */ }
}

export function apagarDados(storage: Armazenamento | null = armazenamentoPadrao()) {
  try {
    storage?.removeItem(DADOS_KEY)
  } catch { /* ignorar */ }
}
