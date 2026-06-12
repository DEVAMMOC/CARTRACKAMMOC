import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireBotKey } from '@/lib/bot-auth'

export const dynamic = 'force-dynamic'

const SELECT = '*, veiculo:veiculos(*), usuario:usuarios(*), cidade_destino:cidades(*)'

/**
 * GET /api/v1/bot/status
 * Foto do momento para o bot responder "o que está acontecendo agora":
 *   - em_viagem: reservas em andamento (quem, qual carro, destino, km de saída)
 *   - agendadas: próximas reservas confirmadas (data_saida >= agora)
 * Auth: X-API-Key.
 */
export async function GET(req: Request) {
  const authErr = requireBotKey(req)
  if (authErr) return authErr

  const supabase = createAdminClient()
  const agora = new Date().toISOString()

  const emViagemRes = await supabase
    .from('reservas')
    .select(SELECT)
    .eq('status', 'em_andamento')
    .order('data_saida', { ascending: true })

  if (emViagemRes.error) {
    return NextResponse.json({ error: emViagemRes.error.message }, { status: 500 })
  }

  const agendadasRes = await supabase
    .from('reservas')
    .select(SELECT)
    .eq('status', 'confirmada')
    .gte('data_saida', agora)
    .order('data_saida', { ascending: true })

  if (agendadasRes.error) {
    return NextResponse.json({ error: agendadasRes.error.message }, { status: 500 })
  }

  return NextResponse.json({
    gerado_em: agora,
    em_viagem: {
      count: emViagemRes.data?.length ?? 0,
      data: emViagemRes.data ?? [],
    },
    agendadas: {
      count: agendadasRes.data?.length ?? 0,
      data: agendadasRes.data ?? [],
    },
  })
}
