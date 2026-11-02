-- Ponto de referência da entrega (opcional)
ALTER TABLE "Pedido" ADD COLUMN "pontoReferencia" VARCHAR(200);

-- O cliente pode só escolher os sabores, sem definir a quantidade de cada um
ALTER TABLE "ItemPedido" ALTER COLUMN "quantidade" DROP NOT NULL;
