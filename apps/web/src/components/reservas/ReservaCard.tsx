'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ReservaComDetalhes, StatusReserva } from '@cartracking/types'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'

const STATUS_LABELS: Record<StatusReserva, string> = {
  confirmada: 'Confirmada',
  em_andamento: 'Em Andamento',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

const STATUS_CLASSES: Record<StatusReserva, string> = {
  confirmada: 'badge-info',
  em_andamento: 'badge-warning',
  finalizada: 'badge-success',
  cancelada: 'badge-muted',
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
  const [iniciando, setIniciando] = useState(false)
  const [kmInicial, setKmInicial] = useState('')
  const [loading, setLoading] = useState(false)

  async function confirmarIniciar() {
    const km = Number(kmInicial)
    if (!Number.isFinite(km) || km <= 0) {
      alert('Informe o KM do hodômetro na retirada.')
      return
    }
    setLoading(true)
    try {
      await apiFetch(`/reservas/${reserva.id}/iniciar`, {
        method: 'PATCH',
        body: JSON.stringify({ km_inicial: km }),
      })
      setIniciando(false)
      setKmInicial('')
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao iniciar viagem')
    } finally {
      setLoading(false)
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
          <span className={statusClass}>{STATUS_LABELS[reserva.status]}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {TIPO_LABELS[reserva.veiculo.tipo] ?? reserva.veiculo.tipo}
        </p>
      </CardHeader>

      <CardContent className="pt-3 space-y-2 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
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
        <CardFooter className="flex flex-col items-stretch gap-2">
          {reserva.status === 'confirmada' && !iniciando && (
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => setIniciando(true)}>
                Iniciar Viagem
              </Button>
              <Button size="sm" variant="destructive" onClick={handleCancelar}>
                Cancelar
              </Button>
            </div>
          )}

          {reserva.status === 'confirmada' && iniciando && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">KM do hodômetro na retirada *</label>
              <Input
                type="number"
                inputMode="numeric"
                value={kmInicial}
                onChange={(e) => setKmInicial(e.target.value)}
                placeholder={
                  reserva.veiculo.km_atual != null
                    ? `Atual no sistema: ${reserva.veiculo.km_atual.toLocaleString('pt-BR')} km`
                    : 'KM atual do painel'
                }
                autoFocus
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Confira o painel do veículo. Esse valor vira o KM de saída e atualiza a frota —
                e fecha automaticamente uma corrida anterior que não tenha sido finalizada.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={confirmarIniciar} disabled={loading} className="flex-1">
                  {loading ? 'Iniciando...' : 'Confirmar saída'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIniciando(false)
                    setKmInicial('')
                  }}
                  disabled={loading}
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {reserva.status === 'em_andamento' && (
            <div className="flex gap-2 flex-wrap">
              <Link
                href={`/reservas/${reserva.id}/finalizar`}
                className={buttonVariants({ variant: 'default', size: 'sm' })}
              >
                Finalizar Viagem
              </Link>
              <Button size="sm" variant="destructive" onClick={handleCancelar}>
                Cancelar
              </Button>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
