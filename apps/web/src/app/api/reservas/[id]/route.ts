import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const user = auth.user

  const { id } = await context.params
  const supabase = createAdminClient()

  const { data: reserva } = await supabase
    .from('reservas')
    .select('usuario_id, status')
    .eq('id', id)
    .single()

  if (!reserva) {
    return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
  }
  if (reserva.usuario_id !== user.id && user.papel !== 'gestor') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  if (reserva.status === 'finalizada') {
    return NextResponse.json(
      { error: 'Não é possível cancelar uma viagem finalizada' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('reservas')
    .update({ status: 'cancelada', atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
