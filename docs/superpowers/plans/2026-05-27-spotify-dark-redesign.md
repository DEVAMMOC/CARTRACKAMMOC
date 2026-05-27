# Spotify-inspired Dark Theme + Light/Dark Switcher — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Spotify-inspired dark theme alongside the existing AMMOC institutional light palette, with a user-facing switcher (sidebar toggle + settings select) that respects system preference by default.

**Architecture:** Token-driven theming using CSS variables in `globals.css` (`:root` for light, `.dark` for dark). `next-themes` provider wraps the app in `layout.tsx` and toggles the `.dark` class on `<html>`. shadcn/ui components inherit automatically; lugares com cor hardcoded são reescritos para usar tokens. Logo é servido em duas versões (com e sem fundo preto) via `<Image>` duplicado com `dark:`/`light:` variants.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, shadcn/ui, `next-themes`, `sharp` (one-off para gerar logo transparente)

**Working directory:** `C:\Users\max_m\OneDrive\Área de Trabalho\CARTrackingAMMOC` (main checkout, branch `main`)

**Reference spec:** `docs/superpowers/specs/2026-05-27-spotify-dark-redesign-design.md`

---

## Task 1: Install `next-themes` dependency

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install package**

Run from repo root:
```bash
npm install --workspace=apps/web next-themes@^0.4.6
```

Expected: adds `"next-themes": "^0.4.6"` under `dependencies` in `apps/web/package.json` and updates `package-lock.json`.

- [ ] **Step 2: Verify package is present**

```bash
node -e "console.log(require('apps/web/package.json').dependencies['next-themes'])"
```

Expected output: `^0.4.6` (or similar caret-pinned version)

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json package-lock.json
git commit -m "chore(web): add next-themes dependency for theme switching"
```

---

## Task 2: Rewrite `globals.css` tokens for both themes

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Replace the `:root` and `.dark` blocks**

Open `apps/web/src/app/globals.css` and replace the entire `:root { ... }` block AND the entire `.dark { ... }` block with the following. Keep everything outside those blocks (imports, `@theme inline`, `@layer base`, FullCalendar overrides) unchanged.

```css
:root {
  /* AMMOC institutional palette (light theme) */
  --brand-primary: #2D6A4F;
  --brand-secondary: #1D3557;
  --brand-accent: #52B788;
  --brand-surface: #F8F9FA;

  --background: #F8F9FA;
  --foreground: #1D3557;
  --card: #ffffff;
  --card-foreground: #1D3557;
  --popover: #ffffff;
  --popover-foreground: #1D3557;
  --primary: #2D6A4F;
  --primary-foreground: #ffffff;
  --secondary: #F1F3F5;
  --secondary-foreground: #1D3557;
  --muted: #F1F3F5;
  --muted-foreground: #6c757d;
  --accent: #E6F4EA;
  --accent-foreground: #1D3557;
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
  --border: #E5E7EB;
  --input: #E5E7EB;
  --ring: #2D6A4F;
  --chart-1: #2D6A4F;
  --chart-2: #1D3557;
  --chart-3: #52B788;
  --chart-4: #74C69D;
  --chart-5: #95D5B2;
  --radius: 0.625rem;
  --sidebar: #1D3557;
  --sidebar-foreground: #ffffff;
  --sidebar-primary: #52B788;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: rgba(255, 255, 255, 0.1);
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border: rgba(255, 255, 255, 0.1);
  --sidebar-ring: #52B788;
}

.dark {
  /* Spotify-inspired dark theme + AMMOC navy as institutional anchor */
  --background: #121212;
  --foreground: #ffffff;
  --card: #181818;
  --card-foreground: #ffffff;
  --popover: #1f1f1f;
  --popover-foreground: #ffffff;
  --primary: #1ed760;
  --primary-foreground: #0a0a0a;
  --secondary: #1f1f1f;
  --secondary-foreground: #ffffff;
  --muted: #1f1f1f;
  --muted-foreground: #b3b3b3;
  --accent: #1D3557;
  --accent-foreground: #ffffff;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: rgba(255, 255, 255, 0.08);
  --input: rgba(255, 255, 255, 0.10);
  --ring: #1ed760;
  --chart-1: #1ed760;
  --chart-2: #1D3557;
  --chart-3: #52B788;
  --chart-4: #f3727f;
  --chart-5: #b3b3b3;
  --sidebar: #000000;
  --sidebar-foreground: #ffffff;
  --sidebar-primary: #1ed760;
  --sidebar-primary-foreground: #0a0a0a;
  --sidebar-accent: rgba(255, 255, 255, 0.06);
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border: rgba(255, 255, 255, 0.06);
  --sidebar-ring: #1ed760;
}
```

- [ ] **Step 2: Update the `body` rule in `@layer base` to use `var(--background)` instead of `var(--brand-surface)`**

Find this block in the same file:
```css
body {
  @apply bg-background text-foreground;
  line-height: 1.55;
  background-color: var(--brand-surface);
}
```

Replace it with:
```css
body {
  @apply bg-background text-foreground;
  line-height: 1.55;
}
```

(Removing the `background-color: var(--brand-surface)` line because it overrides the theme-aware `bg-background` Tailwind class, which is what we need responding to `.dark`.)

- [ ] **Step 3: Update the FullCalendar overrides at the bottom of the file to use `--primary` instead of `--brand-primary`**

Find the block:
```css
.fc .fc-button-primary {
  background-color: var(--brand-primary);
  border-color: var(--brand-primary);
}
.fc .fc-button-primary:not(:disabled):hover {
  background-color: var(--brand-secondary);
  border-color: var(--brand-secondary);
}
.fc .fc-button-primary:not(:disabled).fc-button-active,
.fc .fc-button-primary:not(:disabled):active {
  background-color: var(--brand-secondary);
  border-color: var(--brand-secondary);
}
```

Replace with:
```css
.fc .fc-button-primary {
  background-color: var(--primary);
  border-color: var(--primary);
  color: var(--primary-foreground);
}
.fc .fc-button-primary:not(:disabled):hover {
  background-color: var(--primary);
  border-color: var(--primary);
  filter: brightness(0.9);
}
.fc .fc-button-primary:not(:disabled).fc-button-active,
.fc .fc-button-primary:not(:disabled):active {
  background-color: var(--accent);
  border-color: var(--accent);
  color: var(--accent-foreground);
}
```

Do the same for the mobile media-query block earlier in the file:
```css
.fc .fc-button-primary {
  background-color: var(--brand-primary);
  border-color: var(--brand-primary);
}
```
becomes:
```css
.fc .fc-button-primary {
  background-color: var(--primary);
  border-color: var(--primary);
  color: var(--primary-foreground);
}
```

- [ ] **Step 4: Add FullCalendar dark-mode cell overrides at the end of the file**

Append this block at the bottom of `globals.css`:

```css
/* FullCalendar dark-mode cell overrides — keep grid legible against #121212 */
.dark .fc {
  --fc-border-color: rgba(255, 255, 255, 0.08);
  --fc-page-bg-color: var(--background);
  --fc-neutral-bg-color: var(--card);
  --fc-list-event-hover-bg-color: var(--secondary);
  --fc-today-bg-color: rgba(30, 215, 96, 0.08);
}
.dark .fc .fc-col-header-cell-cushion,
.dark .fc .fc-daygrid-day-number {
  color: var(--foreground);
}
.dark .fc .fc-toolbar-title {
  color: var(--foreground);
}
```

- [ ] **Step 5: Verify build still works**

```bash
npm run build --workspace=apps/web
```

Expected: build completes without errors. Static pages generated.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(web): add dark theme tokens, switch FullCalendar to theme-aware vars"
```

---

## Task 3: Create `ThemeProvider` component

**Files:**
- Create: `apps/web/src/components/providers/ThemeProvider.tsx`

- [ ] **Step 1: Create the provider file**

Create `apps/web/src/components/providers/ThemeProvider.tsx` with this content:

```tsx
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
```

Note: importing the prop type from `ComponentProps<typeof NextThemesProvider>` avoids the missing `ThemeProviderProps` export that exists only in some versions of `next-themes`.

- [ ] **Step 2: Verify typecheck**

```bash
npm --workspace=apps/web exec -- tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/providers/ThemeProvider.tsx
git commit -m "feat(web): add ThemeProvider wrapping next-themes"
```

---

## Task 4: Wire `ThemeProvider` into `layout.tsx`

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Read the current `layout.tsx`**

Use Read tool on `apps/web/src/app/layout.tsx` to see the current structure. The relevant parts are the `<html>` tag and the children rendering.

- [ ] **Step 2: Add `suppressHydrationWarning` to the `<html>` tag**

Find `<html lang="pt-BR">` and change it to:
```tsx
<html lang="pt-BR" suppressHydrationWarning>
```

If there are multiple `<html>` tags (the file has a conditional return for logged-out users), update BOTH.

- [ ] **Step 3: Import `ThemeProvider` and wrap the body content**

At the top of the file, add the import:
```tsx
import { ThemeProvider } from '@/components/providers/ThemeProvider'
```

Then wrap the children inside `<body>` with `<ThemeProvider>`. For example, if the body currently is:
```tsx
<body className={inter.className}>{children}</body>
```
change it to:
```tsx
<body className={inter.className}>
  <ThemeProvider>{children}</ThemeProvider>
</body>
```

Apply the same wrapping inside any second `<body>` if the file has the logged-in branch with sidebar:
```tsx
<body className={`${inter.className} flex min-h-screen`}>
  <ThemeProvider>
    <Sidebar user={usuario} />
    <main className="flex-1 p-6 bg-gray-50 overflow-auto">
      {children}
    </main>
  </ThemeProvider>
</body>
```

- [ ] **Step 4: Replace any hardcoded `bg-gray-50` (or similar) on the `<main>` with `bg-background`**

In the same `layout.tsx`, replace:
```tsx
<main className="flex-1 p-6 bg-gray-50 overflow-auto">
```
with:
```tsx
<main className="flex-1 p-6 bg-background overflow-auto">
```

- [ ] **Step 5: Run dev server and verify no hydration warnings**

```bash
npm run dev --workspace=apps/web
```

Open http://localhost:3000/login in a browser. Open DevTools console. Expected: no hydration warnings about `class` mismatch on `<html>`.

Stop the dev server with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat(web): wrap app in ThemeProvider, swap hardcoded bg-gray-50 for bg-background"
```

---

## Task 5: Generate transparent logo + copy assets to `public/`

**Files:**
- Create: `apps/web/public/ammoc.png`
- Create: `apps/web/public/ammoc-transparent.png`
- Create: `scripts/generate-logo-transparent.mjs` (one-off, kept in repo for future regeneration)

- [ ] **Step 1: Create the script that strips the black background**

Create `scripts/generate-logo-transparent.mjs` (at repo root, not under apps/web):

```js
// One-off: generate a transparent-bg version of the AMMOC logo.
// Removes pixels where R, G, B are all below a threshold (the near-black backdrop).
// Run: node scripts/generate-logo-transparent.mjs
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(__dirname, '..', 'assets', 'logos', 'ammoc.png')
const DST = resolve(__dirname, '..', 'apps', 'web', 'public', 'ammoc-transparent.png')
const THRESHOLD = 24 // pixel is treated as "background" if R<24 AND G<24 AND B<24

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const out = Buffer.from(data)
for (let i = 0; i < out.length; i += 4) {
  if (out[i] < THRESHOLD && out[i + 1] < THRESHOLD && out[i + 2] < THRESHOLD) {
    out[i + 3] = 0 // alpha = 0
  }
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(DST)
console.log(`Wrote ${DST}`)
```

- [ ] **Step 2: Install `sharp` as a dev dependency at the repo root**

```bash
npm install --save-dev sharp@^0.34.0
```

(At repo root, not under apps/web — this is a build-time tool, not a runtime dep.)

- [ ] **Step 3: Copy the original logo to public/**

```bash
cp "assets/logos/ammoc.png" "apps/web/public/ammoc.png"
```

- [ ] **Step 4: Run the script to generate the transparent version**

```bash
node scripts/generate-logo-transparent.mjs
```

Expected output: `Wrote <path>/apps/web/public/ammoc-transparent.png`

- [ ] **Step 5: Verify both files exist and have reasonable sizes**

```bash
ls -la apps/web/public/ammoc*.png
```

Expected: both files present. `ammoc.png` ~11MB (original), `ammoc-transparent.png` smaller (typically 100-500KB after stripping the BG and applying max PNG compression).

- [ ] **Step 6: Commit**

```bash
git add apps/web/public/ammoc.png apps/web/public/ammoc-transparent.png scripts/generate-logo-transparent.mjs package.json package-lock.json
git commit -m "feat(web): add AMMOC logo assets (with and without bg) + generation script"
```

---

## Task 6: Create `ThemeToggle` component

**Files:**
- Create: `apps/web/src/components/ui/theme-toggle.tsx`

- [ ] **Step 1: Create the component file**

Create `apps/web/src/components/ui/theme-toggle.tsx` with this content:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { MoonIcon, SunIcon } from 'lucide-react'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // next-themes recommends gating on mount to avoid hydration mismatch
  // (server renders neutral; client picks up the actual theme).
  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'
  const nextLabel = isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={nextLabel}
      title={nextLabel}
      className={
        'inline-flex h-9 w-9 items-center justify-center rounded-md ' +
        'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ' +
        'transition-colors ' +
        className
      }
    >
      {/* Render a neutral icon before mount to avoid mismatch */}
      {!mounted ? (
        <SunIcon className="h-4 w-4 opacity-50" />
      ) : isDark ? (
        <SunIcon className="h-4 w-4" />
      ) : (
        <MoonIcon className="h-4 w-4" />
      )}
    </button>
  )
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm --workspace=apps/web exec -- tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/theme-toggle.tsx
git commit -m "feat(web): add ThemeToggle button (sun/moon) for sidebar"
```

---

## Task 7: Create `ThemeSelect` component

**Files:**
- Create: `apps/web/src/components/ui/theme-select.tsx`

- [ ] **Step 1: Check whether shadcn's `Select` is installed**

```bash
ls apps/web/src/components/ui/select.tsx
```

Expected: file exists. If it doesn't, install via shadcn CLI: `npx --workspace=apps/web shadcn@latest add select` then proceed.

- [ ] **Step 2: Create the component file**

Create `apps/web/src/components/ui/theme-select.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ThemeSelect() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <Select
      value={mounted ? theme ?? 'system' : 'system'}
      onValueChange={(value) => setTheme(value)}
      disabled={!mounted}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Tema" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="system">Sistema</SelectItem>
        <SelectItem value="light">Claro</SelectItem>
        <SelectItem value="dark">Escuro</SelectItem>
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 3: Verify typecheck**

```bash
npm --workspace=apps/web exec -- tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/theme-select.tsx
git commit -m "feat(web): add ThemeSelect (Sistema/Claro/Escuro) for settings page"
```

---

## Task 8: Update `Sidebar` to use tokens + add `ThemeToggle`

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Read the current Sidebar to find hardcoded colors**

Use Read tool on `apps/web/src/components/layout/Sidebar.tsx`. Look for:
- Hardcoded background gradients (`bg-gradient-to-b from-[#1D3557]...`)
- Hardcoded text colors (`text-white`, `text-blue-200`)
- Hardcoded border colors
- The location of the sign-out / footer area

- [ ] **Step 2: Replace hardcoded sidebar background with token classes**

Wherever the sidebar root or any panel uses hardcoded `bg-gradient-...` or `bg-[#xxx]`, replace with `bg-sidebar text-sidebar-foreground`. For example:

Before:
```tsx
<aside className="w-64 bg-gradient-to-b from-[#1D3557] to-[#2D6A4F] text-white">
```

After:
```tsx
<aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
```

For nav links with active states, replace any hardcoded `bg-white/10` with `bg-sidebar-accent text-sidebar-accent-foreground`. Hover states: `hover:bg-sidebar-accent`.

For sub-text (role/email under user name): `text-sidebar-foreground/70`.

- [ ] **Step 3: Add `ThemeToggle` import and render it in the footer**

At the top of the file, add:
```tsx
import { ThemeToggle } from '@/components/ui/theme-toggle'
```

In the footer area (where the user avatar / sign-out button live), add the `ThemeToggle` next to the sign-out button. Concrete pattern:

```tsx
<div className="mt-auto p-3 border-t border-sidebar-border">
  {/* existing user info block */}
  <div className="flex items-center gap-2 mt-3">
    <ThemeToggle className="flex-shrink-0" />
    <form action={signOutAction} className="flex-1">
      <button
        type="submit"
        className="w-full px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent transition-colors"
      >
        Sair
      </button>
    </form>
  </div>
</div>
```

Adapt to match the existing structure — the goal is the toggle ends up visually adjacent to the sign-out, both inside the sidebar footer.

- [ ] **Step 4: Run dev server and verify both themes render correctly**

```bash
npm run dev --workspace=apps/web
```

Open http://localhost:3000 (you'll be redirected to /login — that's fine for a visual smoke). After logging in (or directly opening any logged-in route if you have a session), verify:
- Sidebar is navy `#1D3557` in light theme
- Sidebar is black `#000000` in dark theme
- Toggle button is present in the footer
- Clicking toggle swaps themes; sidebar bg + main content bg flip

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/Sidebar.tsx
git commit -m "feat(web): make Sidebar token-driven, add ThemeToggle in footer"
```

---

## Task 9: Update Login page (theme-aware bg + dual logo)

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`

- [ ] **Step 1: Replace the hardcoded gradient background**

Find this line near the bottom of the component:
```tsx
<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
```

Replace with:
```tsx
<div className="min-h-screen flex items-center justify-center bg-background">
```

- [ ] **Step 2: Replace the single logo `<Image>` with the dual-image pattern**

Find the existing `<Image>` for the logo (currently `src="/ammoc-logo.png"`). Replace the block:

```tsx
<Image
  src="/ammoc-logo.png"
  alt="AMMOC"
  width={120}
  height={60}
  className="object-contain"
/>
```

with:

```tsx
<Image
  src="/ammoc.png"
  alt="AMMOC"
  width={120}
  height={120}
  className="hidden dark:block object-contain"
  priority
/>
<Image
  src="/ammoc-transparent.png"
  alt="AMMOC"
  width={120}
  height={120}
  className="block dark:hidden object-contain"
  priority
/>
```

(Both versions render, but `hidden dark:block` / `block dark:hidden` ensures only one is visible per theme. `priority` because it's above the fold on the login page.)

- [ ] **Step 3: Run dev server and smoke-test both themes**

```bash
npm run dev --workspace=apps/web
```

Open http://localhost:3000/login. Open DevTools and force light/dark via `prefers-color-scheme` emulation (or use the toggle once you're logged in and come back). Verify:
- Light theme: `ammoc-transparent.png` shown (no black square around logo)
- Dark theme: `ammoc.png` shown (logo blends with #121212 bg)
- Card and form inputs adapt to theme via shadcn tokens
- No console errors

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/login/page.tsx
git commit -m "feat(web): theme-aware login bg + dual-image logo handling"
```

---

## Task 10: Add "Aparência" section to `/configuracoes`

**Files:**
- Modify: `apps/web/src/app/configuracoes/page.tsx`

- [ ] **Step 1: Read the current settings page to find the right insertion point**

Use Read tool on `apps/web/src/app/configuracoes/page.tsx`. Find where existing sections are rendered (perfil, admin, etc.) — the new "Aparência" section should sit above them as a quick, visible setting.

- [ ] **Step 2: Add the `ThemeSelect` import**

At the top of the file:
```tsx
import { ThemeSelect } from '@/components/ui/theme-select'
```

- [ ] **Step 3: Insert the "Aparência" section near the top of the rendered content**

Insert this block just inside the main content container, before existing sections:

```tsx
<section className="rounded-lg border bg-card p-6 mb-6">
  <h2 className="text-lg font-semibold mb-1">Aparência</h2>
  <p className="text-sm text-muted-foreground mb-4">
    Escolha o tema da interface. &quot;Sistema&quot; segue a preferência do seu dispositivo.
  </p>
  <ThemeSelect />
</section>
```

If the page is server-rendered (an `async function` page) and you cannot insert client components without extra setup, this still works — `<ThemeSelect>` is already marked `'use client'`, so Next will render it as a client island inside the server component.

- [ ] **Step 4: Verify the page renders without errors**

```bash
npm run dev --workspace=apps/web
```

Open http://localhost:3000/configuracoes (after login). Verify:
- "Aparência" section appears at the top with the select
- Select shows current theme (Sistema by default)
- Changing the select swaps theme immediately
- No console errors

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/configuracoes/page.tsx
git commit -m "feat(web): add Aparência section with theme select to /configuracoes"
```

---

## Task 11: Full verification — build, dev, both themes across pages

**Files:** none

- [ ] **Step 1: Run a full production build**

```bash
npm run build --workspace=apps/web
```

Expected: build completes, all routes compile. No type errors. No CSS warnings about unknown classes.

- [ ] **Step 2: Run dev server and walk through key pages in both themes**

```bash
npm run dev --workspace=apps/web
```

For BOTH themes (toggle via sidebar after login):
- `/login` — bg adapts, logo swaps, form readable
- `/` or `/reservas` — calendar buttons use theme primary color, day cells readable
- `/admin/veiculos` — list and table styling adapts
- `/admin/reservas` — same
- `/admin/relatorios` — form/chart adapts
- `/configuracoes` — Aparência section + ThemeSelect works

Open DevTools console on each — no warnings about hydration mismatch or missing CSS vars.

Stop dev server.

- [ ] **Step 3: Verify no `bg-gray-`, `bg-blue-`, hardcoded hex left in changed components**

```bash
grep -nE "bg-(gray|blue|slate)-[0-9]|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}" \
  apps/web/src/app/login/page.tsx \
  apps/web/src/app/layout.tsx \
  apps/web/src/components/layout/Sidebar.tsx \
  apps/web/src/app/configuracoes/page.tsx \
  2>&1 || true
```

Expected: no matches (or only matches inside SVG `fill="#xxxxxx"` for brand logos like Google's icon — those are intentional and stay).

- [ ] **Step 4: If everything passes, push and let Vercel build**

```bash
git push origin main
```

Watch the Vercel build. Expected: build succeeds, deploy goes live. Smoke-test the live URL.

---

## Out of Scope (do NOT touch in this plan)

- API routes under `apps/web/src/app/api/**`
- Business logic (reservas, disponibilidade, relatorios services)
- DB schema or migrations
- Supabase Auth / OAuth provider config
- Microsoft OAuth button removal (separate concern)
- Landing/marketing page
- New animations beyond what tokens already provide
- Performance optimization beyond `next/image`'s built-in CDN handling

## Notes for the implementer

- **Don't commit unrelated working-tree changes.** The main checkout has stale deletions (per earlier `git status`). Stage ONLY the files listed in each task's `git add` step.
- **If a step's `Expected` doesn't match reality**, stop and report — don't push through assuming it's fine.
- **Frequent commits, small steps.** Each task commits independently so we can rollback granularly if something looks wrong post-deploy.
