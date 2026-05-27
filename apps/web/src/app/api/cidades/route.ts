import { NextResponse } from 'next/server'
import type { CriarCidadeInput } from '@cartracking/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cidades — lista todas as cidades cadastradas (ordem alfabética).
 * Todo usuário autenticado pode listar (alimenta o dropdown de Nova Reserva).
 */
export async function GET(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('cidades')
    .select('*')
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/**
 * POST /api/cidades — cadastra uma cidade nova (usado quando user escolhe "Outra..." no form).
 * Body: { nome: string }
 * Retorna a cidade criada — ou a existente se o nome já estava cadastrado (case-insensitive).
 */
export async function POST(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response

  const body = (await req.json().catch(() => ({}))) as Partial<CriarCidadeInput>
  const nome = (body.nome ?? '').trim()

  if (!nome) {
    return NextResponse.json({ error: 'nome é obrigatório' }, { status: 400 })
  }
  if (nome.length > 100) {
    return NextResponse.json({ error: 'nome deve ter no máximo 100 caracteres' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Match case-insensitively to avoid "joaçaba" vs "Joaçaba" duplication.
  const { data: existing } = await supabase
    .from('cidades')
    .select('*')
    .ilike('nome', nome)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(existing, { status: 200 })
  }

  const { data, error } = await supabase
    .from('cidades')
    .insert({ nome })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      // Race-condition: another request created it between the SELECT above and our INSERT.
      const { data: now } = await supabase
        .from('cidades')
        .select('*')
        .ilike('nome', nome)
        .single()
      return NextResponse.json(now, { status: 200 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
