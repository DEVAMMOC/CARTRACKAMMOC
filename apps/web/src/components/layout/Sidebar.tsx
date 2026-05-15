'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Usuario } from '@cartracking/types'
import Image from 'next/image'

interface SidebarProps { user: Usuario }

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const funcionarioLinks = [
    { href: '/', label: '📅 Calendário', exact: true },
    { href: '/reservas/nova', label: '+ Nova Reserva', exact: false },
    { href: '/reservas', label: '🚗 Minhas Reservas', exact: true },
  ]

  const gestorLinks = [
    { href: '/admin/veiculos', label: '🚙 Veículos', exact: false },
    { href: '/admin/reservas', label: '📋 Todas as Reservas', exact: false },
    { href: '/admin/relatorios', label: '📊 Relatórios', exact: false },
  ]

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-60 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Image src="/ammoc-logo.png" alt="AMMOC" width={40} height={40} className="object-contain rounded" />
          <div>
            <div className="font-bold text-sm leading-tight">AMMOC Frotas</div>
            <div className="text-xs text-gray-400">Reserva de Veículos</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-1">
        {funcionarioLinks.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-2 rounded-md text-sm transition-colors ${
              isActive(l.href, l.exact)
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {l.label}
          </Link>
        ))}

        {user.papel === 'gestor' && (
          <>
            <div className="mt-4 mb-1 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Gestão
            </div>
            {gestorLinks.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive(l.href, l.exact)
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="text-sm font-medium text-white truncate">{user.nome}</div>
        <div className="text-xs text-gray-400 mb-2 truncate">{user.email}</div>
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            user.papel === 'gestor' ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-700 text-gray-300'
          }`}>
            {user.papel}
          </span>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Sair &rarr;
          </button>
        </div>
      </div>
    </aside>
  )
}
