import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, requireGestor } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

const VALID_PAPEIS = ['funcionario', 'gestor'] as const

/** PATCH /api/admin/users/[id] — edita nome, e-mail (login) e/ou papel. */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const gestorErr = requireGestor(auth.user)
  if (gestorErr) return gestorErr

  const { id } = await context.params
  const body = (await req.json().catch(() => ({}))) as {
    nome?: string
    email?: string
    papel?: string
  }

  const supabase = createAdminClient()
  const patch: Record<string, unknown> = {}

  if (body.nome != null) {
    const nome = body.nome.trim()
    if (!nome) return NextResponse.json({ error: 'Nome não pode ficar vazio' }, { status: 400 })
    patch.nome = nome
  }

  if (body.papel != null) {
    if (!VALID_PAPEIS.includes(body.papel as (typeof VALID_PAPEIS)[number])) {
      return NextResponse.json({ error: `papel deve ser um de: ${VALID_PAPEIS.join(', ')}` }, { status: 400 })
    }
    if (id === auth.user.id && body.papel !== 'gestor') {
      return NextResponse.json({ error: 'Você não pode remover seu próprio acesso de gestor' }, { status: 400 })
    }
    patch.papel = body.papel
  }

  if (body.email != null) {
    const email = body.email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'E-mail (login) inválido' }, { status: 400 })
    }
    // Muda o e-mail de login no Auth (já confirmado) antes de espelhar na tabela.
    const { error: authErr } = await supabase.auth.admin.updateUserById(id, {
      email,
      email_confirm: true,
    })
    if (authErr) {
      const jaExiste = /already|exist|registered/i.test(authErr.message)
      return NextResponse.json(
        { error: jaExiste ? 'Já existe um usuário com esse e-mail' : authErr.message },
        { status: jaExiste ? 409 : 500 }
      )
    }
    patch.email = email
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('usuarios')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/**
 * DELETE /api/admin/users/[id] — remove o usuário. Quem não tem reservas é
 * apagado de vez; quem tem histórico tem o login revogado e a conta desativada
 * (mantida pra preservar o histórico de reservas).
 */
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const gestorErr = requireGestor(auth.user)
  if (gestorErr) return gestorErr

  const { id } = await context.params
  if (id === auth.user.id) {
    return NextResponse.json({ error: 'Você não pode excluir a sua própria conta' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Revoga o login (remove do Supabase Auth). Ignora se já não existir.
  await supabase.auth.admin.deleteUser(id).catch(() => {})

  // Tem reservas? Então não dá pra apagar a linha (perderia o histórico) — desativa.
  const { count } = await supabase
    .from('reservas')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', id)

  if ((count ?? 0) > 0) {
    const { error } = await supabase.from('usuarios').update({ ativo: false }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      ok: true,
      desativado: true,
      message: 'Usuário tem reservas no histórico: o login foi removido e a conta desativada.',
    })
  }

  const { error } = await supabase.from('usuarios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, desativado: false })
}
