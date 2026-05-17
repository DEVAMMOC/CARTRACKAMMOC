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

    if (!placa.trim()) {
      newErrors.placa = 'Placa é obrigatória'
    } else if (placa.trim().length > 8) {
      newErrors.placa = 'Placa deve ter no máximo 8 caracteres'
    }

    if (!modelo.trim()) {
      newErrors.modelo = 'Modelo é obrigatório'
    } else if (modelo.trim().length > 100) {
      newErrors.modelo = 'Modelo deve ter no máximo 100 caracteres'
    }

    const anoNum = parseInt(ano, 10)
    if (!ano || isNaN(anoNum)) {
      newErrors.ano = 'Ano é obrigatório'
    } else if (anoNum < 1900 || anoNum > 2030) {
      newErrors.ano = 'Ano deve estar entre 1900 e 2030'
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
      if (isEdit) {
        type UpdatePayload = Partial<CriarVeiculoInput> & { ativo?: boolean }
        const payload: UpdatePayload = {
          placa: placa.trim().toUpperCase(),
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
          placa: placa.trim().toUpperCase(),
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
      {/* Placa */}
      <div>
        <Label htmlFor="placa">Placa *</Label>
        <Input
          id="placa"
          value={placa}
          onChange={e => setPlaca(e.target.value.toUpperCase())}
          maxLength={8}
          placeholder="ABC-1234"
          className="mt-1"
        />
        {errors.placa && (
          <p className="text-red-500 text-xs mt-1">{errors.placa}</p>
        )}
      </div>

      {/* Modelo */}
      <div>
        <Label htmlFor="modelo">Modelo *</Label>
        <Input
          id="modelo"
          value={modelo}
          onChange={e => setModelo(e.target.value)}
          maxLength={100}
          placeholder="Ex: Toyota Hilux"
          className="mt-1"
        />
        {errors.modelo && (
          <p className="text-red-500 text-xs mt-1">{errors.modelo}</p>
        )}
      </div>

      {/* Ano */}
      <div>
        <Label htmlFor="ano">Ano *</Label>
        <Input
          id="ano"
          type="number"
          value={ano}
          onChange={e => setAno(e.target.value)}
          min={1900}
          max={2030}
          placeholder="2024"
          className="mt-1"
        />
        {errors.ano && (
          <p className="text-red-500 text-xs mt-1">{errors.ano}</p>
        )}
      </div>

      {/* Tipo */}
      <div>
        <Label htmlFor="tipo">Tipo *</Label>
        <div className="mt-1">
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoVeiculo)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPO_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KM Atual — only in create mode */}
      {!isEdit && (
        <div>
          <Label htmlFor="km_atual">KM Atual *</Label>
          <Input
            id="km_atual"
            type="number"
            value={kmAtual}
            onChange={e => setKmAtual(e.target.value)}
            min={0}
            placeholder="0"
            className="mt-1"
          />
          {errors.km_atual && (
            <p className="text-red-500 text-xs mt-1">{errors.km_atual}</p>
          )}
        </div>
      )}

      {/* KM Atual read-only in edit mode */}
      {isEdit && (
        <div>
          <Label>KM Atual</Label>
          <div className="mt-1 h-8 px-2.5 py-1 rounded-lg border border-input bg-muted/50 text-sm text-muted-foreground flex items-center">
            {veiculo!.km_atual.toLocaleString('pt-BR')} km
          </div>
        </div>
      )}

      {/* Ativo — only in edit mode */}
      {isEdit && (
        <div className="flex items-center gap-2">
          <input
            id="ativo"
            type="checkbox"
            checked={ativo}
            onChange={e => setAtivo(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <Label htmlFor="ativo" className="cursor-pointer">
            Veículo ativo
          </Label>
        </div>
      )}

      {/* Foto URL */}
      <div>
        <Label htmlFor="foto_url">Foto URL (opcional)</Label>
        <Input
          id="foto_url"
          value={fotoUrl}
          onChange={e => setFotoUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting
            ? isEdit ? 'Salvando...' : 'Criando...'
            : isEdit ? 'Salvar Alterações' : 'Criar Veículo'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
