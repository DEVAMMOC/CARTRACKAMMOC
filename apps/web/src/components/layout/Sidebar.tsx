'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CalendarIcon,
  CameraIcon,
  CarIcon,
  ClipboardListIcon,
  LogOutIcon,
  PlusCircleIcon,
  SettingsIcon,
  TruckIcon,
  BarChart3Icon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Usuario } from '@cartracking/types'
import Image from 'next/image'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface SidebarProps {
  user: Usuario
  onNavigate?: () => void
}

interface NavItem {
  href: string
  label: string
  exact: boolean
  Icon: typeof CalendarIcon
}

export function Sidebar({ user, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar foto')
    } finally {
      setUploading(false)
    }
  }

  const userLinks: NavItem[] = [
    { href: '/', label: 'Calendário', exact: true, Icon: CalendarIcon },
    { href: '/reservas/nova', label: 'Reservar', exact: false, Icon: PlusCircleIcon },
    { href: '/reservas', label: 'Minhas Reservas', exact: true, Icon: CarIcon },
    { href: '/configuracoes', label: 'Configurações', exact: false, Icon: SettingsIcon },
  ]

  const adminLinks: NavItem[] = [
    { href: '/admin/veiculos', label: 'Veículos', exact: false, Icon: TruckIcon },
    { href: '/admin/reservas', label: 'Todas as Reservas', exact: false, Icon: ClipboardListIcon },
    { href: '/admin/relatorios', label: 'Relatórios', exact: false, Icon: BarChart3Icon },
  ]

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  const initials = user.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?'

  const roleLabel = user.papel === 'gestor' ? 'Administrador' : 'Usuário'

  return (
    <aside className="h-full w-64 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo / app name */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden shadow-sm">
            <Image
              src="/ammoc-transparent.png"
              alt="AMMOC"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight tracking-tight group-hover:opacity-90 transition-opacity">
              AMMOC Frotas
            </div>
            <div className="text-xs text-sidebar-foreground/60 mt-0.5">Gestão de Veículos</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="px-3 pb-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
          Geral
        </div>
        <ul className="flex flex-col gap-0.5">
          {userLinks.map((l) => {
            const active = isActive(l.href, l.exact)
            const Icon = l.Icon
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                  <span>{l.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {user.papel === 'gestor' && (
          <>
            <div className="mt-6 px-3 pb-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Administração
            </div>
            <ul className="flex flex-col gap-0.5">
              {adminLinks.map((l) => {
                const active = isActive(l.href, l.exact)
                const Icon = l.Icon
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={onNavigate}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" aria-hidden />
                      <span>{l.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Alterar foto de perfil"
            className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center group flex-shrink-0 ring-2 ring-sidebar-border hover:ring-sidebar-foreground/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed bg-sidebar-primary text-sidebar-primary-foreground"
          >
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={user.nome}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold">{initials}</span>
            )}
            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              {uploading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <CameraIcon className="w-4 h-4 text-white" aria-hidden />
              )}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-sidebar-foreground truncate">{user.nome}</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">{roleLabel}</div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <ThemeToggle className="flex-shrink-0" />
          <button
            onClick={handleSignOut}
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOutIcon className="w-4 h-4" aria-hidden />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
