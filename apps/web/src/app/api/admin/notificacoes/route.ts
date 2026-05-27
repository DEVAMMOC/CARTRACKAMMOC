import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, requireGestor } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/notificacoes — últimas 100 tentativas de envio de email.
 * Gestor only. Usado pela página /admin/notificacoes pra diagnosticar
 * por que o Resend não está entregando (domínio não verificado etc.).
 */
export async function GET(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const gestorErr = requireGestor(auth.user)
  if (gestorErr) return gestorErr

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('notificacoes_email')
    .select('id, reserva_id, tipo, destinatario, sucesso, erro, criado_em')
    .order('criado_em', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
