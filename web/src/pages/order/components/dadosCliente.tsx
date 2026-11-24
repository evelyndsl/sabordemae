import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhone, telefoneColado } from "@/lib/format";
import type { Erros } from "@/types/types";

interface DadosClienteProps {
  nome: string;
  setNome: (v: string) => void;
  telefone: string;
  setTelefone: (v: string) => void;
  /** O cliente aceitou guardar dados neste aparelho: mostra a opção de lembrar. */
  podeLembrar: boolean;
  lembrar: boolean;
  setLembrar: (v: boolean) => void;
  erros: Erros;
}

const DadosCliente = ({
  nome,
  setNome,
  telefone,
  setTelefone,
  podeLembrar,
  lembrar,
  setLembrar,
  erros,
}: DadosClienteProps) => {
  return (
    <section className="section">
      <h2 className="section__title">
        <span className="section__step">5</span> Seus dados
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
            onPaste={(e) => {
              // Só trata a colagem que substitui o campo todo (vazio ou tudo selecionado).
              const campo = e.currentTarget;
              const tudo =
                campo.value === "" ||
                (campo.selectionStart === 0 &&
                  campo.selectionEnd === campo.value.length);
              if (!tudo) return;
              e.preventDefault();
              setTelefone(
                formatPhone(telefoneColado(e.clipboardData.getData("text"))),
              );
            }}
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            aria-invalid={!!erros.telefone}
          />
          {erros.telefone && <p className="field__error">{erros.telefone}</p>}
        </div>
        {podeLembrar && (
          <label className="drink-none">
            <input
              type="checkbox"
              className="size-4 accent-current"
              checked={lembrar}
              onChange={(e) => setLembrar(e.target.checked)}
            />
            Lembrar meus dados neste aparelho para o próximo pedido.
          </label>
        )}
      </div>
    </section>
  );
};

export default DadosCliente;
