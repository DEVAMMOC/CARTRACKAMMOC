import { Resend } from 'resend'
import { ReservaComDetalhes } from '@cartracking/types'
import { supabase } from '../lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)
const WEB_URL = process.env.WEB_URL || 'http://localhost:3000'
const FROM_EMAIL = 'AMMOC Frotas <frotas@ammoc.org.br>'

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

function confirmacaoHtml(reserva: ReservaComDetalhes): string {
  const { veiculo, usuario } = reserva
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1e40af; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 20px;">✅ Reserva Confirmada</h1>
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
      <a href="${WEB_URL}/reservas"
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

function alertaHtml(reserva: ReservaComDetalhes): string {
  const { veiculo, usuario } = reserva
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #dc2626; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 20px;">⚠️ Viagem Não Finalizada</h1>
  </div>
  <div style="background: #fef2f2; padding: 24px; border: 1px solid #fecaca; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="color: #374151;">A viagem de <strong>${usuario.nome}</strong> ainda não foi encerrada no sistema.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; color: #6b7280; font-size: 14px;">Funcionário</td>
        <td style="padding: 8px; color: #111827; font-weight: 600;">${usuario.nome}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; color: #6b7280; font-size: 14px;">Veículo</td>
        <td style="padding: 8px; color: #111827;">${veiculo.modelo} (${veiculo.placa})</td>
      </tr>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; color: #6b7280; font-size: 14px;">Retorno previsto</td>
        <td style="padding: 8px; color: #dc2626; font-weight: 600;">${formatDate(reserva.data_retorno_prevista)}</td>
      </tr>
      <tr>
        <td style="padding: 8px; color: #6b7280; font-size: 14px;">Destino</td>
        <td style="padding: 8px; color: #111827;">${reserva.destino}</td>
      </tr>
    </table>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${WEB_URL}/reservas/${reserva.id}/finalizar"
         style="background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
        Finalizar viagem agora
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
  await supabase.from('notificacoes_email').insert({
    reserva_id,
    tipo,
    destinatario,
    sucesso,
    erro: erro ?? null,
  })
}

export async function sendConfirmacaoEmail(reserva: ReservaComDetalhes): Promise<void> {
  const { usuario } = reserva
  const subject = `✅ Reserva confirmada — ${reserva.veiculo.modelo} ${reserva.veiculo.placa} - ${formatDate(reserva.data_saida)}`

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: usuario.email,
    subject,
    html: confirmacaoHtml(reserva),
  })

  await logNotificacao(reserva.id, 'confirmacao', usuario.email, !error, error?.message)

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }
}

export async function sendAlertaNaoFinalizadaEmail(
  reserva: ReservaComDetalhes,
  gestores: { email: string }[]
): Promise<void> {
  const { usuario } = reserva
  const subject = `⚠️ Viagem não finalizada — ${reserva.veiculo.modelo} — ${usuario.nome}`
  const destinatarios = [usuario.email, ...gestores.map(g => g.email)]

  for (const email of destinatarios) {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: alertaHtml(reserva),
    })
    await logNotificacao(reserva.id, 'alerta_nao_finalizada', email, !error, error?.message)
  }
}
