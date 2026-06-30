'use client'

import { useEffect, useState } from 'react'
import type { ConfiguracaoNotificacao } from '@cartracking/types'
import { apiFetch } from '@/lib/api'

function ConfigEnviosCard() {
  const [config, setConfig] = useState<ConfiguracaoNotificacao | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    let alive = true
    apiFetch<ConfiguracaoNotificacao>('/admin/configuracoes')
      .then((c) => {
        if (alive) setConfig(c)
      })
      .catch((e: unknown) => {
        if (alive) setErr(e instanceof Error ? e.message : 'Erro ao carregar configuração')
      })
    return () => {
      alive = false
    }
  }, [])

  async function salvar() {
    if (!config) return
    setSaving(true)
    setErr(null)
    setSalvo(false)
    try {
      const saved = await apiFetch<ConfiguracaoNotificacao>('/admin/configuracoes', {
        method: 'PATCH',
        body: JSON.stringify({
          alerta_nao_finalizada_ativo: config.alerta_nao_finalizada_ativo,
          alerta_hora_local: config.alerta_hora_local,
          email_confirmacao_ativo: config.email_confirmacao_ativo,
        }),
      })
      setConfig(saved)
      setSalvo(true)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Configuração de envios</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Defina quando os e-mails são enviados.</p>
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      {!config ? (
        <div className="h-28 rounded-lg bg-muted animate-pulse" aria-hidden />
      ) : (
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.alerta_nao_finalizada_ativo}
              onChange={(e) => setConfig({ ...config, alerta_nao_finalizada_ativo: e.target.checked })}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Alerta de corrida não finalizada
              </span>
              <span className="block text-xs text-muted-foreground">
                E-mail ao responsável (e gestores) com o link para finalizar a corrida que passou do
                retorno previsto.
              </span>
            </span>
          </label>

          <div
            className={config.alerta_nao_finalizada_ativo ? '' : 'opacity-50 pointer-events-none'}
          >
            <label className="block text-sm font-medium text-foreground mb-1">
              Horário do alerta (horário de Brasília)
            </label>
            <select
              value={config.alerta_hora_local}
              onChange={(e) => setConfig({ ...config, alerta_hora_local: Number(e.target.value) })}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Todo dia nesse horário o sistema verifica e avisa as corridas não finalizadas.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.email_confirmacao_ativo}
              onChange={(e) => setConfig({ ...config, email_confirmacao_ativo: e.target.checked })}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                E-mail de confirmação de reserva
              </span>
              <span className="block text-xs text-muted-foreground">
                Enviado automaticamente ao criar uma reserva.
              </span>
            </span>
          </label>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={salvar}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar configuração'}
            </button>
            {salvo && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Salvo ✓</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

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

      <ConfigEnviosCard />

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
