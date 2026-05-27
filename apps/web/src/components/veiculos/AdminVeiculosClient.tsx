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
    <span className="badge-success inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      Ativo
    </span>
  ) : (
    <span className="badge-muted inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
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
        className="w-12 h-12 object-cover rounded-lg border border-border flex-shrink-0"
        unoptimized
      />
    )
  }
  return (
    <div className="w-12 h-12 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Veículos</h1>
          <p className="text-sm text-muted-foreground mt-1">
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
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
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
                className="rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col overflow-hidden"
              >
                <div className="p-4 flex items-center gap-3">
                  <VeiculoThumbnail veiculo={v} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono font-bold text-base text-foreground tracking-wider truncate">
                        {v.placa}
                      </span>
                      <StatusBadge ativo={v.ativo} />
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-2">
                  <p className="text-sm text-foreground font-medium truncate">{v.modelo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {v.ano} · {TIPO_LABELS[v.tipo] ?? v.tipo}
                  </p>
                </div>

                <div className="px-4 pb-3 mt-auto">
                  <p className="text-xs text-muted-foreground">
                    KM atual:{' '}
                    <span className="text-foreground font-medium">
                      {v.km_atual.toLocaleString('pt-BR')} km
                    </span>
                  </p>
                </div>

                <div className="flex gap-2 p-3 border-t border-border bg-muted/40">
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
                        ? 'text-destructive border-destructive/30 hover:bg-destructive/10 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950/30'
                        : 'text-primary border-primary/30 hover:bg-primary/10')
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

      <p className="text-xs text-muted-foreground mt-4">
        {veiculos.length} veículo{veiculos.length !== 1 ? 's' : ''} cadastrado
        {veiculos.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
