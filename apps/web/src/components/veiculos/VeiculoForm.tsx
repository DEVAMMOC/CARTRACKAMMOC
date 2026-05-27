'use client'

import { useState } from 'react'
import { Veiculo, CriarVeiculoInput, TipoVeiculo } from '@cartracking/types'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const TIPO_OPTIONS: { value: TipoVeiculo; label: string }[] = [
  { value: 'carro', label: 'Carro' },
  { value: 'van', label: 'Van' },
  { value: 'caminhonete', label: 'Caminhonete' },
  { value: 'onibus', label: 'Ônibus' },
  { value: 'outro', label: 'Outro' },
]

// Formato antigo: AAA0000  |  Mercosul: AAA0A00
const PLACA_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/

const MIN_YEAR = 2000
const MAX_YEAR = 2030

function normalizePlaca(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

interface VeiculoFormProps {
  veiculo?: Veiculo
  onSuccess: () => void
  onCancel: () => void
}

export function VeiculoForm({ veiculo, onSuccess, onCancel }: VeiculoFormProps) {
  const isEdit = veiculo !== undefined

  const [placa, setPlaca] = useState(veiculo?.placa ?? '')
  const [modelo, setModelo] = useState(veiculo?.modelo ?? '')
  const [ano, setAno] = useState(veiculo?.ano?.toString() ?? '')
  const [tipo, setTipo] = useState<TipoVeiculo>(veiculo?.tipo ?? 'carro')
  const [kmAtual, setKmAtual] = useState(veiculo?.km_atual?.toString() ?? '0')
  const [ativo, setAtivo] = useState(veiculo?.ativo ?? true)
  const [fotoUrl, setFotoUrl] = useState(veiculo?.foto_url ?? '')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  function validate(): boolean {
    const newErrors: Partial<Record<string, string>> = {}

    const placaNorm = normalizePlaca(placa)
    if (!placaNorm) {
      newErrors.placa = 'Placa é obrigatória'
    } else if (!PLACA_REGEX.test(placaNorm)) {
      newErrors.placa = 'Formato inválido. Use AAA0000 ou AAA0A00.'
    }

    if (!modelo.trim()) {
      newErrors.modelo = 'Modelo é obrigatório'
    } else if (modelo.trim().length > 100) {
      newErrors.modelo = 'Modelo deve ter no máximo 100 caracteres'
    }

    const anoNum = parseInt(ano, 10)
    if (!ano || isNaN(anoNum)) {
      newErrors.ano = 'Ano é obrigatório'
    } else if (anoNum < MIN_YEAR || anoNum > MAX_YEAR) {
      newErrors.ano = `Ano deve estar entre ${MIN_YEAR} e ${MAX_YEAR}`
    }

    if (!isEdit) {
      const kmNum = parseInt(kmAtual, 10)
      if (kmAtual === '' || isNaN(kmNum)) {
        newErrors.km_atual = 'KM Atual é obrigatório'
      } else if (kmNum < 0) {
        newErrors.km_atual = 'KM Atual deve ser maior ou igual a 0'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setError(null)

    try {
      const placaNorm = normalizePlaca(placa)
      if (isEdit) {
        type UpdatePayload = Partial<CriarVeiculoInput> & { ativo?: boolean }
        const payload: UpdatePayload = {
          placa: placaNorm,
          modelo: modelo.trim(),
          ano: parseInt(ano, 10),
          tipo,
          ativo,
        }
        if (fotoUrl.trim()) {
          payload.foto_url = fotoUrl.trim()
        }
        await apiFetch(`/veiculos/${veiculo!.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      } else {
        const payload: CriarVeiculoInput = {
          placa: placaNorm,
          modelo: modelo.trim(),
          ano: parseInt(ano, 10),
          tipo,
          km_atual: parseInt(kmAtual, 10),
        }
        if (fotoUrl.trim()) {
          payload.foto_url = fotoUrl.trim()
        }
        await apiFetch('/veiculos', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }

      onSuccess()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar veículo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Placa + Ano (lado a lado em telas maiores) */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="placa">Placa *</Label>
          <Input
            id="placa"
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            maxLength={8}
            placeholder="AAA0000 ou AAA0A00"
            className="mt-1 font-mono tracking-wider"
            inputMode="text"
            autoCapitalize="characters"
          />
          {errors.placa && (
            <p className="text-destructive text-xs mt-1">{errors.placa}</p>
          )}
        </div>
        <div>
          <Label htmlFor="ano">Ano *</Label>
          <Input
            id="ano"
            type="number"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            min={MIN_YEAR}
            max={MAX_YEAR}
            placeholder="2024"
            className="mt-1"
          />
          {errors.ano && (
            <p className="text-destructive text-xs mt-1">{errors.ano}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="modelo">Modelo *</Label>
        <Input
          id="modelo"
          value={modelo}
          onChange={(e) => setModelo(e.target.value)}
          maxLength={100}
          placeholder="Ex: Toyota Hilux"
          className="mt-1"
        />
        {errors.modelo && (
          <p className="text-destructive text-xs mt-1">{errors.modelo}</p>
        )}
      </div>

      <div>
        <Label htmlFor="tipo">Tipo *</Label>
        <div className="mt-1">
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoVeiculo)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPO_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isEdit && (
        <div>
          <Label htmlFor="km_atual">KM Atual *</Label>
          <Input
            id="km_atual"
            type="number"
            value={kmAtual}
            onChange={(e) => setKmAtual(e.target.value)}
            min={0}
            placeholder="0"
            className="mt-1"
          />
          {errors.km_atual && (
            <p className="text-destructive text-xs mt-1">{errors.km_atual}</p>
          )}
        </div>
      )}

      {isEdit && (
        <div>
          <Label>KM Atual</Label>
          <div className="mt-1 h-8 px-2.5 py-1 rounded-lg border border-input bg-muted/50 text-sm text-muted-foreground flex items-center">
            {veiculo!.km_atual.toLocaleString('pt-BR')} km
          </div>
        </div>
      )}

      {isEdit && (
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 bg-muted/40">
          <input
            id="ativo"
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
          />
          <Label htmlFor="ativo" className="cursor-pointer">
            Veículo ativo
          </Label>
        </div>
      )}

      <div>
        <Label htmlFor="foto_url">Foto URL (opcional)</Label>
        <Input
          id="foto_url"
          value={fotoUrl}
          onChange={(e) => setFotoUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting
            ? isEdit
              ? 'Salvando...'
              : 'Criando...'
            : isEdit
            ? 'Salvar Alterações'
            : 'Criar Veículo'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
