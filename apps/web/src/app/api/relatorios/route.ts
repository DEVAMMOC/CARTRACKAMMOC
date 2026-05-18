import { NextResponse } from 'next/server'
import { getAuthUser, requireGestor } from '@/lib/api-auth'
import { fetchRelatorioData } from '@/lib/data/relatorios'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const gestorErr = requireGestor(auth.user)
  if (gestorErr) return gestorErr

  const url = new URL(req.url)
  const inicio = url.searchParams.get('inicio')
  const fim = url.searchParams.get('fim')
  const veiculo_id = url.searchParams.get('veiculo_id') ?? undefined
  const usuario_id = url.searchParams.get('usuario_id') ?? undefined

  if (!inicio || !fim) {
    return NextResponse.json({ error: 'inicio e fim são obrigatórios' }, { status: 400 })
  }

  const data = await fetchRelatorioData({ inicio, fim, veiculo_id, usuario_id })
  if (!data) {
    return NextResponse.json({ error: 'Erro ao buscar dados do relatório' }, { status: 500 })
  }

  return NextResponse.json(data)
}
