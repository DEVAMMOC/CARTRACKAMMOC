import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ReservaComDetalhes, Usuario } from '@cartracking/types'
import { AdminReservasClient } from '@/components/admin/AdminReservasClient'

export default async function AdminReservasPage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const admin = createAdminClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!usuario || (usuario as Usuario).papel !== 'gestor') {
    redirect('/')
  }

  let reservas: ReservaComDetalhes[] = []
  const { data } = await admin
    .from('reservas')
    .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
    .order('data_saida', { ascending: false })

  if (data) reservas = data as ReservaComDetalhes[]

  return <AdminReservasClient reservas={reservas} usuario={usuario as Usuario} />
}
