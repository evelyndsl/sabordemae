import { getTestDatabaseUrl } from "./test-env.js";

// Roda antes de cada arquivo de teste e antes de qualquer import da aplicação.
process.env["DATABASE_URL"] = getTestDatabaseUrl();
process.env["NODE_ENV"] = "test";
process.env["JWT_SECRET"] ??= "segredo-apenas-para-testes-0123456789abcdef";
