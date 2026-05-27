import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import type { Usuario } from '@cartracking/types'

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

  let usuario: Usuario | null = null
  if (authUser) {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', authUser.id)
      .single()
    usuario = (data as Usuario | null) ?? null
  }

  if (!usuario) {
    return (
      <html lang="pt-BR" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    )
  }

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AppShell user={usuario}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
