import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth, requireGestor, AuthRequest } from '../middleware/auth'
import { CriarReservaInput, FinalizarViagemInput } from '@cartracking/types'
import { sendConfirmacaoEmail } from '../services/email'

export const reservasRouter = Router()

// GET /reservas — funcionario sees own; gestor sees all
reservasRouter.get('/', requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!
  let query = supabase
    .from('reservas')
    .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
    .order('data_saida', { ascending: false })

  if (user.papel === 'funcionario') {
    query = query.eq('usuario_id', user.id)
  }

  const { data, error } = await query
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

// POST /reservas — create with availability check
reservasRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!
  const body: CriarReservaInput = req.body

  if (!body.veiculo_id || !body.data_saida || !body.data_retorno_prevista || !body.destino || !body.servico) {
    res.status(400).json({ error: 'veiculo_id, data_saida, data_retorno_prevista, destino e servico são obrigatórios' })
    return
  }

  if (new Date(body.data_retorno_prevista) <= new Date(body.data_saida)) {
    res.status(400).json({ error: 'data_retorno_prevista deve ser posterior à data_saida' })
    return
  }

  // Check availability (overlap: existing.start < requested.end AND existing.end > requested.start)
  const { data: conflicts } = await supabase
    .from('reservas')
    .select('id')
    .eq('veiculo_id', body.veiculo_id)
    .not('status', 'in', '("cancelada","finalizada")')
    .lt('data_saida', body.data_retorno_prevista)
    .gt('data_retorno_prevista', body.data_saida)
    .limit(1)

  if (conflicts && conflicts.length > 0) {
    res.status(409).json({ error: 'Veículo não disponível no período solicitado' })
    return
  }

  // Snapshot current vehicle km for km_saida
  const { data: veiculo } = await supabase
    .from('veiculos')
    .select('km_atual, modelo, placa')
    .eq('id', body.veiculo_id)
    .single()

  if (!veiculo) {
    res.status(404).json({ error: 'Veículo não encontrado' }); return
  }

  const { data, error } = await supabase
    .from('reservas')
    .insert({
      ...body,
      usuario_id: user.id,
      km_saida: veiculo.km_atual,
      status: 'confirmada',
    })
    .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
    .single()

  if (error) { res.status(500).json({ error: error.message }); return }

  // Send confirmation email non-blocking
  sendConfirmacaoEmail(data).catch((err: unknown) => console.error('[email] Confirmation failed:', err))

  res.status(201).json(data)
})

// PATCH /reservas/:id/iniciar — mark as em_andamento
reservasRouter.patch('/:id/iniciar', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params
  const user = req.user!

  const { data: reserva } = await supabase
    .from('reservas')
    .select('usuario_id, status')
    .eq('id', id)
    .single()

  if (!reserva) { res.status(404).json({ error: 'Reserva não encontrada' }); return }
  if (reserva.usuario_id !== user.id && user.papel !== 'gestor') {
    res.status(403).json({ error: 'Sem permissão' }); return
  }
  if (reserva.status !== 'confirmada') {
    res.status(400).json({ error: `Reserva está com status '${reserva.status}', esperado 'confirmada'` }); return
  }

  const { data, error } = await supabase
    .from('reservas')
    .update({ status: 'em_andamento', atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

// PATCH /reservas/:id/finalizar — finalize trip with km_retorno
reservasRouter.patch('/:id/finalizar', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params
  const user = req.user!
  const body: FinalizarViagemInput = req.body

  if (!body.km_retorno || body.km_retorno <= 0) {
    res.status(400).json({ error: 'km_retorno é obrigatório e deve ser positivo' }); return
  }

  const { data: reserva } = await supabase
    .from('reservas')
    .select('usuario_id, status, veiculo_id, km_saida')
    .eq('id', id)
    .single()

  if (!reserva) { res.status(404).json({ error: 'Reserva não encontrada' }); return }
  if (reserva.usuario_id !== user.id && user.papel !== 'gestor') {
    res.status(403).json({ error: 'Sem permissão' }); return
  }
  if (reserva.status === 'finalizada') {
    res.status(400).json({ error: 'Viagem já finalizada' }); return
  }
  if (reserva.status === 'cancelada') {
    res.status(400).json({ error: 'Reserva cancelada não pode ser finalizada' }); return
  }
  if (reserva.km_saida !== null && body.km_retorno < reserva.km_saida) {
    res.status(400).json({ error: `KM de retorno (${body.km_retorno}) menor que KM de saída (${reserva.km_saida})` }); return
  }

  const { data, error } = await supabase
    .from('reservas')
    .update({
      status: 'finalizada',
      km_retorno: body.km_retorno,
      observacoes: body.observacoes ?? null,
      data_retorno_real: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) { res.status(500).json({ error: error.message }); return }

  // Update vehicle's current km
  await supabase
    .from('veiculos')
    .update({ km_atual: body.km_retorno, atualizado_em: new Date().toISOString() })
    .eq('id', reserva.veiculo_id)

  res.json(data)
})

// DELETE /reservas/:id — cancel
reservasRouter.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params
  const user = req.user!

  const { data: reserva } = await supabase
    .from('reservas')
    .select('usuario_id, status')
    .eq('id', id)
    .single()

  if (!reserva) { res.status(404).json({ error: 'Reserva não encontrada' }); return }
  if (reserva.usuario_id !== user.id && user.papel !== 'gestor') {
    res.status(403).json({ error: 'Sem permissão' }); return
  }
  if (reserva.status === 'finalizada') {
    res.status(400).json({ error: 'Não é possível cancelar uma viagem finalizada' }); return
  }

  const { error } = await supabase
    .from('reservas')
    .update({ status: 'cancelada', atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ ok: true })
})
