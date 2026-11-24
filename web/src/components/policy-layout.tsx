import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/** Estrutura comum das páginas legais (cookies, privacidade e termos). */
export function PolicyLayout({
  titulo,
  atualizadoEm,
  children,
}: {
  titulo: string;
  atualizadoEm?: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="page page--narrow policy">
        <Link to="/pedido" className="back-link my-4">
          <ArrowLeft className="size-4" /> Voltar ao pedido
        </Link>
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        {atualizadoEm && (
          <p className="mt-1 text-sm text-muted-foreground">
            Última atualização: {atualizadoEm}
          </p>
        )}
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
