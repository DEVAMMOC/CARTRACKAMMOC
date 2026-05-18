'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ImageIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  PowerOffIcon,
} from 'lucide-react'
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
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-200 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Ativo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      Inativo
    </span>
  )
}

function VeiculoThumbnail({ veiculo }: { veiculo: Veiculo }) {
  if (veiculo.foto_url) {
    return (
      <Image
        src={veiculo.foto_url}
        alt={veiculo.modelo}
        width={48}
        height={48}
        className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0"
        unoptimized
      />
    )
  }
  return (
    <div className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
      <ImageIcon className="w-5 h-5" aria-hidden />
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
        <ul
          className="grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}
        >
          {veiculos.map((v) => {
            const isToggling = togglingId === v.id
            return (
              <li
                key={v.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col overflow-hidden"
              >
                <div className="p-4 flex items-center gap-3">
                  <VeiculoThumbnail veiculo={v} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono font-bold text-base text-gray-900 tracking-wider truncate">
                        {v.placa}
                      </span>
                      <StatusBadge ativo={v.ativo} />
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-2">
                  <p className="text-sm text-gray-800 font-medium truncate">{v.modelo}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {v.ano} · {TIPO_LABELS[v.tipo] ?? v.tipo}
                  </p>
                </div>

                <div className="px-4 pb-3 mt-auto">
                  <p className="text-xs text-gray-500">
                    KM atual:{' '}
                    <span className="text-gray-800 font-medium">
                      {v.km_atual.toLocaleString('pt-BR')} km
                    </span>
                  </p>
                </div>

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
                    className={
                      'flex-1 ' +
                      (v.ativo
                        ? 'text-orange-700 border-orange-200 hover:bg-orange-50'
                        : 'text-green-700 border-green-200 hover:bg-green-50')
                    }
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
      )}

      <p className="text-xs text-gray-400 mt-4">
        {veiculos.length} veículo{veiculos.length !== 1 ? 's' : ''} cadastrado
        {veiculos.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
