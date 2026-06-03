import { NovaReservaForm } from '@/components/reservas/NovaReservaForm'

export default async function NovaReservaPage({
  searchParams,
}: {
  searchParams: Promise<{ data_saida?: string }>
}) {
  const { data_saida } = await searchParams

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Nova Reserva</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione o veículo, período e informe o destino
        </p>
      </div>
      <NovaReservaForm defaultDataSaida={data_saida} />
    </div>
  )
}
