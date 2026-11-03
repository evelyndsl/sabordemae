-- Dias de atendimento e endereço de retirada
ALTER TABLE "Configuracao" ADD COLUMN "diasAtendimento" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6]::INTEGER[];
ALTER TABLE "Configuracao" ADD COLUMN "enderecoRetirada" VARCHAR(300);
ALTER TABLE "Pedido" ADD COLUMN "enderecoRetirada" VARCHAR(300);
