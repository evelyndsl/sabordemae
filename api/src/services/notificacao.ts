import { env } from "../lib/env.js";
import type { PedidoComItens } from "./pedidos.js";

// Aviso de novo pedido por push (ntfy). A mensagem não leva dados pessoais do cliente: o tópico do
// servidor público é aberto a quem souber o nome. Falha ao avisar nunca pode atrapalhar o pedido.

export type ConfigNtfy = { topic: string; servidor?: string; fetchImpl?: typeof fetch };

const TEMPO_LIMITE_MS = 3000;

const reais = (valor: { toFixed(casas: number): string }) => `R$ ${valor.toFixed(2).replace(".", ",")}`;

// Para mudar o texto da notificação, edite aqui: `title` é a primeira linha e `message` o corpo.
// Ao tocar nela abre o painel do admin; sem login, o site leva para /admin/login e, depois de entrar,
// para o dashboard.
export function montarAviso(pedido: PedidoComItens, urlSite?: string) {
  const tipo = pedido.tipoEntrega === "ENTREGA" ? "Entrega" : "Retirada";

  return {
    title: `🔔 Novo pedido - ${pedido.codigo}`,
    message: `${pedido.quantidadeTotal} un. | ${tipo} | ${reais(pedido.total)}`,
    click: urlSite ? `${urlSite.replace(/\/$/, "")}/admin/dashboard` : undefined,
  };
}

/** Publica no ntfy (JSON, para aceitar acentos). Devolve true se enviou; nunca lança erro. */
export async function enviarNtfy(config: ConfigNtfy, aviso: { title: string; message: string; click?: string }) {
  const servidor = (config.servidor ?? "https://ntfy.sh").replace(/\/$/, "");
  try {
    const res = await (config.fetchImpl ?? fetch)(servidor, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic: config.topic, ...aviso, priority: 4, tags: ["shopping_cart"] }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
    if (!res.ok) console.error(`ntfy respondeu ${res.status} ao avisar o pedido ${aviso.title}.`);
    return res.ok;
  } catch (err) {
    console.error("Não foi possível enviar o aviso ao ntfy:", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Avisa o dono de um novo pedido. Sem NTFY_TOPIC, ou nos testes, não faz nada. */
export async function notificarNovoPedido(pedido: PedidoComItens) {
  const topic = process.env["NTFY_TOPIC"]?.trim();
  if (!topic || env.NODE_ENV === "test") return false;

  return enviarNtfy(
    { topic, servidor: process.env["NTFY_SERVER"]?.trim() || undefined },
    montarAviso(pedido, env.WEB_URL),
  );
}
