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
