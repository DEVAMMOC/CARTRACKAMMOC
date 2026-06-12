import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireBotKey, resolveActingUser } from '@/lib/bot-auth'
import { cancelarReserva } from '@/lib/reservas/actions'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/v1/bot/reservas/{id} — cancela a reserva.
 * Auth: X-API-Key + X-Acting-User.
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authErr = requireBotKey(req)
  if (authErr) return authErr

  const supabase = createAdminClient()
  const acting = await resolveActingUser(req, supabase)
  if (acting.response) return acting.response

  const { id } = await context.params
  const result = await cancelarReserva(supabase, acting.user, id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result.data)
}
