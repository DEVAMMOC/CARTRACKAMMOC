import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, requireGestor } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const gestorErr = requireGestor(auth.user)
  if (gestorErr) return gestorErr

  const { id } = await context.params
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const updates: Record<string, unknown> = { ...body, atualizado_em: new Date().toISOString() }
  delete updates.id

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('veiculos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
