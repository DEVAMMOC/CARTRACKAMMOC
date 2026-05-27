import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireApiKey } from '@/lib/api-key'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/export/disponibilidade?veiculo_id=&inicio=&fim=
 * Checks vehicle availability in a date range.
 * Required query params:
 *   - veiculo_id: UUID of the vehicle
 *   - inicio: ISO datetime (data_saida candidata)
 *   - fim:    ISO datetime (data_retorno candidata)
 * Returns: { disponivel: boolean, conflitos: [{ id, data_saida, data_retorno_prevista, status }] }
 * Auth: X-API-Key header.
 */
export async function GET(req: Request) {
  const authErr = requireApiKey(req)
  if (authErr) return authErr

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
    .select('id, data_saida, data_retorno_prevista, status')
    .eq('veiculo_id', veiculo_id)
    .not('status', 'in', '("cancelada","finalizada")')
    .lt('data_saida', fim)
    .gt('data_retorno_prevista', inicio)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    disponivel: !data || data.length === 0,
    conflitos: data ?? [],
  })
}
