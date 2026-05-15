import { NovaReservaForm } from '@/components/reservas/NovaReservaForm'

export default function NovaReservaPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nova Reserva</h1>
        <p className="text-sm text-gray-500 mt-1">
          Selecione o veículo, período e informe o destino
        </p>
      </div>
      <NovaReservaForm />
    </div>
  )
}
