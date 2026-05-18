'use client'

import { useState, useEffect } from 'react'
import { RelatorioData, Veiculo } from '@cartracking/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch } from '@/lib/api'

const API_URL = '/api'

function getCurrentMonthRange(): { inicio: string; fim: string } {
  const now = new Date()
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1)
  const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    inicio: inicio.toISOString().split('T')[0],
    fim: fim.toISOString().split('T')[0],
  }
}

function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function RelatorioPanel() {
  const defaultRange = getCurrentMonthRange()
  const [inicio, setInicio] = useState(defaultRange.inicio)
  const [fim, setFim] = useState(defaultRange.fim)
  const [veiculoId, setVeiculoId] = useState<string>('all')
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [geradoInicio, setGeradoInicio] = useState<string>('')
  const [geradoFim, setGeradoFim] = useState<string>('')

  // Load vehicles for the filter select
  useEffect(() => {
    apiFetch<Veiculo[]>('/veiculos')
      .then(data => setVeiculos(data))
      .catch(() => setVeiculos([]))
  }, [])

  async function handleGerar() {
    if (!inicio || !fim) {
      setError('Por favor, informe as datas de início e fim.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      let path = `/relatorios?inicio=${inicio}&fim=${fim}`
      if (veiculoId && veiculoId !== 'all') {
        path += `&veiculo_id=${veiculoId}`
      }
      const data = await apiFetch<RelatorioData>(path)
      setRelatorio(data)
      setGeradoInicio(inicio)
      setGeradoFim(fim)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }

  function buildExportUrl(format: 'excel' | 'pdf'): string {
    let url = `${API_URL}/relatorios/exportar/${format}?inicio=${geradoInicio}&fim=${geradoFim}`
    if (veiculoId && veiculoId !== 'all') {
      url += `&veiculo_id=${veiculoId}`
    }
    return url
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gere relatórios de uso de veículos por período
        </p>
      </div>

      {/* Filter card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inicio">De</Label>
              <Input
                id="inicio"
                type="date"
                value={inicio}
                onChange={e => setInicio(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fim">Até</Label>
              <Input
                id="fim"
                type="date"
                value={fim}
                onChange={e => setFim(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="veiculo">Veículo</Label>
              <Select value={veiculoId} onValueChange={val => setVeiculoId(val ?? 'all')}>
                <SelectTrigger id="veiculo" className="w-52">
                  <SelectValue placeholder="Todos os veículos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os veículos</SelectItem>
                  {veiculos.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.modelo} ({v.placa})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGerar} disabled={loading}>
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {relatorio && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total de Viagens</p>
                <p className="text-3xl font-bold text-gray-900">{relatorio.total_viagens}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total de KM</p>
                <p className="text-3xl font-bold text-gray-900">
                  {relatorio.total_km.toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Veículos Utilizados</p>
                <p className="text-3xl font-bold text-gray-900">{relatorio.veiculos_usados}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Período</p>
                <p className="text-base font-semibold text-gray-900">
                  {formatDateBR(geradoInicio)} – {formatDateBR(geradoFim)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Export buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => window.open(buildExportUrl('excel'), '_blank')}
            >
              Exportar Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(buildExportUrl('pdf'), '_blank')}
            >
              Exportar PDF
            </Button>
          </div>

          {/* Uso por Veículo */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Uso por Veículo</h2>
            {relatorio.por_veiculo.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum dado disponível.</p>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Veículo</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Viagens</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">KM Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.por_veiculo.map((row, i) => (
                      <tr
                        key={row.veiculo.id}
                        className={`border-b border-gray-100 last:border-0 ${
                          i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-800">
                          {row.veiculo.modelo}{' '}
                          <span className="font-mono text-xs text-gray-500">({row.veiculo.placa})</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.viagens}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {row.km.toLocaleString('pt-BR')} km
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Uso por Funcionário */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Uso por Funcionário</h2>
            {relatorio.por_usuario.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum dado disponível.</p>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Funcionário</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Viagens</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">KM Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.por_usuario.map((row, i) => (
                      <tr
                        key={row.usuario.id}
                        className={`border-b border-gray-100 last:border-0 ${
                          i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-800">{row.usuario.nome}</td>
                        <td className="px-4 py-3 text-gray-700">{row.viagens}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {row.km.toLocaleString('pt-BR')} km
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Destinos Mais Frequentes */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Destinos Mais Frequentes</h2>
            {relatorio.destinos_frequentes.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum dado disponível.</p>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Destino</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.destinos_frequentes.map((row, i) => (
                      <tr
                        key={row.destino}
                        className={`border-b border-gray-100 last:border-0 ${
                          i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-800">{row.destino}</td>
                        <td className="px-4 py-3 text-gray-700">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
