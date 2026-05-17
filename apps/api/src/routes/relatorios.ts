import { Router, Response } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth, requireGestor, AuthRequest } from '../middleware/auth'
import { RelatorioFiltros, RelatorioData } from '@cartracking/types'
import * as XLSX from 'xlsx'
import PDFDocument from 'pdfkit'

export const relatoriosRouter = Router()

async function fetchRelatorioData(filtros: RelatorioFiltros): Promise<RelatorioData | null> {
  let query = supabase
    .from('reservas')
    .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
    .eq('status', 'finalizada')
    .gte('data_saida', filtros.inicio)
    .lte('data_saida', filtros.fim)
    .order('data_saida', { ascending: false })

  if (filtros.veiculo_id) query = query.eq('veiculo_id', filtros.veiculo_id)
  if (filtros.usuario_id) query = query.eq('usuario_id', filtros.usuario_id)

  const { data: reservas, error } = await query
  if (error || !reservas) return null

  const total_km = reservas.reduce((sum, r) => {
    const km = (r.km_retorno ?? 0) - (r.km_saida ?? 0)
    return sum + (km > 0 ? km : 0)
  }, 0)

  // Group by vehicle
  const veiculoMap = new Map<string, { veiculo: any; viagens: number; km: number }>()
  // Group by user
  const usuarioMap = new Map<string, { usuario: any; viagens: number; km: number }>()
  // Count destinations
  const destinoMap = new Map<string, number>()

  for (const r of reservas) {
    const km = Math.max(0, (r.km_retorno ?? 0) - (r.km_saida ?? 0))
    const vid = r.veiculo_id
    const uid = r.usuario_id

    if (!veiculoMap.has(vid)) {
      veiculoMap.set(vid, { veiculo: r.veiculo, viagens: 0, km: 0 })
    }
    const v = veiculoMap.get(vid)!
    v.viagens++
    v.km += km

    if (!usuarioMap.has(uid)) {
      usuarioMap.set(uid, { usuario: r.usuario, viagens: 0, km: 0 })
    }
    const u = usuarioMap.get(uid)!
    u.viagens++
    u.km += km

    const destino = r.destino?.trim() || 'Não informado'
    destinoMap.set(destino, (destinoMap.get(destino) ?? 0) + 1)
  }

  return {
    total_viagens: reservas.length,
    total_km,
    veiculos_usados: veiculoMap.size,
    por_veiculo: Array.from(veiculoMap.values()).sort((a, b) => b.km - a.km),
    por_usuario: Array.from(usuarioMap.values()).sort((a, b) => b.viagens - a.viagens),
    destinos_frequentes: Array.from(destinoMap.entries())
      .map(([destino, count]) => ({ destino, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    reservas,
  }
}

// GET /relatorios — JSON report data (gestor only)
relatoriosRouter.get('/', requireAuth, requireGestor, async (req: AuthRequest, res) => {
  const { inicio, fim, veiculo_id, usuario_id } = req.query as Record<string, string>

  if (!inicio || !fim) {
    res.status(400).json({ error: 'inicio e fim são obrigatórios' })
    return
  }

  const data = await fetchRelatorioData({ inicio, fim, veiculo_id, usuario_id })
  if (!data) {
    res.status(500).json({ error: 'Erro ao buscar dados do relatório' })
    return
  }

  res.json(data)
})

// GET /relatorios/exportar/excel
relatoriosRouter.get('/exportar/excel', requireAuth, requireGestor, async (req: AuthRequest, res: Response) => {
  const { inicio, fim, veiculo_id, usuario_id } = req.query as Record<string, string>

  if (!inicio || !fim) {
    res.status(400).json({ error: 'inicio e fim são obrigatórios' })
    return
  }

  const data = await fetchRelatorioData({ inicio, fim, veiculo_id, usuario_id })
  if (!data) {
    res.status(500).json({ error: 'Erro ao gerar Excel' })
    return
  }

  // Sheet 1: all reservations
  const rows = data.reservas.map(r => ({
    'Funcionário': r.usuario?.nome ?? '',
    'Email': r.usuario?.email ?? '',
    'Veículo': `${r.veiculo?.modelo ?? ''} (${r.veiculo?.placa ?? ''})`,
    'Tipo Veículo': r.veiculo?.tipo ?? '',
    'Saída': r.data_saida ? new Date(r.data_saida).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '',
    'Retorno Previsto': r.data_retorno_prevista ? new Date(r.data_retorno_prevista).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '',
    'Retorno Real': r.data_retorno_real ? new Date(r.data_retorno_real).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '',
    'Destino': r.destino,
    'Serviço': r.servico,
    'KM Saída': r.km_saida ?? '',
    'KM Retorno': r.km_retorno ?? '',
    'KM Rodados': r.km_retorno && r.km_saida ? r.km_retorno - r.km_saida : '',
    'Observações': r.observacoes ?? '',
  }))

  // Sheet 2: summary by vehicle
  const veiculoRows = data.por_veiculo.map(v => ({
    'Veículo': `${v.veiculo.modelo} (${v.veiculo.placa})`,
    'Tipo': v.veiculo.tipo,
    'Viagens': v.viagens,
    'KM Total': v.km,
  }))

  // Sheet 3: summary by user
  const usuarioRows = data.por_usuario.map(u => ({
    'Funcionário': u.usuario.nome,
    'Email': u.usuario.email,
    'Viagens': u.viagens,
    'KM Total': u.km,
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Reservas')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(veiculoRows), 'Por Veículo')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usuarioRows), 'Por Funcionário')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  const filename = `relatorio-ammoc-${inicio}-${fim}.xlsx`
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.send(buf)
})

// GET /relatorios/exportar/pdf
relatoriosRouter.get('/exportar/pdf', requireAuth, requireGestor, async (req: AuthRequest, res: Response) => {
  const { inicio, fim, veiculo_id, usuario_id } = req.query as Record<string, string>

  if (!inicio || !fim) {
    res.status(400).json({ error: 'inicio e fim são obrigatórios' })
    return
  }

  const data = await fetchRelatorioData({ inicio, fim, veiculo_id, usuario_id })
  if (!data) {
    res.status(500).json({ error: 'Erro ao gerar PDF' })
    return
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

  const doc = new PDFDocument({ margin: 50, size: 'A4' })
  const filename = `relatorio-ammoc-${inicio}-${fim}.pdf`
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Type', 'application/pdf')
  doc.pipe(res)

  // Header
  doc.fontSize(20).fillColor('#1e40af').text('AMMOC', { align: 'center' })
  doc.fontSize(14).fillColor('#374151').text('Relatório de Uso de Veículos', { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(11).fillColor('#6b7280')
    .text(`Período: ${fmtDate(inicio)} a ${fmtDate(fim)}`, { align: 'center' })
  doc.moveDown(1)

  // Summary cards
  doc.fontSize(12).fillColor('#111827').text('Resumo', { underline: true })
  doc.moveDown(0.5)
  doc.fontSize(11).fillColor('#374151')
  doc.text(`Total de viagens: ${data.total_viagens}`)
  doc.text(`Total de KM rodados: ${data.total_km.toLocaleString('pt-BR')} km`)
  doc.text(`Veículos utilizados: ${data.veiculos_usados}`)
  doc.moveDown(1)

  // By vehicle
  doc.fontSize(12).fillColor('#111827').text('Uso por Veículo', { underline: true })
  doc.moveDown(0.5)
  doc.fontSize(10).fillColor('#374151')
  for (const v of data.por_veiculo) {
    doc.text(`• ${v.veiculo.modelo} (${v.veiculo.placa}): ${v.viagens} viagem(ns), ${v.km.toLocaleString('pt-BR')} km`)
  }
  doc.moveDown(1)

  // By employee
  doc.fontSize(12).fillColor('#111827').text('Uso por Funcionário', { underline: true })
  doc.moveDown(0.5)
  doc.fontSize(10).fillColor('#374151')
  for (const u of data.por_usuario) {
    doc.text(`• ${u.usuario.nome}: ${u.viagens} viagem(ns), ${u.km.toLocaleString('pt-BR')} km`)
  }
  doc.moveDown(1)

  // Top destinations
  if (data.destinos_frequentes.length > 0) {
    doc.fontSize(12).fillColor('#111827').text('Destinos Mais Frequentes', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(10).fillColor('#374151')
    for (const d of data.destinos_frequentes) {
      doc.text(`• ${d.destino}: ${d.count}x`)
    }
    doc.moveDown(1)
  }

  // Trips table
  if (data.reservas.length > 0) {
    doc.addPage()
    doc.fontSize(12).fillColor('#111827').text('Detalhamento de Viagens', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(9).fillColor('#374151')
    for (const r of data.reservas) {
      const km = r.km_retorno && r.km_saida ? `${r.km_retorno - r.km_saida} km` : '-'
      doc.text(
        `${r.usuario?.nome} | ${r.veiculo?.modelo} (${r.veiculo?.placa}) | ${fmtDate(r.data_saida)} | ${r.destino} | ${km}`,
        { ellipsis: true }
      )
    }
  }

  doc.end()
})
