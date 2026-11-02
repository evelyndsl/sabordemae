-- Marca (nome e logo) e cores editáveis pelo admin
ALTER TABLE "Configuracao" ADD COLUMN "nomeMarca" VARCHAR(60) NOT NULL DEFAULT 'Sabor de Mãe';
ALTER TABLE "Configuracao" ADD COLUMN "logoDados" BYTEA;
ALTER TABLE "Configuracao" ADD COLUMN "logoTipo" VARCHAR(30);
ALTER TABLE "Configuracao" ADD COLUMN "logoAtualizadaEm" TIMESTAMP(3);
ALTER TABLE "Configuracao" ADD COLUMN "cores" JSONB;
