'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReservaComDetalhes, Usuario, StatusReserva } from '@cartracking/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch } from '@/lib/api'

interface AdminReservasClientProps {
  reservas: ReservaComDetalhes[]
  usuario: Usuario
}

const STATUS_LABELS: Record<StatusReserva, string> = {
  confirmada: 'Confirmada',
  em_andamento: 'Em Andamento',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

const STATUS_BADGE_CLASSES: Record<StatusReserva, string> = {
  confirmada: 'bg-blue-100 text-blue-800 border-blue-200',
  em_andamento: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  finalizada: 'bg-green-100 text-green-800 border-green-200',
  cancelada: 'bg-red-100 text-red-800 border-red-200',
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function AdminReservasClient({ reservas, usuario }: AdminReservasClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusReserva | 'all'>('all')
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  // Sort by data_saida descending
  const sorted = [...reservas].sort(
    (a, b) => new Date(b.data_saida).getTime() - new Date(a.data_saida).getTime()
  )

  // Filter
  const filtered = sorted.filter(r => {
    const matchesSearch =
      search.trim() === '' ||
      r.usuario.nome.toLowerCase().includes(search.toLowerCase()) ||
      r.destino.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  async function handleCancelar(id: string) {
    if (!window.confirm('Tem certeza que deseja cancelar esta reserva?')) return
    setCancelingId(id)
    try {
      await apiFetch(`/reservas/${id}`, { method: 'DELETE' })
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao cancelar reserva')
    } finally {
      setCancelingId(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Todas as Reservas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Visualize e gerencie todas as reservas de veículos
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Input
          placeholder="Buscar por funcionário ou destino..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={val => setStatusFilter(val as StatusReserva | 'all')}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="confirmada">Confirmada</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="finalizada">Finalizada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          Nenhuma reserva encontrada.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Funcionário</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Veículo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Destino</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Saída</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Retorno Previsto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b border-gray-100 last:border-0 ${
                    i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  } hover:bg-blue-50/30 transition-colors`}
                >
                  <td className="px-4 py-3 text-gray-800 font-medium">{r.usuario.nome}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <span>{r.veiculo.modelo}</span>
                    <span className="ml-1 font-mono text-xs text-gray-500">({r.veiculo.placa})</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.destino}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatDate(r.data_saida)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatDate(r.data_retorno_prevista)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE_CLASSES[r.status]}`}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(r.status === 'confirmada' || r.status === 'em_andamento') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={cancelingId === r.id}
                        onClick={() => handleCancelar(r.id)}
                      >
                        {cancelingId === r.id ? 'Cancelando...' : 'Cancelar'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        {filtered.length} reserva{filtered.length !== 1 ? 's' : ''} exibida{filtered.length !== 1 ? 's' : ''}
        {filtered.length !== reservas.length && ` (de ${reservas.length} total)`}
      </p>
    </div>
  )
}
