import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/api-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Body inválido (esperado multipart)' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: 'Arquivo obrigatório no campo "file"' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Arquivo muito grande (máximo 2 MB)' }, { status: 400 })
  }

  const contentType = file.type || 'image/jpeg'
  const ext = ALLOWED[contentType]
  if (!ext) {
    return NextResponse.json(
      { error: 'Formato não suportado. Use PNG, JPG, WebP ou GIF.' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const path = `${auth.user.id}/avatar-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, buffer, {
      contentType,
      upsert: true,
      cacheControl: '3600',
    })

  if (uploadError) {
    return NextResponse.json(
      { error: `Falha no upload: ${uploadError.message}` },
      { status: 500 }
    )
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(path)

  const { data, error: updateError } = await supabase
    .from('usuarios')
    .update({ avatar_url: publicUrl })
    .eq('id', auth.user.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ avatar_url: publicUrl, user: data })
}
