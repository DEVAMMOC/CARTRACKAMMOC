import { NextResponse } from 'next/server'
import type { CriarReservaInput } from '@cartracking/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireBotKey, resolveActingUser } from '@/lib/bot-auth'
import { criarReserva } from '@/lib/reservas/actions'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/bot/reservas?status=&funcionario=&inicio=&fim=
 * Lista reservas com veículo, funcionário e cidade. Filtros opcionais.
 *   - status:      confirmada|em_andamento|finalizada|cancelada
 *   - funcionario: e-mail (ilike) do funcionário dono da reserva
 *   - inicio/fim:  ISO — janela sobre data_saida
 * Auth: X-API-Key.
 */
export async function GET(req: Request) {
  const authErr = requireBotKey(req)
  if (authErr) return authErr

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const funcionario = url.searchParams.get('funcionario')
  const inicio = url.searchParams.get('inicio')
  const fim = url.searchParams.get('fim')

  const supabase = createAdminClient()
  let query = supabase
    .from('reservas')
    .select('*, veiculo:veiculos(*), usuario:usuarios(*), cidade_destino:cidades(*)')
    .order('data_saida', { ascending: false })

  if (status) query = query.eq('status', status)
  if (inicio) query = query.gte('data_saida', inicio)
  if (fim) query = query.lte('data_saida', fim)

  let data
  if (funcionario) {
    const { data: u } = await supabase
      .from('usuarios')
      .select('id')
      .ilike('email', funcionario)
      .maybeSingle()
    if (!u) return NextResponse.json({ count: 0, data: [] })
    const res = await query.eq('usuario_id', u.id)
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 })
    data = res.data
  } else {
    const res = await query
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 })
    data = res.data
  }

  return NextResponse.json({ count: data?.length ?? 0, data: data ?? [] })
}

/**
 * POST /api/v1/bot/reservas — cria uma reserva em nome do funcionário indicado
 * em X-Acting-User. Body: CriarReservaInput (inclui opcional reservado_para).
 * Auth: X-API-Key + X-Acting-User.
 */
export async function POST(req: Request) {
  const authErr = requireBotKey(req)
  if (authErr) return authErr

  const supabase = createAdminClient()
  const acting = await resolveActingUser(req, supabase)
  if (acting.response) return acting.response

  const body = (await req.json().catch(() => ({}))) as Partial<CriarReservaInput>
  const result = await criarReserva(supabase, acting.user, body)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result.data, { status: 201 })
}
