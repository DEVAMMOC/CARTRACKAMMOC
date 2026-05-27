import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireApiKey } from '@/lib/api-key'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/export/reservas
 * Returns ALL reservations with joined veiculo + usuario, for external consumption.
 * Optional query params:
 *   - status: filter by status (confirmada|em_andamento|finalizada|cancelada)
 *   - inicio: ISO date string — only reservations with data_saida >= this date
 *   - fim:    ISO date string — only reservations with data_saida <= this date
 * Auth: X-API-Key header.
 */
export async function GET(req: Request) {
  const authErr = requireApiKey(req)
  if (authErr) return authErr

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const inicio = url.searchParams.get('inicio')
  const fim = url.searchParams.get('fim')

  const supabase = createAdminClient()
  let query = supabase
    .from('reservas')
    .select('*, veiculo:veiculos(*), usuario:usuarios(id, nome, email, papel, ativo, criado_em)')
    .order('data_saida', { ascending: false })

  if (status) query = query.eq('status', status)
  if (inicio) query = query.gte('data_saida', inicio)
  if (fim) query = query.lte('data_saida', fim)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    count: data?.length ?? 0,
    data: data ?? [],
  })
}
