import { Link } from "react-router-dom";
import { PolicyLayout } from "@/components/policy-layout";

export default function PrivacyPage() {
  return (
    <PolicyLayout titulo="Política de privacidade" atualizadoEm="24/11/2026">
      <p className="mt-2 text-muted-foreground">
        Explicamos aqui quais dados pessoais coletamos quando você faz um
        pedido, para quê usamos, com quem compartilhamos e quais são os seus
        direitos, conforme a Lei Geral de Proteção de Dados (LGPD, Lei
        13.709/2018).
      </p>

      <h2>Quem é o responsável</h2>
      <p>
        A loja que aparece no topo deste site é a responsável (controladora)
        pelos dados dos pedidos. Não é preciso criar conta para pedir. Para
        falar sobre seus dados, use o botão de WhatsApp no topo da página.
      </p>

      <h2>Quais dados coletamos</h2>
      <ul>
        <li>
          <b>Dados do pedido:</b> nome, telefone/WhatsApp, quantidade, sabores,
          bebidas, forma de pagamento (e valor do troco, se houver), observação
          e horário escolhido.
        </li>
        <li>
          <b>Endereço</b> (rua, número, bairro e ponto de referência), somente
          quando você escolhe entrega.
        </li>
        <li>
          <b>Dados guardados no seu aparelho</b>, se você aceitar: nome,
          telefone e endereço do último pedido. Veja a{" "}
          <Link to="/politica-de-cookies" className="underline">
            Política de cookies
          </Link>
          .
        </li>
      </ul>
      <p className="mt-2">
        Não pedimos CPF, e-mail, senha nem dados de cartão. O pagamento é feito
        na entrega ou na retirada, ou por Pix direto para a loja, fora deste
        site.
      </p>

      <h2>Para que usamos</h2>
      <ul>
        <li>
          Preparar, entregar ou separar o seu pedido e calcular o valor e a taxa
          de entrega.
        </li>
        <li>
          Falar com você pelo WhatsApp sobre o pedido (confirmação, atraso,
          dúvida sobre o endereço).
        </li>
        <li>
          Mostrar o andamento na página de acompanhamento, acessada pelo código
          do pedido.
        </li>
        <li>Preencher o formulário da próxima vez, somente se você aceitar.</li>
        <li>
          Controle e organização da loja, como o histórico de pedidos e os
          relatórios do painel.
        </li>
      </ul>
      <p className="mt-2">
        Não usamos seus dados para publicidade, não fazemos perfil comercial e
        não vendemos nem cedemos seus dados.
      </p>

      <h2>Base legal</h2>
      <p>
        Tratamos os dados do pedido para executar o contrato que você pede ao
        fazer a compra (LGPD, art. 7º, V). Lembrar seus dados neste aparelho
        depende do seu consentimento (art. 7º, I), que você pode retirar a
        qualquer momento.
      </p>

      <h2>Com quem os dados passam</h2>
      <ul>
        <li>
          <b>Quem administra a loja</b> vê os pedidos no painel restrito (nome,
          telefone, endereço e itens).
        </li>
        <li>
          <b>Provedores de tecnologia</b> que hospedam o site e guardam o banco
          de dados, apenas para o sistema funcionar.
        </li>
        <li>
          <b>WhatsApp:</b> ao clicar no botão de WhatsApp, a conversa acontece
          nele e vale a política dele.
        </li>
        <li>
          <b>Aviso de novo pedido para a loja:</b> enviamos uma notificação por
          um serviço de push, com o código, a quantidade, o tipo (entrega ou
          retirada) e o valor. Ela não leva nome, telefone nem endereço.
        </li>
      </ul>

      <h2>Por quanto tempo guardamos</h2>
      <p>
        Mantemos os dados do pedido pelo tempo necessário para atender você,
        controlar a loja e cumprir obrigações legais. Depois disso, eles podem
        ser apagados ou anonimizados. Os dados guardados no seu aparelho ficam
        até você apagar ou recusar.
      </p>

      <h2>Segurança</h2>
      <p>
        A conexão com o site é criptografada e o painel exige login. Nenhum
        sistema é 100% seguro, mas adotamos medidas para proteger os dados. Se
        houver incidente que traga risco a você, avisaremos como a lei
        determina.
      </p>

      <h2>Seus direitos</h2>
      <p>Você pode pedir, a qualquer momento (LGPD, art. 18):</p>
      <ul>
        <li>confirmação de que tratamos seus dados e acesso a eles;</li>
        <li>correção de dados incompletos ou errados;</li>
        <li>
          exclusão dos dados, anonimização ou bloqueio quando não forem
          necessários;
        </li>
        <li>informação sobre com quem compartilhamos os dados;</li>
        <li>retirada do consentimento, sem custo e sem prejudicar o pedido.</li>
      </ul>
      <p className="mt-2">
        Basta falar com a loja pelo botão de WhatsApp no topo da página. Se
        achar que seus dados não foram tratados corretamente, você também pode
        reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>Crianças e adolescentes</h2>
      <p>
        O site é voltado a quem pode fazer compras. Pedidos de menores de idade
        devem ser feitos com um responsável.
      </p>

      <h2>Mudanças nesta política</h2>
      <p>
        Podemos atualizar este texto. A data de atualização fica no início da
        página e, havendo mudança importante, destacaremos no site.
      </p>
    </PolicyLayout>
  );
}
