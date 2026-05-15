'use client'
import { useRouter } from 'next/navigation'
import { ReservasCalendar } from './ReservasCalendar'
import { ReservaComDetalhes } from '@cartracking/types'

export function CalendarWrapper({ reservas }: { reservas: ReservaComDetalhes[] }) {
  const router = useRouter()
  return (
    <ReservasCalendar
      reservas={reservas}
      onNewReservation={() => router.push('/reservas/nova')}
    />
  )
}
