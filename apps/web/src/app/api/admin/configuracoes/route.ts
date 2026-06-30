import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, requireGestor } from '@/lib/api-auth'
import { getConfiguracaoNotificacao } from '@/lib/configuracoes'

export const dynamic = 'force-dynamic'

/** GET /api/admin/configuracoes — config de notificações (gestor). */
export async function GET(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const gestorErr = requireGestor(auth.user)
  if (gestorErr) return gestorErr

  const config = await getConfiguracaoNotificacao(createAdminClient())
  return NextResponse.json(config)
}

/** PATCH /api/admin/configuracoes — atualiza a config (gestor). */
export async function PATCH(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const gestorErr = requireGestor(auth.user)
  if (gestorErr) return gestorErr

  const body = (await req.json().catch(() => ({}))) as {
    alerta_nao_finalizada_ativo?: boolean
    alerta_hora_local?: number
    email_confirmacao_ativo?: boolean
  }

  const patch: Record<string, unknown> = { atualizado_em: new Date().toISOString() }

  if (typeof body.alerta_nao_finalizada_ativo === 'boolean') {
    patch.alerta_nao_finalizada_ativo = body.alerta_nao_finalizada_ativo
  }
  if (typeof body.email_confirmacao_ativo === 'boolean') {
    patch.email_confirmacao_ativo = body.email_confirmacao_ativo
  }
  if (body.alerta_hora_local != null) {
    const h = Number(body.alerta_hora_local)
    if (!Number.isInteger(h) || h < 0 || h > 23) {
      return NextResponse.json(
        { error: 'alerta_hora_local deve ser um inteiro entre 0 e 23' },
        { status: 400 }
      )
    }
    patch.alerta_hora_local = h
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('configuracoes_notificacao')
    .update(patch)
    .eq('id', true)
    .select('alerta_nao_finalizada_ativo, alerta_hora_local, email_confirmacao_ativo, atualizado_em')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
