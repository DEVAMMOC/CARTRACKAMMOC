import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/api-auth'
import { iniciarViagem } from '@/lib/reservas/actions'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response

  const { id } = await context.params
  const body = (await req.json().catch(() => ({}))) as { km_inicial?: number }
  const result = await iniciarViagem(createAdminClient(), auth.user, id, body)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result.data)
}
