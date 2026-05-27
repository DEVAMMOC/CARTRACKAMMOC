# AMMOC Frotas — Redesign Spotify-inspired com switch light/dark

**Data**: 2026-05-27
**Status**: aprovado para implementação
**Escopo**: portal interno (login + pós-login). Sem landing/marketing.

## Contexto

A aplicação hoje usa uma paleta institucional AMMOC (verdes #2D6A4F/#52B788, navy #1D3557, surface #F8F9FA) sobre shadcn/ui + Tailwind v4. O usuário quer dar uma "cara nova" inspirada no design system Spotify (entregue em `Spotify-showcase.zip`) — dark, verde-neon, tipografia justa, componentes com bordas e radii do Spotify. Como o atual já está construído, manter ambos os temas convivendo é mais robusto que substituir.

A app já tem suporte parcial a tema escuro em `globals.css` (bloco `.dark` com placeholders oklch). Falta: tokens reais no bloco `.dark`, infraestrutura de switching (next-themes), e tratamento dos poucos lugares com cor hardcoded fora do sistema de tokens.

## Decisões

| Tópico | Decisão | Por quê |
|---|---|---|
| Direção visual | Dois temas conviventes: light = AMMOC atual; dark = Spotify-integral + navy AMMOC de apoio | Atende o pedido do usuário sem destruir o trabalho existente |
| Escopo | Portal interno (login, sidebar, calendário, /reservas, /admin/\*, /configurações) | Pedido explícito; nada de marketing/landing |
| Lib de theming | `next-themes` | Padrão de fato no Next.js; zero-flash via script inject; 3KB |
| Tema default | `system` | Respeita preferência do SO; comportamento esperado em 2026 |
| Persistência | `localStorage` (via next-themes) | Sem round-trip; não precisa schema |
| UI do switcher | Ícone sol/lua no footer da sidebar + select de 3 opções em `/configurações` | Toggle rápido onipresente + controle explícito |
| Logo | `assets/logos/ammoc.png` movido para `public/ammoc.png`; gera versão sem fundo preto via sharp | O logo tem BG preto, ruim no tema light |
| Compressão do logo | `next/image` faz on-the-fly via Vercel CDN | Não precisa pipeline próprio; arquivo 11MB vira ~50KB servido |

## Token tables

### Light (`:root` — mantém AMMOC institucional)

```css
:root {
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
  --sidebar: #1D3557;
  --sidebar-foreground: #ffffff;
  --sidebar-primary: #52B788;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: rgba(255,255,255,0.10);
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border: rgba(255,255,255,0.10);
  --sidebar-ring: #52B788;
  --radius: 0.625rem;
}
```

### Dark (`.dark` — Spotify integral + navy de apoio)

```css
.dark {
  --background: #121212;
  --foreground: #ffffff;
  --card: #181818;
  --card-foreground: #ffffff;
  --popover: #1f1f1f;
  --popover-foreground: #ffffff;
  --primary: #1ed760;             /* Spotify green */
  --primary-foreground: #0a0a0a;  /* black on green CTA */
  --secondary: #1f1f1f;
  --secondary-foreground: #ffffff;
  --muted: #1f1f1f;
  --muted-foreground: #b3b3b3;
  --accent: #1D3557;              /* AMMOC navy = institutional anchor */
  --accent-foreground: #ffffff;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: rgba(255,255,255,0.08);
  --input: rgba(255,255,255,0.10);
  --ring: #1ed760;
  --chart-1: #1ed760;
  --chart-2: #1D3557;
  --chart-3: #52B788;
  --chart-4: #f3727f;             /* coral pra séries quentes */
  --chart-5: #b3b3b3;
  --sidebar: #000000;             /* preto puro, como Spotify */
  --sidebar-foreground: #ffffff;
  --sidebar-primary: #1ed760;
  --sidebar-primary-foreground: #0a0a0a;
  --sidebar-accent: rgba(255,255,255,0.06);
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border: rgba(255,255,255,0.06);
  --sidebar-ring: #1ed760;
}
```

### Tipografia

- Font sans (já existe): Inter (`var(--font-sans)`)
- Headings: `letter-spacing: -0.02em`, `font-weight: 700` (mantém atual com pequeno ajuste de -0.01 → -0.02)
- Hero/títulos grandes: `font-size: clamp(2rem, 4.2vw, 3rem)` (existente já usa clamp; reforça)
- Mono: `var(--font-mono)` (já existe — Geist Mono) para badges/labels técnicos (KPIs, eyebrows)

### Radii

- `--radius: 0.625rem` (10px) — mantém atual; gera 6/8/10/14/18/22 via escala existente
- Cards de KPI no dark: 10px (médio). Cards grandes: 14-18px. Botões: 8-10px.

## Arquitetura de componentes

### Provider

Novo arquivo: `apps/web/src/components/providers/ThemeProvider.tsx`

```tsx
'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
```

Integrado em `apps/web/src/app/layout.tsx`:

```tsx
<html lang="pt-BR" suppressHydrationWarning>
  <body>
    <ThemeProvider>{children}</ThemeProvider>
  </body>
</html>
```

`suppressHydrationWarning` no `<html>` é obrigatório porque next-themes adiciona a classe antes da hidratação.

### Toggle (sidebar)

Novo arquivo: `apps/web/src/components/ui/theme-toggle.tsx`

Ícone clicável (sol/lua de `lucide-react`) que chama `useTheme()` e alterna entre `'light'` e `'dark'`. Posicionado no footer da `Sidebar.tsx`, acima do botão de sign-out.

### Select (configurações)

Novo arquivo: `apps/web/src/components/ui/theme-select.tsx`

Select com 3 opções (Sistema, Claro, Escuro) usando o Select do shadcn. Vai em uma nova seção "Aparência" em `apps/web/src/app/configuracoes/page.tsx`.

## Páginas e arquivos modificados

| Arquivo | Tipo | Mudança |
|---|---|---|
| `apps/web/src/app/globals.css` | edit | Rewrite total de `:root` (mantém AMMOC) e `.dark` (Spotify). Override FullCalendar para usar tokens em vez de hardcoded brand vars. |
| `apps/web/src/app/layout.tsx` | edit | Adiciona `<ThemeProvider>` wrapper. Adiciona `suppressHydrationWarning`. Remove `bg-gray-50` se hardcoded. |
| `apps/web/src/app/login/page.tsx` | edit | Substitui `bg-gradient-to-br from-blue-50 to-gray-100` por classe token-driven (`bg-background` + gradient via CSS variables). Substitui o único `<Image>` do logo pelo padrão dual-image descrito em "Tratamento do logo" abaixo. |
| `apps/web/src/components/layout/Sidebar.tsx` | edit | Remove gradient hardcoded; usa `bg-sidebar text-sidebar-foreground`. Adiciona `<ThemeToggle>` no footer. |
| `apps/web/src/app/configuracoes/page.tsx` | edit | Nova seção "Aparência" no topo com `<ThemeSelect>`. |
| `apps/web/src/components/providers/ThemeProvider.tsx` | new | Wrapper do next-themes. |
| `apps/web/src/components/ui/theme-toggle.tsx` | new | Botão sol/lua. |
| `apps/web/src/components/ui/theme-select.tsx` | new | Select de 3 opções. |
| `apps/web/public/ammoc.png` | new | Logo principal (transparent ou com BG preto, ver abaixo). |
| `apps/web/public/ammoc.png` (versão sem BG) | new | Versão com fundo removido para tema light. Gerada via script local. |
| `apps/web/package.json` | edit | Adiciona `next-themes` em dependencies. |

## Tratamento do logo

1. Copiar `assets/logos/ammoc.png` → `apps/web/public/ammoc.png` (arquivo grande, original)
2. Rodar script local com `sharp` para gerar `apps/web/public/ammoc-transparent.png`:
   - Remove pixels onde R<20 && G<20 && B<20 (preto puro/quase puro do BG)
   - Salva PNG com canal alpha
3. No componente que renderiza o logo (Login + Sidebar), usar duas tags `<Image>` com classes `dark:block hidden` e `block dark:hidden`:

```tsx
<Image src="/ammoc.png" alt="AMMOC" width={120} height={60}
       className="hidden dark:block" />
<Image src="/ammoc-transparent.png" alt="AMMOC" width={120} height={60}
       className="block dark:hidden" />
```

Trade-off: duplica o DOM em uma versão sempre escondida. Aceito porque é trivial e evita flash ao trocar tema.

## Detalhes de UX

- **No-flash on load**: next-themes injeta script no `<head>` que lê localStorage antes do React montar — sem flash de tema errado
- **Transição entre temas**: `disableTransitionOnChange` no provider — desativa CSS transitions durante o swap pra evitar piscar
- **Acessibilidade**: `ThemeToggle` tem `aria-label` dinâmico ("Mudar para tema escuro" / "Mudar para tema claro")
- **FullCalendar**: overrides hoje usam `--brand-primary`; vão passar a usar `--primary`, então respondem ao tema automaticamente

## Out of scope

- API routes (`apps/web/src/app/api/**`) — nenhuma mudança
- Lógica de negócio (reservas, disponibilidade, relatórios, finalizar viagem) — nenhuma mudança
- Schema do banco — nenhuma mudança
- Auth flow / Supabase config / OAuth providers — nenhuma mudança
- Acessibilidade do FullCalendar além do existente
- Animações novas — só tokens; transitions só onde já existem
- Microsoft OAuth button — fora de escopo deste design (assunto separado)
- Landing/marketing page — fora de escopo

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Flash de tema errado no carregamento | `next-themes` injeta script bloqueante no `<head>` (built-in) |
| Componente com cor hardcoded esquecido | Grep por classes Tailwind de cor (`bg-blue-`, `text-gray-`, `from-`, `to-`) antes de fechar PR |
| Logo com BG preto no tema light | Gerar versão transparente via sharp; duplicar `<Image>` tags com `dark:` variants |
| Performance do PNG 11MB | `next/image` + Vercel CDN comprime e serve WebP/AVIF on-demand |
| Hidratação quebrando por classe mismatch | `suppressHydrationWarning` no `<html>` (built-in pattern do next-themes) |
| FullCalendar com dark mode feio (cells branco em fundo escuro) | Sobrescrever `.fc-day`, `.fc-col-header-cell`, `.fc-event` com tokens em `globals.css` |

## Sucesso

- [ ] `npm run dev` no apps/web roda sem warnings; ambos os temas renderizam sem erro
- [ ] Toggle no sidebar troca entre dark e light em <100ms, sem flash
- [ ] Select em /configurações tem 3 opções e respeita o System
- [ ] Login renderiza corretamente nos dois temas (sem gradient azul no dark)
- [ ] Sidebar renderiza preto puro no dark, navy no light
- [ ] Calendar renderiza legível nos dois temas (eventos, headers, navegação)
- [ ] Logo aparece corretamente nos dois temas (sem quadrado preto no light)
- [ ] `next build` passa no Vercel deploy
- [ ] Visualmente testado em 360px, 768px, 1366px (mobile/tablet/desktop)

## Próximos passos

Após aprovação deste spec, invocar `superpowers:writing-plans` para gerar plano de implementação detalhado (ordem das edições, comandos, validações intermediárias).
