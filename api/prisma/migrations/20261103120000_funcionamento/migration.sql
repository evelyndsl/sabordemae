-- Funcionamento: horário de atendimento, estabelecimento fechado e entrega suspensa no dia
ALTER TABLE "Configuracao" ADD COLUMN "horarioAbertura" VARCHAR(5);
ALTER TABLE "Configuracao" ADD COLUMN "horarioFechamento" VARCHAR(5);
ALTER TABLE "Configuracao" ADD COLUMN "estabelecimentoFechado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Configuracao" ADD COLUMN "entregaSuspensaEm" VARCHAR(10);
