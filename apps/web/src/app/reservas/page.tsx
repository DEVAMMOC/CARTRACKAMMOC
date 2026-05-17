import { createClient } from '@/lib/supabase/server'
import { ReservaComDetalhes } from '@cartracking/types'
import { ReservaCard } from '@/components/reservas/ReservaCard'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default async function ReservasPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  let reservas: ReservaComDetalhes[] = []
  let fetchError: string | null = null

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

    reservas = await res.json() as ReservaComDetalhes[]
  } catch (e: unknown) {
    fetchError = e instanceof Error ? e.message : 'Erro ao carregar reservas'
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Minhas Reservas</h1>
        <Link href="/reservas/nova" className={buttonVariants({ variant: 'default' })}>
          Nova Reserva
        </Link>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {!fetchError && reservas.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-muted-foreground">
          <p className="text-base font-medium">Nenhuma reserva encontrada</p>
          <p className="mt-1 text-sm">Crie uma nova reserva para começar a usar o sistema.</p>
        </div>
      )}

      {reservas.length > 0 && (
        <div className="space-y-4">
          {reservas.map((reserva) => (
            <ReservaCard key={reserva.id} reserva={reserva} />
          ))}
        </div>
      )}
    </div>
  )
}
