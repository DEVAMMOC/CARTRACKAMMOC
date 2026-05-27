'use client'
import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { Veiculo, Cidade } from '@cartracking/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter } from 'next/navigation'

const schema = z.object({
  veiculo_id: z.string().min(1, 'Selecione um veículo'),
  data_saida: z.string().min(1, 'Informe a data/hora de saída'),
  data_retorno_prevista: z.string().min(1, 'Informe o retorno previsto'),
  cidade_destino_id: z.string().min(1, 'Selecione a cidade de destino'),
  endereco_destino: z.string().optional().or(z.literal('')),
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
  const [cidades, setCidades] = useState<Cidade[]>([])
  const [cidadesError, setCidadesError] = useState<string | null>(null)
  const [disponivel, setDisponivel] = useState<boolean | null>(null)
  const [checkingDisp, setCheckingDisp] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [outraMode, setOutraMode] = useState(false)
  const [novaCidadeNome, setNovaCidadeNome] = useState('')
  const [creatingCidade, setCreatingCidade] = useState(false)
  const [cidadeError, setCidadeError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { veiculo_id: '', cidade_destino_id: '' },
  })

  const veiculoId = watch('veiculo_id')
  const dataSaida = watch('data_saida')
  const dataRetorno = watch('data_retorno_prevista')
  const cidadeId = watch('cidade_destino_id')

  // Load vehicles + cities on mount
  useEffect(() => {
    apiFetch<Veiculo[]>('/veiculos')
      .then(setVeiculos)
      .catch(err => console.error('Error loading vehicles:', err))
    apiFetch<Cidade[]>('/cidades')
      .then((data) => {
        setCidades(data)
        setCidadesError(null)
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar cidades'
        setCidadesError(msg)
        console.error('Error loading cidades:', err)
      })
  }, [])

  async function handleCreateCidade() {
    const nome = novaCidadeNome.trim()
    if (!nome) {
      setCidadeError('Digite o nome da cidade')
      return
    }
    setCreatingCidade(true)
    setCidadeError(null)
    try {
      const created = await apiFetch<Cidade>('/cidades', {
        method: 'POST',
        body: JSON.stringify({ nome }),
      })
      setCidades(prev => {
        const without = prev.filter(c => c.id !== created.id)
        return [...without, created].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      })
      setValue('cidade_destino_id', created.id, { shouldValidate: true })
      setOutraMode(false)
      setNovaCidadeNome('')
    } catch (err) {
      setCidadeError(err instanceof Error ? err.message : 'Erro ao criar cidade')
    } finally {
      setCreatingCidade(false)
    }
  }

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
        <Controller
          name="veiculo_id"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={(value) => field.onChange(value ?? '')}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Selecione um veículo..." />
              </SelectTrigger>
              <SelectContent>
                {veiculos.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Nenhum veículo disponível
                  </div>
                ) : (
                  veiculos.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.modelo} ({v.placa}) — {TIPO_LABELS[v.tipo] ?? v.tipo}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        />
        {errors.veiculo_id && (
          <p className="text-destructive text-xs mt-1">{errors.veiculo_id.message}</p>
        )}

        {selectedVeiculo && (
          <div className="mt-2 p-3 rounded-lg border border-border bg-accent/30 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-sm font-medium text-foreground">{selectedVeiculo.modelo}</span>
              <span className="text-xs text-muted-foreground ml-2">Placa: {selectedVeiculo.placa}</span>
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

      {/* Date/time fields — stacked on mobile, side-by-side on >=sm */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Data/Hora de Saída *</Label>
          <Input
            type="datetime-local"
            {...register('data_saida')}
            className="mt-1"
          />
          {errors.data_saida && (
            <p className="text-destructive text-xs mt-1">{errors.data_saida.message}</p>
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
            <p className="text-destructive text-xs mt-1">{errors.data_retorno_prevista.message}</p>
          )}
        </div>
      </div>

      {/* Availability indicator */}
      {veiculoId && dataSaida && dataRetorno && (
        <div>
          {checkingDisp && (
            <Card className="border-border bg-muted/40">
              <CardContent className="py-3 text-sm text-muted-foreground">
                ⏳ Verificando disponibilidade...
              </CardContent>
            </Card>
          )}
          {!checkingDisp && disponivel === true && (
            <div className="rounded-lg border border-green-200 bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900 px-4 py-3 text-sm font-medium">
              ✅ Veículo disponível neste período!
            </div>
          )}
          {!checkingDisp && disponivel === false && (
            <div className="rounded-lg border border-red-200 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 px-4 py-3 text-sm font-medium">
              ❌ Veículo não disponível neste período. Escolha outra data ou outro veículo.
            </div>
          )}
        </div>
      )}

      {/* Cidade de destino */}
      <div>
        <Label className="text-sm font-medium">Cidade de destino *</Label>

        {cidadesError && (
          <p className="text-destructive text-xs mt-1">
            Não foi possível carregar a lista de cidades: {cidadesError}
            {' '}<span className="text-muted-foreground">(verifique se a migration 008_create_cidades.sql foi rodada no Supabase)</span>
          </p>
        )}

        {!outraMode ? (
          <>
            <Controller
              name="cidade_destino_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(value) => {
                    field.onChange(value ?? '')
                    setNovaCidadeNome('')
                    setCidadeError(null)
                  }}
                  disabled={!!cidadesError}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Selecione a cidade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cidades.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Nenhuma cidade cadastrada ainda
                      </div>
                    ) : (
                      cidades.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            <button
              type="button"
              onClick={() => {
                setOutraMode(true)
                setValue('cidade_destino_id', '', { shouldValidate: false })
                setCidadeError(null)
              }}
              className="text-xs text-primary hover:underline mt-1.5 inline-flex"
            >
              Não está na lista? Cadastrar nova cidade →
            </button>
          </>
        ) : (
          <div className="mt-1 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={novaCidadeNome}
                onChange={(e) => {
                  setNovaCidadeNome(e.target.value)
                  setCidadeError(null)
                }}
                placeholder="Nome da cidade nova (ex.: Pinheiro Preto)"
                disabled={creatingCidade}
                maxLength={100}
                className="flex-1"
                autoFocus
              />
              <Button
                type="button"
                onClick={handleCreateCidade}
                disabled={creatingCidade || !novaCidadeNome.trim()}
              >
                {creatingCidade ? 'Cadastrando...' : 'Cadastrar e usar'}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => {
                setOutraMode(false)
                setNovaCidadeNome('')
                setCidadeError(null)
              }}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex"
            >
              ← Voltar para a lista
            </button>
          </div>
        )}

        {errors.cidade_destino_id && !outraMode && (
          <p className="text-destructive text-xs mt-1">{errors.cidade_destino_id.message}</p>
        )}
        {cidadeError && (
          <p className="text-destructive text-xs mt-1">{cidadeError}</p>
        )}
      </div>

      {/* Endereço dentro da cidade (opcional) */}
      <div>
        <Label className="text-sm font-medium">Endereço no destino</Label>
        <Input
          {...register('endereco_destino')}
          placeholder="Ex.: Secretaria Municipal de Saúde — Rua das Flores, 123"
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Opcional. Detalhe do local dentro da cidade selecionada.
        </p>
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
          <p className="text-destructive text-xs mt-1">{errors.servico.message}</p>
        )}
      </div>

      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 px-4 py-3 text-sm">
          {submitError}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="sm:w-auto"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || disponivel === false}
          className="flex-1"
        >
          {isSubmitting ? 'Criando reserva...' : 'Confirmar Reserva'}
        </Button>
      </div>
    </form>
  )
}
