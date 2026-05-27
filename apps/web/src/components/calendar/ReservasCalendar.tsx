'use client'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { ReservaComDetalhes, StatusReserva } from '@cartracking/types'

const VEHICLE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
]

const STATUS_OPACITY: Record<StatusReserva, number> = {
  confirmada: 1,
  em_andamento: 0.85,
  finalizada: 0.45,
  cancelada: 0.25,
}

interface Props {
  reservas: ReservaComDetalhes[]
  onNewReservation: () => void
}

export function ReservasCalendar({ reservas, onNewReservation }: Props) {
  const vehicleColorMap = new Map<string, string>()
  let colorIdx = 0

  const events = reservas.map(r => {
    if (!vehicleColorMap.has(r.veiculo_id)) {
      vehicleColorMap.set(r.veiculo_id, VEHICLE_COLORS[colorIdx++ % VEHICLE_COLORS.length])
    }
    const baseColor = vehicleColorMap.get(r.veiculo_id)!
    const opacity = STATUS_OPACITY[r.status]

    return {
      id: r.id,
      title: `${r.veiculo?.modelo ?? 'Veículo'} — ${r.usuario?.nome ?? 'Usuário'}`,
      start: r.data_saida,
      end: r.data_retorno_prevista,
      backgroundColor: baseColor,
      borderColor: baseColor,
      opacity,
      extendedProps: { reserva: r },
    }
  })

  function handleEventClick({ event }: { event: any }) {
    const r: ReservaComDetalhes = event.extendedProps.reserva
    const kmInfo = r.km_retorno && r.km_saida
      ? `\nKM rodados: ${r.km_retorno - r.km_saida} km`
      : ''
    alert(
      `🚗 ${r.veiculo?.modelo} (${r.veiculo?.placa})\n` +
      `👤 ${r.usuario?.nome}\n` +
      `📍 Destino: ${r.destino}\n` +
      `🔧 Serviço: ${r.servico}\n` +
      `📊 Status: ${r.status}` +
      kmInfo
    )
  }

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek',
        }}
        locale="pt-br"
        buttonText={{
          today: 'Hoje',
          month: 'Mês',
          week: 'Semana',
        }}
        events={events}
        eventClick={handleEventClick}
        eventDidMount={({ event, el }) => {
          const r: ReservaComDetalhes = event.extendedProps.reserva
          el.title = `${r.veiculo?.modelo} → ${r.destino} (${r.status})`
          if (r.status === 'cancelada') {
            el.style.textDecoration = 'line-through'
            el.style.opacity = '0.4'
          }
        }}
        height="auto"
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
      />
    </div>
  )
}
