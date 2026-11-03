-- Troco no pagamento em dinheiro
ALTER TABLE "Pedido" ADD COLUMN "precisaTroco" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Pedido" ADD COLUMN "trocoPara" DECIMAL(10,2);
