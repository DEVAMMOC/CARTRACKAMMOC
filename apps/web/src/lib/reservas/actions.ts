import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Usuario,
  CriarReservaInput,
  FinalizarViagemInput,
  ReservaComDetalhes,
} from '@cartracking/types'
import { sendConfirmacaoEmail } from '@/lib/email'

/**
 * Core reservation operations, shared by the employee-facing routes
 * (`/api/reservas/*`) and the bot routes (`/api/v1/bot/reservas/*`). Both call
 * these so the business rules never diverge.
 *
 * Each function receives the admin Supabase client plus the acting `Usuario`
 * (the employee on whose behalf the action runs) and returns either a `data`
 * payload or an `{ error, status }` pair that the route turns into a response.
 */
export type ActionResult<T> = { data: T } | { error: string; status: number }

const RESERVA_SELECT = '*, veiculo:veiculos(*), usuario:usuarios(*), cidade_destino:cidades(*)'

/**
 * Resolve a destination city from either an id or a name. By id: must exist.
 * By name: matched case-insensitively, created if new (same behaviour as the
 * web form's "outra cidade"). Returns `{ id, nome }` or null.
 */
async function resolveCidade(
  supabase: SupabaseClient,
  id: string | undefined,
  nome: string
): Promise<{ id: string; nome: string } | null> {
  if (id) {
    const { data } = await supabase.from('cidades').select('id, nome').eq('id', id).single()
    return data ?? null
  }
  if (!nome) return null

  const { data: existing } = await supabase
    .from('cidades')
    .select('id, nome')
    .ilike('nome', nome)
    .maybeSingle()
  if (existing) return existing

  const { data: created, error } = await supabase
    .from('cidades')
    .insert({ nome })
    .select('id, nome')
    .single()
  if (error) {
    // Race: another insert won; fetch the now-existing row.
    const { data: now } = await supabase
      .from('cidades')
      .select('id, nome')
      .ilike('nome', nome)
      .maybeSingle()
    return now ?? null
  }
  return created
}

export async function criarReserva(
  supabase: SupabaseClient,
  user: Usuario,
  input: Partial<CriarReservaInput>
): Promise<ActionResult<ReservaComDetalhes>> {
  const cidadeNome = (input.cidade_destino_nome ?? '').trim()
  if (
    !input.veiculo_id ||
    !input.data_saida ||
    !input.data_retorno_prevista ||
    (!input.cidade_destino_id && !cidadeNome) ||
    !input.servico
  ) {
    return {
      error:
        'veiculo_id, data_saida, data_retorno_prevista, servico e (cidade_destino_id ou cidade_destino_nome) são obrigatórios',
      status: 400,
    }
  }

  if (new Date(input.data_retorno_prevista) <= new Date(input.data_saida)) {
    return { error: 'data_retorno_prevista deve ser posterior à data_saida', status: 400 }
  }

  // Resolve the destination city (by id, or by name — creating it if new, like
  // the web form's "outra cidade"). Needed to compose the legacy `destino` text.
  const cidade = await resolveCidade(supabase, input.cidade_destino_id, cidadeNome)
  if (!cidade) {
    return { error: 'Cidade de destino não encontrada', status: 404 }
  }

  const enderecoTrimmed = (input.endereco_destino ?? '').trim()
  const destinoLegacy = enderecoTrimmed ? `${cidade.nome} — ${enderecoTrimmed}` : cidade.nome
  const reservadoPara = (input.reservado_para ?? '').trim() || null

  const { data: conflicts } = await supabase
    .from('reservas')
    .select('id')
    .eq('veiculo_id', input.veiculo_id)
    .not('status', 'in', '("cancelada","finalizada")')
    .lt('data_saida', input.data_retorno_prevista)
    .gt('data_retorno_prevista', input.data_saida)
    .limit(1)

  if (conflicts && conflicts.length > 0) {
    return { error: 'Veículo não disponível no período solicitado', status: 409 }
  }

  const { data: veiculo } = await supabase
    .from('veiculos')
    .select('km_atual, modelo, placa')
    .eq('id', input.veiculo_id)
    .single()

  if (!veiculo) {
    return { error: 'Veículo não encontrado', status: 404 }
  }

  const { data, error } = await supabase
    .from('reservas')
    .insert({
      veiculo_id: input.veiculo_id,
      data_saida: input.data_saida,
      data_retorno_prevista: input.data_retorno_prevista,
      cidade_destino_id: cidade.id,
      endereco_destino: enderecoTrimmed || null,
      destino: destinoLegacy,
      servico: input.servico,
      reservado_para: reservadoPara,
      usuario_id: user.id,
      km_saida: veiculo.km_atual,
      status: 'confirmada',
    })
    .select(RESERVA_SELECT)
    .single()

  if (error) return { error: error.message, status: 500 }

  sendConfirmacaoEmail(data as ReservaComDetalhes).catch((err: unknown) =>
    console.error('[email] Confirmation failed:', err)
  )

  return { data: data as ReservaComDetalhes }
}

export async function iniciarViagem(
  supabase: SupabaseClient,
  user: Usuario,
  id: string
): Promise<ActionResult<unknown>> {
  const { data: reserva } = await supabase
    .from('reservas')
    .select('usuario_id, status')
    .eq('id', id)
    .single()

  if (!reserva) return { error: 'Reserva não encontrada', status: 404 }
  if (reserva.usuario_id !== user.id && user.papel !== 'gestor') {
    return { error: 'Sem permissão', status: 403 }
  }
  if (reserva.status !== 'confirmada') {
    return {
      error: `Reserva está com status '${reserva.status}', esperado 'confirmada'`,
      status: 400,
    }
  }

  const { data, error } = await supabase
    .from('reservas')
    .update({ status: 'em_andamento', atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message, status: 500 }
  return { data }
}

export async function finalizarViagem(
  supabase: SupabaseClient,
  user: Usuario,
  id: string,
  input: Partial<FinalizarViagemInput>
): Promise<ActionResult<unknown>> {
  if (!input.km_retorno || input.km_retorno <= 0) {
    return { error: 'km_retorno é obrigatório e deve ser positivo', status: 400 }
  }

  const { data: reserva } = await supabase
    .from('reservas')
    .select('usuario_id, status, veiculo_id, km_saida')
    .eq('id', id)
    .single()

  if (!reserva) return { error: 'Reserva não encontrada', status: 404 }
  if (reserva.usuario_id !== user.id && user.papel !== 'gestor') {
    return { error: 'Sem permissão', status: 403 }
  }
  if (reserva.status === 'finalizada') {
    return { error: 'Viagem já finalizada', status: 400 }
  }
  if (reserva.status === 'cancelada') {
    return { error: 'Reserva cancelada não pode ser finalizada', status: 400 }
  }
  if (reserva.km_saida !== null && input.km_retorno < reserva.km_saida) {
    return {
      error: `KM de retorno (${input.km_retorno}) menor que KM de saída (${reserva.km_saida})`,
      status: 400,
    }
  }

  const { data, error } = await supabase
    .from('reservas')
    .update({
      status: 'finalizada',
      km_retorno: input.km_retorno,
      observacoes: input.observacoes ?? null,
      data_retorno_real: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message, status: 500 }

  await supabase
    .from('veiculos')
    .update({ km_atual: input.km_retorno, atualizado_em: new Date().toISOString() })
    .eq('id', reserva.veiculo_id)

  return { data }
}

export async function cancelarReserva(
  supabase: SupabaseClient,
  user: Usuario,
  id: string
): Promise<ActionResult<{ ok: true }>> {
  const { data: reserva } = await supabase
    .from('reservas')
    .select('usuario_id, status')
    .eq('id', id)
    .single()

  if (!reserva) return { error: 'Reserva não encontrada', status: 404 }
  if (reserva.usuario_id !== user.id && user.papel !== 'gestor') {
    return { error: 'Sem permissão', status: 403 }
  }
  if (reserva.status === 'finalizada') {
    return { error: 'Não é possível cancelar uma viagem finalizada', status: 400 }
  }

  const { error } = await supabase
    .from('reservas')
    .update({ status: 'cancelada', atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message, status: 500 }
  return { data: { ok: true } }
}
