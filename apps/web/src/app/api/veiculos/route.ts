import { NextResponse } from 'next/server'
import type { CriarVeiculoInput } from '@cartracking/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, requireGestor } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('veiculos')
    .select('*')
    .eq('ativo', true)
    .order('modelo')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const gestorErr = requireGestor(auth.user)
  if (gestorErr) return gestorErr

  const body = (await req.json().catch(() => ({}))) as Partial<CriarVeiculoInput>
  if (!body.placa || !body.modelo || !body.ano || !body.tipo) {
    return NextResponse.json(
      { error: 'placa, modelo, ano e tipo são obrigatórios' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('veiculos')
    .insert(body)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Placa já cadastrada' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
