// Tipos espelhando o contrato da API (api/src/schemas). Valores em reais chegam como string ("44.00").

export type TipoEntrega = 'ENTREGA' | 'RETIRADA'
export type FormaPagamento = 'DINHEIRO' | 'CARTAO' | 'PIX'
export type StatusPedido =
  | 'AGUARDANDO_PAGAMENTO' // só Pix
  | 'PAGAMENTO_APROVADO' // só Pix
  | 'AGUARDANDO'
  | 'EM_PRODUCAO'
  | 'EM_ROTA_ENTREGA'
  | 'PRONTO_RETIRADA'
  | 'FINALIZADO'
export type TipoChavePix = 'CPF' | 'CNPJ' | 'TELEFONE' | 'ALEATORIA'

export interface Sabor {
  id: number
  nome: string
}

export interface Valores {
  faixas: { quantidade: number; valor: string }[]
  acimaDe: { quantidade: number; valorPorUnidade: string }
  quantidadeMinima: number
  quantidadeMaxima: number
  passo: number
}

export interface TempoPreparo {
  minimoMin: number
  maximoMin: number
}

export interface TaxasEntrega {
  taxaAte49: string
  taxaDe50a199: string
  entregaGratisAPartirDe: number
}

export interface Pix {
  tipo: TipoChavePix
  chave: string
  chaveParaCopiar: string
  configurada: boolean
  titular: string | null
  banco: string | null
  /** WhatsApp do estabelecimento (só dígitos, DDD + número). */
  whatsapp: string | null
  /** Pedido para um dia seguinte: antecedência mínima do pagamento, em horas. */
  antecedencia: { ateLimiteHoras: number; acimaLimiteHoras: number; limiteUnidades: number }
}

export interface InstrucaoPix {
  /** true = pagar no ato do pedido. */
  imediato: boolean
  horasAntecedencia: number | null
  pagarAte: string | null
}

export interface Catalogo {
  sabores: Sabor[]
  valores: Valores
  tempo: TempoPreparo
  taxas: TaxasEntrega
  pix: Pix
}

export interface Pedido {
  codigo: string
  status: StatusPedido
  nomeCliente: string
  tipoEntrega: TipoEntrega
  endereco: string | null
  pontoReferencia: string | null
  /** Data e hora pedidas pelo cliente; null = "para quando ficar pronto". */
  horarioAgendado: string | null
  /** Só para pedidos sem horário agendado: informado pelo admin. */
  tempoPreparoMin: number | null
  previsaoEm: string | null
  formaPagamento: FormaPagamento
  instrucaoPix: InstrucaoPix | null
  quantidadeTotal: number
  subtotal: string
  taxaEntrega: string
  total: string
  criadoEm: string
  /** quantidade null = o cliente só escolheu o sabor (a loja divide as unidades). */
  itens: { sabor: string; quantidade: number | null }[]
}

// Visão do admin: inclui o telefone (só dígitos).
export interface PedidoAdmin extends Pedido {
  telefone: string
}

export interface CriarPedidoBody {
  nomeCliente: string
  telefone: string
  quantidade: number
  /** Com quantidade em todos os itens, ou sem em nenhum (só a escolha dos sabores). */
  sabores: { saborId: number; quantidade?: number }[]
  tipoEntrega: TipoEntrega
  endereco?: string
  /** Opcional, só na entrega. */
  pontoReferencia?: string
  /** Omitido = "para quando ficar pronto". */
  horarioAgendado?: string
  formaPagamento: FormaPagamento
}

export interface SalvarPixBody {
  tipo: TipoChavePix
  chave: string
  titular: string
  banco: string
  whatsapp: string
  antecedenciaAteLimiteHoras: number
  antecedenciaAcimaLimiteHoras: number
}

// Sabor na visão do admin (inclui desativados).
export interface SaborAdmin extends Sabor {
  ativo: boolean
}

// Marca e aparência (editáveis no painel). Cores em #rrggbb; ausente = padrão do tema.
export type ChaveCor = 'fundo' | 'texto' | 'cartao' | 'primaria' | 'destaque' | 'textoSecundario' | 'borda'
export type TemaCores = Partial<Record<ChaveCor, string>>
export type TemaCoresAdmin = TemaCores & { barraLateral?: string }

export interface Cores {
  publico?: { claro?: TemaCores; escuro?: TemaCores }
  admin?: { claro?: TemaCoresAdmin; escuro?: TemaCoresAdmin }
}

export interface Marca {
  nome: string
  /** Versão da logo (use em logoUrl) ou null quando não há logo. */
  logoVersao: number | null
  /** null = tema padrão. */
  cores: Cores | null
}
