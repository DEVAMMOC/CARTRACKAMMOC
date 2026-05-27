'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CameraIcon } from 'lucide-react'
import { Usuario } from '@cartracking/types'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProfileFormProps {
  usuario: Usuario
}

export function ProfileForm({ usuario }: ProfileFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [nome, setNome] = useState(usuario.nome)
  const [cargo, setCargo] = useState(usuario.cargo ?? '')
  const [telefone, setTelefone] = useState(usuario.telefone ?? '')
  const [avatarUrl, setAvatarUrl] = useState(usuario.avatar_url)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const initials =
    usuario.nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploading(true)
    setMessage(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const json = (await res.json()) as { avatar_url: string }
      setAvatarUrl(json.avatar_url)
      setMessage({ type: 'success', text: 'Foto de perfil atualizada.' })
      router.refresh()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao enviar foto',
      })
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (nome.trim().length < 2) {
      setMessage({ type: 'error', text: 'Nome deve ter pelo menos 2 caracteres.' })
      return
    }

    setSaving(true)
    try {
      await apiFetch('/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          nome: nome.trim(),
          cargo: cargo.trim(),
          telefone: telefone.trim(),
        }),
      })
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso.' })
      router.refresh()
    } catch (e: unknown) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Erro ao salvar perfil',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar section */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Alterar foto de perfil"
          className="relative w-20 h-20 rounded-full overflow-hidden flex items-center justify-center group flex-shrink-0 ring-2 ring-border hover:ring-primary/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed bg-primary text-primary-foreground"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={usuario.nome}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-semibold">{initials}</span>
          )}
          <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            {uploading ? (
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <CameraIcon className="w-5 h-5 text-white" aria-hidden />
            )}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Foto de perfil</span>
          <span className="text-xs text-muted-foreground">
            PNG, JPG, WebP ou GIF. Máximo 2 MB.
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-1 w-fit"
          >
            {uploading ? 'Enviando...' : 'Alterar foto'}
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={usuario.email}
            disabled
            className="h-10 bg-muted/50"
          />
          <p className="text-xs text-muted-foreground">Email não pode ser alterado.</p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="nome">Nome completo *</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={saving}
            required
            className="h-10"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="cargo">Cargo</Label>
          <Input
            id="cargo"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            disabled={saving}
            placeholder="Ex: Coordenador de Frotas"
            className="h-10"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            disabled={saving}
            placeholder="(49) 99999-9999"
            className="h-10"
          />
        </div>
      </div>

      {message && (
        <p
          className={
            message.type === 'error'
              ? 'text-sm text-destructive'
              : 'text-sm text-primary'
          }
          role={message.type === 'error' ? 'alert' : undefined}
        >
          {message.text}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="h-10">
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
