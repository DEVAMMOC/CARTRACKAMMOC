import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ReservaComDetalhes, Usuario } from '@cartracking/types'
import { ReservaCard } from '@/components/reservas/ReservaCard'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default async function ReservasPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const admin = createAdminClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('*')
    .eq('id', authUser.id)
    .single()

  let reservas: ReservaComDetalhes[] = []
  let fetchError: string | null = null

  if (!usuario || !(usuario as Usuario).ativo) {
    fetchError = 'Usuário inativo ou não encontrado'
  } else {
    let query = admin
      .from('reservas')
      .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
      .order('data_saida', { ascending: false })

    if ((usuario as Usuario).papel === 'funcionario') {
      query = query.eq('usuario_id', (usuario as Usuario).id)
    }

    const { data, error } = await query
    if (error) {
      fetchError = error.message
    } else {
      reservas = (data ?? []) as ReservaComDetalhes[]
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Minhas Reservas</h1>
        <Link href="/reservas/nova" className={buttonVariants({ variant: 'default' })}>
          Nova Reserva
        </Link>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {!fetchError && reservas.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-muted-foreground">
          <p className="text-base font-medium">Nenhuma reserva encontrada</p>
          <p className="mt-1 text-sm">Crie uma nova reserva para começar a usar o sistema.</p>
        </div>
      )}

      {reservas.length > 0 && (
        <div className="space-y-4">
          {reservas.map((reserva) => (
            <ReservaCard key={reserva.id} reserva={reserva} />
          ))}
        </div>
      )}
    </div>
  )
}
