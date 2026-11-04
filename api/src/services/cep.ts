import { RegraDeNegocioError } from "../lib/errors.js";

// Entregas só em Paiçandu/PR.
//
// 1) Faixa dos Correios (sem rede): o CEP geral antigo (87140-000) e os CEPs por logradouro
//    (87140-001 a 87149-999), conforme comunicado dos Correios de 18/03/2026.
// 2) Fora da faixa, o ViaCEP confirma a cidade (cobre CEPs que a faixa não previu).
//    Se ele cair ou demorar além do limite, o pedido é recusado com uma mensagem amigável.
export const CEP_FAIXA_PAICANDU = { inicio: 87140000, fim: 87149999 } as const;
export const VIACEP_TIMEOUT_MS = 3000;

export class CepIndisponivelError extends RegraDeNegocioError {}

export function cepEmPaicandu(cep: string): boolean {
  const n = Number(cep);
  return n >= CEP_FAIXA_PAICANDU.inicio && n <= CEP_FAIXA_PAICANDU.fim;
}

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

interface RespostaViaCep {
  erro?: boolean | string;
  localidade?: string;
  uf?: string;
}

/** Lança RegraDeNegocioError se o CEP (8 dígitos) não for de Paiçandu/PR. */
export async function validarCepDeEntrega(cep: string, timeoutMs = VIACEP_TIMEOUT_MS): Promise<void> {
  if (cepEmPaicandu(cep)) return;

  let dados: RespostaViaCep;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(timeoutMs) });
    // O ViaCEP responde 400 para CEP malformado; para CEP inexistente responde 200 com { erro: true }.
    if (res.status === 400) throw new RegraDeNegocioError("CEP inválido. Confira os números e tente de novo.");
    if (!res.ok) throw new Error(`ViaCEP respondeu ${res.status}`);
    dados = (await res.json()) as RespostaViaCep;
  } catch (err) {
    if (err instanceof RegraDeNegocioError) throw err;
    throw new CepIndisponivelError(
      "Não conseguimos confirmar o CEP agora. Tente novamente em instantes.",
    );
  }

  if (dados.erro === true || dados.erro === "true") {
    throw new RegraDeNegocioError("CEP não encontrado. Confira os números e tente de novo.");
  }

  if (normalizar(dados.localidade ?? "") === "paicandu" && dados.uf?.toUpperCase() === "PR") return;

  throw new RegraDeNegocioError("No momento entregamos apenas em Paiçandu/PR.");
}
