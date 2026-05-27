import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Usuario } from '@cartracking/types'
import { NotificacoesClient } from '@/components/admin/NotificacoesClient'

export default async function AdminNotificacoesPage() {
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

  return <NotificacoesClient />
}
