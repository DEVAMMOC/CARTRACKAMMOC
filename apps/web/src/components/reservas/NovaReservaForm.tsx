'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { Veiculo } from '@cartracking/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

const schema = z.object({
  veiculo_id: z.string().min(1, 'Selecione um veículo'),
  data_saida: z.string().min(1, 'Informe a data/hora de saída'),
  data_retorno_prevista: z.string().min(1, 'Informe o retorno previsto'),
  destino: z.string().min(3, 'Informe o destino (mínimo 3 caracteres)'),
  servico: z.string().min(3, 'Informe o serviço (mínimo 3 caracteres)'),
}).refine(
  data => !data.data_saida || !data.data_retorno_prevista ||
    new Date(data.data_retorno_prevista) > new Date(data.data_saida),
  { message: 'Retorno previsto deve ser posterior à saída', path: ['data_retorno_prevista'] }
)

type FormData = z.infer<typeof schema>

const TIPO_LABELS: Record<string, string> = {
  carro: 'Carro',
  van: 'Van',
  caminhonete: 'Caminhonete',
  onibus: 'Ônibus',
  outro: 'Outro',
}

export function NovaReservaForm() {
  const router = useRouter()
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [disponivel, setDisponivel] = useState<boolean | null>(null)
  const [checkingDisp, setCheckingDisp] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const veiculoId = watch('veiculo_id')
  const dataSaida = watch('data_saida')
  const dataRetorno = watch('data_retorno_prevista')

  // Load vehicles on mount
  useEffect(() => {
    apiFetch<Veiculo[]>('/veiculos')
      .then(setVeiculos)
      .catch(err => console.error('Error loading vehicles:', err))
  }, [])

  // Check availability when vehicle/dates change
  useEffect(() => {
    if (!veiculoId || !dataSaida || !dataRetorno) {
      setDisponivel(null)
      return
    }
    if (new Date(dataRetorno) <= new Date(dataSaida)) {
      setDisponivel(null)
      return
    }

    setCheckingDisp(true)
    const params = new URLSearchParams({
      veiculo_id: veiculoId,
      inicio: new Date(dataSaida).toISOString(),
      fim: new Date(dataRetorno).toISOString(),
    })

    apiFetch<{ disponivel: boolean }>(`/disponibilidade?${params}`)
      .then(d => setDisponivel(d.disponivel))
      .catch(() => setDisponivel(null))
      .finally(() => setCheckingDisp(false))
  }, [veiculoId, dataSaida, dataRetorno])

  async function onSubmit(formData: FormData) {
    if (disponivel === false) return
    setSubmitError(null)

    try {
      await apiFetch('/reservas', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          data_saida: new Date(formData.data_saida).toISOString(),
          data_retorno_prevista: new Date(formData.data_retorno_prevista).toISOString(),
        }),
      })
      router.push('/reservas')
      router.refresh()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Erro ao criar reserva')
    }
  }

  const selectedVeiculo = veiculos.find(v => v.id === veiculoId)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-5">
      {/* Vehicle selector */}
      <div>
        <Label className="text-sm font-medium">Veículo *</Label>
        <select
          {...register('veiculo_id')}
          className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecione um veículo...</option>
          {veiculos.map(v => (
            <option key={v.id} value={v.id}>
              {v.modelo} ({v.placa}) — {TIPO_LABELS[v.tipo] ?? v.tipo}
            </option>
          ))}
        </select>
        {errors.veiculo_id && (
          <p className="text-red-500 text-xs mt-1">{errors.veiculo_id.message}</p>
        )}

        {selectedVeiculo && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-blue-900">{selectedVeiculo.modelo}</span>
              <span className="text-xs text-blue-600 ml-2">Placa: {selectedVeiculo.placa}</span>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">{TIPO_LABELS[selectedVeiculo.tipo]}</Badge>
              <Badge variant="outline" className="text-xs">
                {selectedVeiculo.km_atual.toLocaleString('pt-BR')} km
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Date/time fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Data/Hora de Saída *</Label>
          <Input
            type="datetime-local"
            {...register('data_saida')}
            className="mt-1"
          />
          {errors.data_saida && (
            <p className="text-red-500 text-xs mt-1">{errors.data_saida.message}</p>
          )}
        </div>
        <div>
          <Label className="text-sm font-medium">Retorno Previsto *</Label>
          <Input
            type="datetime-local"
            {...register('data_retorno_prevista')}
            className="mt-1"
          />
          {errors.data_retorno_prevista && (
            <p className="text-red-500 text-xs mt-1">{errors.data_retorno_prevista.message}</p>
          )}
        </div>
      </div>

      {/* Availability indicator */}
      {veiculoId && dataSaida && dataRetorno && (
        <div>
          {checkingDisp && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="py-3 text-blue-700 text-sm">
                ⏳ Verificando disponibilidade...
              </CardContent>
            </Card>
          )}
          {!checkingDisp && disponivel === true && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-3 text-green-700 text-sm font-medium">
                ✅ Veículo disponível neste período!
              </CardContent>
            </Card>
          )}
          {!checkingDisp && disponivel === false && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-3 text-red-700 text-sm font-medium">
                ❌ Veículo não disponível neste período. Escolha outra data ou outro veículo.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Destination */}
      <div>
        <Label className="text-sm font-medium">Destino *</Label>
        <Input
          {...register('destino')}
          placeholder="Ex: Secretaria Municipal de Saúde — Rua das Flores, 123"
          className="mt-1"
        />
        {errors.destino && (
          <p className="text-red-500 text-xs mt-1">{errors.destino.message}</p>
        )}
      </div>

      {/* Service */}
      <div>
        <Label className="text-sm font-medium">Serviço / Finalidade *</Label>
        <Input
          {...register('servico')}
          placeholder="Ex: Transporte de servidores para reunião"
          className="mt-1"
        />
        {errors.servico && (
          <p className="text-red-500 text-xs mt-1">{errors.servico.message}</p>
        )}
      </div>

      {submitError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-red-700 text-sm">{submitError}</CardContent>
        </Card>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting || disponivel === false}
          className="flex-1"
        >
          {isSubmitting ? 'Criando reserva...' : 'Confirmar Reserva'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
