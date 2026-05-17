# AMMOC Car Tracking — Deploy Guide

## 1. GitHub — Criar repositório e subir o código

1. Acesse github.com e crie um novo repositório chamado **CarTrackingammoc** (público ou privado)
2. Copie a URL do repositório (ex: `https://github.com/SEU_USUARIO/CarTrackingammoc.git`)
3. Na pasta raiz do projeto, execute:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/CarTrackingammoc.git
   git branch -M main
   git push -u origin main
   ```

---

## 2. Supabase — Configurar OAuth (Google + Microsoft)

### Google OAuth

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto ou use um existente
3. Vá em **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Authorized redirect URIs: `https://nhalrckiplhfyuqezzqf.supabase.co/auth/v1/callback`
6. Copie o **Client ID** e **Client Secret**
7. No Supabase Dashboard → **Authentication → Providers → Google**:
   - Enable Google provider: ON
   - Client ID: (cole aqui)
   - Client Secret: (cole aqui)
   - Salve

### Microsoft OAuth

1. Acesse [portal.azure.com](https://portal.azure.com)
2. Vá em **Azure Active Directory → App registrations → New registration**
3. Nome: `AMMOC Car Tracking`
4. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
5. Redirect URI: `https://nhalrckiplhfyuqezzqf.supabase.co/auth/v1/callback`
6. Após criar: **Certificates & secrets → New client secret** — copie o valor
7. Na página Overview: copie o **Application (client) ID**
8. No Supabase Dashboard → **Authentication → Providers → Azure**:
   - Enable Azure provider: ON
   - Azure Tenant: `common`
   - Client ID: (Application ID do Azure)
   - Client Secret: (secret criado acima)
   - Salve

### Redirect URL após login

No Supabase Dashboard → **Authentication → URL Configuration**:
- Site URL: URL do seu Vercel (ex: `https://cartrackingammoc.vercel.app`)
- Redirect URLs: adicione `https://cartrackingammoc.vercel.app/**`

### Domínio de email (Resend)

1. Acesse [resend.com](https://resend.com) e faça login
2. Vá em **Domains → Add Domain**
3. Adicione `ammoc.org.br`
4. Configure os registros DNS (TXT, MX, DKIM) no provedor DNS da AMMOC conforme mostrado
5. Após verificação, crie uma API Key em **API Keys → Create API Key**
6. Guarde a chave — ela vai em `RESEND_API_KEY` no Railway

---

## 3. Railway — Deploy da API (Express)

1. Acesse [railway.app](https://railway.app) e faça login com GitHub
2. **New Project → Deploy from GitHub repo** → selecione `CarTrackingammoc`
3. Railway detectará o `railway.json` automaticamente
4. Vá em **Variables** e adicione:

   | Variável | Valor |
   |----------|-------|
   | `SUPABASE_URL` | `https://nhalrckiplhfyuqezzqf.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | (Supabase → Settings → API → service_role key) |
   | `RESEND_API_KEY` | (da etapa 2 acima) |
   | `WEB_URL` | URL do Vercel (preencher depois do deploy do Vercel) |
   | `PORT` | `3001` (Railway define automaticamente, mas deixe como fallback) |

5. Clique em **Deploy** — aguarde o build
6. Vá em **Settings → Networking → Generate Domain** para obter a URL pública da API
7. Teste: `GET https://SUA_API.railway.app/health` deve retornar `{"ok": true}`

---

## 4. Vercel — Deploy do Frontend (Next.js)

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. **Add New Project → Import Git Repository** → selecione `CarTrackingammoc`
3. **Root Directory**: deixe como `/` (raiz do monorepo) — o `vercel.json` já configura o build
4. **Framework Preset**: Next.js (detectado automaticamente)
5. Em **Environment Variables**, adicione:

   | Variável | Valor |
   |----------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://nhalrckiplhfyuqezzqf.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (Supabase → Settings → API → anon key) |
   | `NEXT_PUBLIC_API_URL` | URL do Railway (ex: `https://sua-api.railway.app`) |

6. Clique em **Deploy**
7. Após deploy, copie a URL do Vercel (ex: `https://cartrackingammoc.vercel.app`)

---

## 5. Passos pós-deploy

1. **Atualizar WEB_URL no Railway**: vá em Railway → Variables → edite `WEB_URL` para a URL real do Vercel → redeploy
2. **Testar o fluxo completo**:
   - Login com Google → redirecionado para `/`
   - Criar reserva → verificar email de confirmação
   - Verificar calendário exibe a reserva
   - Finalizar viagem com KM
   - Acessar `/admin/relatorios` → exportar Excel

---

## Variáveis de ambiente — resumo

### Railway (API)
```
SUPABASE_URL=https://nhalrckiplhfyuqezzqf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key do Supabase>
RESEND_API_KEY=<chave do Resend>
WEB_URL=<URL do Vercel>
```

### Vercel (Web)
```
NEXT_PUBLIC_SUPABASE_URL=https://nhalrckiplhfyuqezzqf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key do Supabase>
NEXT_PUBLIC_API_URL=<URL do Railway>
```

---

## Desenvolvimento local

```bash
# Instalar dependências
npm install

# Configurar .env localmente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Preencher os valores nos arquivos .env

# Rodar API (porta 3001)
npm run dev --workspace=@cartracking/api

# Rodar Web (porta 3000)  
npm run dev --workspace=web
```
