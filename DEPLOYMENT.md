# Guia de Execução e Deployment

Este guia explica como correr o projeto localmente e como fazer o deploy para a internet.

## 1. Como Correr Localmente

O projeto está dividido em duas partes: `client` (Frontend) e `server` (Backend). Precisas de dois terminais abertos.

### Passo 1: Base de Dados
Certifica-te que tens o PostgreSQL a correr localmente.
```bash
# Na pasta server
npx prisma migrate dev
```

### Passo 2: Backend (Server)
No primeiro terminal:
```bash
cd server
npm run dev
```
*O servidor ficará a correr em `http://localhost:3000`.*

### Passo 3: Frontend (Client)
No segundo terminal:
```bash
cd client
npm run dev
```
*O frontend ficará a correr em `http://localhost:5173`.*

---

## 2. Como Fazer Deploy para a Internet

Para uma aplicação com esta arquitetura (React + Node.js + PostgreSQL), a estratégia mais simples e moderna é separar os serviços.

### Estrutura Recomendada
*   **Frontend (React):** Vercel ou Netlify.
*   **Backend (Node.js):** Render, Railway ou Heroku.
*   **Base de Dados (PostgreSQL):** Neon, Supabase ou Railway.

### Guia Passo-a-Passo (Opção Gratuita/Barata)

#### A. Base de Dados (Neon ou Supabase)
1.  Cria uma conta no **Neon.tech** ou **Supabase**.
2.  Cria um novo projeto.
3.  **Copia a Connection String:**
    *   No dashboard do Neon/Supabase, procura por "Connection String" ou "Database URL".
    *   Deve começar por `postgres://` ou `postgresql://`.
    *   *Exemplo:* `postgres://henrique:password123@ep-cool-frog.us-east-2.aws.neon.tech/neondb`
4.  **Aplica as Migrações (Temporariamente):**
    *   Vai ao ficheiro `server/.env` no teu computador.
    *   Coloca um `#` antes da tua `DATABASE_URL` local para a comentar.
    *   Cola a nova URL da cloud por baixo.
    *   Corre o comando: `npx prisma migrate deploy`
    *   **MUITO IMPORTANTE:** Depois de terminar, apaga a URL da cloud e remove o `#` da local para voltares a trabalhar no teu computador!

#### B. Backend (Render.com)
1.  Cria conta no **Render**.
2.  Cria um **New Web Service**.
3.  Conecta o teu repositório GitHub.
4.  **Configurações:**
    *   **Root Directory:** `server`
    *   **Build Command:** `npm install && npm run build` (ou `npx prisma generate && tsc`)
    *   **Start Command:** `npm start`
5.  **Environment Variables (Variáveis de Ambiente):**
    *   Adiciona todas as variáveis do teu `.env` (`DATABASE_URL`, `JWT_SECRET`, etc.).
    *   **Importante:** A `DATABASE_URL` deve ser a da base de dados de produção (passo A).

#### C. Frontend (Opção 1: Vercel - Recomendado)
1.  Cria conta na **Vercel**.
2.  Importa o teu projeto do GitHub.
3.  **Configurações:**
    *   **Framework Preset:** Vite
    *   **Root Directory:** `client`
4.  **Environment Variables:**
    *   Adiciona `VITE_API_URL` com o link do teu backend no Render.

#### D. Frontend (Opção 2: Netlify - Também Excelente)
1.  Cria conta na **Netlify**.
2.  "Add new site" -> "Import an existing project" -> GitHub.
3.  **Configurações:**
    *   **Base directory:** `client`
    *   **Build command:** `npm run build`
    *   **Publish directory:** `dist`
4.  **Environment Variables:**
    *   Vai a "Site configuration" -> "Environment variables".
    *   Adiciona `VITE_API_URL` com o link do teu backend no Render.
    *   **Nota:** No Netlify, por vezes é preciso adicionar um ficheiro `_redirects` na pasta `public` do client com o conteúdo `/* /index.html 200` para o routing do React funcionar bem ao recarregar páginas.

### Organização do Repositório
A tua estrutura atual já está ótima para isto (Monorepo simples):
```
/ (Raiz do Git)
├── client/  -> Deploy na Vercel (Root Directory: client)
├── server/  -> Deploy no Render (Root Directory: server)
└── README.md
```

### Dicas Importantes
1.  **CORS:** No `server/src/index.ts`, atualiza a configuração do CORS para aceitar o domínio do teu frontend na Vercel (ex: `app.use(cors({ origin: 'https://meu-app.vercel.app' }));`).
2.  **Segurança:** Nunca faças commit dos ficheiros `.env`. Usa as configurações do painel de controlo do Vercel/Render para guardar as chaves secretas.
3.  **Build:** Verifica sempre se o comando `npm run build` funciona localmente antes de fazer deploy.
