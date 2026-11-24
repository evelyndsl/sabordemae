import { Link, useLocation } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apagarDados } from "@/lib/dados-cliente";
import { salvarConsentimento, useConsentimento } from "@/lib/consentimento";

/** Aviso na parte de baixo da tela, só para quem ainda não escolheu. Não aparece no painel do admin. */
export function CookieBanner() {
  const consentimento = useConsentimento();
  const { pathname } = useLocation();

  // Na política os botões de escolha já estão na própria página.
  if (
    consentimento !== null ||
    pathname.startsWith("/admin") ||
    pathname === "/politica-de-cookies"
  )
    return null;

  return (
    <section
      className="cookie-banner"
      role="region"
      aria-label="Aviso de cookies"
    >
      <div className="cookie-banner__inner">
        <p className="cookie-banner__text">
          <Cookie className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Não usamos cookies de rastreamento. Podemos guardar seu nome,
            telefone e endereço <b>neste aparelho</b> para você não digitar tudo
            de novo no próximo pedido. Veja a{" "}
            <Link to="/politica-de-cookies" className="underline">
              Política de cookies
            </Link>
            .
          </span>
        </p>
        <div className="cookie-banner__actions">
          <Button
            variant="outline"
            onClick={() => {
              apagarDados();
              salvarConsentimento("recusado");
            }}
          >
            Só o essencial
          </Button>
          <Button onClick={() => salvarConsentimento("aceito")}>Aceitar</Button>
        </div>
      </div>
    </section>
  );
}
