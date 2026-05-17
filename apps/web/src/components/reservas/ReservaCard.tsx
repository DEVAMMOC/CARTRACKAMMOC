'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ReservaComDetalhes, StatusReserva } from '@cartracking/types'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'

const STATUS_LABELS: Record<StatusReserva, string> = {
  confirmada: 'Confirmada',
  em_andamento: 'Em Andamento',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

const STATUS_CLASSES: Record<StatusReserva, string> = {
  confirmada: 'bg-blue-100 text-blue-800 border-blue-200',
  em_andamento: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  finalizada: 'bg-green-100 text-green-800 border-green-200',
  cancelada: 'bg-gray-100 text-gray-600 border-gray-200',
}

const TIPO_LABELS: Record<string, string> = {
  carro: 'Carro',
  van: 'Van',
  caminhonete: 'Caminhonete',
  onibus: 'Ônibus',
  outro: 'Outro',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface ReservaCardProps {
  reserva: ReservaComDetalhes
}

export function ReservaCard({ reserva }: ReservaCardProps) {
  const router = useRouter()

  async function handleIniciar() {
    try {
      await apiFetch(`/reservas/${reserva.id}/iniciar`, { method: 'PATCH' })
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao iniciar viagem')
    }
  }

  async function handleCancelar() {
    if (!window.confirm('Tem certeza que deseja cancelar esta reserva?')) return
    try {
      await apiFetch(`/reservas/${reserva.id}`, { method: 'DELETE' })
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao cancelar reserva')
    }
  }

  const statusClass = STATUS_CLASSES[reserva.status]

  return (
    <Card className="w-full">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">
            {reserva.veiculo.modelo}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {reserva.veiculo.placa}
            </span>
          </CardTitle>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
          >
            {STATUS_LABELS[reserva.status]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {TIPO_LABELS[reserva.veiculo.tipo] ?? reserva.veiculo.tipo}
        </p>
      </CardHeader>

      <CardContent className="pt-3 space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div>
            <span className="font-medium text-muted-foreground">Saída:</span>{' '}
            {formatDate(reserva.data_saida)}
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Retorno previsto:</span>{' '}
            {formatDate(reserva.data_retorno_prevista)}
          </div>
        </div>

        <div>
          <span className="font-medium text-muted-foreground">Destino:</span>{' '}
          {reserva.destino}
        </div>

        <div>
          <span className="font-medium text-muted-foreground">Serviço:</span>{' '}
          {reserva.servico}
        </div>

        {reserva.status === 'em_andamento' && reserva.km_saida !== null && (
          <div>
            <span className="font-medium text-muted-foreground">KM de saída:</span>{' '}
            {reserva.km_saida.toLocaleString('pt-BR')} km
          </div>
        )}

        {reserva.status === 'finalizada' && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {reserva.km_saida !== null && (
              <div>
                <span className="font-medium text-muted-foreground">KM de saída:</span>{' '}
                {reserva.km_saida.toLocaleString('pt-BR')} km
              </div>
            )}
            {reserva.km_retorno !== null && (
              <div>
                <span className="font-medium text-muted-foreground">KM de retorno:</span>{' '}
                {reserva.km_retorno.toLocaleString('pt-BR')} km
              </div>
            )}
          </div>
        )}
      </CardContent>

      {(reserva.status === 'confirmada' || reserva.status === 'em_andamento') && (
        <CardFooter className="flex gap-2 flex-wrap">
          {reserva.status === 'confirmada' && (
            <Button size="sm" onClick={handleIniciar}>
              Iniciar Viagem
            </Button>
          )}

          {reserva.status === 'em_andamento' && (
            <Link
              href={`/reservas/${reserva.id}/finalizar`}
              className={buttonVariants({ variant: 'default', size: 'sm' })}
            >
              Finalizar Viagem
            </Link>
          )}

          <Button size="sm" variant="destructive" onClick={handleCancelar}>
            Cancelar
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
