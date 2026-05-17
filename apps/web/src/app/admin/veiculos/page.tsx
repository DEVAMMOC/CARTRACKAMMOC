import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Veiculo } from '@cartracking/types'
import { AdminVeiculosClient } from '@/components/veiculos/AdminVeiculosClient'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default async function AdminVeiculosPage() {
  const supabase = await createClient()

  // Verify user and role
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    redirect('/login')
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', authUser.id)
    .single()

  if (!usuario || usuario.papel !== 'gestor') {
    redirect('/')
  }

  // Fetch all vehicles (including inactive) using the gestor endpoint
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  let veiculos: Veiculo[] = []
  try {
    const res = await fetch(`${API_URL}/veiculos/todos`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })
    if (res.ok) {
      veiculos = await res.json()
    }
  } catch {
    // Render with empty list if API is unreachable
    veiculos = []
  }

  return <AdminVeiculosClient veiculos={veiculos} />
}
