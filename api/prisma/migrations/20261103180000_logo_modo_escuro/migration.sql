-- Logo opcional para o modo escuro
ALTER TABLE "Configuracao" ADD COLUMN "logoEscuraDados" BYTEA;
ALTER TABLE "Configuracao" ADD COLUMN "logoEscuraTipo" VARCHAR(30);
ALTER TABLE "Configuracao" ADD COLUMN "logoEscuraAtualizadaEm" TIMESTAMP(3);
