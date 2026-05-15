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
          <h1 className="text-2xl font-bold text-gray-900">Calendário de Reservas</h1>
          <p className="text-sm text-gray-500 mt-1">Visualize todos os agendamentos da frota</p>
        </div>
        <Link
          href="/reservas/nova"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          + Nova Reserva
        </Link>
      </div>
      <CalendarWrapper reservas={(reservas as any) ?? []} />
    </div>
  )
}
