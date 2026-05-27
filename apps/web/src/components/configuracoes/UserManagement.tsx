'use client'
import { useEffect, useState } from 'react'
import { Usuario } from '@cartracking/types'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'

interface UserManagementProps {
  currentUserId: string
}

export function UserManagement({ currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState<Usuario[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

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

  async function toggleRole(u: Usuario) {
    const next = u.papel === 'gestor' ? 'funcionario' : 'gestor'
    const action = next === 'gestor' ? 'promover a Administrador' : 'remover Administrador'
    if (!window.confirm(`Tem certeza que deseja ${action} de ${u.nome}?`)) return

    setPendingId(u.id)
    try {
      const updated = await apiFetch<Usuario>(`/admin/users/${u.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ papel: next }),
      })
      setUsers((prev) =>
        prev ? prev.map((x) => (x.id === u.id ? { ...x, papel: updated.papel } : x)) : prev
      )
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao alterar papel')
    } finally {
      setPendingId(null)
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
        {error}
      </div>
    )
  }

  if (!users) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-14 rounded-lg bg-muted animate-pulse"
            aria-hidden
          />
        ))}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-2 py-6 text-center">
        Nenhum usuário encontrado.
      </p>
    )
  }

  return (
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
                <tr
                  key={u.id}
                  className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/30'}`}
                >
                  <td className="px-4 py-3 text-foreground font-medium">
                    {u.nome}
                    {isSelf && (
                      <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground/80">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={isAdmin ? 'badge-info' : 'badge-muted'}>
                      {isAdmin ? 'Administrador' : 'Usuário'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pendingId === u.id || (isSelf && isAdmin)}
                      onClick={() => toggleRole(u)}
                    >
                      {pendingId === u.id
                        ? 'Salvando...'
                        : isAdmin
                        ? 'Remover admin'
                        : 'Promover a admin'}
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
            <li
              key={u.id}
              className="rounded-xl border border-border bg-card text-card-foreground p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground truncate">
                    {u.nome}
                    {isSelf && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">(você)</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
                <span className={isAdmin ? 'badge-info' : 'badge-muted'}>
                  {isAdmin ? 'Admin' : 'Usuário'}
                </span>
              </div>
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={pendingId === u.id || (isSelf && isAdmin)}
                  onClick={() => toggleRole(u)}
                >
                  {pendingId === u.id
                    ? 'Salvando...'
                    : isAdmin
                    ? 'Remover admin'
                    : 'Promover a admin'}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
