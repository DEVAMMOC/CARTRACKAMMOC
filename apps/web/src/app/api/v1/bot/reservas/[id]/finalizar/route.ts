import { NextResponse } from 'next/server'
import type { FinalizarViagemInput } from '@cartracking/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireBotKey, resolveActingUser } from '@/lib/bot-auth'
import { finalizarViagem } from '@/lib/reservas/actions'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/v1/bot/reservas/{id}/finalizar — marca o retorno.
 * Body: { km_retorno: number, observacoes?: string }. Atualiza km do veículo.
 * Auth: X-API-Key + X-Acting-User.
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authErr = requireBotKey(req)
  if (authErr) return authErr

  const supabase = createAdminClient()
  const acting = await resolveActingUser(req, supabase)
  if (acting.response) return acting.response

  const { id } = await context.params
  const body = (await req.json().catch(() => ({}))) as Partial<FinalizarViagemInput>
  const result = await finalizarViagem(supabase, acting.user, id, body)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result.data)
}
