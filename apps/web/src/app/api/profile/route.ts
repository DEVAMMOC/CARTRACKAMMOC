import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  return NextResponse.json(auth.user)
}

export async function PATCH(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const updates: Record<string, unknown> = {}

  if (typeof body.nome === 'string') updates.nome = body.nome.trim()
  if (typeof body.cargo === 'string') updates.cargo = body.cargo.trim() || null
  if (typeof body.telefone === 'string') updates.telefone = body.telefone.trim() || null

  if (typeof updates.nome === 'string' && updates.nome.length < 2) {
    return NextResponse.json({ error: 'Nome deve ter pelo menos 2 caracteres' }, { status: 400 })
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('usuarios')
    .update(updates)
    .eq('id', auth.user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
