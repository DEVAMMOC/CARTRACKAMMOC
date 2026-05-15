import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AMMOC Frotas',
  description: 'Sistema de Reserva de Veículos da AMMOC',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  let usuario = null
  if (authUser) {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', authUser.id)
      .single()
    usuario = data
  }

  // If no user or on login/auth pages, render without sidebar
  if (!usuario) {
    return (
      <html lang="pt-BR">
        <body className={inter.className}>{children}</body>
      </html>
    )
  }

  return (
    <html lang="pt-BR">
      <body className={`${inter.className} flex min-h-screen`}>
        <Sidebar user={usuario} />
        <main className="flex-1 p-6 bg-gray-50 overflow-auto">
          {children}
        </main>
      </body>
    </html>
  )
}
