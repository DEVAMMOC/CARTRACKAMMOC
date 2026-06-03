'use client'
import { useRouter } from 'next/navigation'
import { ReservasCalendar } from './ReservasCalendar'
import { ReservaComDetalhes } from '@cartracking/types'

export function CalendarWrapper({ reservas }: { reservas: ReservaComDetalhes[] }) {
  const router = useRouter()

  function handleDateClick(dateStr: string) {
    // dateStr is YYYY-MM-DD; default to 08:00 as departure time
    const dataSaida = `${dateStr}T08:00`
    router.push(`/reservas/nova?data_saida=${encodeURIComponent(dataSaida)}`)
  }

  return (
    <ReservasCalendar
      reservas={reservas}
      onNewReservation={() => router.push('/reservas/nova')}
      onDateClick={handleDateClick}
    />
  )
}
