import { execSync } from "node:child_process";
import { ADMIN_TESTE, getTestDatabaseUrl } from "./test-env.js";

// Roda uma vez antes de todos os testes: deixa o banco de testes com o schema, os dados base
// no estado padrão e um admin só para os testes.
export default function setup() {
  const env = {
    ...process.env,
    DATABASE_URL: getTestDatabaseUrl(),
    ADMIN_USER: ADMIN_TESTE.usuario,
    ADMIN_PASSWORD: ADMIN_TESTE.senha,
    SEED_SOBRESCREVER: "1",
  };

  execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "inherit" });
}
