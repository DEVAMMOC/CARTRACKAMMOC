'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReservaComDetalhes } from '@cartracking/types'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FinalizarViagemFormProps {
  reserva: ReservaComDetalhes
}

export function FinalizarViagemForm({ reserva }: FinalizarViagemFormProps) {
  const router = useRouter()
  const [kmRetorno, setKmRetorno] = useState<string>('')
  const [observacoes, setObservacoes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const kmSaida = reserva.km_saida ?? 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const kmRetornoNum = Number(kmRetorno)
    if (isNaN(kmRetornoNum) || kmRetornoNum < kmSaida) {
      setError(`KM de retorno deve ser maior ou igual ao KM de saída (${kmSaida.toLocaleString('pt-BR')} km)`)
      return
    }

    setIsSubmitting(true)
    try {
      await apiFetch(`/reservas/${reserva.id}/finalizar`, {
        method: 'PATCH',
        body: JSON.stringify({
          km_retorno: kmRetornoNum,
          ...(observacoes.trim() ? { observacoes: observacoes.trim() } : {}),
        }),
      })
      router.push('/reservas')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao finalizar viagem')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Vehicle info header */}
      <div className="rounded-lg border border-border bg-accent/30 px-4 py-3">
        <p className="font-medium text-foreground">{reserva.veiculo.modelo}</p>
        <p className="text-sm text-muted-foreground">Placa: {reserva.veiculo.placa}</p>
      </div>

      {/* KM de saída (read-only) */}
      <div>
        <Label className="text-sm font-medium">KM de Saída</Label>
        <Input
          type="number"
          value={kmSaida}
          readOnly
          className="mt-1 bg-muted cursor-not-allowed"
        />
      </div>

      {/* KM de retorno */}
      <div>
        <Label htmlFor="km_retorno" className="text-sm font-medium">
          KM de Retorno *
        </Label>
        <Input
          id="km_retorno"
          type="number"
          required
          min={kmSaida}
          value={kmRetorno}
          onChange={(e) => setKmRetorno(e.target.value)}
          placeholder={`Mínimo: ${kmSaida.toLocaleString('pt-BR')}`}
          className="mt-1"
        />
      </div>

      {/* Observações */}
      <div>
        <Label htmlFor="observacoes" className="text-sm font-medium">
          Observações
        </Label>
        <textarea
          id="observacoes"
          rows={3}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Observações sobre a viagem (opcional)"
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring resize-none"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/reservas')}
          disabled={isSubmitting}
        >
          Voltar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Finalizando...' : 'Finalizar Viagem'}
        </Button>
      </div>
    </form>
  )
}
