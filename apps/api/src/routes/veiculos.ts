import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth, requireGestor, AuthRequest } from '../middleware/auth'
import { CriarVeiculoInput } from '@cartracking/types'

export const veiculosRouter = Router()

// GET /veiculos — list active vehicles (any authenticated user)
veiculosRouter.get('/', requireAuth, async (_req, res) => {
  const { data, error } = await supabase
    .from('veiculos')
    .select('*')
    .eq('ativo', true)
    .order('modelo')

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

// GET /veiculos/todos — list all vehicles including inactive (gestor only)
veiculosRouter.get('/todos', requireAuth, requireGestor, async (_req, res) => {
  const { data, error } = await supabase
    .from('veiculos')
    .select('*')
    .order('modelo')

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

// POST /veiculos — create vehicle (gestor only)
veiculosRouter.post('/', requireAuth, requireGestor, async (req, res) => {
  const body: CriarVeiculoInput = req.body

  if (!body.placa || !body.modelo || !body.ano || !body.tipo) {
    res.status(400).json({ error: 'placa, modelo, ano e tipo são obrigatórios' }); return
  }

  const { data, error } = await supabase
    .from('veiculos')
    .insert(body)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Placa já cadastrada' }); return
    }
    res.status(500).json({ error: error.message }); return
  }
  res.status(201).json(data)
})

// PATCH /veiculos/:id — update vehicle (gestor only)
veiculosRouter.patch('/:id', requireAuth, requireGestor, async (req: AuthRequest, res) => {
  const { id } = req.params
  const updates = { ...req.body, atualizado_em: new Date().toISOString() }

  // Don't allow changing id
  delete updates.id

  const { data, error } = await supabase
    .from('veiculos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      res.status(404).json({ error: 'Veículo não encontrado' }); return
    }
    res.status(500).json({ error: error.message }); return
  }
  res.json(data)
})
