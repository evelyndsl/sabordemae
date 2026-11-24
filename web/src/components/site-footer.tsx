import { Link } from "react-router-dom";
import { useBrand } from "@/context/brand";

export function SiteFooter() {
  const { marca } = useBrand();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>
          © {new Date().getFullYear()} {marca.nome}
        </p>
        <nav aria-label="Documentos legais" className="site-footer__links">
          <Link to="/termos-de-uso" className="underline">
            Termos de uso
          </Link>
          <Link to="/politica-de-privacidade" className="underline">
            Política de privacidade
          </Link>
          <Link to="/politica-de-cookies" className="underline">
            Política de cookies
          </Link>
        </nav>
      </div>
    </footer>
  );
}
