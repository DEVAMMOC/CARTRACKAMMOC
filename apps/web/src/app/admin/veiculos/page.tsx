import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Veiculo, Usuario } from '@cartracking/types'
import { AdminVeiculosClient } from '@/components/veiculos/AdminVeiculosClient'

export default async function AdminVeiculosPage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const admin = createAdminClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('papel')
    .eq('id', authUser.id)
    .single()

  if (!usuario || (usuario as Pick<Usuario, 'papel'>).papel !== 'gestor') {
    redirect('/')
  }

  const { data } = await admin
    .from('veiculos')
    .select('*')
    .order('modelo')

  const veiculos: Veiculo[] = (data ?? []) as Veiculo[]

  return <AdminVeiculosClient veiculos={veiculos} />
}
