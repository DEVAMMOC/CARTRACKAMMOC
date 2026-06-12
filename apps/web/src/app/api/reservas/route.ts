import { NextResponse } from 'next/server'
import type { CriarReservaInput } from '@cartracking/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/api-auth'
import { criarReserva } from '@/lib/reservas/actions'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const user = auth.user

  const supabase = createAdminClient()
  let query = supabase
    .from('reservas')
    .select('*, veiculo:veiculos(*), usuario:usuarios(*), cidade_destino:cidades(*)')
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
  const result = await criarReserva(createAdminClient(), user, body)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result.data, { status: 201 })
}
