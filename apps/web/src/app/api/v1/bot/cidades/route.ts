import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireBotKey } from '@/lib/bot-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/bot/cidades — lista as cidades cadastradas (id + nome), em ordem
 * alfabética. O agente usa isto para descobrir o `cidade_destino_id` ao criar
 * uma reserva (ou pode passar `cidade_destino_nome` direto no POST /reservas).
 * Auth: X-API-Key.
 */
export async function GET(req: Request) {
  const authErr = requireBotKey(req)
  if (authErr) return authErr

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('cidades').select('id, nome').order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ count: data?.length ?? 0, data: data ?? [] })
}

/**
 * POST /api/v1/bot/cidades — cadastra uma cidade nova. Body: { nome }.
 * Retorna a existente (case-insensitive) se já houver. Auth: X-API-Key.
 */
export async function POST(req: Request) {
  const authErr = requireBotKey(req)
  if (authErr) return authErr

  const body = (await req.json().catch(() => ({}))) as { nome?: string }
  const nome = (body.nome ?? '').trim()
  if (!nome) return NextResponse.json({ error: 'nome é obrigatório' }, { status: 400 })
  if (nome.length > 100) {
    return NextResponse.json({ error: 'nome deve ter no máximo 100 caracteres' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from('cidades')
    .select('id, nome')
    .ilike('nome', nome)
    .maybeSingle()
  if (existing) return NextResponse.json(existing, { status: 200 })

  const { data, error } = await supabase
    .from('cidades')
    .insert({ nome })
    .select('id, nome')
    .single()
  if (error) {
    if (error.code === '23505') {
      const { data: now } = await supabase
        .from('cidades')
        .select('id, nome')
        .ilike('nome', nome)
        .single()
      return NextResponse.json(now, { status: 200 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
