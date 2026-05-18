import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response

  const url = new URL(req.url)
  const veiculo_id = url.searchParams.get('veiculo_id')
  const inicio = url.searchParams.get('inicio')
  const fim = url.searchParams.get('fim')

  if (!veiculo_id || !inicio || !fim) {
    return NextResponse.json(
      { error: 'veiculo_id, inicio e fim são obrigatórios' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('reservas')
    .select('id')
    .eq('veiculo_id', veiculo_id)
    .not('status', 'in', '("cancelada","finalizada")')
    .lt('data_saida', fim)
    .gt('data_retorno_prevista', inicio)
    .limit(1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ disponivel: data.length === 0 })
}
