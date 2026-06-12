import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Usuario } from '@cartracking/types'

/**
 * Auth for the bot API (`/api/v1/bot/*`), used by the OpenClaw agent.
 *
 * Two layers:
 *  1. `X-API-Key` validated against `BOT_API_KEY` — the bot's own service key,
 *     separate from `EXPORT_API_KEY` so it can be revoked independently and is
 *     the only key allowed to perform writes.
 *  2. `X-Acting-User` (e-mail or telefone) — the employee on whose behalf the
 *     bot acts. Write actions are attributed to this user and follow the same
 *     permission rules as the web app.
 */

export function requireBotKey(req: Request): NextResponse | null {
  const expected = process.env.BOT_API_KEY
  if (!expected) {
    return NextResponse.json(
      { error: 'BOT_API_KEY is not configured on the server' },
      { status: 500 }
    )
  }
  const provided = req.headers.get('x-api-key')
  if (!provided || provided !== expected) {
    return NextResponse.json(
      { error: 'Invalid or missing X-API-Key header' },
      { status: 401 }
    )
  }
  return null
}

export type ActingUserResult =
  | { user: Usuario; response?: undefined }
  | { user?: undefined; response: NextResponse }

/**
 * Resolve the employee named in `X-Acting-User` (e-mail or telefone). The user
 * must exist and be active. Returns a 400/404 response otherwise.
 */
export async function resolveActingUser(
  req: Request,
  supabase: SupabaseClient
): Promise<ActingUserResult> {
  const raw = req.headers.get('x-acting-user')?.trim()
  if (!raw) {
    return {
      response: NextResponse.json(
        { error: 'Header X-Acting-User (e-mail ou telefone do funcionário) é obrigatório' },
        { status: 400 }
      ),
    }
  }

  const isEmail = raw.includes('@')
  const query = supabase.from('usuarios').select('*')
  const { data: usuario } = isEmail
    ? await query.ilike('email', raw).maybeSingle()
    : await query.eq('telefone', raw).maybeSingle()

  if (!usuario) {
    return {
      response: NextResponse.json(
        { error: `Funcionário não encontrado para '${raw}'` },
        { status: 404 }
      ),
    }
  }
  if (!usuario.ativo) {
    return {
      response: NextResponse.json(
        { error: `Funcionário '${raw}' está inativo` },
        { status: 403 }
      ),
    }
  }

  return { user: usuario as Usuario }
}
