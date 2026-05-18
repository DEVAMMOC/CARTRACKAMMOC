import { Resend } from 'resend'
import type { ReservaComDetalhes } from '@cartracking/types'
import { createAdminClient } from './supabase/admin'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AMMOC Frotas <frotas@ammoc.org.br>'

function getWebUrl(): string {
  return (
    process.env.WEB_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000')
  )
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function confirmacaoHtml(reserva: ReservaComDetalhes, webUrl: string): string {
  const { veiculo, usuario } = reserva
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1e40af; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 20px;">Reserva Confirmada</h1>
  </div>
  <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="color: #374151;">Olá, <strong>${usuario.nome}</strong>!</p>
    <p style="color: #374151;">Sua reserva foi confirmada com sucesso.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; color: #6b7280; font-size: 14px;">Veículo</td>
        <td style="padding: 8px; color: #111827; font-weight: 600;">${veiculo.modelo} (${veiculo.placa})</td>
      </tr>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; color: #6b7280; font-size: 14px;">Tipo</td>
        <td style="padding: 8px; color: #111827;">${veiculo.tipo}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; color: #6b7280; font-size: 14px;">Saída</td>
        <td style="padding: 8px; color: #111827;">${formatDate(reserva.data_saida)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; color: #6b7280; font-size: 14px;">Retorno previsto</td>
        <td style="padding: 8px; color: #111827;">${formatDate(reserva.data_retorno_prevista)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; color: #6b7280; font-size: 14px;">Destino</td>
        <td style="padding: 8px; color: #111827;">${reserva.destino}</td>
      </tr>
      <tr>
        <td style="padding: 8px; color: #6b7280; font-size: 14px;">Serviço</td>
        <td style="padding: 8px; color: #111827;">${reserva.servico}</td>
      </tr>
    </table>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${webUrl}/reservas"
         style="background: #1e40af; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
        Ver minha reserva
      </a>
    </div>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; text-align: center;">
      AMMOC — Sistema de Gestão de Frotas
    </p>
  </div>
</body>
</html>`
}

async function logNotificacao(
  reserva_id: string,
  tipo: 'confirmacao' | 'alerta_nao_finalizada',
  destinatario: string,
  sucesso: boolean,
  erro?: string
) {
  try {
    await createAdminClient().from('notificacoes_email').insert({
      reserva_id,
      tipo,
      destinatario,
      sucesso,
      erro: erro ?? null,
    })
  } catch (e) {
    console.error('[email] failed to log notification:', e)
  }
}

export async function sendConfirmacaoEmail(reserva: ReservaComDetalhes): Promise<void> {
  const resend = getResend()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping confirmation email')
    return
  }

  const { usuario } = reserva
  const subject = `Reserva confirmada — ${reserva.veiculo.modelo} ${reserva.veiculo.placa} - ${formatDate(reserva.data_saida)}`

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: usuario.email,
    subject,
    html: confirmacaoHtml(reserva, getWebUrl()),
  })

  await logNotificacao(reserva.id, 'confirmacao', usuario.email, !error, error?.message)

  if (error) throw new Error(`Resend error: ${error.message}`)
}

function alertaHtml(reserva: ReservaComDetalhes, webUrl: string): string {
  const { veiculo, usuario } = reserva
  const finalizarUrl = `${webUrl}/reservas/${reserva.id}/finalizar`
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
  <div style="background: #1D3557; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 20px;">Viagem não finalizada</h1>
  </div>
  <div style="background: #F8F9FA; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="color: #1D3557; margin: 0 0 12px 0;">Olá, <strong>${usuario.nome}</strong>.</p>
    <p style="color: #374151; margin: 0 0 16px 0;">
      A reserva abaixo passou da data prevista de retorno e ainda não foi finalizada no sistema. Conclua a viagem informando o KM final.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px;">
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 12px; color: #6b7280; font-size: 14px; width: 40%;">Veículo</td>
        <td style="padding: 10px 12px; color: #1D3557; font-weight: 600;">${veiculo.modelo} (${veiculo.placa})</td>
      </tr>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 12px; color: #6b7280; font-size: 14px;">Destino</td>
        <td style="padding: 10px 12px; color: #1D3557;">${reserva.destino}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 12px; color: #6b7280; font-size: 14px;">Saída</td>
        <td style="padding: 10px 12px; color: #1D3557;">${formatDate(reserva.data_saida)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; color: #6b7280; font-size: 14px;">Retorno previsto</td>
        <td style="padding: 10px 12px; color: #b91c1c; font-weight: 600;">${formatDate(reserva.data_retorno_prevista)}</td>
      </tr>
    </table>
    <div style="text-align: center; margin: 28px 0 12px;">
      <a href="${finalizarUrl}"
         style="background: #2D6A4F; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
        Finalizar corrida agora →
      </a>
    </div>
    <p style="color: #6b7280; font-size: 13px; margin: 12px 0 0; text-align: center;">
      Ou copie o link: <a href="${finalizarUrl}" style="color: #2D6A4F;">${finalizarUrl}</a>
    </p>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; text-align: center;">
      AMMOC — Sistema de Gestão de Frotas
    </p>
  </div>
</body>
</html>`
}

export async function sendAlertaNaoFinalizadaEmail(
  reserva: ReservaComDetalhes,
  gestores: { email: string }[]
): Promise<void> {
  const resend = getResend()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping alert email')
    return
  }

  const { usuario } = reserva
  const subject = `Viagem não finalizada — ${reserva.veiculo.modelo} ${reserva.veiculo.placa} — ${usuario.nome}`
  const webUrl = getWebUrl()
  const html = alertaHtml(reserva, webUrl)

  const destinatarios = Array.from(
    new Set([usuario.email, ...gestores.map((g) => g.email)].filter(Boolean))
  )

  for (const email of destinatarios) {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
    })
    await logNotificacao(reserva.id, 'alerta_nao_finalizada', email, !error, error?.message)
    if (error) {
      console.error(`[email] alerta para ${email} falhou:`, error.message)
    }
  }
}
