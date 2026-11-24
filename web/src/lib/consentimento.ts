import { useSyncExternalStore } from "react";

// Escolha do cliente sobre guardar dados neste aparelho (LGPD, art. 7º, I: consentimento).
// O app não usa cookies; tudo fica no localStorage do navegador e nada disso vai para o servidor.
export type Consentimento = "aceito" | "recusado";

export const CONSENTIMENTO_KEY = "saborDeMae:cookies";

export type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function armazenamentoPadrao(): Armazenamento | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // navegador bloqueou o armazenamento
  }
}

/** null = o cliente ainda não escolheu (o banner aparece). */
export function lerConsentimento(
  storage: Armazenamento | null = armazenamentoPadrao(),
): Consentimento | null {
  try {
    const v = storage?.getItem(CONSENTIMENTO_KEY);
    return v === "aceito" || v === "recusado" ? v : null;
  } catch {
    return null;
  }
}

const ouvintes = new Set<() => void>();

export function salvarConsentimento(
  valor: Consentimento,
  storage: Armazenamento | null = armazenamentoPadrao(),
) {
  try {
    storage?.setItem(CONSENTIMENTO_KEY, valor);
  } catch {
    /* sem armazenamento a escolha vale só até recarregar */
  }
  ouvintes.forEach((fn) => fn());
}

function assinar(fn: () => void) {
  ouvintes.add(fn);
  return () => {
    ouvintes.delete(fn);
  };
}

/** Reage quando o cliente decide no banner ou na página da política. */
export function useConsentimento() {
  return useSyncExternalStore(
    assinar,
    () => lerConsentimento(),
    () => null,
  );
}
