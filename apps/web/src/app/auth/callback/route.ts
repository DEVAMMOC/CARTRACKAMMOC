import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  // Atrás do proxy reverso (Hostinger/Coolify), o `origin` de request.url é o
  // endereço interno (localhost:3000), não o domínio público. Por isso o
  // redirect pós-login caía em localhost. Preferimos o host encaminhado pelo
  // proxy para que o usuário volte para o domínio real.
  const hdrs = await headers()
  const forwardedHost = hdrs.get('x-forwarded-host')
  const forwardedProto = hdrs.get('x-forwarded-proto') ?? 'https'
  const baseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cs) {
            cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const destination = type === 'recovery' ? '/auth/nova-senha' : '/'
      return NextResponse.redirect(`${baseUrl}${destination}`)
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth_failed`)
}
