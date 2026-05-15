import cron from 'node-cron'
import { supabase } from '../lib/supabase'
import { sendAlertaNaoFinalizadaEmail } from './email'

export function initCron(): void {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log(`[cron] ${new Date().toISOString()} — checking for non-finalized trips...`)

    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

      const { data: reservas, error: reservasError } = await supabase
        .from('reservas')
        .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
        .in('status', ['confirmada', 'em_andamento'])
        .lt('data_retorno_prevista', twoHoursAgo)
        .eq('alerta_nao_finalizada_enviado', false)

      if (reservasError) {
        console.error('[cron] Error fetching overdue trips:', reservasError.message)
        return
      }

      if (!reservas || reservas.length === 0) {
        console.log('[cron] No overdue trips found.')
        return
      }

      console.log(`[cron] Found ${reservas.length} overdue trip(s).`)

      const { data: gestores, error: gestoresError } = await supabase
        .from('usuarios')
        .select('email')
        .eq('papel', 'gestor')
        .eq('ativo', true)

      if (gestoresError) {
        console.error('[cron] Error fetching gestores:', gestoresError.message)
      }

      for (const reserva of reservas) {
        try {
          await sendAlertaNaoFinalizadaEmail(reserva, gestores ?? [])

          await supabase
            .from('reservas')
            .update({ alerta_nao_finalizada_enviado: true, atualizado_em: new Date().toISOString() })
            .eq('id', reserva.id)

          console.log(`[cron] Alert sent for reserva ${reserva.id} (${reserva.usuario?.nome})`)
        } catch (err) {
          console.error(`[cron] Failed to send alert for reserva ${reserva.id}:`, err)
        }
      }
    } catch (err) {
      console.error('[cron] Unexpected error:', err)
    }
  })

  console.log('[cron] Non-finalization alert job scheduled (every 15 minutes)')
}
