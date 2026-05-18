'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Usuario } from '@cartracking/types'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProfileFormProps {
  usuario: Usuario
}

export function ProfileForm({ usuario }: ProfileFormProps) {
  const router = useRouter()
  const [nome, setNome] = useState(usuario.nome)
  const [cargo, setCargo] = useState(usuario.cargo ?? '')
  const [telefone, setTelefone] = useState(usuario.telefone ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={usuario.email}
            disabled
            className="h-10 bg-gray-50"
          />
          <p className="text-xs text-gray-500">Email não pode ser alterado.</p>
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
              : 'text-sm text-green-600'
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
