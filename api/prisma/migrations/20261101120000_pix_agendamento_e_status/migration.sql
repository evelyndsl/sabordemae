-- Novos status para pedidos pagos com Pix
ALTER TYPE "StatusPedido" ADD VALUE 'AGUARDANDO_PAGAMENTO';
ALTER TYPE "StatusPedido" ADD VALUE 'PAGAMENTO_APROVADO';

-- O horário agora vale para entrega e retirada (RENAME preserva os dados); nulo = "para quando ficar pronto"
ALTER TABLE "Pedido" RENAME COLUMN "horarioRetirada" TO "horarioAgendado";

-- Pedido: tempo de preparo informado pelo admin e prazo de pagamento do Pix
ALTER TABLE "Pedido" ADD COLUMN "tempoPreparoMin" INTEGER;
ALTER TABLE "Pedido" ADD COLUMN "previsaoEm" TIMESTAMP(3);
ALTER TABLE "Pedido" ADD COLUMN "pixAntecedenciaHoras" INTEGER;
ALTER TABLE "Pedido" ADD COLUMN "pagarAte" TIMESTAMP(3);

-- Configuração: dados do Pix, WhatsApp do estabelecimento e antecedência do pagamento
ALTER TABLE "Configuracao" ADD COLUMN "titularPix" VARCHAR(80);
ALTER TABLE "Configuracao" ADD COLUMN "bancoPix" VARCHAR(80);
ALTER TABLE "Configuracao" ADD COLUMN "whatsappEstabelecimento" VARCHAR(20);
ALTER TABLE "Configuracao" ADD COLUMN "pixAntecedenciaAteLimiteHoras" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Configuracao" ADD COLUMN "pixAntecedenciaAcimaLimiteHoras" INTEGER NOT NULL DEFAULT 4;
