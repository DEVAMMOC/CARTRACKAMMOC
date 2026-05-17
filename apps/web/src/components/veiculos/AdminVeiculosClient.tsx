'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Veiculo } from '@cartracking/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { VeiculoForm } from './VeiculoForm'
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

export function AdminVeiculosClient({ veiculos }: AdminVeiculosClientProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editVeiculo, setEditVeiculo] = useState<Veiculo | null>(null)

  function handleSuccess() {
    setCreateOpen(false)
    setEditVeiculo(null)
    router.refresh()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Veículos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie a frota de veículos da AMMOC
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={
              <Button />
            }
          >
            + Novo Veículo
          </DialogTrigger>
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
      </div>

      {/* Edit Dialog (controlled externally, not via trigger) */}
      <Dialog
        open={editVeiculo !== null}
        onOpenChange={open => {
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

      {/* Table */}
      {veiculos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          Nenhum veículo cadastrado. Crie o primeiro clicando em &ldquo;Novo Veículo&rdquo;.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {veiculos.map((v, i) => (
                <tr
                  key={v.id}
                  className={`border-b border-gray-100 last:border-0 ${
                    i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  } hover:bg-blue-50/30 transition-colors`}
                >
                  {/* Foto */}
                  <td className="px-4 py-3">
                    {v.foto_url ? (
                      <Image
                        src={v.foto_url}
                        alt={v.modelo}
                        width={48}
                        height={36}
                        className="w-12 h-9 object-cover rounded-md border border-gray-200"
                        unoptimized
                      />
                    ) : (
                      <div className="w-12 h-9 rounded-md border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                          />
                        </svg>
                      </div>
                    )}
                  </td>

                  {/* Placa */}
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-gray-800 tracking-wider">
                      {v.placa}
                    </span>
                  </td>

                  {/* Modelo */}
                  <td className="px-4 py-3 text-gray-700">{v.modelo}</td>

                  {/* Ano */}
                  <td className="px-4 py-3 text-gray-600">{v.ano}</td>

                  {/* Tipo */}
                  <td className="px-4 py-3 text-gray-600">
                    {TIPO_LABELS[v.tipo] ?? v.tipo}
                  </td>

                  {/* KM Atual */}
                  <td className="px-4 py-3 text-gray-600">
                    {v.km_atual.toLocaleString('pt-BR')} km
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <Badge variant={v.ativo ? 'default' : 'outline'}>
                      {v.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditVeiculo(v)}
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        {veiculos.length} veículo{veiculos.length !== 1 ? 's' : ''} cadastrado{veiculos.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
