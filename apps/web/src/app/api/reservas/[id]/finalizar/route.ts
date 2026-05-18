import { NextResponse } from 'next/server'
import type { FinalizarViagemInput } from '@cartracking/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const user = auth.user

  const { id } = await context.params
  const body = (await req.json().catch(() => ({}))) as Partial<FinalizarViagemInput>

  if (!body.km_retorno || body.km_retorno <= 0) {
    return NextResponse.json(
      { error: 'km_retorno é obrigatório e deve ser positivo' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data: reserva } = await supabase
    .from('reservas')
    .select('usuario_id, status, veiculo_id, km_saida')
    .eq('id', id)
    .single()

  if (!reserva) {
    return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
  }
  if (reserva.usuario_id !== user.id && user.papel !== 'gestor') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  if (reserva.status === 'finalizada') {
    return NextResponse.json({ error: 'Viagem já finalizada' }, { status: 400 })
  }
  if (reserva.status === 'cancelada') {
    return NextResponse.json(
      { error: 'Reserva cancelada não pode ser finalizada' },
      { status: 400 }
    )
  }
  if (reserva.km_saida !== null && body.km_retorno < reserva.km_saida) {
    return NextResponse.json(
      { error: `KM de retorno (${body.km_retorno}) menor que KM de saída (${reserva.km_saida})` },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('reservas')
    .update({
      status: 'finalizada',
      km_retorno: body.km_retorno,
      observacoes: body.observacoes ?? null,
      data_retorno_real: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase
    .from('veiculos')
    .update({ km_atual: body.km_retorno, atualizado_em: new Date().toISOString() })
    .eq('id', reserva.veiculo_id)

  return NextResponse.json(data)
}
