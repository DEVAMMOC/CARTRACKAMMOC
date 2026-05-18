import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { getAuthUser, requireGestor } from '@/lib/api-auth'
import { fetchRelatorioData } from '@/lib/data/relatorios'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const gestorErr = requireGestor(auth.user)
  if (gestorErr) return gestorErr

  const url = new URL(req.url)
  const inicio = url.searchParams.get('inicio')
  const fim = url.searchParams.get('fim')
  const veiculo_id = url.searchParams.get('veiculo_id') ?? undefined
  const usuario_id = url.searchParams.get('usuario_id') ?? undefined

  if (!inicio || !fim) {
    return NextResponse.json({ error: 'inicio e fim são obrigatórios' }, { status: 400 })
  }

  const data = await fetchRelatorioData({ inicio, fim, veiculo_id, usuario_id })
  if (!data) {
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 })
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

  const buffer: Buffer = await new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' })
      const chunks: Buffer[] = []
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      doc.fontSize(20).fillColor('#1e40af').text('AMMOC', { align: 'center' })
      doc.fontSize(14).fillColor('#374151').text('Relatório de Uso de Veículos', { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(11).fillColor('#6b7280')
        .text(`Período: ${fmtDate(inicio)} a ${fmtDate(fim)}`, { align: 'center' })
      doc.moveDown(1)

      doc.fontSize(12).fillColor('#111827').text('Resumo', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(11).fillColor('#374151')
      doc.text(`Total de viagens: ${data.total_viagens}`)
      doc.text(`Total de KM rodados: ${data.total_km.toLocaleString('pt-BR')} km`)
      doc.text(`Veículos utilizados: ${data.veiculos_usados}`)
      doc.moveDown(1)

      doc.fontSize(12).fillColor('#111827').text('Uso por Veículo', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(10).fillColor('#374151')
      for (const v of data.por_veiculo) {
        doc.text(`- ${v.veiculo.modelo} (${v.veiculo.placa}): ${v.viagens} viagem(ns), ${v.km.toLocaleString('pt-BR')} km`)
      }
      doc.moveDown(1)

      doc.fontSize(12).fillColor('#111827').text('Uso por Funcionário', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(10).fillColor('#374151')
      for (const u of data.por_usuario) {
        doc.text(`- ${u.usuario.nome}: ${u.viagens} viagem(ns), ${u.km.toLocaleString('pt-BR')} km`)
      }
      doc.moveDown(1)

      if (data.destinos_frequentes.length > 0) {
        doc.fontSize(12).fillColor('#111827').text('Destinos Mais Frequentes', { underline: true })
        doc.moveDown(0.5)
        doc.fontSize(10).fillColor('#374151')
        for (const d of data.destinos_frequentes) {
          doc.text(`- ${d.destino}: ${d.count}x`)
        }
        doc.moveDown(1)
      }

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
    } catch (e) {
      reject(e)
    }
  })

  const filename = `relatorio-ammoc-${inicio}-${fim}.pdf`
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'application/pdf',
    },
  })
}
