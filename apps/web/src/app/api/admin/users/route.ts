import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, requireGestor } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const gestorErr = requireGestor(auth.user)
  if (gestorErr) return gestorErr

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

const VALID_PAPEIS = ['funcionario', 'gestor'] as const

/**
 * POST /api/admin/users — gestor cria um login (e-mail + senha) para alguém que
 * não tem e-mail da AMMOC. O e-mail vira o usuário de login; pode ser pessoal ou
 * inventado (ex.: joao@frotas.local). Já entra confirmado, dá pra logar na hora.
 */
export async function POST(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const gestorErr = requireGestor(auth.user)
  if (gestorErr) return gestorErr

  const body = (await req.json().catch(() => ({}))) as {
    nome?: string
    email?: string
    senha?: string
    papel?: string
  }

  const nome = (body.nome ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()
  const senha = body.senha ?? ''
  const papel = (body.papel ?? 'funcionario') as (typeof VALID_PAPEIS)[number]

  if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail (login) inválido' }, { status: 400 })
  }
  if (senha.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter ao menos 6 caracteres' }, { status: 400 })
  }
  if (!VALID_PAPEIS.includes(papel)) {
    return NextResponse.json({ error: `papel deve ser um de: ${VALID_PAPEIS.join(', ')}` }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Cria o usuário no Supabase Auth com a senha definida pelo gestor, já confirmado.
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { full_name: nome },
  })

  if (createError || !created?.user) {
    const msg = createError?.message ?? 'Falha ao criar usuário'
    const jaExiste = /already|exist|registered/i.test(msg)
    return NextResponse.json(
      { error: jaExiste ? 'Já existe um usuário com esse e-mail' : msg },
      { status: jaExiste ? 409 : 500 }
    )
  }

  // O gatilho on_auth_user_created já criou a linha em `usuarios` (papel funcionario).
  // Garante nome/email corretos e ajusta o papel se for gestor.
  const { data: usuario, error: upError } = await supabase
    .from('usuarios')
    .update({ nome, email, papel })
    .eq('id', created.user.id)
    .select('*')
    .single()

  if (upError) {
    // Fallback: se o gatilho não tiver rodado, insere a linha manualmente.
    const { data: inserted, error: insError } = await supabase
      .from('usuarios')
      .insert({ id: created.user.id, nome, email, papel })
      .select('*')
      .single()
    if (insError) return NextResponse.json({ error: insError.message }, { status: 500 })
    return NextResponse.json(inserted, { status: 201 })
  }

  return NextResponse.json(usuario, { status: 201 })
}
