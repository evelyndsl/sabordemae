import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

// Usado quando o usuário não existe, para o tempo de resposta não revelar quais usuários existem.
const hashFalso = bcrypt.hash("senha-inexistente", 12);

export async function autenticarAdmin(usuario: string, senha: string) {
  const admin = await prisma.adminUser.findUnique({ where: { usuario } });
  const senhaCorreta = await bcrypt.compare(senha, admin?.senhaHash ?? (await hashFalso));

  return admin && senhaCorreta ? admin : null;
}
