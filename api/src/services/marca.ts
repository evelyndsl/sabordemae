import { Prisma } from "../generated/prisma/client.js";
import { validarLogo, type TipoLogo } from "../lib/logo.js";
import { prisma } from "../lib/prisma.js";
import { coresSchema } from "../schemas/marca.js";
import { obterConfiguracao } from "./catalogo.js";

export async function obterMarca() {
  const config = await obterConfiguracao();
  // O que está salvo passa de novo pelo schema: nunca devolvemos algo fora do formato esperado.
  const cores = config.cores ? coresSchema.safeParse(config.cores) : null;

  return {
    nome: config.nomeMarca,
    logoVersao: config.logoDados && config.logoAtualizadaEm ? config.logoAtualizadaEm.getTime() : null,
    cores: cores?.success ? cores.data : null,
  };
}

export async function obterLogo() {
  const config = await obterConfiguracao();
  if (!config.logoDados || !config.logoTipo) return null;
  return { tipo: config.logoTipo, dados: Buffer.from(config.logoDados) };
}

export async function atualizarMarca(dados: { nome: string; cores: unknown }) {
  await prisma.configuracao.update({
    where: { id: 1 },
    data: { nomeMarca: dados.nome, cores: dados.cores === null ? Prisma.DbNull : (dados.cores as Prisma.InputJsonValue) },
  });
  return obterMarca();
}

export async function salvarLogo(tipo: TipoLogo, base64: string) {
  const dados = Buffer.from(base64, "base64");
  validarLogo(tipo, dados);

  await prisma.configuracao.update({
    where: { id: 1 },
    data: { logoDados: dados, logoTipo: tipo, logoAtualizadaEm: new Date() },
  });
  return obterMarca();
}

export async function removerLogo() {
  await prisma.configuracao.update({
    where: { id: 1 },
    data: { logoDados: null, logoTipo: null, logoAtualizadaEm: null },
  });
  return obterMarca();
}
