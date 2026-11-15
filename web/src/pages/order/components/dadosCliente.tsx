import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhone } from "@/lib/format";
import type { Erros } from "@/types/types";

interface DadosClienteProps {
  nome: string;
  setNome: (v: string) => void;
  telefone: string;
  setTelefone: (v: string) => void;
  erros: Erros;
}

const DadosCliente = ({
  nome,
  setNome,
  telefone,
  setTelefone,
  erros,
}: DadosClienteProps) => {
  return (
    <section className="section">
      <h2 className="section__title">
        <span className="section__step">4</span> Seus dados
      </h2>
      <div className="stack mt-3">
        <div className="field">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="name"
            aria-invalid={!!erros.nomeCliente}
          />
          {erros.nomeCliente && (
            <p className="field__error">{erros.nomeCliente}</p>
          )}
        </div>
        <div className="field">
          <Label htmlFor="telefone">Telefone / WhatsApp</Label>
          <Input
            id="telefone"
            type="tel"
            inputMode="tel"
            value={telefone}
            onChange={(e) => setTelefone(formatPhone(e.target.value))}
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            aria-invalid={!!erros.telefone}
          />
          {erros.telefone && (
            <p className="field__error">{erros.telefone}</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default DadosCliente;
