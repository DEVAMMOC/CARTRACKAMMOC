import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireBotKey } from '@/lib/bot-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/bot/veiculos
 * Veículos com quilometragem atual e flag `em_viagem` (se há uma reserva em
 * andamento para o veículo neste momento). Auth: X-API-Key.
 */
export async function GET(req: Request) {
  const authErr = requireBotKey(req)
  if (authErr) return authErr

  const supabase = createAdminClient()

  const veiculosRes = await supabase.from('veiculos').select('*').order('modelo')
  if (veiculosRes.error) {
    return NextResponse.json({ error: veiculosRes.error.message }, { status: 500 })
  }

  const emAndamentoRes = await supabase
    .from('reservas')
    .select('veiculo_id')
    .eq('status', 'em_andamento')
  if (emAndamentoRes.error) {
    return NextResponse.json({ error: emAndamentoRes.error.message }, { status: 500 })
  }

  const emViagemIds = new Set((emAndamentoRes.data ?? []).map((r) => r.veiculo_id))
  const data = (veiculosRes.data ?? []).map((v) => ({
    ...v,
    em_viagem: emViagemIds.has(v.id),
  }))

  return NextResponse.json({ count: data.length, data })
}
