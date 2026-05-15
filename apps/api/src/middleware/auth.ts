import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'
import { Usuario } from '@cartracking/types'

export interface AuthRequest extends Request {
  user?: Usuario
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    res.status(401).json({ error: 'Token obrigatório' })
    return
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    res.status(401).json({ error: 'Token inválido' })
    return
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!usuario || !usuario.ativo) {
    res.status(403).json({ error: 'Usuário inativo ou não encontrado' })
    return
  }

  req.user = usuario
  next()
}

export function requireGestor(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.papel !== 'gestor') {
    res.status(403).json({ error: 'Acesso restrito a gestores' })
    return
  }
  next()
}
