import "dotenv/config";

// Admin só dos testes: criado no banco de testes, nunca usa as credenciais reais do .env.
export const ADMIN_TESTE = { usuario: "admin_teste", senha: "senha-de-teste-123" };

// Os testes gravam no banco, então nunca podem apontar para o banco de produção.
export function getTestDatabaseUrl(): string {
  const url = process.env["DATABASE_TESTS_URL"];

  if (!url) {
    throw new Error("DATABASE_TESTS_URL não está definida no .env.");
  }
  if (url === process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_TESTS_URL é igual a DATABASE_URL. Use um banco separado para os testes.");
  }

  return url;
}
