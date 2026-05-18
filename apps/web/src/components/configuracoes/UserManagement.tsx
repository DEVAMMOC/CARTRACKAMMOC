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
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
            className="h-14 rounded-lg bg-gray-100 animate-pulse"
            aria-hidden
          />
        ))}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <p className="text-sm text-gray-500 px-2 py-6 text-center">
        Nenhum usuário encontrado.
      </p>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Papel</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const isAdmin = u.papel === 'gestor'
              const isSelf = u.id === currentUserId
              return (
                <tr
                  key={u.id}
                  className={`border-b border-gray-100 last:border-0 ${
                    i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                  }`}
                >
                  <td className="px-4 py-3 text-gray-800 font-medium">
                    {u.nome}
                    {isSelf && (
                      <span className="ml-2 text-xs text-gray-400">(você)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                        isAdmin
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
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
              className="rounded-xl border border-gray-200 bg-white p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">
                    {u.nome}
                    {isSelf && (
                      <span className="ml-2 text-xs text-gray-400 font-normal">(você)</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{u.email}</div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border whitespace-nowrap ${
                    isAdmin
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
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
