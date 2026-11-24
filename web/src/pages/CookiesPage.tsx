import { useState } from "react";
import { Link } from "react-router-dom";
import { PolicyLayout } from "@/components/policy-layout";
import { Button } from "@/components/ui/button";
import { salvarConsentimento, useConsentimento } from "@/lib/consentimento";
import { apagarDados, carregarDados } from "@/lib/dados-cliente";

const ITENS = [
  {
    chave: "saborDeMae:cookies",
    para: "Lembrar a sua escolha neste aviso.",
    tipo: "Essencial",
    prazo: "Até você limpar os dados do navegador",
  },
  {
    chave: "delivery:theme",
    para: "Lembrar se você prefere o tema claro ou escuro.",
    tipo: "Essencial (preferência)",
    prazo: "Até você limpar os dados do navegador",
  },
  {
    chave: "saborDeMae:marca",
    para: "Guardar nome e cores da loja para a página abrir sem piscar.",
    tipo: "Essencial",
    prazo: "Atualizado a cada visita",
  },
  {
    chave: "saborDeMae:dadosCliente",
    para: "Lembrar seu nome, telefone e endereço de entrega para o próximo pedido.",
    tipo: "Preferências (precisa do seu consentimento)",
    prazo: "Até você apagar ou recusar",
  },
];

export default function CookiesPage() {
  const consentimento = useConsentimento();
  const [apagado, setApagado] = useState(false);
  const temDados = !apagado && carregarDados() !== null;

  return (
    <PolicyLayout titulo="Política de cookies">
      <p className="mt-2 text-muted-foreground">
        Esta página explica o que o nosso site guarda no seu aparelho e como
        você controla isso, conforme a Lei Geral de Proteção de Dados (LGPD, Lei
        13.709/2018).
      </p>

      <h2>O que usamos</h2>
      <p>
        <b>Não usamos cookies</b> e não temos rastreamento, publicidade nem
        ferramentas de análise de terceiros. Usamos apenas o armazenamento local
        do navegador (<i>localStorage</i>), que fica no seu aparelho e não é
        enviado a nós a cada visita.
      </p>
      <div className="policy__scroll mt-3">
        <table className="policy__table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Para quê</th>
              <th>Tipo</th>
              <th>Duração</th>
            </tr>
          </thead>
          <tbody>
            {ITENS.map((i) => (
              <tr key={i.chave}>
                <td>
                  <code>{i.chave}</code>
                </td>
                <td>{i.para}</td>
                <td>{i.tipo}</td>
                <td>{i.prazo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3">
        Quem administra a loja também tem um item de sessão (
        <code>saborDeMae:token</code>) e preferências do painel. Eles só existem
        na área restrita e servem para manter o login.
      </p>

      <h2>Lembrar meus dados no próximo pedido</h2>
      <p>
        Se você aceitar, guardamos <b>neste aparelho</b> o nome, o telefone e o
        endereço (rua, número, bairro e ponto de referência) do seu último
        pedido de entrega, para preencher o formulário da próxima vez. Não
        guardamos forma de pagamento, troco nem observações. Não é preciso criar
        conta, e esses dados ficam só neste navegador: quem usar outro aparelho
        ou navegador não terá o preenchimento.
      </p>
      <p className="mt-2">
        Se você recusar, o site funciona normalmente e você digita seus dados a
        cada pedido. Os dados enviados no pedido em si (para entregarmos e
        entrarmos em contato) continuam sendo necessários e são tratados para
        essa finalidade.
      </p>

      <h2>Sua escolha</h2>
      <p>
        Situação atual:{" "}
        <b>
          {consentimento === "aceito"
            ? "você aceitou lembrar seus dados neste aparelho"
            : consentimento === "recusado"
              ? "você escolheu só o essencial"
              : "você ainda não escolheu"}
        </b>
        .
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          onClick={() => salvarConsentimento("aceito")}
          disabled={consentimento === "aceito"}
        >
          Aceitar
        </Button>
        <Button
          variant="outline"
          disabled={consentimento === "recusado"}
          onClick={() => {
            apagarDados();
            setApagado(true);
            salvarConsentimento("recusado");
          }}
        >
          Só o essencial
        </Button>
        <Button
          variant="outline"
          disabled={!temDados}
          onClick={() => {
            apagarDados();
            setApagado(true);
          }}
        >
          Apagar meus dados salvos
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Você pode mudar de ideia quando quiser. Recusar ou apagar remove os
        dados salvos na hora. Também é possível limpar tudo pelas configurações
        do seu navegador.
      </p>

      <h2>Dúvidas e seus direitos</h2>
      <p>
        Veja os seus direitos sobre os dados dos pedidos na{" "}
        <Link to="/politica-de-privacidade" className="underline">
          Política de privacidade
        </Link>
        .
      </p>
    </PolicyLayout>
  );
}
