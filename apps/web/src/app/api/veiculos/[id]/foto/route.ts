import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, requireGestor } from '@/lib/api-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 4 * 1024 * 1024 // 4 MB — foto de carro pode ser maior que avatar
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * POST /api/veiculos/[id]/foto — gestor faz upload de uma foto pro veículo.
 * Multipart com campo "file". Retorna { foto_url, veiculo }.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const gestorErr = requireGestor(auth.user)
  if (gestorErr) return gestorErr

  const { id } = await params

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
    return NextResponse.json({ error: 'Arquivo muito grande (máximo 4 MB)' }, { status: 400 })
  }

  const contentType = file.type || 'image/jpeg'
  const ext = ALLOWED[contentType]
  if (!ext) {
    return NextResponse.json(
      { error: 'Formato não suportado. Use PNG, JPG ou WebP.' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Verifica que o veículo existe (e pega foto antiga pra remover)
  const { data: veiculoAtual, error: fetchError } = await supabase
    .from('veiculos')
    .select('id, foto_url')
    .eq('id', id)
    .single()

  if (fetchError || !veiculoAtual) {
    return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
  }

  const path = `${id}/foto-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('veiculos')
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
  } = supabase.storage.from('veiculos').getPublicUrl(path)

  // Update veículo com a URL nova
  const { data: updated, error: updateError } = await supabase
    .from('veiculos')
    .update({ foto_url: publicUrl, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Best-effort: remove foto anterior do storage pra não acumular lixo.
  // Só remove se a antiga estava no mesmo bucket "veiculos" — não tenta
  // mexer em URLs externas que podem ter sido cadastradas via campo de URL.
  if (veiculoAtual.foto_url && veiculoAtual.foto_url.includes('/veiculos/')) {
    try {
      const oldPath = veiculoAtual.foto_url.split('/veiculos/')[1]
      if (oldPath && oldPath !== path) {
        await supabase.storage.from('veiculos').remove([oldPath])
      }
    } catch (e) {
      console.warn('[veiculos/foto] could not remove old photo:', e)
    }
  }

  return NextResponse.json({ foto_url: publicUrl, veiculo: updated })
}

/**
 * DELETE /api/veiculos/[id]/foto — remove a foto atual do veículo.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(req)
  if (auth.response) return auth.response
  const gestorErr = requireGestor(auth.user)
  if (gestorErr) return gestorErr

  const { id } = await params
  const supabase = createAdminClient()

  const { data: veiculoAtual } = await supabase
    .from('veiculos')
    .select('foto_url')
    .eq('id', id)
    .single()

  if (veiculoAtual?.foto_url && veiculoAtual.foto_url.includes('/veiculos/')) {
    try {
      const oldPath = veiculoAtual.foto_url.split('/veiculos/')[1]
      if (oldPath) {
        await supabase.storage.from('veiculos').remove([oldPath])
      }
    } catch (e) {
      console.warn('[veiculos/foto] could not remove storage object:', e)
    }
  }

  const { data: updated, error } = await supabase
    .from('veiculos')
    .update({ foto_url: null, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ veiculo: updated })
}
