import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireApiKey } from '@/lib/api-key'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/export/veiculos
 * Returns ALL vehicles (active + inactive) for external consumption.
 * Auth: X-API-Key header.
 */
export async function GET(req: Request) {
  const authErr = requireApiKey(req)
  if (authErr) return authErr

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('veiculos')
    .select('*')
    .order('modelo')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    count: data?.length ?? 0,
    data: data ?? [],
  })
}
