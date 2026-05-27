import { NextResponse } from 'next/server'

/**
 * Validate the X-API-Key header against the EXPORT_API_KEY env var.
 * Returns a 401/500 NextResponse if invalid, or null if the request can proceed.
 *
 * Used by /api/v1/export/* routes — external consumers (Power BI, scripts,
 * sibling systems) authenticate with a static API key instead of a user session.
 */
export function requireApiKey(req: Request): NextResponse | null {
  const expected = process.env.EXPORT_API_KEY
  if (!expected) {
    return NextResponse.json(
      { error: 'EXPORT_API_KEY is not configured on the server' },
      { status: 500 }
    )
  }
  const provided = req.headers.get('x-api-key')
  if (!provided || provided !== expected) {
    return NextResponse.json(
      { error: 'Invalid or missing X-API-Key header' },
      { status: 401 }
    )
  }
  return null
}
