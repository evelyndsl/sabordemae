import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Info, MapPinCheck, Search, Store, Truck } from "lucide-react";
import { AvisoEntrega } from "@/components/aviso-entrega";
import { FaixaFerias } from "@/components/faixa-ferias";
import { ErrorState, LoadingState } from "@/components/state-views";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFetch } from "@/hooks/use-fetch";
import { ApiError, api } from "@/lib/api";
import { apagarDados, carregarDados, salvarDados } from "@/lib/dados-cliente";
import { useConsentimento } from "@/lib/consentimento";
import { textoHorario, textoPeriodo } from "@/lib/funcionamento";
import { formatPhone, normalizarTelefone } from "@/lib/format";
import { calcularPreco, quantidadeValida } from "@/lib/preco";
import { validarPedido, valorTroco } from "@/lib/validar-pedido";
import Quantidade from "./components/quantidade";
import Sabores from "./components/sabores";
import BebidaEscolha from "./components/bebida";
import Envio from "./components/envio";
import DadosCliente from "./components/dadosCliente";
import Pagamento from "./components/pagamento";
import Observacao from "./components/observacao";
import Resumo from "./components/resumo";
import type {
  Catalogo,
  CriarPedidoBody,
  Funcionamento,
  FormaPagamento,
  TipoEntrega,
  Quando,
  Erros,
  ModoSabores,
} from "@/types/types";

function TrackOrder() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const c = codigo.trim().toUpperCase();
    if (c.length === 8) navigate(`/pedido/${c}`);
  }

  return (
    <form onSubmit={submit} className="hero__track">
      <Input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        maxLength={8}
        placeholder="Código do pedido"
        aria-label="Código do pedido"
        className="bg-background uppercase"
      />
      <Button
        type="submit"
        variant="outline"
        disabled={codigo.trim().length !== 8}
      >
        <Search /> Acompanhar
      </Button>
    </form>
  );
}

function OrderForm({ catalogo }: { catalogo: Catalogo }) {
  const { sabores, bebidas, valores, tempo, taxas, pix, funcionamento } =
    catalogo;
  const navigate = useNavigate();
  // Dados lembrados neste aparelho (só existem se o cliente aceitou no aviso de cookies).
  const [salvos] = useState(() => carregarDados());
  const aceitouLembrar = useConsentimento() === "aceito";
  const [lembrar, setLembrar] = useState(true);

  // Nada vem pré-selecionado: o cliente escolhe cada opção (null = ainda não escolheu).
  const [qtdText, setQtdText] = useState("");
  const [modoSabores, setModoSabores] = useState<ModoSabores | null>(null);
  const [selecao, setSelecao] = useState<Record<number, number>>({}); // modo "quantidades": saborId -> unidades
  const [escolhidos, setEscolhidos] = useState<number[]>([]); // modo "selecao": só os sabores marcados
  const [bebidasQtd, setBebidasQtd] = useState<Record<number, number>>({}); // bebidaId -> unidades
  const [semBebida, setSemBebida] = useState(false);
  const [tipo, setTipo] = useState<TipoEntrega | null>(null);
  const [endereco, setEndereco] = useState(salvos?.endereco ?? "");
  const [numero, setNumero] = useState(salvos?.numero ?? "");
  const [bairro, setBairro] = useState(salvos?.bairro ?? "");
  const [pontoReferencia, setPontoReferencia] = useState(
    salvos?.pontoReferencia ?? "",
  );
  const [observacao, setObservacao] = useState("");
  const [quando, setQuando] = useState<Quando | null>(null);
  const [horario, setHorario] = useState("");
  const [nome, setNome] = useState(salvos?.nome ?? "");
  const [telefone, setTelefone] = useState(salvos?.telefone ?? "");
  const [pagamento, setPagamento] = useState<FormaPagamento | null>(null);
  const [precisaTroco, setPrecisaTroco] = useState(false);
  const [trocoText, setTrocoText] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState("");
  const [enviando, setEnviando] = useState(false);
  // Confirmação dos dados antes de enviar (nome, telefone e, na entrega, endereço). Se o cliente já confirmou
  // exatamente estes dados, não perguntamos de novo; mudou qualquer campo, confirma outra vez.
  const [confirmandoDados, setConfirmandoDados] = useState(false);
  const [dadosConfirmados, setDadosConfirmados] = useState("");
  const entrega = tipo === "ENTREGA";
  const assinaturaDados = JSON.stringify([
    nome.trim(),
    normalizarTelefone(telefone),
    entrega
      ? [endereco.trim(), numero.trim(), bairro.trim(), pontoReferencia.trim()]
      : null,
  ]);

  const qtd = Number(qtdText);
  const qtdOk = quantidadeValida(qtd, valores);
  const troco = valorTroco(trocoText);
  const nSabores =
    modoSabores === "quantidades"
      ? Object.keys(selecao).length
      : modoSabores === "selecao"
        ? escolhidos.length
        : 0;

  // O subtotal já aparece com a quantidade; a taxa e o total só depois de escolher entrega ou retirada.
  const subtotal = useMemo(
    () =>
      qtdOk ? calcularPreco(qtd, "RETIRADA", valores, taxas).subtotal : null,
    [qtd, qtdOk, valores, taxas],
  );
  // Bebidas escolhidas: o valor (quantidade x preço) entra no total (a API confere ao criar o pedido).
  const bebidaObrigatoria = bebidas.length > 0;
  const bebidasEscolhidas = bebidas.filter((b) => (bebidasQtd[b.id] ?? 0) > 0);
  const unidadesBebida = bebidasEscolhidas.reduce(
    (soma, b) => soma + bebidasQtd[b.id],
    0,
  );
  const valorBebida =
    bebidasEscolhidas.reduce(
      (soma, b) =>
        soma + Math.round(parseFloat(b.preco) * 100) * bebidasQtd[b.id],
      0,
    ) / 100;
  const preco = useMemo(() => {
    if (!qtdOk || !tipo) return null;
    const base = calcularPreco(qtd, tipo, valores, taxas);
    return {
      ...base,
      total: Math.round((base.total + valorBebida) * 100) / 100,
    };
  }, [qtd, qtdOk, tipo, valores, taxas, valorBebida]);
  const faltaParaGratis = taxas.entregaGratisAPartirDe - (qtdOk ? qtd : 0);

  const formasPagamento = (
    ["DINHEIRO", "CARTAO", "PIX"] as FormaPagamento[]
  ).filter((f) => f !== "PIX" || pix.configurada);

  // Fora do horário ou sem entrega no dia, "assim que ficar pronto" não vale: o cliente agenda.
  const horarioAtendimento = textoHorario(funcionamento);
  const foraDoHorario = funcionamento.motivoFechado === "FORA_DO_HORARIO";
  const semEntregaHoje = !funcionamento.entregaHoje;
  const prontoIndisponivel =
    foraDoHorario || (tipo === "ENTREGA" && semEntregaHoje);
  const menorHorario = new Date();
  if (tipo === "ENTREGA" && semEntregaHoje) {
    menorHorario.setDate(menorHorario.getDate() + 1);
    menorHorario.setHours(0, 0, 0, 0);
  }

  function escolherTipo(novo: TipoEntrega) {
    setTipo(novo);
    // Sem entrega hoje: quem já tinha marcado "assim que ficar pronto" precisa escolher uma data.
    if (novo === "ENTREGA" && semEntregaHoje && quando === "pronto")
      setQuando("agendar");
  }

  async function submit(ev?: React.FormEvent, dadosJaConfirmados = false) {
    ev?.preventDefault();
    setConfirmandoDados(false);
    setErroGeral("");
    const e = validarPedido({
      valores,
      funcionamento,
      qtd,
      qtdOk,
      modoSabores,
      selecao,
      escolhidos,
      bebidaObrigatoria,
      bebidas: bebidasQtd,
      semBebida,
      tipo,
      endereco,
      numero,
      bairro,
      quando,
      horario,
      foraDoHorario,
      prontoIndisponivel,
      horarioAtendimento,
      nome,
      telefone,
      pagamento,
      precisaTroco,
      troco,
      preco,
    });
    setErros(e);
    if (Object.keys(e).length || !tipo || !pagamento) {
      // Leva o cliente até o primeiro campo com problema (o botão fica longe dos campos).
      if (Object.keys(e).length) {
        setErroGeral("Confira os campos destacados no formulário.");
        requestAnimationFrame(() =>
          document
            .querySelector(".field__error")
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        );
      }
      return;
    }

    // Erro de digitação no telefone (ou o 55 do Brasil colado junto) ou dados antigos preenchidos
    // automaticamente são comuns: o cliente confere tudo antes de enviar.
    if (!dadosJaConfirmados && dadosConfirmados !== assinaturaDados) {
      setConfirmandoDados(true);
      return;
    }

    const body: CriarPedidoBody = {
      nomeCliente: nome.trim(),
      telefone: normalizarTelefone(telefone),
      quantidade: qtd,
      // "misto": nenhum sabor (a loja monta a variedade). "quantidades": cada sabor com suas unidades.
      // "selecao": só os sabores marcados (a loja divide as unidades entre eles).
      sabores:
        modoSabores === "quantidades"
          ? Object.entries(selecao).map(([id, q]) => ({
              saborId: Number(id),
              quantidade: q,
            }))
          : modoSabores === "selecao"
            ? escolhidos.map((id) => ({ saborId: id }))
            : [],
      // [] = "Não quero bebida"; sem bebidas à venda o campo nem é enviado.
      ...(bebidaObrigatoria && {
        bebidas: bebidasEscolhidas.map((b) => ({
          bebidaId: b.id,
          quantidade: bebidasQtd[b.id],
        })),
      }),
      tipoEntrega: tipo,
      endereco: tipo === "ENTREGA" ? endereco.trim() : undefined,
      numero: tipo === "ENTREGA" ? numero.trim() : undefined,
      bairro: tipo === "ENTREGA" ? bairro.trim() : undefined,
      pontoReferencia:
        tipo === "ENTREGA" && pontoReferencia.trim()
          ? pontoReferencia.trim()
          : undefined,
      observacao: observacao.trim() || undefined,
      horarioAgendado:
        quando === "agendar" ? new Date(horario).toISOString() : undefined,
      formaPagamento: pagamento,
      ...(pagamento === "DINHEIRO" && {
        precisaTroco,
        trocoPara: precisaTroco ? troco : undefined,
      }),
    };

    setEnviando(true);
    try {
      const pedido = await api.criarPedido(body);
      if (aceitouLembrar && lembrar) {
        // Retirada não pergunta endereço: mantém o último endereço de entrega salvo.
        salvarDados({
          nome: nome.trim(),
          telefone,
          endereco:
            tipo === "ENTREGA" ? endereco.trim() : (salvos?.endereco ?? ""),
          numero: tipo === "ENTREGA" ? numero.trim() : (salvos?.numero ?? ""),
          bairro: tipo === "ENTREGA" ? bairro.trim() : (salvos?.bairro ?? ""),
          pontoReferencia:
            tipo === "ENTREGA"
              ? pontoReferencia.trim()
              : (salvos?.pontoReferencia ?? ""),
        });
      } else if (!lembrar) {
        apagarDados();
      }
      navigate(`/pedido/${pedido.codigo}`, { state: { novo: true } });
    } catch (err) {
      if (err instanceof ApiError && err.erros.length) {
        const mapped: Erros = {};
        for (const item of err.erros)
          mapped[
            item.campo.split(".")[0] === "bebidas"
              ? "bebida"
              : item.campo.split(".")[0]
          ] ??= item.mensagem;
        setErros(mapped);
      }
      setErroGeral(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o pedido.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="page-columns">
      <div className="stack">
        {/* 1. Quantidade */}
        <Quantidade
          valores={valores}
          qtdText={qtdText}
          setQtdText={setQtdText}
          qtd={qtd}
          qtdOk={qtdOk}
          erro={erros.quantidade}
        />

        {/* 2. Sabores */}
        <Sabores
          sabores={sabores}
          qtd={qtd}
          qtdOk={qtdOk}
          modoSabores={modoSabores}
          setModoSabores={setModoSabores}
          selecao={selecao}
          setSelecao={setSelecao}
          escolhidos={escolhidos}
          setEscolhidos={setEscolhidos}
          erro={erros.sabores}
        />

        {/* 3. Bebidas (só quando há bebidas à venda) */}
        {bebidaObrigatoria && (
          <BebidaEscolha
            bebidas={bebidas}
            quantidades={bebidasQtd}
            setQuantidades={setBebidasQtd}
            semBebida={semBebida}
            setSemBebida={setSemBebida}
            erro={erros.bebida}
          />
        )}

        {/* 4. Entrega ou retirada */}
        <Envio
          taxas={taxas}
          tempo={tempo}
          funcionamento={funcionamento}
          tipo={tipo}
          escolherTipo={escolherTipo}
          endereco={endereco}
          setEndereco={setEndereco}
          numero={numero}
          setNumero={setNumero}
          bairro={bairro}
          setBairro={setBairro}
          pontoReferencia={pontoReferencia}
          setPontoReferencia={setPontoReferencia}
          quando={quando}
          setQuando={setQuando}
          horario={horario}
          setHorario={setHorario}
          horarioAtendimento={horarioAtendimento}
          foraDoHorario={foraDoHorario}
          semEntregaHoje={semEntregaHoje}
          prontoIndisponivel={prontoIndisponivel}
          menorHorario={menorHorario}
          erros={erros}
        />

        {/* 5. Dados */}
        <DadosCliente
          nome={nome}
          setNome={setNome}
          telefone={telefone}
          setTelefone={setTelefone}
          podeLembrar={aceitouLembrar}
          lembrar={lembrar}
          setLembrar={setLembrar}
          erros={erros}
        />

        {/* 6. Pagamento */}
        <Pagamento
          formasPagamento={formasPagamento}
          pagamento={pagamento}
          setPagamento={setPagamento}
          precisaTroco={precisaTroco}
          setPrecisaTroco={setPrecisaTroco}
          trocoText={trocoText}
          setTrocoText={setTrocoText}
          troco={troco}
          pix={pix}
          qtd={qtd}
          qtdOk={qtdOk}
          quando={quando}
          horario={horario}
          erros={erros}
        />

        {/* 7. Observação */}
        <Observacao
          observacao={observacao}
          setObservacao={setObservacao}
          erros={erros}
        />
      </div>

      {/* Resumo */}
      <Resumo
        tempo={tempo}
        tipo={tipo}
        qtd={qtd}
        qtdOk={qtdOk}
        modoSabores={modoSabores}
        nSabores={nSabores}
        subtotal={subtotal}
        preco={preco}
        faltaParaGratis={faltaParaGratis}
        bebidas={
          unidadesBebida > 0
            ? { unidades: unidadesBebida, valor: valorBebida }
            : null
        }
        erroGeral={erroGeral}
        enviando={enviando}
      />

      <Dialog open={confirmandoDados} onOpenChange={setConfirmandoDados}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confira se seus dados estão corretos</DialogTitle>
            <DialogDescription>
              Vamos chamar você no WhatsApp neste número, se precisarmos.
              {entrega
                ? " A entrega será feita no endereço informado."
                : ""}{" "}
              Confira o DDD e não inclua o 55 do Brasil.
            </DialogDescription>
          </DialogHeader>
          <dl className="grid gap-3 text-sm" aria-label="Dados do pedido">
            <div>
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="font-semibold">{nome.trim()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Telefone / WhatsApp</dt>
              <dd
                className="text-xl font-semibold tabular-nums"
                aria-label={`Telefone ${formatPhone(telefone)}`}
              >
                {formatPhone(telefone)}
              </dd>
            </div>
            {entrega && (
              <div>
                <dt className="text-muted-foreground">Endereço de entrega</dt>
                <dd className="font-semibold">
                  {endereco.trim()}, {numero.trim()} - {bairro.trim()}
                  {pontoReferencia.trim() && (
                    <span className="block font-normal text-muted-foreground">
                      Ponto de referência: {pontoReferencia.trim()}
                    </span>
                  )}
                </dd>
              </div>
            )}
          </dl>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmandoDados(false);
                // O endereço é o primeiro campo do formulário; na retirada ele não existe e vale o nome.
                requestAnimationFrame(() =>
                  document
                    .getElementById(entrega ? "endereco" : "nome")
                    ?.focus(),
                );
              }}
            >
              Corrigir
            </Button>
            <Button
              type="button"
              onClick={() => {
                setDadosConfirmados(assinaturaDados);
                void submit(undefined, true);
              }}
            >
              Está tudo correto, enviar pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

// Avisos do topo da página: estabelecimento fechado, férias, fora do horário e dia sem entrega.
function AvisoFuncionamento({ f }: { f: Funcionamento }) {
  const horario = textoHorario(f);

  if (f.motivoFechado === "FECHADO_MANUAL") {
    return (
      <div role="status" className="alert alert--error aviso">
        <p className="aviso__title">
          <Store className="size-4" /> Estamos fechados no momento
        </p>
        <p>
          Não estamos aceitando pedidos agora.{" "}
          {horario ? `Nosso atendimento é ${horario}. ` : ""}Volte em breve!
        </p>
      </div>
    );
  }

  if (f.motivoFechado === "FERIAS" && f.ferias) {
    return (
      <div role="status" className="alert alert--error aviso">
        <p className="aviso__title">
          <Store className="size-4" /> Estamos de férias
        </p>
        <p>
          Ficaremos fechados {textoPeriodo(f.ferias)} e não estamos aceitando
          pedidos nesse período. Até a volta!
        </p>
      </div>
    );
  }

  return (
    <>
      {f.motivoFechado === "FORA_DO_HORARIO" && (
        <div role="status" className="alert alert--info aviso">
          <p className="aviso__title">
            <Clock className="size-4" /> Fora do horário de atendimento
          </p>
          <p>
            Nosso atendimento é {horario}. Você pode fazer o pedido agendando um
            horário dentro do atendimento.
          </p>
        </div>
      )}
      {!f.entregaHoje && (
        <div role="status" className="alert alert--info aviso">
          <p className="aviso__title">
            <Truck className="size-4" /> Hoje só temos retirada
          </p>
          <p>Para receber em casa, agende a entrega para outro dia.</p>
        </div>
      )}
    </>
  );
}

export default function OrderPage() {
  const catalogo = useFetch(api.catalogo, []);

  return (
    <>
      <AvisoEntrega />
      <SiteHeader whatsapp={catalogo.data?.pix.whatsapp} />
      {catalogo.data?.funcionamento.ferias && (
        <FaixaFerias
          ferias={catalogo.data.funcionamento.ferias}
          emAndamento={catalogo.data.funcionamento.motivoFechado === "FERIAS"}
        />
      )}
      <main className="page">
        <section className="hero">
          {catalogo.data && (
            <p
              role="status"
              className="mb-3 flex items-center gap-2 text-lg font-semibold"
            >
              <span
                aria-hidden="true"
                className={`inline-block size-3 rounded-full border-2 border-black ${catalogo.data.funcionamento.aberto ? "bg-green-500" : "bg-red-500"}`}
              />
              {catalogo.data.funcionamento.aberto ? "Aberto" : "Fechado"}
            </p>
          )}
          <p className="hero__eyebrow">
            <Clock className="size-4" />
            {catalogo.data
              ? `Preparo em ${catalogo.data.tempo.minimoMin} a ${catalogo.data.tempo.maximoMin} min`
              : "Mini salgados feitos com carinho"}
          </p>
          <p className="hero__aviso">
            <MapPinCheck className="size-4 shrink-0" /> Entregas apenas em
            Paiçandu, PR
          </p>
          <p className="hero__text font-semibold">
            Escolha a quantidade, os sabores e como quer receber. A gente cuida
            do resto!
          </p>
          <TrackOrder />
          <p className="hero__aviso mt-4 mb-0!">
            <Info className="size-4 shrink-0" /> Se precisar falar conosco,
            clique no botão de WhatsApp acima.
          </p>
        </section>

        {catalogo.loading && !catalogo.data ? (
          <LoadingState label="Carregando cardápio..." />
        ) : catalogo.data ? (
          <>
            <AvisoFuncionamento f={catalogo.data.funcionamento} />
            {/* Fechado pelo admin ou de férias: não há o que pedir até reabrir. */}
            {catalogo.data.funcionamento.motivoFechado !== "FECHADO_MANUAL" &&
              catalogo.data.funcionamento.motivoFechado !== "FERIAS" && (
                <OrderForm catalogo={catalogo.data} />
              )}
          </>
        ) : (
          <ErrorState
            error={catalogo.error}
            onRetry={catalogo.reload}
            title="Não conseguimos abrir o cardápio"
          />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
