-- Período de férias do estabelecimento (AAAA-MM-DD, Brasília)
ALTER TABLE "Configuracao" ADD COLUMN "feriasInicio" VARCHAR(10);
ALTER TABLE "Configuracao" ADD COLUMN "feriasFim" VARCHAR(10);
