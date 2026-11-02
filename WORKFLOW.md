# WORKFLOW — como as peças se ligam e como colocar no ar

Este guia explica a ligação entre **GitHub**, **Neon** (banco), **Vercel** (API e front) e o **GitHub Actions** (testes), na ordem em que você precisa configurar. Para rodar só na sua máquina, o [README da raiz](README.md) basta.

## 1. Visão geral

```
                      ┌─────────────────────────┐
  Navegador ────────► │ Vercel: projeto "web"   │  site estático (Vite)
  (cliente / lojista) │ Root Directory: web     │
                      └───────────┬─────────────┘
                                  │ fetch(VITE_API_URL + "/pedido", ...)
                                  ▼
                      ┌─────────────────────────┐        ┌──────────────────────┐
                      │ Vercel: projeto "api"   │ ─────► │ Neon: banco de       │
                      │ Root Directory: api     │  SQL   │ PRODUÇÃO             │
                      │ (Fastify, serverless)   │        └──────────────────────┘
                      └─────────────────────────┘
                         ▲ só aceita a origem WEB_URL (CORS)

  GitHub ── push/PR ──► GitHub Actions ──► testes da API ──► Neon: banco de TESTES (separado!)
        └─ push na main ─► Vercel faz o deploy dos dois projetos
```

Três ligações fazem tudo funcionar:

| Ligação | Onde se configura | Por quê |
|---|---|---|
| Front → API | `VITE_API_URL` no projeto **web** | O front só conhece a API por essa URL (entra no build). |
| API ← Front | `WEB_URL` no projeto **api** | CORS: o navegador só deixa o front chamar a API se `WEB_URL` for exatamente a URL do front. |
| API → Banco | `DATABASE_URL` no projeto **api** | Conexão com o Neon de produção. |

## 2. Variáveis de ambiente, em um só lugar

| Variável | Local (`.env`) | Vercel `api` | Vercel `web` | GitHub Actions |
|---|---|---|---|---|
| `DATABASE_URL` | `api/.env` | sim (string do Neon **com `-pooler`**) | — | — |
| `JWT_SECRET` (≥ 32 caracteres) | `api/.env` | sim (gere um novo para produção) | — | — |
| `WEB_URL` | `api/.env` (padrão `http://localhost:5173`) | sim: URL do front, `https://...` e **sem barra no final** | — | — |
| `ADMIN_USER`, `ADMIN_PASSWORD` | `api/.env` | não (só para rodar o seed) | — | — |
| `DATABASE_TESTS_URL` | `api/.env` | — | — | **secret** do repositório |
| `VITE_API_URL` | `web/.env` (opcional) | — | sim: URL da API, **sem barra no final** | — |

Notas:
- `.env` nunca vai para o git (já está no `.gitignore` de `api/` e `web/`).
- Tudo que é `VITE_*` fica visível no navegador: não coloque segredo no front.
- WhatsApp, chave Pix, favorecido e banco **não são variáveis**: o lojista cadastra no painel, em **Pix e contato**.

## 3. Ordem para colocar no ar

### 3.1 Banco (Neon)
1. Crie um projeto no Neon.
2. Tenha **dois bancos/branches**: um de **produção** e outro de **testes** (por exemplo, uma branch `testes`). Os testes apagam e recriam dados, então jamais aponte-os para produção.
3. Anote as connection strings. Para produção você usará duas versões da mesma URL:
   - **direta** (sem `-pooler`): para rodar migrations e seed;
   - **com `-pooler`**: para a API na Vercel (serverless abre muitas conexões curtas).

### 3.2 GitHub
1. Crie o repositório e envie o código (`api/`, `web/`, `.github/`, READMEs). Confira com `git status` que nenhum `.env` aparece.
2. Em **Settings → Secrets and variables → Actions**, crie o secret `DATABASE_TESTS_URL` com a string do banco de **testes**.
3. Os workflows em `.github/workflows/` rodam sozinhos:
   - `api-tests.yml`: typecheck + testes da API (se algo em `api/` mudar);
   - `web-tests.yml`: build + testes do web (se algo em `web/` mudar).

   Ao abrir um PR, a aba **Checks** mostra o resultado. Recomendado: em **Settings → Branches**, exigir esses checks antes de aceitar merge na `main`.

### 3.3 Projeto "api" na Vercel
1. **Add New → Project**, escolha o repositório.
2. **Root Directory:** `api`. Não precisa de `vercel.json` (a Vercel detecta o Fastify em `src/server.ts`).
3. Em **Environment Variables**, defina `DATABASE_URL` (com `-pooler`), `JWT_SECRET` e `WEB_URL`.
   - Você ainda não sabe a URL do front: coloque um valor provisório e volte aqui no passo 3.6.
4. Faça o deploy. Se o build falhar procurando `src/generated/prisma`, confira se o `postinstall` (`prisma generate`) está no `api/package.json`.

### 3.4 Migrations e seed no banco de produção
A Vercel **não** cria as tabelas. Rode uma vez, da sua máquina, dentro de `api/`, com a string **direta** de produção:

```bash
# bash
DATABASE_URL="<string direta de produção>" npm run db:deploy
DATABASE_URL="<string direta de produção>" ADMIN_USER="<usuario>" ADMIN_PASSWORD="<senha forte>" npm run db:seed
```
```powershell
# PowerShell
$env:DATABASE_URL="<string direta de produção>"; npm run db:deploy
$env:ADMIN_USER="<usuario>"; $env:ADMIN_PASSWORD="<senha forte>"; npm run db:seed
```

Depois, teste `https://<sua-api>.vercel.app/health` → `{"status":"ok"}`. O seed é seguro para repetir: preserva preços, sabores e Pix já editados, e só atualiza a senha do admin.

### 3.5 Projeto "web" na Vercel
1. Novo projeto, mesmo repositório, **Root Directory:** `web` (o Vite é detectado sozinho).
2. Defina `VITE_API_URL` = URL da API (ex.: `https://sua-api.vercel.app`, sem barra no final).
3. Faça o deploy. O `web/vercel.json` faz qualquer rota cair no `index.html` (necessário para `/pedido/CODIGO` e `/admin/...` funcionarem ao recarregar).

### 3.6 Fechar o ciclo (CORS)
1. No projeto **api**, edite `WEB_URL` para a URL final do front (a do projeto web, ou seu domínio próprio).
2. **Redeploy** da API (variáveis só valem em novos deploys).
3. Abra o front, vá em `/pedido`: o cardápio deve carregar. Se aparecer erro de CORS no console, `WEB_URL` não bate com a URL do navegador (veja a seção 6).

### 3.7 Primeiro uso no painel
Entre em `<front>/admin/login` e configure:
1. **Pix e contato:** WhatsApp, chave Pix, favorecido, banco e as horas de antecedência do pagamento.
2. **Preços e entrega:** confira tabela, taxas e tempo de preparo.
3. **Sabores:** ative/desative conforme o cardápio.

## 4. Rotina do dia a dia

| Quero... | Faça |
|---|---|
| Publicar uma mudança | Abra um PR; quando os checks passarem, faça merge na `main`. A Vercel faz o deploy dos dois projetos. |
| Mudar o banco (tabela/coluna) | 1) edite `api/prisma/schema.prisma`; 2) `npm run db:migrate` (gera a migration, só em dev); 3) teste; 4) commit; 5) **antes** de publicar o código, rode `npm run db:deploy` em produção (3.4). |
| Trocar a senha do admin | Rode o seed de novo com o novo `ADMIN_PASSWORD` (3.4). |
| Trocar o domínio do front | Atualize `WEB_URL` (api) e redeploy da API. |
| Trocar o domínio da API | Atualize `VITE_API_URL` (web) e redeploy do web. |
| Rodar os testes na máquina | `cd api && npm test` e `cd web && npm test`. |

## 5. Segurança (checklist)

- [ ] `JWT_SECRET` de produção diferente do local (48+ bytes aleatórios).
- [ ] Senha do admin forte (não use a de testes locais).
- [ ] `DATABASE_TESTS_URL` aponta para um banco **de testes**, nunca para produção.
- [ ] Nenhum `.env` no git (`git ls-files | grep .env` não deve listar nada além de `.env.example`).
- [ ] `WEB_URL` é só a URL do front de produção.

## 6. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Console: "blocked by CORS policy" | `WEB_URL` diferente da URL aberta no navegador (http/https, `www`, barra no final, outro domínio) | Ajuste `WEB_URL` na api e faça redeploy. |
| CORS só em URLs de *preview* da Vercel | A API aceita uma única origem | Teste pela URL de produção do front ou use o ambiente local. |
| Front diz "Não foi possível conectar ao servidor" | `VITE_API_URL` errada/ausente, ou API fora do ar | Confira a variável, **refaça o deploy do web** (entra no build) e teste `/health` da API. |
| 404 ao recarregar `/pedido/...` ou `/admin/...` | Falta o rewrite de SPA | Confirme que `web/vercel.json` existe e o Root Directory é `web`. |
| API: "Variáveis de ambiente inválidas" | `DATABASE_URL` ou `JWT_SECRET` (mín. 32) ausentes | Defina em **Settings → Environment Variables** e redeploy. |
| Erro 500 e "relation/column does not exist" | Migrations não aplicadas em produção | Rode `npm run db:deploy` com a string de produção (3.4). |
| Login do admin falha (401) | Seed não rodou, ou rodou em outro banco | Rode o seed no banco de produção (3.4). |
| 429 em login/pedido | Rate limit (login 5/min, pedido 10/min) | Aguarde 1 minuto. |
| Pix não aparece para o cliente | Chave ainda não cadastrada | Cadastre em **Pix e contato**. |
| Botão de WhatsApp do Pix sumiu | WhatsApp do estabelecimento vazio | Preencha em **Pix e contato**. |
| Job da API falha no GitHub: `DATABASE_TESTS_URL` | Secret ausente ou igual a `DATABASE_URL` | Crie o secret com a string do banco de testes. |
| Testes do GitHub falham em PR de fork | Forks não recebem secrets | Rode os testes localmente ou use PR de branch do próprio repositório. |

## 7. Limitações conhecidas

- **Rate limit em serverless:** a contagem fica na memória de cada instância; vale como proteção básica. Para um limite rígido seria preciso um armazenamento compartilhado (ex.: Redis).
- **Uma origem no CORS:** a API aceita só `WEB_URL`.
- **Pix manual:** o sistema não confirma pagamentos; o lojista confere o comprovante no WhatsApp e muda o pedido para "Pagamento aprovado".
- **Deploy da API na Vercel:** configurado seguindo a documentação de Fastify "zero-config". Confira `GET /health` logo após o primeiro deploy.
