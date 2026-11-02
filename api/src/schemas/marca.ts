import { z } from "zod";
import { TIPOS_LOGO } from "../lib/logo.js";

// Entrada: valida o formato e grava em minúsculas.
const corEntrada = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato #RRGGBB.")
  .transform((v) => v.toLowerCase());
// Saída: sem transform (o serializador de resposta do Fastify faz "encode", que não aceita transform de mão única).
const corSaida = z.string();

// Cores editáveis de um tema (claro ou escuro). Ausente = usa o padrão do app.
function criarCoresSchema<C extends z.ZodType<string>>(cor: C) {
  const paleta = z.object({
    fundo: cor.optional(),
    texto: cor.optional(),
    cartao: cor.optional(),
    primaria: cor.optional(),
    destaque: cor.optional(),
    textoSecundario: cor.optional(),
    borda: cor.optional(),
  });
  const paletaAdmin = paleta.extend({ barraLateral: cor.optional() });

  return z.object({
    publico: z.object({ claro: paleta.optional(), escuro: paleta.optional() }).optional(),
    admin: z.object({ claro: paletaAdmin.optional(), escuro: paletaAdmin.optional() }).optional(),
  });
}

export const coresSchema = criarCoresSchema(corEntrada);
const coresRespostaSchema = criarCoresSchema(corSaida);

export const marcaRespostaSchema = z.object({
  nome: z.string(),
  // Versão da logo (use em /marca/logo?v=...) ou nulo quando não há logo.
  logoVersao: z.number().nullable(),
  cores: coresRespostaSchema.nullable(),
});

export const atualizarMarcaSchema = z.object({
  nome: z.string().trim().min(2, "O nome deve ter ao menos 2 caracteres.").max(60, "O nome deve ter no máximo 60 caracteres."),
  // null restaura as cores padrão.
  cores: coresSchema.nullable(),
});

export const enviarLogoSchema = z.object({
  tipo: z.enum(TIPOS_LOGO),
  // Conteúdo do arquivo em base64 (sem o prefixo "data:...").
  dados: z.string().min(1).max(600_000),
});
