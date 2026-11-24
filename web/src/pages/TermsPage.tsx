import { Link } from "react-router-dom";
import { PolicyLayout } from "@/components/policy-layout";

export default function TermsPage() {
  return (
    <PolicyLayout titulo="Termos de uso" atualizadoEm="24/11/2026">
      <p className="mt-2 text-muted-foreground">
        Ao usar este site para fazer um pedido, você concorda com as regras
        abaixo. Se não concordar, não faça o pedido.
      </p>

      <h2>O que é este site</h2>
      <p>
        É o canal de pedidos de uma loja de mini salgados. Aqui você escolhe
        quantidade, sabores, bebidas e a forma de receber, e acompanha o
        andamento pelo código do pedido. Não é preciso criar conta.
      </p>

      <h2>Como funciona o pedido</h2>
      <ul>
        <li>
          O pedido só vale depois de enviado. A loja pode entrar em contato pelo
          WhatsApp para confirmar detalhes.
        </li>
        <li>
          Você é responsável por informar dados corretos: nome, telefone com DDD
          e, na entrega, o endereço completo. Dados errados podem atrasar ou
          impedir a entrega.
        </li>
        <li>
          Guarde o código do pedido. Ele dá acesso à página de acompanhamento,
          então não o compartilhe com quem você não conhece.
        </li>
        <li>
          As quantidades mínima e máxima, o passo de unidades e os sabores
          disponíveis são os exibidos no formulário e podem mudar.
        </li>
      </ul>

      <h2>Preços, taxas e pagamento</h2>
      <ul>
        <li>
          O valor é calculado pela quantidade escolhida, mais as bebidas e a
          taxa de entrega, quando houver. O total aparece no resumo antes do
          envio.
        </li>
        <li>
          As formas de pagamento disponíveis (dinheiro, cartão ou Pix) aparecem
          no formulário. O pagamento é feito diretamente à loja, não por este
          site.
        </li>
        <li>
          No pagamento em dinheiro, informe se precisa de troco e para qual
          valor.
        </li>
        <li>
          No Pix, pode haver prazo de pagamento conforme a antecedência do
          pedido. Pedidos sem o pagamento no prazo podem ser cancelados.
        </li>
      </ul>

      <h2>Entrega, retirada e horários</h2>
      <ul>
        <li>
          As entregas atendem apenas a região informada no site (hoje, Paiçandu,
          PR). Fora dela, é possível retirar o pedido.
        </li>
        <li>
          O tempo de preparo mostrado é uma estimativa e pode variar conforme a
          demanda.
        </li>
        <li>
          A loja pode estar fechada ou sem entregas em certos dias e horários.
          Nesses casos, você pode agendar o pedido para um horário de
          atendimento.
        </li>
        <li>
          Quem estiver ausente no endereço ou não atender os contatos pode ter a
          entrega reagendada ou cancelada.
        </li>
      </ul>

      <h2>Cancelamentos e problemas</h2>
      <p>
        Por serem alimentos feitos sob encomenda, alterações e cancelamentos
        dependem de a produção ainda não ter começado. Se algo chegar errado ou
        com problema, fale com a loja pelo botão de WhatsApp no topo da página,
        sem prejuízo dos seus direitos previstos no Código de Defesa do
        Consumidor.
      </p>

      <h2>Uso adequado do site</h2>
      <ul>
        <li>
          Não faça pedidos falsos nem use dados de outras pessoas sem permissão.
        </li>
        <li>
          Não tente acessar áreas restritas, sobrecarregar o site ou explorar
          falhas. Isso pode levar ao bloqueio dos pedidos.
        </li>
        <li>A área de administração é exclusiva de quem a loja autorizar.</li>
      </ul>

      <h2>Conteúdo e marca</h2>
      <p>
        O nome, a logo, as fotos e os textos do site pertencem à loja ou a quem
        a autorizou a usá-los. Não os copie ou reproduza sem permissão.
      </p>

      <h2>Disponibilidade</h2>
      <p>
        Fazemos o possível para manter o site no ar, mas ele pode ficar
        indisponível por manutenção ou por problemas fora do nosso controle. Se
        o site falhar, você pode pedir pelo WhatsApp da loja.
      </p>

      <h2>Privacidade e cookies</h2>
      <p>
        O tratamento dos seus dados está descrito na{" "}
        <Link to="/politica-de-privacidade" className="underline">
          Política de privacidade
        </Link>{" "}
        e na{" "}
        <Link to="/politica-de-cookies" className="underline">
          Política de cookies
        </Link>
        .
      </p>

      <h2>Mudanças e foro</h2>
      <p>
        Podemos alterar estes termos; vale a versão publicada aqui na data do
        seu pedido. Estes termos seguem as leis brasileiras. Em caso de
        conflito, fica garantido ao consumidor o foro do seu domicílio.
      </p>
    </PolicyLayout>
  );
}
