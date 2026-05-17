import { createClient } from '@/lib/supabase/server'
import { ReservaComDetalhes } from '@cartracking/types'
import { FinalizarViagemForm } from '@/components/reservas/FinalizarViagemForm'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FinalizarViagemPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  let reserva: ReservaComDetalhes | null = null
  let errorMsg: string | null = null

  try {
    const res = await fetch(`${API_URL}/reservas`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || `HTTP ${res.status}`)
    }

    const reservas = await res.json() as ReservaComDetalhes[]
    reserva = reservas.find((r) => r.id === id) ?? null
  } catch (e: unknown) {
    errorMsg = e instanceof Error ? e.message : 'Erro ao carregar reserva'
  }

  if (errorMsg) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      </div>
    )
  }

  if (!reserva || reserva.status !== 'em_andamento') {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Reserva não encontrada ou não está em andamento.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Finalizar Viagem</h1>
      <FinalizarViagemForm reserva={reserva} />
    </div>
  )
}
