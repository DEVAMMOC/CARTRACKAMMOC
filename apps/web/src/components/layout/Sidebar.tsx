'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CalendarIcon,
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

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
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
    <aside className="h-full w-64 flex flex-col bg-white border-r border-gray-200">
      {/* Logo / app name */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center overflow-hidden">
            <Image
              src="/ammoc-logo.png"
              alt="AMMOC"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <div>
            <div className="font-bold text-sm text-gray-900 leading-tight group-hover:text-blue-700 transition-colors">
              AMMOC Frotas
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Gestão de Veículos</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="px-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
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
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-gray-400'}`}
                    aria-hidden
                  />
                  <span>{l.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {user.papel === 'gestor' && (
          <>
            <div className="mt-6 px-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
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
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-gray-400'}`}
                        aria-hidden
                      />
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
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900 truncate">{user.nome}</div>
            <div className="text-xs text-gray-500 truncate">{roleLabel}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOutIcon className="w-4 h-4 text-gray-400" aria-hidden />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
