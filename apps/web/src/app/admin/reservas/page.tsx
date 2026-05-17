import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReservaComDetalhes, Usuario } from '@cartracking/types'
import { AdminReservasClient } from '@/components/admin/AdminReservasClient'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default async function AdminReservasPage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    redirect('/login')
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!usuario || usuario.papel !== 'gestor') {
    redirect('/')
  }

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  let reservas: ReservaComDetalhes[] = []
  try {
    const res = await fetch(`${API_URL}/reservas`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })
    if (res.ok) {
      reservas = await res.json()
    }
  } catch {
    reservas = []
  }

  return <AdminReservasClient reservas={reservas} usuario={usuario as Usuario} />
}
