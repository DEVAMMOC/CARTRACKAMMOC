import { createClient } from '@/lib/supabase/server'
import { CalendarWrapper } from '@/components/calendar/CalendarWrapper'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: reservas } = await supabase
    .from('reservas')
    .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
    .not('status', 'in', '("cancelada")')
    .order('data_saida', { ascending: true })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Calendário de Reservas</h1>
          <p className="text-sm text-muted-foreground mt-1">Visualize todos os agendamentos da frota</p>
        </div>
        <Link
          href="/reservas/nova"
          className="bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-lg transition-opacity font-medium text-sm"
        >
          + Nova Reserva
        </Link>
      </div>
      <CalendarWrapper reservas={(reservas as any) ?? []} />
    </div>
  )
}
