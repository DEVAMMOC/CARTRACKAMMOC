import { Request, Response, NextFunction } from 'express'
export interface AuthRequest extends Request { user?: any }
export async function requireAuth(_req: AuthRequest, _res: Response, next: NextFunction) { next() }
export function requireGestor(_req: AuthRequest, _res: Response, next: NextFunction) { next() }
