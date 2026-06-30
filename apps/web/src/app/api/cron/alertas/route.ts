import { NextResponse } from 'next/server'
import type { ReservaComDetalhes } from '@cartracking/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAlertaNaoFinalizadaEmail } from '@/lib/email'
import { getConfiguracaoNotificacao } from '@/lib/configuracoes'

/** Hora atual (0-23) no fuso de Brasília. */
function horaBrasilia(): number {
  const h = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false,
  }).format(new Date())
  return parseInt(h, 10) % 24
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(req: Request): boolean {
  // Vercel Cron sends Authorization: Bearer ${CRON_SECRET}
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth === `Bearer ${secret}`) return true
  }
  // Fallback: Vercel attaches x-vercel-cron when triggering cron jobs.
  // Not safe alone (header is user-settable), so only honor it when no
  // CRON_SECRET is configured — first deploy convenience.
  if (!secret && req.headers.get('x-vercel-cron')) return true
  return false
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const startedAt = new Date().toISOString()
  console.log(`[cron] ${startedAt} — checking unfinalized trips`)

  // Configuração de quando enviar (definida em /admin/notificacoes). O Coolify
  // dispara este endpoint de hora em hora; aqui decidimos se é o momento certo.
  const config = await getConfiguracaoNotificacao(supabase)
  const force =
    new URL(req.url).searchParams.get('force') === 'true' ||
    new URL(req.url).searchParams.get('force') === '1'

  if (!config.alerta_nao_finalizada_ativo) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      message: 'Alerta de corrida não finalizada está desativado nas configurações.',
    })
  }

  if (!force && horaBrasilia() !== config.alerta_hora_local) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      message: `Fora do horário configurado (agora ${horaBrasilia()}h BRT, configurado para ${config.alerta_hora_local}h).`,
    })
  }

  const nowIso = new Date().toISOString()

  // Pega qualquer reserva ainda em aberto (confirmada OU em andamento) cujo
  // retorno previsto já passou e que ainda não foi finalizada/cancelada — ou
  // seja, o sistema não identificou a finalização da corrida. Inclui as que
  // nunca foram "iniciadas" mas já deveriam ter sido concluídas.
  const { data: rows, error: reservasError } = await supabase
    .from('reservas')
    .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
    .in('status', ['confirmada', 'em_andamento'])
    .lt('data_retorno_prevista', nowIso)
    .eq('alerta_nao_finalizada_enviado', false)

  if (reservasError) {
    console.error('[cron] fetch reservas error:', reservasError.message)
    return NextResponse.json({ error: reservasError.message }, { status: 500 })
  }

  const reservas = (rows ?? []) as ReservaComDetalhes[]
  if (reservas.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      message: 'Nenhuma reserva em atraso.',
    })
  }

  const { data: gestoresData } = await supabase
    .from('usuarios')
    .select('email')
    .eq('papel', 'gestor')
    .eq('ativo', true)

  const gestores = ((gestoresData ?? []) as { email: string }[]).filter((g) => !!g.email)

  const results: { id: string; ok: boolean; error?: string }[] = []

  for (const reserva of reservas) {
    try {
      await sendAlertaNaoFinalizadaEmail(reserva, gestores)

      const { error: updateError } = await supabase
        .from('reservas')
        .update({
          alerta_nao_finalizada_enviado: true,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', reserva.id)

      if (updateError) {
        console.error(`[cron] update reserva ${reserva.id} error:`, updateError.message)
        results.push({ id: reserva.id, ok: false, error: updateError.message })
        continue
      }

      console.log(`[cron] alerta enviado para reserva ${reserva.id}`)
      results.push({ id: reserva.id, ok: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[cron] falha em reserva ${reserva.id}:`, msg)
      results.push({ id: reserva.id, ok: false, error: msg })
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  })
}
