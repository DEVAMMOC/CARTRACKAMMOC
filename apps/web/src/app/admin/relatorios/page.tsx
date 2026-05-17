import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RelatorioPanel } from '@/components/admin/RelatorioPanel'

export default async function RelatoriosPage() {
  const supabase = await createClient()

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

  return <RelatorioPanel />
}
