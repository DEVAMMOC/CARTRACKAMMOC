import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, requireGestor } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/** PATCH /api/admin/users/[id]/senha — gestor redefine a senha de um usuário. */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const gestorErr = requireGestor(auth.user)
  if (gestorErr) return gestorErr

  const { id } = await context.params
  const body = (await req.json().catch(() => ({}))) as { senha?: string }
  const senha = body.senha ?? ''

  if (senha.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter ao menos 6 caracteres' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.updateUserById(id, { password: senha })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
