'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

interface Notificacao {
  id: string
  reserva_id: string
  tipo: 'confirmacao' | 'alerta_nao_finalizada'
  destinatario: string
  sucesso: boolean
  erro: string | null
  criado_em: string
}

const TIPO_LABELS: Record<Notificacao['tipo'], string> = {
  confirmacao: 'Confirmação',
  alerta_nao_finalizada: 'Alerta não finalizada',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificacoesClient() {
  const [items, setItems] = useState<Notificacao[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let alive = true
    apiFetch<Notificacao[]>('/admin/notificacoes')
      .then((data) => {
        if (alive) setItems(data)
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : 'Erro ao carregar notificações')
      })
    return () => {
      alive = false
    }
  }, [reloadKey])

  const total = items?.length ?? 0
  const falhas = items?.filter((n) => !n.sucesso).length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Notificações de email</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Últimas 100 tentativas de envio via Resend. Use isso pra diagnosticar emails que não chegaram.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="self-start sm:self-auto px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted transition-colors"
        >
          Atualizar
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!items && !error && (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" aria-hidden />
          ))}
        </div>
      )}

      {items && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          Nenhuma notificação registrada ainda. Crie uma reserva nova pra disparar o primeiro envio.
        </div>
      )}

      {items && items.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground mt-1">{total}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Sucesso</p>
              <p className="text-2xl font-bold text-foreground mt-1">{total - falhas}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 col-span-2 sm:col-span-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Falhas</p>
              <p
                className={`text-2xl font-bold mt-1 ${falhas > 0 ? 'text-destructive' : 'text-foreground'}`}
              >
                {falhas}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card text-card-foreground overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Quando</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Destinatário</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Erro</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n, i) => (
                  <tr
                    key={n.id}
                    className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/30'}`}
                  >
                    <td className="px-4 py-3 text-foreground/80 whitespace-nowrap">
                      {formatDate(n.criado_em)}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">{TIPO_LABELS[n.tipo]}</td>
                    <td className="px-4 py-3 text-foreground/80 font-mono text-xs">{n.destinatario}</td>
                    <td className="px-4 py-3">
                      <span className={n.sucesso ? 'badge-success' : 'badge-danger'}>
                        {n.sucesso ? 'Enviado' : 'Falha'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs">
                      {n.erro ? (
                        <code className="block whitespace-pre-wrap break-all font-mono text-[11px] text-destructive/90">
                          {n.erro}
                        </code>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
