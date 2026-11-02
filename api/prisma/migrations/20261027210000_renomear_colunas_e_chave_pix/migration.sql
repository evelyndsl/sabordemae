-- CreateEnum
CREATE TYPE "TipoChavePix" AS ENUM ('CPF', 'CNPJ', 'TELEFONE', 'ALEATORIA');

-- Renomeia colunas (RENAME preserva os dados; o Prisma geraria DROP + ADD)
ALTER TABLE "Configuracao" RENAME COLUMN "taxaEntrega" TO "taxaEntregaDe50a199";
ALTER TABLE "Configuracao" RENAME COLUMN "entregaGratisAcimaDe" TO "entregaGratisAPartirDe";

-- Chave Pix: tipo + valor padrão de "ainda não configurada"
ALTER TABLE "Configuracao" ADD COLUMN "tipoChavePix" "TipoChavePix" NOT NULL DEFAULT 'CPF';
ALTER TABLE "Configuracao" ALTER COLUMN "chavePix" SET DEFAULT '00000000000';
UPDATE "Configuracao" SET "chavePix" = '00000000000' WHERE "chavePix" = '';
