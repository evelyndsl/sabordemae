import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env["DATABASE_URL"]! }),
});

// Com SEED_SOBRESCREVER=1 (usado no banco de testes) os valores base voltam ao padrão.
// Sem isso, o que o admin já editou é preservado.
const sobrescrever = process.env["SEED_SOBRESCREVER"] === "1";

const sabores = [
  "Coxinha de frango",
  "Enroladinho de salsicha",
  "Croquete de queijo e presunto",
  "Bolinha de queijo",
  "Risóles de carne",
  "Kibe de carne",
  "Mini pastel de pizza",
  "Mini pastel de carne",
];

const faixas = [
  [10, "13.00"],
  [20, "20.00"],
  [30, "29.00"],
  [40, "35.00"],
  [50, "39.00"],
  [60, "44.00"],
  [70, "49.00"],
  [80, "55.00"],
  [90, "59.00"],
  [100, "64.00"],
] as const;

const configuracaoPadrao = {
  tempoPreparoMinimoMin: 30,
  tempoPreparoMaximoMin: 60,
  valorUnidadeAcimaDe100: "0.64",
  taxaEntregaAte49: "7.00",
  taxaEntregaDe50a199: "5.00",
  entregaGratisAPartirDe: 200,
  tipoChavePix: "CPF",
  chavePix: "00000000000",
  titularPix: null,
  bancoPix: null,
  whatsappEstabelecimento: null,
  pixAntecedenciaAteLimiteHoras: 2,
  pixAntecedenciaAcimaLimiteHoras: 4,
  nomeMarca: "Sabor de Mãe",
} as const;

async function main() {
  for (const nome of sabores) {
    await prisma.sabor.upsert({
      where: { nome },
      update: sobrescrever ? { ativo: true } : {},
      create: { nome },
    });
  }

  for (const [quantidade, valor] of faixas) {
    await prisma.faixaPreco.upsert({
      where: { quantidade },
      update: sobrescrever ? { valor } : {},
      create: { quantidade, valor },
    });
  }

  await prisma.configuracao.upsert({
    where: { id: 1 },
    update: sobrescrever ? configuracaoPadrao : {},
    create: { id: 1, ...configuracaoPadrao },
  });

  const usuario = process.env["ADMIN_USER"];
  const senha = process.env["ADMIN_PASSWORD"];

  if (usuario && senha) {
    const senhaHash = await bcrypt.hash(senha, 12);
    await prisma.adminUser.upsert({
      where: { usuario },
      update: { senhaHash },
      create: { usuario, senhaHash },
    });
    console.log(`Admin "${usuario}" criado/atualizado.`);
  } else {
    console.warn("ADMIN_USER/ADMIN_PASSWORD ausentes no .env: admin não foi criado.");
  }

  console.log("Seed concluído.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
