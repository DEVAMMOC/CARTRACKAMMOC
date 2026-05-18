import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getAuthUser, requireGestor } from '@/lib/api-auth'
import { fetchRelatorioData } from '@/lib/data/relatorios'

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
    return NextResponse.json({ error: 'Erro ao gerar Excel' }, { status: 500 })
  }

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

  const veiculoRows = data.por_veiculo.map(v => ({
    'Veículo': `${v.veiculo.modelo} (${v.veiculo.placa})`,
    'Tipo': v.veiculo.tipo,
    'Viagens': v.viagens,
    'KM Total': v.km,
  }))

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

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
}
