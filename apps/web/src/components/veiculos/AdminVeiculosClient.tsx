'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageIcon, PencilIcon, PowerIcon, PowerOffIcon, PlusIcon } from 'lucide-react'
import { Veiculo } from '@cartracking/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { VeiculoForm } from './VeiculoForm'
import { apiFetch } from '@/lib/api'
import Image from 'next/image'

const TIPO_LABELS: Record<string, string> = {
  carro: 'Carro',
  van: 'Van',
  caminhonete: 'Caminhonete',
  onibus: 'Ônibus',
  outro: 'Outro',
}

interface AdminVeiculosClientProps {
  veiculos: Veiculo[]
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return ativo ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Ativo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      Inativo
    </span>
  )
}

function VeiculoThumbnail({ veiculo, size = 'sm' }: { veiculo: Veiculo; size?: 'sm' | 'lg' }) {
  const dimensions = size === 'lg' ? 'w-16 h-12' : 'w-12 h-9'
  if (veiculo.foto_url) {
    return (
      <Image
        src={veiculo.foto_url}
        alt={veiculo.modelo}
        width={size === 'lg' ? 64 : 48}
        height={size === 'lg' ? 48 : 36}
        className={`${dimensions} object-cover rounded-md border border-gray-200`}
        unoptimized
      />
    )
  }
  return (
    <div className={`${dimensions} rounded-md border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400`}>
      <ImageIcon className={size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'} aria-hidden />
    </div>
  )
}

export function AdminVeiculosClient({ veiculos }: AdminVeiculosClientProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editVeiculo, setEditVeiculo] = useState<Veiculo | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  function handleSuccess() {
    setCreateOpen(false)
    setEditVeiculo(null)
    router.refresh()
  }

  async function handleToggleAtivo(v: Veiculo) {
    if (v.ativo) {
      if (
        !window.confirm(
          `Tem certeza que deseja desativar o veículo ${v.modelo} (${v.placa})? Ele não poderá ser usado em novas reservas.`
        )
      ) {
        return
      }
    }

    setTogglingId(v.id)
    try {
      await apiFetch(`/veiculos/${v.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: !v.ativo }),
      })
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao alterar status do veículo')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Veículos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie a frota de veículos da AMMOC
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5">
          <PlusIcon className="w-4 h-4" aria-hidden />
          <span className="hidden sm:inline">Novo Veículo</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Veículo</DialogTitle>
          </DialogHeader>
          <VeiculoForm
            onSuccess={handleSuccess}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={editVeiculo !== null}
        onOpenChange={(open) => {
          if (!open) setEditVeiculo(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Veículo</DialogTitle>
          </DialogHeader>
          {editVeiculo && (
            <VeiculoForm
              veiculo={editVeiculo}
              onSuccess={handleSuccess}
              onCancel={() => setEditVeiculo(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {veiculos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          Nenhum veículo cadastrado. Crie o primeiro clicando em &ldquo;Novo Veículo&rdquo;.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="md:hidden space-y-3">
            {veiculos.map((v) => {
              const isToggling = togglingId === v.id
              return (
                <li
                  key={v.id}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3 border-b border-gray-100">
                    <VeiculoThumbnail veiculo={v} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-gray-900 tracking-wider">
                          {v.placa}
                        </span>
                        <StatusBadge ativo={v.ativo} />
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-0.5">{v.modelo}</p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-3 gap-2 px-3 py-3 text-xs">
                    <div>
                      <dt className="text-gray-500">Ano</dt>
                      <dd className="text-gray-800 font-medium mt-0.5">{v.ano}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Tipo</dt>
                      <dd className="text-gray-800 font-medium mt-0.5">
                        {TIPO_LABELS[v.tipo] ?? v.tipo}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">KM</dt>
                      <dd className="text-gray-800 font-medium mt-0.5">
                        {v.km_atual.toLocaleString('pt-BR')}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex gap-2 p-3 border-t border-gray-100 bg-gray-50/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditVeiculo(v)}
                    >
                      <PencilIcon className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`flex-1 ${
                        v.ativo
                          ? 'text-orange-700 border-orange-200 hover:bg-orange-50'
                          : 'text-green-700 border-green-200 hover:bg-green-50'
                      }`}
                      disabled={isToggling}
                      onClick={() => handleToggleAtivo(v)}
                    >
                      {v.ativo ? (
                        <PowerOffIcon className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                      ) : (
                        <PowerIcon className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                      )}
                      {isToggling ? '...' : v.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Foto</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Placa</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Modelo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ano</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">KM Atual</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {veiculos.map((v, i) => {
                    const isToggling = togglingId === v.id
                    return (
                      <tr
                        key={v.id}
                        className={`border-b border-gray-100 last:border-0 ${
                          i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                        } hover:bg-blue-50/30 transition-colors`}
                      >
                        <td className="px-4 py-3">
                          <VeiculoThumbnail veiculo={v} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-gray-800 tracking-wider">
                            {v.placa}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{v.modelo}</td>
                        <td className="px-4 py-3 text-gray-600">{v.ano}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {TIPO_LABELS[v.tipo] ?? v.tipo}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {v.km_atual.toLocaleString('pt-BR')} km
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge ativo={v.ativo} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditVeiculo(v)}
                            >
                              <PencilIcon className="w-3.5 h-3.5 mr-1" aria-hidden />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className={
                                v.ativo
                                  ? 'text-orange-700 border-orange-200 hover:bg-orange-50'
                                  : 'text-green-700 border-green-200 hover:bg-green-50'
                              }
                              disabled={isToggling}
                              onClick={() => handleToggleAtivo(v)}
                            >
                              {v.ativo ? (
                                <PowerOffIcon className="w-3.5 h-3.5 mr-1" aria-hidden />
                              ) : (
                                <PowerIcon className="w-3.5 h-3.5 mr-1" aria-hidden />
                              )}
                              {isToggling ? '...' : v.ativo ? 'Desativar' : 'Ativar'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <p className="text-xs text-gray-400 mt-3">
        {veiculos.length} veículo{veiculos.length !== 1 ? 's' : ''} cadastrado{veiculos.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
