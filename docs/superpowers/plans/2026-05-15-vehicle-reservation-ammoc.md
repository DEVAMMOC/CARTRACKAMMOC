# AMMOC Car Tracking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a vehicle reservation system for AMMOC with calendar view, email notifications, trip finalization with KM tracking, and admin reports — deployed on Vercel (Next.js) + Railway (Express API) backed by Supabase.

**Architecture:** Next.js 14 frontend on Vercel calls an Express REST API on Railway; Railway handles all business logic, cron jobs (2h non-finalization alerts), and email via Resend; Supabase provides PostgreSQL, Google/Microsoft SSO, and Storage for vehicle photos.

**Tech Stack:** Next.js 14 (App Router), Express, TypeScript, Supabase (PostgreSQL + Auth + Storage), Resend, node-cron, FullCalendar, shadcn/ui, SheetJS (xlsx), pdfkit, npm workspaces monorepo.

---

## File Map

```
cartracking-ammoc/
├── package.json                              ← workspace root
├── .gitignore
├── packages/
│   └── types/
│       ├── package.json
│       └── src/index.ts                      ← shared TS types
├── apps/
│   ├── api/                                  ← Express (Railway)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   └── src/
│   │       ├── index.ts                      ← server entry, cron init
│   │       ├── lib/supabase.ts               ← service-role client
│   │       ├── middleware/auth.ts            ← JWT validation
│   │       ├── routes/
│   │       │   ├── veiculos.ts
│   │       │   ├── reservas.ts
│   │       │   ├── disponibilidade.ts
│   │       │   └── relatorios.ts
│   │       ├── services/
│   │       │   ├── email.ts                  ← Resend + templates
│   │       │   └── cron.ts                   ← node-cron alert job
│   │       └── __tests__/
│   │           ├── veiculos.test.ts
│   │           ├── reservas.test.ts
│   │           └── disponibilidade.test.ts
│   └── web/                                  ← Next.js (Vercel)
│       ├── package.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── .env.local.example
│       └── src/
│           ├── middleware.ts                  ← route auth guard
│           ├── app/
│           │   ├── layout.tsx
│           │   ├── page.tsx                  ← calendar home
│           │   ├── login/page.tsx
│           │   ├── reservas/
│           │   │   ├── page.tsx              ← my reservations
│           │   │   ├── nova/page.tsx
│           │   │   └── [id]/finalizar/page.tsx
│           │   └── admin/
│           │       ├── veiculos/page.tsx
│           │       ├── reservas/page.tsx
│           │       └── relatorios/page.tsx
│           ├── components/
│           │   ├── layout/Sidebar.tsx
│           │   ├── calendar/ReservasCalendar.tsx
│           │   ├── reservas/
│           │   │   ├── NovaReservaForm.tsx
│           │   │   ├── ReservaCard.tsx
│           │   │   └── FinalizarViagemForm.tsx
│           │   ├── veiculos/
│           │   │   ├── VeiculoCard.tsx
│           │   │   └── VeiculoForm.tsx
│           │   └── relatorios/
│           │       └── RelatorioPanel.tsx
│           └── lib/
│               ├── supabase/client.ts
│               ├── supabase/server.ts
│               └── api.ts                    ← fetch wrapper → Railway
└── supabase/
    └── migrations/
        ├── 001_create_usuarios.sql
        ├── 002_create_veiculos.sql
        ├── 003_create_reservas.sql
        ├── 004_create_notificacoes_email.sql
        ├── 005_rls_policies.sql
        └── 006_auth_trigger.sql
```

---

## Task 1: Initialize Monorepo

**Files:**
- Create: `package.json` (root)
- Create: `.gitignore`
- Create: `packages/types/package.json`
- Create: `packages/types/src/index.ts`

- [ ] **Step 1: Init git repo**

```bash
cd "C:\Users\max_m\OneDrive\Área de Trabalho\CARTrackingAMMOC"
git init
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "cartracking-ammoc",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:web": "npm --workspace apps/web run dev",
    "dev:api": "npm --workspace apps/api run dev",
    "build:web": "npm --workspace apps/web run build",
    "build:api": "npm --workspace apps/api run build"
  }
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
.env
.env.local
dist/
.next/
*.tsbuildinfo
```

- [ ] **Step 4: Create packages/types/package.json**

```bash
mkdir -p packages/types/src
```

```json
{
  "name": "@cartracking/types",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

- [ ] **Step 5: Create packages/types/src/index.ts**

```typescript
export type Papel = 'funcionario' | 'gestor'
export type StatusReserva = 'confirmada' | 'em_andamento' | 'finalizada' | 'cancelada'
export type TipoVeiculo = 'carro' | 'van' | 'caminhonete' | 'onibus' | 'outro'
export type TipoNotificacao = 'confirmacao' | 'alerta_nao_finalizada'

export interface Usuario {
  id: string
  email: string
  nome: string
  papel: Papel
  ativo: boolean
  criado_em: string
}

export interface Veiculo {
  id: string
  placa: string
  modelo: string
  ano: number
  tipo: TipoVeiculo
  km_atual: number
  foto_url: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface Reserva {
  id: string
  veiculo_id: string
  usuario_id: string
  data_saida: string
  data_retorno_prevista: string
  data_retorno_real: string | null
  destino: string
  servico: string
  km_saida: number | null
  km_retorno: number | null
  observacoes: string | null
  status: StatusReserva
  alerta_nao_finalizada_enviado: boolean
  criado_em: string
  atualizado_em: string
  // joined
  veiculo?: Veiculo
  usuario?: Usuario
}

export interface ReservaComDetalhes extends Reserva {
  veiculo: Veiculo
  usuario: Usuario
}

export interface CriarReservaInput {
  veiculo_id: string
  data_saida: string
  data_retorno_prevista: string
  destino: string
  servico: string
}

export interface FinalizarViagemInput {
  km_retorno: number
  observacoes?: string
}

export interface CriarVeiculoInput {
  placa: string
  modelo: string
  ano: number
  tipo: TipoVeiculo
  km_atual: number
  foto_url?: string
}

export interface RelatorioFiltros {
  inicio: string
  fim: string
  veiculo_id?: string
  usuario_id?: string
}

export interface RelatorioData {
  total_viagens: number
  total_km: number
  veiculos_usados: number
  por_veiculo: { veiculo: Veiculo; viagens: number; km: number }[]
  por_usuario: { usuario: Usuario; viagens: number; km: number }[]
  destinos_frequentes: { destino: string; count: number }[]
  reservas: ReservaComDetalhes[]
}
```

- [ ] **Step 6: Initial commit**

```bash
git add .
git commit -m "feat: initialize monorepo with shared types"
```

---

## Task 2: Setup Express API (apps/api)

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/lib/supabase.ts`
- Create: `apps/api/.env.example`

- [ ] **Step 1: Create apps/api directory and package.json**

```bash
mkdir -p apps/api/src/lib apps/api/src/middleware apps/api/src/routes apps/api/src/services apps/api/src/__tests__
```

```json
{
  "name": "@cartracking/api",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "@cartracking/types": "*",
    "@supabase/supabase-js": "^2.45.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "helmet": "^7.1.0",
    "node-cron": "^3.0.3",
    "pdfkit": "^0.15.0",
    "resend": "^3.2.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.14.0",
    "@types/node-cron": "^3.0.11",
    "@types/pdfkit": "^0.13.4",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.4",
    "tsx": "^4.15.0",
    "typescript": "^5.5.2"
  }
}
```

- [ ] **Step 2: Create apps/api/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "paths": {
      "@cartracking/types": ["../../packages/types/src/index.ts"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create apps/api/.env.example**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_your_key
PORT=3001
WEB_URL=http://localhost:3000
```

- [ ] **Step 4: Create apps/api/src/lib/supabase.ts**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})
```

- [ ] **Step 5: Create apps/api/src/index.ts**

```typescript
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { veiculosRouter } from './routes/veiculos'
import { reservasRouter } from './routes/reservas'
import { disponibilidadeRouter } from './routes/disponibilidade'
import { relatoriosRouter } from './routes/relatorios'
import { initCron } from './services/cron'

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cors({ origin: process.env.WEB_URL || 'http://localhost:3000' }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/veiculos', veiculosRouter)
app.use('/reservas', reservasRouter)
app.use('/disponibilidade', disponibilidadeRouter)
app.use('/relatorios', relatoriosRouter)

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`)
  initCron()
})

export { app }
```

- [ ] **Step 6: Install dependencies**

```bash
cd apps/api && npm install
```

- [ ] **Step 7: Commit**

```bash
cd ../..
git add apps/api
git commit -m "feat: setup Express API base with Supabase client"
```

---

## Task 3: Auth Middleware (API)

**Files:**
- Create: `apps/api/src/middleware/auth.ts`
- Create: `apps/api/src/__tests__/auth.test.ts`

- [ ] **Step 1: Create middleware**

```typescript
// apps/api/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'
import { Usuario } from '@cartracking/types'

export interface AuthRequest extends Request {
  user?: Usuario
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    res.status(401).json({ error: 'Token obrigatório' })
    return
  }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    res.status(401).json({ error: 'Token inválido' })
    return
  }
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!usuario || !usuario.ativo) {
    res.status(403).json({ error: 'Usuário inativo ou não encontrado' })
    return
  }
  req.user = usuario
  next()
}

export function requireGestor(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.papel !== 'gestor') {
    res.status(403).json({ error: 'Acesso restrito a gestores' })
    return
  }
  next()
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/middleware/auth.ts
git commit -m "feat: add JWT auth middleware for Express API"
```

---

## Task 4: Supabase Database Migrations

**Files:**
- Create: `supabase/migrations/001_create_usuarios.sql`
- Create: `supabase/migrations/002_create_veiculos.sql`
- Create: `supabase/migrations/003_create_reservas.sql`
- Create: `supabase/migrations/004_create_notificacoes_email.sql`
- Create: `supabase/migrations/005_rls_policies.sql`
- Create: `supabase/migrations/006_auth_trigger.sql`

- [ ] **Step 1: Create migration files directory**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Create 001_create_usuarios.sql**

```sql
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  nome text NOT NULL,
  papel text NOT NULL DEFAULT 'funcionario'
    CHECK (papel IN ('funcionario', 'gestor')),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz DEFAULT now()
);
```

- [ ] **Step 3: Create 002_create_veiculos.sql**

```sql
CREATE TABLE IF NOT EXISTS veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa varchar(8) NOT NULL UNIQUE,
  modelo varchar(100) NOT NULL,
  ano integer NOT NULL,
  tipo varchar(50) NOT NULL
    CHECK (tipo IN ('carro', 'van', 'caminhonete', 'onibus', 'outro')),
  km_atual integer NOT NULL DEFAULT 0,
  foto_url text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);
```

- [ ] **Step 4: Create 003_create_reservas.sql**

```sql
CREATE TABLE IF NOT EXISTS reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES veiculos(id),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  data_saida timestamptz NOT NULL,
  data_retorno_prevista timestamptz NOT NULL,
  data_retorno_real timestamptz,
  destino text NOT NULL,
  servico text NOT NULL,
  km_saida integer,
  km_retorno integer,
  observacoes text,
  status varchar(20) NOT NULL DEFAULT 'confirmada'
    CHECK (status IN ('confirmada', 'em_andamento', 'finalizada', 'cancelada')),
  alerta_nao_finalizada_enviado boolean NOT NULL DEFAULT false,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX idx_reservas_veiculo_data ON reservas(veiculo_id, data_saida, data_retorno_prevista);
CREATE INDEX idx_reservas_usuario ON reservas(usuario_id);
CREATE INDEX idx_reservas_status ON reservas(status);
```

- [ ] **Step 5: Create 004_create_notificacoes_email.sql**

```sql
CREATE TABLE IF NOT EXISTS notificacoes_email (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id uuid NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  tipo varchar(50) NOT NULL
    CHECK (tipo IN ('confirmacao', 'alerta_nao_finalizada')),
  destinatario text NOT NULL,
  enviado_em timestamptz DEFAULT now(),
  sucesso boolean NOT NULL DEFAULT false,
  erro text
);
```

- [ ] **Step 6: Create 005_rls_policies.sql**

```sql
-- Enable RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_email ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's papel
CREATE OR REPLACE FUNCTION get_user_papel()
RETURNS text AS $$
  SELECT papel FROM usuarios WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- veiculos: all authenticated can read; only gestores write
CREATE POLICY "veiculos_read" ON veiculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "veiculos_write" ON veiculos FOR ALL TO authenticated
  USING (get_user_papel() = 'gestor')
  WITH CHECK (get_user_papel() = 'gestor');

-- reservas: all authenticated can read (for calendar); own writes for funcionarios; gestores write all
CREATE POLICY "reservas_read" ON reservas FOR SELECT TO authenticated USING (true);
CREATE POLICY "reservas_insert_own" ON reservas FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "reservas_update_own" ON reservas FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR get_user_papel() = 'gestor');
CREATE POLICY "reservas_delete_own" ON reservas FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR get_user_papel() = 'gestor');

-- usuarios: read own; gestores read all
CREATE POLICY "usuarios_read_own" ON usuarios FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_user_papel() = 'gestor');
CREATE POLICY "usuarios_update_own" ON usuarios FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- notificacoes_email: only gestores
CREATE POLICY "notificacoes_gestores" ON notificacoes_email FOR ALL TO authenticated
  USING (get_user_papel() = 'gestor');
```

- [ ] **Step 7: Create 006_auth_trigger.sql**

```sql
-- Auto-create usuario record on first Supabase Auth login
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome, papel)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'funcionario'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

- [ ] **Step 8: Apply migrations to Supabase via MCP**

Apply each file in order using the Supabase MCP `apply_migration` tool, one at a time:
1. `001_create_usuarios.sql`
2. `002_create_veiculos.sql`
3. `003_create_reservas.sql`
4. `004_create_notificacoes_email.sql`
5. `005_rls_policies.sql`
6. `006_auth_trigger.sql`

- [ ] **Step 9: Commit**

```bash
git add supabase/
git commit -m "feat: add database migrations and RLS policies"
```

---

## Task 5: Vehicles API Routes

**Files:**
- Create: `apps/api/src/routes/veiculos.ts`
- Create: `apps/api/src/__tests__/veiculos.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/api/src/__tests__/veiculos.test.ts
import request from 'supertest'
import { app } from '../index'

// Mock supabase and auth middleware
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    })),
  },
}))

describe('GET /veiculos', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/veiculos')
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd apps/api && npx jest __tests__/veiculos.test.ts --no-coverage
```

Expected: FAIL (routes not defined yet)

- [ ] **Step 3: Create veiculos route**

```typescript
// apps/api/src/routes/veiculos.ts
import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth, requireGestor, AuthRequest } from '../middleware/auth'
import { CriarVeiculoInput, Veiculo } from '@cartracking/types'

export const veiculosRouter = Router()

// GET /veiculos — list active vehicles
veiculosRouter.get('/', requireAuth, async (_req, res) => {
  const { data, error } = await supabase
    .from('veiculos')
    .select('*')
    .eq('ativo', true)
    .order('modelo')

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

// GET /veiculos/todos — list all vehicles including inactive (gestor)
veiculosRouter.get('/todos', requireAuth, requireGestor, async (_req, res) => {
  const { data, error } = await supabase
    .from('veiculos')
    .select('*')
    .order('modelo')

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

// POST /veiculos — create vehicle (gestor)
veiculosRouter.post('/', requireAuth, requireGestor, async (req, res) => {
  const body: CriarVeiculoInput = req.body
  const { data, error } = await supabase
    .from('veiculos')
    .insert(body)
    .select()
    .single()

  if (error) { res.status(500).json({ error: error.message }); return }
  res.status(201).json(data)
})

// PATCH /veiculos/:id — update vehicle (gestor)
veiculosRouter.patch('/:id', requireAuth, requireGestor, async (req, res) => {
  const { id } = req.params
  const updates: Partial<Veiculo> = { ...req.body, atualizado_em: new Date().toISOString() }
  const { data, error } = await supabase
    .from('veiculos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest __tests__/veiculos.test.ts --no-coverage
```

- [ ] **Step 5: Commit**

```bash
cd ../..
git add apps/api/src/routes/veiculos.ts apps/api/src/__tests__/veiculos.test.ts
git commit -m "feat: add vehicles CRUD API routes"
```

---

## Task 6: Availability Check + Reservations API

**Files:**
- Create: `apps/api/src/routes/disponibilidade.ts`
- Create: `apps/api/src/routes/reservas.ts`

- [ ] **Step 1: Create disponibilidade route**

```typescript
// apps/api/src/routes/disponibilidade.ts
import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'

export const disponibilidadeRouter = Router()

// GET /disponibilidade?veiculo_id=X&inicio=ISO&fim=ISO
disponibilidadeRouter.get('/', requireAuth, async (req, res) => {
  const { veiculo_id, inicio, fim } = req.query as Record<string, string>

  if (!veiculo_id || !inicio || !fim) {
    res.status(400).json({ error: 'veiculo_id, inicio e fim são obrigatórios' })
    return
  }

  // Check for overlapping reservations
  const { data, error } = await supabase
    .from('reservas')
    .select('id')
    .eq('veiculo_id', veiculo_id)
    .not('status', 'in', '("cancelada","finalizada")')
    .or(`data_saida.lt.${fim},data_retorno_prevista.gt.${inicio}`)
    .limit(1)

  if (error) { res.status(500).json({ error: error.message }); return }

  res.json({ disponivel: data.length === 0 })
})
```

- [ ] **Step 2: Create reservas route**

```typescript
// apps/api/src/routes/reservas.ts
import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth, requireGestor, AuthRequest } from '../middleware/auth'
import { CriarReservaInput, FinalizarViagemInput } from '@cartracking/types'
import { sendConfirmacaoEmail } from '../services/email'

export const reservasRouter = Router()

// GET /reservas
reservasRouter.get('/', requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!
  let query = supabase
    .from('reservas')
    .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
    .order('data_saida', { ascending: false })

  if (user.papel === 'funcionario') {
    query = query.eq('usuario_id', user.id)
  }

  const { data, error } = await query
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

// POST /reservas — create with availability check
reservasRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!
  const body: CriarReservaInput = req.body

  // Check availability
  const { data: conflicts } = await supabase
    .from('reservas')
    .select('id')
    .eq('veiculo_id', body.veiculo_id)
    .not('status', 'in', '("cancelada","finalizada")')
    .or(`data_saida.lt.${body.data_retorno_prevista},data_retorno_prevista.gt.${body.data_saida}`)
    .limit(1)

  if (conflicts && conflicts.length > 0) {
    res.status(409).json({ error: 'Veículo não disponível no período solicitado' })
    return
  }

  // Get current vehicle km for km_saida
  const { data: veiculo } = await supabase
    .from('veiculos')
    .select('km_atual, modelo, placa')
    .eq('id', body.veiculo_id)
    .single()

  const { data, error } = await supabase
    .from('reservas')
    .insert({
      ...body,
      usuario_id: user.id,
      km_saida: veiculo?.km_atual ?? null,
      status: 'confirmada',
    })
    .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
    .single()

  if (error) { res.status(500).json({ error: error.message }); return }

  // Send confirmation email (non-blocking)
  sendConfirmacaoEmail(data).catch(console.error)

  res.status(201).json(data)
})

// PATCH /reservas/:id/iniciar
reservasRouter.patch('/:id/iniciar', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params
  const user = req.user!

  const { data: reserva } = await supabase
    .from('reservas')
    .select('usuario_id, status')
    .eq('id', id)
    .single()

  if (!reserva) { res.status(404).json({ error: 'Reserva não encontrada' }); return }
  if (reserva.usuario_id !== user.id && user.papel !== 'gestor') {
    res.status(403).json({ error: 'Sem permissão' }); return
  }
  if (reserva.status !== 'confirmada') {
    res.status(400).json({ error: 'Reserva não está no status confirmada' }); return
  }

  const { data, error } = await supabase
    .from('reservas')
    .update({ status: 'em_andamento', atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

// PATCH /reservas/:id/finalizar
reservasRouter.patch('/:id/finalizar', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params
  const user = req.user!
  const body: FinalizarViagemInput = req.body

  if (!body.km_retorno) {
    res.status(400).json({ error: 'km_retorno é obrigatório' }); return
  }

  const { data: reserva } = await supabase
    .from('reservas')
    .select('usuario_id, status, veiculo_id, km_saida')
    .eq('id', id)
    .single()

  if (!reserva) { res.status(404).json({ error: 'Reserva não encontrada' }); return }
  if (reserva.usuario_id !== user.id && user.papel !== 'gestor') {
    res.status(403).json({ error: 'Sem permissão' }); return
  }
  if (reserva.status === 'finalizada' || reserva.status === 'cancelada') {
    res.status(400).json({ error: 'Reserva já encerrada' }); return
  }
  if (reserva.km_saida && body.km_retorno < reserva.km_saida) {
    res.status(400).json({ error: 'KM de retorno menor que KM de saída' }); return
  }

  // Update reservation
  const { data, error } = await supabase
    .from('reservas')
    .update({
      status: 'finalizada',
      km_retorno: body.km_retorno,
      observacoes: body.observacoes ?? null,
      data_retorno_real: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) { res.status(500).json({ error: error.message }); return }

  // Update vehicle's current km
  await supabase
    .from('veiculos')
    .update({ km_atual: body.km_retorno, atualizado_em: new Date().toISOString() })
    .eq('id', reserva.veiculo_id)

  res.json(data)
})

// DELETE /reservas/:id — cancel
reservasRouter.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params
  const user = req.user!

  const { data: reserva } = await supabase
    .from('reservas')
    .select('usuario_id, status')
    .eq('id', id)
    .single()

  if (!reserva) { res.status(404).json({ error: 'Reserva não encontrada' }); return }
  if (reserva.usuario_id !== user.id && user.papel !== 'gestor') {
    res.status(403).json({ error: 'Sem permissão' }); return
  }
  if (reserva.status === 'finalizada') {
    res.status(400).json({ error: 'Não é possível cancelar uma viagem finalizada' }); return
  }

  const { error } = await supabase
    .from('reservas')
    .update({ status: 'cancelada', atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ ok: true })
})
```

- [ ] **Step 3: Commit**

```bash
cd ../..
git add apps/api/src/routes/
git commit -m "feat: add reservations and availability API routes"
```

---

## Task 7: Email Service + Cron Job

**Files:**
- Create: `apps/api/src/services/email.ts`
- Create: `apps/api/src/services/cron.ts`

- [ ] **Step 1: Create email service**

```typescript
// apps/api/src/services/email.ts
import { Resend } from 'resend'
import { ReservaComDetalhes } from '@cartracking/types'
import { supabase } from '../lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)
const WEB_URL = process.env.WEB_URL || 'http://localhost:3000'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export async function sendConfirmacaoEmail(reserva: ReservaComDetalhes) {
  const { veiculo, usuario } = reserva
  const html = `
    <h2>✅ Reserva confirmada</h2>
    <p>Olá, <strong>${usuario.nome}</strong>!</p>
    <table>
      <tr><td><strong>Veículo:</strong></td><td>${veiculo.modelo} (${veiculo.placa})</td></tr>
      <tr><td><strong>Saída:</strong></td><td>${formatDate(reserva.data_saida)}</td></tr>
      <tr><td><strong>Retorno previsto:</strong></td><td>${formatDate(reserva.data_retorno_prevista)}</td></tr>
      <tr><td><strong>Destino:</strong></td><td>${reserva.destino}</td></tr>
      <tr><td><strong>Serviço:</strong></td><td>${reserva.servico}</td></tr>
    </table>
    <p><a href="${WEB_URL}/reservas">Ver minha reserva</a></p>
  `
  const { error } = await resend.emails.send({
    from: 'AMMOC Frotas <frotas@ammoc.org.br>',
    to: usuario.email,
    subject: `✅ Reserva confirmada — ${veiculo.modelo} ${veiculo.placa} - ${formatDate(reserva.data_saida)}`,
    html,
  })

  await supabase.from('notificacoes_email').insert({
    reserva_id: reserva.id,
    tipo: 'confirmacao',
    destinatario: usuario.email,
    sucesso: !error,
    erro: error?.message ?? null,
  })
}

export async function sendAlertaNaoFinalizadaEmail(reserva: ReservaComDetalhes, gestores: { email: string }[]) {
  const { veiculo, usuario } = reserva
  const destinatarios = [usuario.email, ...gestores.map(g => g.email)]
  const html = `
    <h2>⚠️ Viagem não finalizada</h2>
    <p>A viagem de <strong>${usuario.nome}</strong> ainda não foi encerrada no sistema.</p>
    <table>
      <tr><td><strong>Veículo:</strong></td><td>${veiculo.modelo} (${veiculo.placa})</td></tr>
      <tr><td><strong>Retorno previsto:</strong></td><td>${formatDate(reserva.data_retorno_prevista)}</td></tr>
      <tr><td><strong>Destino:</strong></td><td>${reserva.destino}</td></tr>
    </table>
    <p><a href="${WEB_URL}/reservas/${reserva.id}/finalizar">Finalizar viagem agora</a></p>
  `
  for (const email of destinatarios) {
    const { error } = await resend.emails.send({
      from: 'AMMOC Frotas <frotas@ammoc.org.br>',
      to: email,
      subject: `⚠️ Viagem não finalizada — ${veiculo.modelo} — ${usuario.nome}`,
      html,
    })
    await supabase.from('notificacoes_email').insert({
      reserva_id: reserva.id,
      tipo: 'alerta_nao_finalizada',
      destinatario: email,
      sucesso: !error,
      erro: error?.message ?? null,
    })
  }
}
```

- [ ] **Step 2: Create cron service**

```typescript
// apps/api/src/services/cron.ts
import cron from 'node-cron'
import { supabase } from '../lib/supabase'
import { sendAlertaNaoFinalizadaEmail } from './email'

export function initCron() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[cron] Checking for non-finalized trips...')
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

      const { data: reservas } = await supabase
        .from('reservas')
        .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
        .in('status', ['confirmada', 'em_andamento'])
        .lt('data_retorno_prevista', twoHoursAgo)
        .eq('alerta_nao_finalizada_enviado', false)

      if (!reservas?.length) return

      const { data: gestores } = await supabase
        .from('usuarios')
        .select('email')
        .eq('papel', 'gestor')
        .eq('ativo', true)

      for (const reserva of reservas) {
        await sendAlertaNaoFinalizadaEmail(reserva, gestores ?? [])
        await supabase
          .from('reservas')
          .update({ alerta_nao_finalizada_enviado: true })
          .eq('id', reserva.id)
        console.log(`[cron] Alert sent for reserva ${reserva.id}`)
      }
    } catch (err) {
      console.error('[cron] Error:', err)
    }
  })
  console.log('[cron] Alert job initialized')
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/
git commit -m "feat: add email service with Resend and cron alert job"
```

---

## Task 8: Reports API Routes

**Files:**
- Create: `apps/api/src/routes/relatorios.ts`

- [ ] **Step 1: Create relatorios route**

```typescript
// apps/api/src/routes/relatorios.ts
import { Router, Response } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth, requireGestor, AuthRequest } from '../middleware/auth'
import { RelatorioFiltros } from '@cartracking/types'
import * as XLSX from 'xlsx'
import PDFDocument from 'pdfkit'

export const relatoriosRouter = Router()

async function fetchRelatorioData(filtros: RelatorioFiltros) {
  let query = supabase
    .from('reservas')
    .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
    .eq('status', 'finalizada')
    .gte('data_saida', filtros.inicio)
    .lte('data_saida', filtros.fim)

  if (filtros.veiculo_id) query = query.eq('veiculo_id', filtros.veiculo_id)
  if (filtros.usuario_id) query = query.eq('usuario_id', filtros.usuario_id)

  const { data: reservas, error } = await query
  if (error || !reservas) return null

  const total_km = reservas.reduce((sum, r) => sum + ((r.km_retorno ?? 0) - (r.km_saida ?? 0)), 0)

  // Group by vehicle
  const veiculoMap = new Map<string, { veiculo: any; viagens: number; km: number }>()
  const usuarioMap = new Map<string, { usuario: any; viagens: number; km: number }>()
  const destinoMap = new Map<string, number>()

  for (const r of reservas) {
    const km = (r.km_retorno ?? 0) - (r.km_saida ?? 0)
    const vid = r.veiculo_id
    const uid = r.usuario_id

    if (!veiculoMap.has(vid)) veiculoMap.set(vid, { veiculo: r.veiculo, viagens: 0, km: 0 })
    const v = veiculoMap.get(vid)!
    v.viagens++; v.km += km

    if (!usuarioMap.has(uid)) usuarioMap.set(uid, { usuario: r.usuario, viagens: 0, km: 0 })
    const u = usuarioMap.get(uid)!
    u.viagens++; u.km += km

    destinoMap.set(r.destino, (destinoMap.get(r.destino) ?? 0) + 1)
  }

  return {
    total_viagens: reservas.length,
    total_km,
    veiculos_usados: veiculoMap.size,
    por_veiculo: Array.from(veiculoMap.values()),
    por_usuario: Array.from(usuarioMap.values()),
    destinos_frequentes: Array.from(destinoMap.entries())
      .map(([destino, count]) => ({ destino, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    reservas,
  }
}

// GET /relatorios
relatoriosRouter.get('/', requireAuth, requireGestor, async (req: AuthRequest, res) => {
  const filtros: RelatorioFiltros = {
    inicio: req.query.inicio as string,
    fim: req.query.fim as string,
    veiculo_id: req.query.veiculo_id as string | undefined,
    usuario_id: req.query.usuario_id as string | undefined,
  }
  if (!filtros.inicio || !filtros.fim) {
    res.status(400).json({ error: 'inicio e fim são obrigatórios' }); return
  }
  const data = await fetchRelatorioData(filtros)
  if (!data) { res.status(500).json({ error: 'Erro ao buscar dados' }); return }
  res.json(data)
})

// GET /relatorios/exportar/excel
relatoriosRouter.get('/exportar/excel', requireAuth, requireGestor, async (req: AuthRequest, res: Response) => {
  const filtros: RelatorioFiltros = {
    inicio: req.query.inicio as string,
    fim: req.query.fim as string,
  }
  const data = await fetchRelatorioData(filtros)
  if (!data) { res.status(500).json({ error: 'Erro ao gerar Excel' }); return }

  const rows = data.reservas.map(r => ({
    'Funcionário': r.usuario?.nome ?? '',
    'Veículo': `${r.veiculo?.modelo} (${r.veiculo?.placa})`,
    'Saída': new Date(r.data_saida).toLocaleString('pt-BR'),
    'Retorno Previsto': new Date(r.data_retorno_prevista).toLocaleString('pt-BR'),
    'Retorno Real': r.data_retorno_real ? new Date(r.data_retorno_real).toLocaleString('pt-BR') : '',
    'Destino': r.destino,
    'Serviço': r.servico,
    'KM Saída': r.km_saida ?? '',
    'KM Retorno': r.km_retorno ?? '',
    'KM Rodados': (r.km_retorno ?? 0) - (r.km_saida ?? 0),
    'Observações': r.observacoes ?? '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Reservas')

  const totaisRows = data.por_veiculo.map(v => ({
    'Veículo': `${v.veiculo.modelo} (${v.veiculo.placa})`,
    'Viagens': v.viagens,
    'KM Total': v.km,
  }))
  const wsTotais = XLSX.utils.json_to_sheet(totaisRows)
  XLSX.utils.book_append_sheet(wb, wsTotais, 'Por Veículo')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Disposition', 'attachment; filename=relatorio.xlsx')
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.send(buf)
})

// GET /relatorios/exportar/pdf
relatoriosRouter.get('/exportar/pdf', requireAuth, requireGestor, async (req: AuthRequest, res: Response) => {
  const filtros: RelatorioFiltros = {
    inicio: req.query.inicio as string,
    fim: req.query.fim as string,
  }
  const data = await fetchRelatorioData(filtros)
  if (!data) { res.status(500).json({ error: 'Erro ao gerar PDF' }); return }

  const doc = new PDFDocument({ margin: 40 })
  res.setHeader('Content-Disposition', 'attachment; filename=relatorio.pdf')
  res.setHeader('Content-Type', 'application/pdf')
  doc.pipe(res)

  doc.fontSize(18).text('AMMOC — Relatório de Uso de Veículos', { align: 'center' })
  doc.moveDown()
  doc.fontSize(12).text(`Período: ${new Date(filtros.inicio).toLocaleDateString('pt-BR')} a ${new Date(filtros.fim).toLocaleDateString('pt-BR')}`)
  doc.moveDown()
  doc.text(`Total de viagens: ${data.total_viagens}`)
  doc.text(`Total de KM rodados: ${data.total_km} km`)
  doc.text(`Veículos utilizados: ${data.veiculos_usados}`)
  doc.moveDown()

  doc.fontSize(14).text('Uso por Veículo', { underline: true })
  doc.fontSize(10)
  for (const v of data.por_veiculo) {
    doc.text(`${v.veiculo.modelo} (${v.veiculo.placa}): ${v.viagens} viagens, ${v.km} km`)
  }
  doc.moveDown()

  doc.fontSize(14).text('Uso por Funcionário', { underline: true })
  doc.fontSize(10)
  for (const u of data.por_usuario) {
    doc.text(`${u.usuario.nome}: ${u.viagens} viagens, ${u.km} km`)
  }

  doc.end()
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/routes/relatorios.ts
git commit -m "feat: add reports API with Excel and PDF export"
```

---

## Task 9: Setup Next.js Frontend (apps/web)

**Files:**
- Create: `apps/web/` (Next.js scaffold)
- Create: `apps/web/src/lib/supabase/client.ts`
- Create: `apps/web/src/lib/supabase/server.ts`
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/middleware.ts`

- [ ] **Step 1: Create Next.js app**

```bash
cd apps
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --no-import-alias
cd ..
```

When prompted: App Router = Yes, all others as needed.

- [ ] **Step 2: Install additional dependencies**

```bash
cd apps/web
npm install @supabase/supabase-js @supabase/ssr @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction react-hook-form @hookform/resolvers zod date-fns
npx shadcn@latest init
npx shadcn@latest add button input label card dialog select toast badge
```

- [ ] **Step 3: Create .env.local.example**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

- [ ] **Step 4: Create supabase clients**

```typescript
// apps/web/src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// apps/web/src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 5: Create API fetch wrapper**

```typescript
// apps/web/src/lib/api.ts
import { createClient } from './supabase/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function getToken(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}
```

- [ ] **Step 6: Create Next.js middleware for auth**

```typescript
// apps/web/src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/login'
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth')

  if (!user && !isLoginPage && !isAuthCallback) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 7: Commit**

```bash
cd ../..
git add apps/web
git commit -m "feat: setup Next.js frontend with Supabase SSR and API client"
```

---

## Task 10: Login Page + App Layout

**Files:**
- Create: `apps/web/src/app/login/page.tsx`
- Create: `apps/web/src/app/auth/callback/route.ts`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create login page**

```typescript
// apps/web/src/app/login/page.tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const supabase = createClient()

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function signInWithMicrosoft() {
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">AMMOC Frotas</CardTitle>
          <p className="text-muted-foreground text-sm">Sistema de Reserva de Veículos</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={signInWithGoogle} variant="outline" className="w-full">
            Entrar com Google
          </Button>
          <Button onClick={signInWithMicrosoft} variant="outline" className="w-full">
            Entrar com Microsoft
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create auth callback route**

```typescript
// apps/web/src/app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const origin = new URL(request.url).origin

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
        },
      }
    )
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/`)
}
```

- [ ] **Step 3: Create Sidebar component**

```typescript
// apps/web/src/components/layout/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Usuario } from '@cartracking/types'

interface SidebarProps { user: Usuario }

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const links = [
    { href: '/', label: '📅 Calendário' },
    { href: '/reservas/nova', label: '+ Nova Reserva' },
    { href: '/reservas', label: 'Minhas Reservas' },
    ...(user.papel === 'gestor' ? [
      { href: '/admin/veiculos', label: '🚗 Veículos' },
      { href: '/admin/reservas', label: '📋 Todas as Reservas' },
      { href: '/admin/relatorios', label: '📊 Relatórios' },
    ] : []),
  ]

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col p-4">
      <div className="font-bold text-lg mb-6">AMMOC Frotas</div>
      <nav className="flex flex-col gap-1 flex-1">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-2 rounded text-sm hover:bg-gray-700 ${pathname === l.href ? 'bg-gray-700 font-semibold' : ''}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-gray-700 pt-4 text-xs">
        <div className="text-gray-400 mb-2">{user.nome}</div>
        <button onClick={handleSignOut} className="text-gray-400 hover:text-white">
          Sair
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Create root layout**

```typescript
// apps/web/src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AMMOC Frotas',
  description: 'Sistema de Reserva de Veículos',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  let usuario = null
  if (authUser) {
    const { data } = await supabase.from('usuarios').select('*').eq('id', authUser.id).single()
    usuario = data
  }

  if (!usuario) {
    return (
      <html lang="pt-BR">
        <body className={inter.className}>{children}</body>
      </html>
    )
  }

  return (
    <html lang="pt-BR">
      <body className={`${inter.className} flex`}>
        <Sidebar user={usuario} />
        <main className="flex-1 p-6 bg-gray-50 min-h-screen">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/login apps/web/src/app/auth apps/web/src/app/layout.tsx apps/web/src/components/layout
git commit -m "feat: add login page with SSO, auth callback, and sidebar layout"
```

---

## Task 11: Calendar Home Page

**Files:**
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/components/calendar/ReservasCalendar.tsx`

- [ ] **Step 1: Create calendar component**

```typescript
// apps/web/src/components/calendar/ReservasCalendar.tsx
'use client'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { ReservaComDetalhes } from '@cartracking/types'

const VEHICLE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316']

interface Props {
  reservas: ReservaComDetalhes[]
  onNewReservation: () => void
}

export function ReservasCalendar({ reservas, onNewReservation }: Props) {
  const vehicleColorMap = new Map<string, string>()
  let colorIndex = 0

  const events = reservas.map(r => {
    if (!vehicleColorMap.has(r.veiculo_id)) {
      vehicleColorMap.set(r.veiculo_id, VEHICLE_COLORS[colorIndex++ % VEHICLE_COLORS.length])
    }
    return {
      id: r.id,
      title: `${r.veiculo?.modelo} — ${r.usuario?.nome}`,
      start: r.data_saida,
      end: r.data_retorno_prevista,
      backgroundColor: vehicleColorMap.get(r.veiculo_id),
      extendedProps: { reserva: r },
    }
  })

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek',
        }}
        locale="pt-br"
        events={events}
        eventClick={({ event }) => {
          const r: ReservaComDetalhes = event.extendedProps.reserva
          alert(`${r.veiculo?.modelo}\nDestino: ${r.destino}\nServiço: ${r.servico}\nStatus: ${r.status}`)
        }}
        customButtons={{
          newReservation: {
            text: '+ Nova Reserva',
            click: onNewReservation,
          },
        }}
        height="auto"
      />
    </div>
  )
}
```

- [ ] **Step 2: Create home page**

```typescript
// apps/web/src/app/page.tsx
import { createClient } from '@/lib/supabase/server'
import { apiFetch } from '@/lib/api'  // Note: apiFetch uses browser client; for server use direct supabase
import { ReservasCalendar } from '@/components/calendar/ReservasCalendar'
import Link from 'next/link'

// Server component fetches directly via Supabase
export default async function HomePage() {
  const supabase = await createClient()

  const { data: reservas } = await supabase
    .from('reservas')
    .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
    .not('status', 'in', '("cancelada")')
    .order('data_saida')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendário de Reservas</h1>
        <Link
          href="/reservas/nova"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Nova Reserva
        </Link>
      </div>
      <CalendarWrapper reservas={reservas ?? []} />
    </div>
  )
}

// Client wrapper needed for calendar interactivity
function CalendarWrapper({ reservas }: { reservas: any[] }) {
  'use client'
  const { useRouter } = require('next/navigation')
  const router = useRouter()
  return <ReservasCalendar reservas={reservas} onNewReservation={() => router.push('/reservas/nova')} />
}
```

> **Note:** The `CalendarWrapper` inline approach won't work in Server Components. Extract it to a separate `'use client'` file:

```typescript
// apps/web/src/components/calendar/CalendarWrapper.tsx
'use client'
import { useRouter } from 'next/navigation'
import { ReservasCalendar } from './ReservasCalendar'
import { ReservaComDetalhes } from '@cartracking/types'

export function CalendarWrapper({ reservas }: { reservas: ReservaComDetalhes[] }) {
  const router = useRouter()
  return <ReservasCalendar reservas={reservas} onNewReservation={() => router.push('/reservas/nova')} />
}
```

Update `page.tsx` to use `<CalendarWrapper>` instead.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/components/calendar/
git commit -m "feat: add calendar home page with FullCalendar"
```

---

## Task 12: New Reservation Form

**Files:**
- Create: `apps/web/src/app/reservas/nova/page.tsx`
- Create: `apps/web/src/components/reservas/NovaReservaForm.tsx`

- [ ] **Step 1: Create NovaReservaForm component**

```typescript
// apps/web/src/components/reservas/NovaReservaForm.tsx
'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { Veiculo, CriarReservaInput } from '@cartracking/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

const schema = z.object({
  veiculo_id: z.string().min(1, 'Selecione um veículo'),
  data_saida: z.string().min(1, 'Informe a data/hora de saída'),
  data_retorno_prevista: z.string().min(1, 'Informe o retorno previsto'),
  destino: z.string().min(3, 'Informe o destino'),
  servico: z.string().min(3, 'Informe o serviço'),
})

type FormData = z.infer<typeof schema>

export function NovaReservaForm() {
  const router = useRouter()
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [disponivel, setDisponivel] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const veiculoId = watch('veiculo_id')
  const dataSaida = watch('data_saida')
  const dataRetorno = watch('data_retorno_prevista')

  useEffect(() => {
    apiFetch<Veiculo[]>('/veiculos').then(setVeiculos).catch(console.error)
  }, [])

  useEffect(() => {
    if (!veiculoId || !dataSaida || !dataRetorno) { setDisponivel(null); return }
    const params = new URLSearchParams({ veiculo_id: veiculoId, inicio: dataSaida, fim: dataRetorno })
    apiFetch<{ disponivel: boolean }>(`/disponibilidade?${params}`)
      .then(d => setDisponivel(d.disponivel))
      .catch(() => setDisponivel(null))
  }, [veiculoId, dataSaida, dataRetorno])

  async function onSubmit(data: FormData) {
    if (disponivel === false) return
    setLoading(true); setError(null)
    try {
      await apiFetch('/reservas', { method: 'POST', body: JSON.stringify(data) })
      router.push('/reservas')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-4">
      <div>
        <Label>Veículo</Label>
        <select {...register('veiculo_id')} className="w-full border rounded px-3 py-2 mt-1">
          <option value="">Selecione...</option>
          {veiculos.map(v => (
            <option key={v.id} value={v.id}>
              {v.modelo} ({v.placa}) — {v.tipo}
            </option>
          ))}
        </select>
        {errors.veiculo_id && <p className="text-red-500 text-xs mt-1">{errors.veiculo_id.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Data/Hora de Saída</Label>
          <Input type="datetime-local" {...register('data_saida')} className="mt-1" />
          {errors.data_saida && <p className="text-red-500 text-xs mt-1">{errors.data_saida.message}</p>}
        </div>
        <div>
          <Label>Retorno Previsto</Label>
          <Input type="datetime-local" {...register('data_retorno_prevista')} className="mt-1" />
          {errors.data_retorno_prevista && <p className="text-red-500 text-xs mt-1">{errors.data_retorno_prevista.message}</p>}
        </div>
      </div>

      {disponivel === false && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 text-red-700 text-sm">
            ❌ Veículo não disponível neste período. Escolha outra data ou outro veículo.
          </CardContent>
        </Card>
      )}
      {disponivel === true && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 text-green-700 text-sm">
            ✅ Veículo disponível neste período!
          </CardContent>
        </Card>
      )}

      <div>
        <Label>Destino</Label>
        <Input {...register('destino')} placeholder="Ex: Secretaria Municipal de Saúde" className="mt-1" />
        {errors.destino && <p className="text-red-500 text-xs mt-1">{errors.destino.message}</p>}
      </div>

      <div>
        <Label>Serviço / Finalidade</Label>
        <Input {...register('servico')} placeholder="Ex: Transporte de servidores" className="mt-1" />
        {errors.servico && <p className="text-red-500 text-xs mt-1">{errors.servico.message}</p>}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button type="submit" disabled={loading || disponivel === false} className="w-full">
        {loading ? 'Criando reserva...' : 'Confirmar Reserva'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Create page**

```typescript
// apps/web/src/app/reservas/nova/page.tsx
import { NovaReservaForm } from '@/components/reservas/NovaReservaForm'

export default function NovaReservaPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nova Reserva</h1>
      <NovaReservaForm />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/reservas/nova apps/web/src/components/reservas/NovaReservaForm.tsx
git commit -m "feat: add new reservation form with availability check"
```

---

## Task 13: My Reservations List + Finalize Trip

**Files:**
- Create: `apps/web/src/app/reservas/page.tsx`
- Create: `apps/web/src/components/reservas/ReservaCard.tsx`
- Create: `apps/web/src/app/reservas/[id]/finalizar/page.tsx`
- Create: `apps/web/src/components/reservas/FinalizarViagemForm.tsx`

- [ ] **Step 1: Create ReservaCard**

```typescript
// apps/web/src/components/reservas/ReservaCard.tsx
'use client'
import { ReservaComDetalhes, StatusReserva } from '@cartracking/types'
import { apiFetch } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_COLORS: Record<StatusReserva, string> = {
  confirmada: 'bg-green-100 text-green-800',
  em_andamento: 'bg-yellow-100 text-yellow-800',
  finalizada: 'bg-gray-100 text-gray-800',
  cancelada: 'bg-red-100 text-red-800',
}

interface Props {
  reserva: ReservaComDetalhes
  onUpdate: () => void
}

export function ReservaCard({ reserva, onUpdate }: Props) {
  const router = useRouter()

  async function handleIniciar() {
    if (!confirm('Iniciar viagem?')) return
    await apiFetch(`/reservas/${reserva.id}/iniciar`, { method: 'PATCH' })
    onUpdate()
  }

  async function handleCancelar() {
    if (!confirm('Cancelar esta reserva?')) return
    await apiFetch(`/reservas/${reserva.id}`, { method: 'DELETE' })
    onUpdate()
  }

  const fmt = (d: string) => format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR })

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold">{reserva.veiculo?.modelo} ({reserva.veiculo?.placa})</div>
            <div className="text-sm text-gray-600 mt-1">
              {fmt(reserva.data_saida)} → {fmt(reserva.data_retorno_prevista)}
            </div>
            <div className="text-sm mt-1">📍 {reserva.destino}</div>
            <div className="text-sm">🔧 {reserva.servico}</div>
            {reserva.km_saida && <div className="text-xs text-gray-500 mt-1">KM saída: {reserva.km_saida}</div>}
          </div>
          <Badge className={STATUS_COLORS[reserva.status]}>{reserva.status}</Badge>
        </div>
        <div className="flex gap-2 mt-3">
          {reserva.status === 'confirmada' && (
            <Button size="sm" variant="outline" onClick={handleIniciar}>Iniciar</Button>
          )}
          {(reserva.status === 'confirmada' || reserva.status === 'em_andamento') && (
            <Button size="sm" onClick={() => router.push(`/reservas/${reserva.id}/finalizar`)}>
              Finalizar
            </Button>
          )}
          {reserva.status === 'confirmada' && (
            <Button size="sm" variant="destructive" onClick={handleCancelar}>Cancelar</Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create my reservations page**

```typescript
// apps/web/src/app/reservas/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { ReservaComDetalhes } from '@cartracking/types'
import { ReservaCard } from '@/components/reservas/ReservaCard'

export default function ReservasPage() {
  const [reservas, setReservas] = useState<ReservaComDetalhes[]>([])

  const load = useCallback(() => {
    apiFetch<ReservaComDetalhes[]>('/reservas').then(setReservas).catch(console.error)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Minhas Reservas</h1>
      {reservas.length === 0 ? (
        <p className="text-gray-500">Nenhuma reserva encontrada.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reservas.map(r => <ReservaCard key={r.id} reserva={r} onUpdate={load} />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create FinalizarViagemForm**

```typescript
// apps/web/src/components/reservas/FinalizarViagemForm.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { FinalizarViagemInput } from '@cartracking/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const schema = z.object({
  km_retorno: z.coerce.number().int().positive('Informe o KM final'),
  observacoes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function FinalizarViagemForm({ reservaId, kmSaida }: { reservaId: string; kmSaida: number | null }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    try {
      await apiFetch(`/reservas/${reservaId}/finalizar`, { method: 'PATCH', body: JSON.stringify(data) })
      router.push('/reservas')
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4">
      {kmSaida && <p className="text-sm text-gray-600">KM de saída registrado: <strong>{kmSaida} km</strong></p>}
      <div>
        <Label>KM Final (hodômetro)</Label>
        <Input type="number" {...register('km_retorno')} className="mt-1" />
        {errors.km_retorno && <p className="text-red-500 text-xs mt-1">{errors.km_retorno.message}</p>}
      </div>
      <div>
        <Label>Observações / Ocorrências (opcional)</Label>
        <textarea
          {...register('observacoes')}
          rows={3}
          className="w-full border rounded px-3 py-2 mt-1 text-sm"
          placeholder="Problemas, ocorrências, ou observações sobre a viagem..."
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Finalizando...' : 'Finalizar Viagem'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Create finalize page**

```typescript
// apps/web/src/app/reservas/[id]/finalizar/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FinalizarViagemForm } from '@/components/reservas/FinalizarViagemForm'

export default async function FinalizarPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: reserva } = await supabase
    .from('reservas')
    .select('*, veiculo:veiculos(*)')
    .eq('id', params.id)
    .single()

  if (!reserva || reserva.status === 'finalizada' || reserva.status === 'cancelada') {
    notFound()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Finalizar Viagem</h1>
      <p className="text-gray-600 mb-6">
        {reserva.veiculo?.modelo} ({reserva.veiculo?.placa}) — {reserva.destino}
      </p>
      <FinalizarViagemForm reservaId={reserva.id} kmSaida={reserva.km_saida} />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/reservas apps/web/src/components/reservas/
git commit -m "feat: add my reservations list and finalize trip form"
```

---

## Task 14: Admin — Vehicles CRUD

**Files:**
- Create: `apps/web/src/app/admin/veiculos/page.tsx`
- Create: `apps/web/src/components/veiculos/VeiculoForm.tsx`

- [ ] **Step 1: Create VeiculoForm component**

```typescript
// apps/web/src/components/veiculos/VeiculoForm.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { CriarVeiculoInput, Veiculo, TipoVeiculo } from '@cartracking/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  placa: z.string().min(7).max(8),
  modelo: z.string().min(2),
  ano: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1),
  tipo: z.enum(['carro', 'van', 'caminhonete', 'onibus', 'outro']),
  km_atual: z.coerce.number().int().min(0),
})

type FormData = z.infer<typeof schema>

interface Props {
  veiculo?: Veiculo
  onSave: () => void
  onCancel: () => void
}

export function VeiculoForm({ veiculo, onSave, onCancel }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: veiculo ? {
      placa: veiculo.placa,
      modelo: veiculo.modelo,
      ano: veiculo.ano,
      tipo: veiculo.tipo as TipoVeiculo,
      km_atual: veiculo.km_atual,
    } : undefined,
  })

  async function onSubmit(data: FormData) {
    if (veiculo) {
      await apiFetch(`/veiculos/${veiculo.id}`, { method: 'PATCH', body: JSON.stringify(data) })
    } else {
      await apiFetch('/veiculos', { method: 'POST', body: JSON.stringify(data) })
    }
    onSave()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Placa</Label>
          <Input {...register('placa')} placeholder="ABC-1234" className="mt-1" />
          {errors.placa && <p className="text-red-500 text-xs mt-1">{errors.placa.message}</p>}
        </div>
        <div>
          <Label>Modelo</Label>
          <Input {...register('modelo')} placeholder="Ford Ranger" className="mt-1" />
          {errors.modelo && <p className="text-red-500 text-xs mt-1">{errors.modelo.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Ano</Label>
          <Input type="number" {...register('ano')} className="mt-1" />
        </div>
        <div>
          <Label>Tipo</Label>
          <select {...register('tipo')} className="w-full border rounded px-3 py-2 mt-1">
            <option value="carro">Carro</option>
            <option value="van">Van</option>
            <option value="caminhonete">Caminhonete</option>
            <option value="onibus">Ônibus</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <Label>KM Atual</Label>
          <Input type="number" {...register('km_atual')} className="mt-1" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {veiculo ? 'Salvar' : 'Cadastrar'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create admin vehicles page**

```typescript
// apps/web/src/app/admin/veiculos/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { Veiculo } from '@cartracking/types'
import { VeiculoForm } from '@/components/veiculos/VeiculoForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function AdminVeiculosPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [editando, setEditando] = useState<Veiculo | null | 'novo'>(null)

  const load = useCallback(() => {
    apiFetch<Veiculo[]>('/veiculos/todos').then(setVeiculos).catch(console.error)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleAtivo(v: Veiculo) {
    await apiFetch(`/veiculos/${v.id}`, { method: 'PATCH', body: JSON.stringify({ ativo: !v.ativo }) })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Veículos</h1>
        <Button onClick={() => setEditando('novo')}>+ Cadastrar Veículo</Button>
      </div>

      {editando && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h2 className="font-semibold mb-3">{editando === 'novo' ? 'Novo Veículo' : 'Editar Veículo'}</h2>
          <VeiculoForm
            veiculo={editando !== 'novo' ? editando : undefined}
            onSave={() => { setEditando(null); load() }}
            onCancel={() => setEditando(null)}
          />
        </div>
      )}

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Placa</th>
              <th className="px-4 py-3 text-left">Modelo</th>
              <th className="px-4 py-3 text-left">Ano</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-right">KM Atual</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {veiculos.map(v => (
              <tr key={v.id} className="border-t">
                <td className="px-4 py-3 font-mono">{v.placa}</td>
                <td className="px-4 py-3">{v.modelo}</td>
                <td className="px-4 py-3">{v.ano}</td>
                <td className="px-4 py-3 capitalize">{v.tipo}</td>
                <td className="px-4 py-3 text-right">{v.km_atual.toLocaleString()} km</td>
                <td className="px-4 py-3 text-center">
                  <Badge className={v.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {v.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3 flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setEditando(v)}>Editar</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleAtivo(v)}>
                    {v.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/admin/veiculos apps/web/src/components/veiculos/
git commit -m "feat: add admin vehicles CRUD page"
```

---

## Task 15: Admin — All Reservations + Reports

**Files:**
- Create: `apps/web/src/app/admin/reservas/page.tsx`
- Create: `apps/web/src/app/admin/relatorios/page.tsx`
- Create: `apps/web/src/components/relatorios/RelatorioPanel.tsx`

- [ ] **Step 1: Create admin reservations page**

```typescript
// apps/web/src/app/admin/reservas/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { ReservaComDetalhes, StatusReserva } from '@cartracking/types'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_COLORS: Record<StatusReserva, string> = {
  confirmada: 'bg-green-100 text-green-800',
  em_andamento: 'bg-yellow-100 text-yellow-800',
  finalizada: 'bg-gray-100 text-gray-800',
  cancelada: 'bg-red-100 text-red-800',
}

export default function AdminReservasPage() {
  const [reservas, setReservas] = useState<ReservaComDetalhes[]>([])

  const load = useCallback(() => {
    apiFetch<ReservaComDetalhes[]>('/reservas').then(setReservas).catch(console.error)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Todas as Reservas</h1>
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Funcionário</th>
              <th className="px-4 py-3 text-left">Veículo</th>
              <th className="px-4 py-3 text-left">Saída</th>
              <th className="px-4 py-3 text-left">Retorno Previsto</th>
              <th className="px-4 py-3 text-left">Destino</th>
              <th className="px-4 py-3 text-left">Serviço</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">KM</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map(r => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{r.usuario?.nome}</td>
                <td className="px-4 py-3">{r.veiculo?.modelo} ({r.veiculo?.placa})</td>
                <td className="px-4 py-3">{format(new Date(r.data_saida), 'dd/MM/yy HH:mm', { locale: ptBR })}</td>
                <td className="px-4 py-3">{format(new Date(r.data_retorno_prevista), 'dd/MM/yy HH:mm', { locale: ptBR })}</td>
                <td className="px-4 py-3">{r.destino}</td>
                <td className="px-4 py-3">{r.servico}</td>
                <td className="px-4 py-3 text-center">
                  <Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {r.km_retorno && r.km_saida ? `${r.km_retorno - r.km_saida} km` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create RelatorioPanel**

```typescript
// apps/web/src/components/relatorios/RelatorioPanel.tsx
'use client'
import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { RelatorioData } from '@cartracking/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export function RelatorioPanel() {
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [data, setData] = useState<RelatorioData | null>(null)
  const [loading, setLoading] = useState(false)

  async function buscar() {
    setLoading(true)
    try {
      const result = await apiFetch<RelatorioData>(`/relatorios?inicio=${inicio}&fim=${fim}`)
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function exportar(tipo: 'excel' | 'pdf') {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    window.open(`${apiUrl}/relatorios/exportar/${tipo}?inicio=${inicio}&fim=${fim}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end">
        <div>
          <Label>Data início</Label>
          <Input type="date" value={inicio} onChange={e => setInicio(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Data fim</Label>
          <Input type="date" value={fim} onChange={e => setFim(e.target.value)} className="mt-1" />
        </div>
        <Button onClick={buscar} disabled={!inicio || !fim || loading}>
          {loading ? 'Buscando...' : 'Gerar Relatório'}
        </Button>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold">{data.total_viagens}</div>
              <div className="text-sm text-gray-500">Viagens</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold">{data.total_km.toLocaleString()}</div>
              <div className="text-sm text-gray-500">KM Total</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold">{data.veiculos_usados}</div>
              <div className="text-sm text-gray-500">Veículos Utilizados</div>
            </CardContent></Card>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => exportar('excel')}>📥 Exportar Excel</Button>
            <Button variant="outline" onClick={() => exportar('pdf')}>📄 Exportar PDF</Button>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Uso por Veículo</h2>
            <table className="w-full text-sm bg-white rounded shadow">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-2 text-left">Veículo</th>
                <th className="px-4 py-2 text-right">Viagens</th>
                <th className="px-4 py-2 text-right">KM</th>
              </tr></thead>
              <tbody>
                {data.por_veiculo.map((v, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{v.veiculo.modelo} ({v.veiculo.placa})</td>
                    <td className="px-4 py-2 text-right">{v.viagens}</td>
                    <td className="px-4 py-2 text-right">{v.km.toLocaleString()} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Uso por Funcionário</h2>
            <table className="w-full text-sm bg-white rounded shadow">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-2 text-left">Funcionário</th>
                <th className="px-4 py-2 text-right">Viagens</th>
                <th className="px-4 py-2 text-right">KM</th>
              </tr></thead>
              <tbody>
                {data.por_usuario.map((u, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{u.usuario.nome}</td>
                    <td className="px-4 py-2 text-right">{u.viagens}</td>
                    <td className="px-4 py-2 text-right">{u.km.toLocaleString()} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Destinos Mais Frequentes</h2>
            <div className="flex flex-col gap-1">
              {data.destinos_frequentes.map((d, i) => (
                <div key={i} className="flex justify-between text-sm bg-white px-4 py-2 rounded border">
                  <span>{d.destino}</span>
                  <span className="font-semibold">{d.count}x</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create reports page**

```typescript
// apps/web/src/app/admin/relatorios/page.tsx
import { RelatorioPanel } from '@/components/relatorios/RelatorioPanel'

export default function RelatoriosPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Relatórios</h1>
      <RelatorioPanel />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/ apps/web/src/components/relatorios/
git commit -m "feat: add admin pages for all reservations and reports"
```

---

## Task 16: Configure Supabase Auth Providers

- [ ] **Step 1: Enable Google OAuth in Supabase Dashboard**

Go to Supabase Dashboard → Authentication → Providers → Google:
- Enable Google provider
- Add Client ID and Client Secret from Google Cloud Console
- Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`

- [ ] **Step 2: Enable Microsoft/Azure OAuth in Supabase Dashboard**

Go to Supabase Dashboard → Authentication → Providers → Azure:
- Enable Azure provider
- Add Azure AD Client ID, Client Secret, and Tenant ID
- Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`

- [ ] **Step 3: Configure Supabase Auth redirect URLs**

In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://your-vercel-app.vercel.app`
- Redirect URLs: add `https://your-vercel-app.vercel.app/auth/callback`

- [ ] **Step 4: Configure Supabase Storage bucket for vehicle photos**

```sql
-- Run in Supabase SQL editor
INSERT INTO storage.buckets (id, name, public) VALUES ('veiculos', 'veiculos', true);

CREATE POLICY "public_read_veiculos" ON storage.objects
  FOR SELECT USING (bucket_id = 'veiculos');

CREATE POLICY "auth_upload_veiculos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'veiculos');
```

---

## Task 17: Deploy — Railway (API)

- [ ] **Step 1: Create railway.json**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd apps/api && npm install && npm run build"
  },
  "deploy": {
    "startCommand": "cd apps/api && npm start",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

- [ ] **Step 2: Add Procfile (alternative)**

```
web: cd apps/api && node dist/index.js
```

- [ ] **Step 3: Set environment variables in Railway dashboard**

```
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
RESEND_API_KEY=re_[your-key]
WEB_URL=https://[your-vercel-app].vercel.app
NODE_ENV=production
```

- [ ] **Step 4: Deploy via Railway CLI or GitHub integration**

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```

- [ ] **Step 5: Note the Railway API URL**

After deploy, Railway provides a public URL like `https://cartracking-api-production.up.railway.app`. Save this as `NEXT_PUBLIC_API_URL` in Vercel.

---

## Task 18: Deploy — Vercel (Frontend)

- [ ] **Step 1: Create vercel.json**

```json
{
  "buildCommand": "cd apps/web && npm run build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

- [ ] **Step 2: Set environment variables in Vercel dashboard**

```
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
NEXT_PUBLIC_API_URL=https://[your-railway-api-url]
```

- [ ] **Step 3: Deploy via Vercel CLI or GitHub integration**

```bash
npm install -g vercel
vercel login
vercel --prod
```

- [ ] **Step 4: Update Supabase Auth redirect URLs with production Vercel URL**

In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://[your-app].vercel.app`
- Add to Redirect URLs: `https://[your-app].vercel.app/auth/callback`

- [ ] **Step 5: Final commit**

```bash
git add railway.json vercel.json
git commit -m "feat: add Railway and Vercel deployment configuration"
```

---

## Spec Coverage Check

| Requirement | Task |
|---|---|
| Funcionário reserva veículo | Task 12 |
| Verificação de disponibilidade em tempo real | Task 6, 12 |
| Login Google/Microsoft SSO | Task 10, 16 |
| Calendário mensal/semanal | Task 11 |
| Finalizar viagem com KM + observações | Task 6, 13 |
| Email de confirmação | Task 7 |
| Alerta 2h viagem não finalizada | Task 7 |
| Gestor: CRUD veículos | Task 5, 14 |
| Gestor: ver todas as reservas | Task 15 |
| Relatórios com totais e filtros | Task 8, 15 |
| Exportar Excel | Task 8 |
| Exportar PDF | Task 8 |
| RLS policies | Task 4 |
| Deploy Vercel + Railway | Task 17, 18 |
| Git com commits | All tasks |
| Banco no Supabase CARTracking | Task 4 |
