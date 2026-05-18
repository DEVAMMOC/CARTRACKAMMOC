'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MenuIcon, XIcon } from 'lucide-react'
import { Usuario } from '@cartracking/types'
import { Sidebar } from './Sidebar'

interface AppShellProps {
  user: Usuario
  children: React.ReactNode
}

export function AppShell({ user, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar user={user} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 shadow-xl">
            <Sidebar user={user} onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            className="p-2 -ml-2 rounded-md text-gray-700 hover:bg-gray-100"
          >
            {mobileOpen ? (
              <XIcon className="w-5 h-5" />
            ) : (
              <MenuIcon className="w-5 h-5" />
            )}
          </button>
          <span className="font-semibold text-gray-900">AMMOC Frotas</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
