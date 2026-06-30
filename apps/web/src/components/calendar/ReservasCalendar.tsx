'use client'
import { useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { ReservaComDetalhes, StatusReserva } from '@cartracking/types'

const VEHICLE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
]

const STATUS_LABEL: Record<StatusReserva, string> = {
  confirmada: 'Confirmada',
  em_andamento: 'Em andamento',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

const STATUS_BADGE: Record<StatusReserva, string> = {
  confirmada: 'badge-info',
  em_andamento: 'badge-warning',
  finalizada: 'badge-success',
  cancelada: 'badge-danger',
}

interface Props {
  reservas: ReservaComDetalhes[]
  onNewReservation: () => void
  onDateClick?: (dateStr: string) => void
}

function fmtData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ReservasCalendar({ reservas, onDateClick }: Props) {
  const [selected, setSelected] = useState<ReservaComDetalhes | null>(null)

  // Cor estável por veículo (ordem de primeira aparição).
  const vehicleColorMap = new Map<string, string>()
  let colorIdx = 0
  for (const r of reservas) {
    if (!vehicleColorMap.has(r.veiculo_id)) {
      vehicleColorMap.set(r.veiculo_id, VEHICLE_COLORS[colorIdx++ % VEHICLE_COLORS.length])
    }
  }

  // Legenda: um item por veículo distinto.
  const legenda = Array.from(
    new Map(
      reservas.map(r => [
        r.veiculo_id,
        { id: r.veiculo_id, label: `${r.veiculo?.modelo ?? 'Veículo'} (${r.veiculo?.placa ?? '—'})` },
      ])
    ).values()
  )

  const events = reservas.map(r => {
    const baseColor = vehicleColorMap.get(r.veiculo_id)!
    return {
      id: r.id,
      title: `${r.veiculo?.modelo ?? 'Veículo'} — ${r.usuario?.nome ?? 'Usuário'}`,
      start: r.data_saida,
      end: r.data_retorno_prevista,
      backgroundColor: baseColor,
      borderColor: baseColor,
      extendedProps: { reserva: r },
    }
  })

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-4">
      {/* Legenda de cores por veículo */}
      {legenda.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
          {legenda.map(v => (
            <span key={v.id} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: vehicleColorMap.get(v.id) }}
              />
              {v.label}
            </span>
          ))}
        </div>
      )}

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,listMonth',
        }}
        locale="pt-br"
        buttonText={{
          today: 'Hoje',
          month: 'Mês',
          week: 'Semana',
          list: 'Lista',
        }}
        events={events}
        dateClick={({ dateStr }) => onDateClick?.(dateStr)}
        eventClick={({ event }) => setSelected(event.extendedProps.reserva as ReservaComDetalhes)}
        dayMaxEvents={3}
        moreLinkText={(n) => `+${n} mais`}
        fixedWeekCount={false}
        noEventsText="Nenhum agendamento neste período."
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventContent={(arg) => {
          const r: ReservaComDetalhes = arg.event.extendedProps.reserva
          const cancelada = r.status === 'cancelada'

          // Visão Lista: linha rica e legível (o horário e a bolinha já vêm da própria lista).
          if (arg.view.type === 'listMonth') {
            return (
              <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${cancelada ? 'line-through opacity-60' : ''}`}>
                <span className="font-medium">{r.veiculo?.modelo} ({r.veiculo?.placa})</span>
                <span className="text-muted-foreground">— {r.usuario?.nome}</span>
                {r.destino && <span className="text-muted-foreground">· {r.destino}</span>}
                <span className={`ml-auto ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
              </div>
            )
          }

          // Visão Mês/Semana: pílula compacta (bolinha + hora + modelo), com reticências.
          return (
            <div
              className={`flex items-center gap-1 overflow-hidden px-0.5 ${cancelada ? 'line-through opacity-60' : ''}`}
              style={{ opacity: r.status === 'finalizada' ? 0.55 : 1 }}
            >
              <span
                className="shrink-0 h-1.5 w-1.5 rounded-full"
                style={{ background: arg.event.backgroundColor }}
              />
              {arg.timeText && <span className="shrink-0 tabular-nums">{arg.timeText}</span>}
              <span className="truncate">{r.veiculo?.modelo}</span>
            </div>
          )
        }}
        height="auto"
      />

      {/* Modal de detalhes (substitui o alert) */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-foreground">
                {selected.veiculo?.modelo}{' '}
                <span className="text-muted-foreground font-normal">({selected.veiculo?.placa})</span>
              </h3>
              <span className={STATUS_BADGE[selected.status]}>{STATUS_LABEL[selected.status]}</span>
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-muted-foreground">Responsável</dt>
                <dd className="text-foreground">{selected.usuario?.nome ?? '—'}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-muted-foreground">Destino</dt>
                <dd className="text-foreground">{selected.destino ?? '—'}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-muted-foreground">Serviço</dt>
                <dd className="text-foreground">{selected.servico ?? '—'}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-muted-foreground">Saída</dt>
                <dd className="text-foreground">{fmtData(selected.data_saida)}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-muted-foreground">Retorno previsto</dt>
                <dd className="text-foreground">{fmtData(selected.data_retorno_prevista)}</dd>
              </div>
              {selected.km_saida != null && selected.km_retorno != null && (
                <div className="flex gap-3">
                  <dt className="w-32 shrink-0 text-muted-foreground">KM rodados</dt>
                  <dd className="text-foreground">
                    {(selected.km_retorno - selected.km_saida).toLocaleString('pt-BR')} km
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-6 flex justify-end gap-2">
              {selected.status !== 'finalizada' && selected.status !== 'cancelada' && (
                <a
                  href={`/reservas/${selected.id}/finalizar`}
                  className="rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Finalizar corrida
                </a>
              )}
              <button
                onClick={() => setSelected(null)}
                className="rounded-md border border-border px-3.5 py-2 text-sm text-foreground hover:bg-accent"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
