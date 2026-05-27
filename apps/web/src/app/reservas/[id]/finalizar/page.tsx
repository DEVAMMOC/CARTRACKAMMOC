import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ReservaComDetalhes, Usuario } from '@cartracking/types'
import { FinalizarViagemForm } from '@/components/reservas/FinalizarViagemForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FinalizarViagemPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const admin = createAdminClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!usuario || !(usuario as Usuario).ativo) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 px-4 py-3 text-sm">
          Usuário inativo ou não encontrado
        </div>
      </div>
    )
  }

  const { data: reserva, error } = await admin
    .from('reservas')
    .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
    .eq('id', id)
    .single()

  if (error || !reserva) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 px-4 py-3 text-sm">
          {error?.message || 'Reserva não encontrada'}
        </div>
      </div>
    )
  }

  const r = reserva as ReservaComDetalhes
  const u = usuario as Usuario
  if (r.usuario_id !== u.id && u.papel !== 'gestor') {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 px-4 py-3 text-sm">
          Sem permissão para visualizar esta reserva.
        </div>
      </div>
    )
  }

  if (r.status !== 'em_andamento') {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-yellow-200 bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900 px-4 py-3 text-sm">
          Reserva não encontrada ou não está em andamento.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground tracking-tight mb-6">Finalizar Viagem</h1>
      <FinalizarViagemForm reserva={r} />
    </div>
  )
}
