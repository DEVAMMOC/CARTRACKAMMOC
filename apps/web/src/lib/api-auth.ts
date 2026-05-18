import { NextResponse } from 'next/server'
import type { Usuario } from '@cartracking/types'
import { createAdminClient } from './supabase/admin'

export type AuthResult =
  | { user: Usuario; response?: undefined }
  | { user?: undefined; response: NextResponse }

export async function getAuthUser(req: Request): Promise<AuthResult> {
  const auth = req.headers.get('authorization')
  const token = auth?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return { response: NextResponse.json({ error: 'Token obrigatório' }, { status: 401 }) }
  }

  const supabase = createAdminClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { response: NextResponse.json({ error: 'Token inválido' }, { status: 401 }) }
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!usuario || !usuario.ativo) {
    return {
      response: NextResponse.json(
        { error: 'Usuário inativo ou não encontrado' },
        { status: 403 }
      ),
    }
  }

  return { user: usuario as Usuario }
}

export function requireGestor(user: Usuario): NextResponse | null {
  if (user.papel !== 'gestor') {
    return NextResponse.json({ error: 'Acesso restrito a gestores' }, { status: 403 })
  }
  return null
}
