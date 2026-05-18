import { NextResponse } from 'next/server'
import type { CriarReservaInput } from '@cartracking/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/api-auth'
import { sendConfirmacaoEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const user = auth.user

  const supabase = createAdminClient()
  let query = supabase
    .from('reservas')
    .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
    .order('data_saida', { ascending: false })

  if (user.papel === 'funcionario') {
    query = query.eq('usuario_id', user.id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const user = auth.user

  const body = (await req.json().catch(() => ({}))) as Partial<CriarReservaInput>
  if (!body.veiculo_id || !body.data_saida || !body.data_retorno_prevista || !body.destino || !body.servico) {
    return NextResponse.json(
      { error: 'veiculo_id, data_saida, data_retorno_prevista, destino e servico são obrigatórios' },
      { status: 400 }
    )
  }

  if (new Date(body.data_retorno_prevista) <= new Date(body.data_saida)) {
    return NextResponse.json(
      { error: 'data_retorno_prevista deve ser posterior à data_saida' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data: conflicts } = await supabase
    .from('reservas')
    .select('id')
    .eq('veiculo_id', body.veiculo_id)
    .not('status', 'in', '("cancelada","finalizada")')
    .lt('data_saida', body.data_retorno_prevista)
    .gt('data_retorno_prevista', body.data_saida)
    .limit(1)

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json(
      { error: 'Veículo não disponível no período solicitado' },
      { status: 409 }
    )
  }

  const { data: veiculo } = await supabase
    .from('veiculos')
    .select('km_atual, modelo, placa')
    .eq('id', body.veiculo_id)
    .single()

  if (!veiculo) {
    return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('reservas')
    .insert({
      ...body,
      usuario_id: user.id,
      km_saida: veiculo.km_atual,
      status: 'confirmada',
    })
    .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  sendConfirmacaoEmail(data).catch((err: unknown) =>
    console.error('[email] Confirmation failed:', err)
  )

  return NextResponse.json(data, { status: 201 })
}
