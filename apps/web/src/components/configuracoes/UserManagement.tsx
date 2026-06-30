'use client'
import { useEffect, useState } from 'react'
import { Usuario } from '@cartracking/types'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UserManagementProps {
  currentUserId: string
}

function CriarUsuarioForm({ onCreated }: { onCreated: (u: Usuario) => void }) {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [papel, setPapel] = useState<'funcionario' | 'gestor'>('funcionario')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOk(null)
    setSalvando(true)
    try {
      const novo = await apiFetch<Usuario>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({ nome, email, senha, papel }),
      })
      onCreated(novo)
      setOk(`Usuário "${novo.nome}" criado. Login: ${novo.email}`)
      setNome('')
      setEmail('')
      setSenha('')
      setPapel('funcionario')
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar usuário')
    } finally {
      setSalvando(false)
    }
  }

  if (!aberto) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-card/50 p-4">
        <p className="text-sm text-muted-foreground">
          Crie um login com senha para quem não tem e-mail da AMMOC.
        </p>
        <Button size="sm" onClick={() => setAberto(true)}>
          + Criar usuário
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={criar}
      className="rounded-xl border border-border bg-card text-card-foreground p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Novo usuário</h3>
        <button
          type="button"
          onClick={() => {
            setAberto(false)
            setErro(null)
            setOk(null)
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Fechar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="novo-nome">Nome</Label>
          <Input id="novo-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" required disabled={salvando} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="novo-email">E-mail (login)</Label>
          <Input id="novo-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ex.: joao@frotas.local" required disabled={salvando} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="novo-senha">Senha</Label>
          <Input id="novo-senha" type="text" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mínimo 6 caracteres" required disabled={salvando} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="novo-papel">Papel</Label>
          <select
            id="novo-papel"
            value={papel}
            onChange={(e) => setPapel(e.target.value as 'funcionario' | 'gestor')}
            disabled={salvando}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="funcionario">Usuário</option>
            <option value="gestor">Administrador</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        O e-mail é só o identificador de login (pode ser pessoal ou inventado). A pessoa entra com
        esse e-mail e a senha — sem precisar de e-mail da AMMOC nem confirmação.
      </p>

      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 px-3 py-2 text-sm">{erro}</div>
      )}
      {ok && (
        <div className="rounded-lg border border-green-200 bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900 px-3 py-2 text-sm">{ok}</div>
      )}

      <Button type="submit" disabled={salvando}>
        {salvando ? 'Criando...' : 'Criar usuário'}
      </Button>
    </form>
  )
}

function EditarUsuarioModal({
  usuario,
  currentUserId,
  onClose,
  onUpdated,
  onDeleted,
}: {
  usuario: Usuario
  currentUserId: string
  onClose: () => void
  onUpdated: (u: Usuario) => void
  onDeleted: (id: string) => void
}) {
  const [nome, setNome] = useState(usuario.nome)
  const [email, setEmail] = useState(usuario.email)
  const [papel, setPapel] = useState<'funcionario' | 'gestor'>(
    usuario.papel === 'gestor' ? 'gestor' : 'funcionario'
  )
  const [novaSenha, setNovaSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const isSelf = usuario.id === currentUserId

  async function salvar() {
    setErro(null)
    setOk(null)
    setSalvando(true)
    try {
      const patch: Record<string, unknown> = {}
      if (nome.trim() !== usuario.nome) patch.nome = nome.trim()
      if (email.trim().toLowerCase() !== usuario.email) patch.email = email.trim().toLowerCase()
      if (papel !== usuario.papel) patch.papel = papel

      let atualizado = usuario
      if (Object.keys(patch).length > 0) {
        atualizado = await apiFetch<Usuario>(`/admin/users/${usuario.id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        })
      }
      if (novaSenha) {
        await apiFetch(`/admin/users/${usuario.id}/senha`, {
          method: 'PATCH',
          body: JSON.stringify({ senha: novaSenha }),
        })
      }
      onUpdated(atualizado)
      setNovaSenha('')
      setOk('Alterações salvas.')
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!window.confirm(`Excluir o usuário "${usuario.nome}"? Ele perde o acesso ao sistema.`)) return
    setErro(null)
    setExcluindo(true)
    try {
      await apiFetch(`/admin/users/${usuario.id}`, { method: 'DELETE' })
      onDeleted(usuario.id)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir')
      setExcluindo(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Editar usuário</h3>
          <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
            Fechar
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-nome">Nome</Label>
            <Input id="edit-nome" value={nome} onChange={(e) => setNome(e.target.value)} disabled={salvando || excluindo} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-email">E-mail (login)</Label>
            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={salvando || excluindo} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-papel">Papel</Label>
            <select
              id="edit-papel"
              value={papel}
              onChange={(e) => setPapel(e.target.value as 'funcionario' | 'gestor')}
              disabled={salvando || excluindo || (isSelf && papel === 'gestor')}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
            >
              <option value="funcionario">Usuário</option>
              <option value="gestor">Administrador</option>
            </select>
            {isSelf && (
              <p className="text-xs text-muted-foreground">Você não pode remover seu próprio acesso de admin.</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-senha">Nova senha</Label>
            <Input
              id="edit-senha"
              type="text"
              autoComplete="new-password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="deixe em branco para não alterar"
              disabled={salvando || excluindo}
            />
          </div>
        </div>

        {erro && (
          <div className="rounded-lg border border-red-200 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 px-3 py-2 text-sm">{erro}</div>
        )}
        {ok && (
          <div className="rounded-lg border border-green-200 bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900 px-3 py-2 text-sm">{ok}</div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="destructive" size="sm" onClick={excluir} disabled={salvando || excluindo || isSelf}>
            {excluindo ? 'Excluindo...' : 'Excluir'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={salvando || excluindo}>
              Fechar
            </Button>
            <Button size="sm" onClick={salvar} disabled={salvando || excluindo}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function UserManagement({ currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState<Usuario[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<Usuario | null>(null)

  useEffect(() => {
    let alive = true
    apiFetch<Usuario[]>('/admin/users')
      .then((data) => {
        if (alive) setUsers(data)
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : 'Erro ao carregar usuários')
      })
    return () => {
      alive = false
    }
  }, [])

  function handleCreated(novo: Usuario) {
    setUsers((prev) => {
      const semDup = (prev ?? []).filter((u) => u.id !== novo.id)
      return [...semDup, novo].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    })
  }

  function handleUpdated(u: Usuario) {
    setUsers((prev) =>
      prev
        ? prev
            .map((x) => (x.id === u.id ? { ...x, ...u } : x))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        : prev
    )
    setEditando((cur) => (cur && cur.id === u.id ? { ...cur, ...u } : cur))
  }

  function handleDeleted(id: string) {
    setUsers((prev) => (prev ? prev.filter((u) => u.id !== id) : prev))
    setEditando(null)
  }

  let listContent: React.ReactNode
  if (error) {
    listContent = (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
        {error}
      </div>
    )
  } else if (!users) {
    listContent = (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" aria-hidden />
        ))}
      </div>
    )
  } else if (users.length === 0) {
    listContent = (
      <p className="text-sm text-muted-foreground px-2 py-6 text-center">Nenhum usuário encontrado.</p>
    )
  } else {
    listContent = (
      <>
        {/* Desktop table */}
        <div className="hidden sm:block rounded-xl border border-border bg-card text-card-foreground overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Papel</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const isAdmin = u.papel === 'gestor'
                const isSelf = u.id === currentUserId
                return (
                  <tr key={u.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/30'}`}>
                    <td className="px-4 py-3 text-foreground font-medium">
                      {u.nome}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={isAdmin ? 'badge-info' : 'badge-muted'}>
                        {isAdmin ? 'Administrador' : 'Usuário'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setEditando(u)}>
                        Editar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <ul className="sm:hidden space-y-2">
          {users.map((u) => {
            const isAdmin = u.papel === 'gestor'
            const isSelf = u.id === currentUserId
            return (
              <li key={u.id} className="rounded-xl border border-border bg-card text-card-foreground p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground truncate">
                      {u.nome}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground font-normal">(você)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                  <span className={isAdmin ? 'badge-info' : 'badge-muted'}>{isAdmin ? 'Admin' : 'Usuário'}</span>
                </div>
                <div className="mt-3">
                  <Button size="sm" variant="outline" className="w-full" onClick={() => setEditando(u)}>
                    Editar
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </>
    )
  }

  return (
    <div className="space-y-4">
      <CriarUsuarioForm onCreated={handleCreated} />
      {listContent}
      {editando && (
        <EditarUsuarioModal
          usuario={editando}
          currentUserId={currentUserId}
          onClose={() => setEditando(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
