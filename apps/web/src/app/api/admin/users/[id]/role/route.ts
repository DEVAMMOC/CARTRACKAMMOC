import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, requireGestor } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

const VALID_PAPEIS = ['funcionario', 'gestor'] as const
type Papel = (typeof VALID_PAPEIS)[number]

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const gestorErr = requireGestor(auth.user)
  if (gestorErr) return gestorErr

  const { id } = await context.params
  const body = (await req.json().catch(() => ({}))) as { papel?: string }
  const papel = body.papel as Papel | undefined

  if (!papel || !VALID_PAPEIS.includes(papel)) {
    return NextResponse.json(
      { error: `papel deve ser um de: ${VALID_PAPEIS.join(', ')}` },
      { status: 400 }
    )
  }

  if (id === auth.user.id && papel !== 'gestor') {
    return NextResponse.json(
      { error: 'Você não pode remover seu próprio acesso de gestor' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('usuarios')
    .update({ papel })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
