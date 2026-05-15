import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'

export const disponibilidadeRouter = Router()

// GET /disponibilidade?veiculo_id=X&inicio=ISO&fim=ISO
disponibilidadeRouter.get('/', requireAuth, async (req, res) => {
  const { veiculo_id, inicio, fim } = req.query as Record<string, string>

  if (!veiculo_id || !inicio || !fim) {
    res.status(400).json({ error: 'veiculo_id, inicio e fim são obrigatórios' })
    return
  }

  // Check for overlapping reservations (that are not cancelled/finalised)
  // Overlap condition: existing.start < requested.end AND existing.end > requested.start
  const { data, error } = await supabase
    .from('reservas')
    .select('id')
    .eq('veiculo_id', veiculo_id)
    .not('status', 'in', '("cancelada","finalizada")')
    .lt('data_saida', fim)
    .gt('data_retorno_prevista', inicio)
    .limit(1)

  if (error) { res.status(500).json({ error: error.message }); return }

  res.json({ disponivel: data.length === 0 })
})
