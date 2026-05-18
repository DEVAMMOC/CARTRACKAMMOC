import type { RelatorioData, RelatorioFiltros, Veiculo, Usuario } from '@cartracking/types'
import { createAdminClient } from '@/lib/supabase/admin'

export async function fetchRelatorioData(
  filtros: RelatorioFiltros
): Promise<RelatorioData | null> {
  const supabase = createAdminClient()
  let query = supabase
    .from('reservas')
    .select('*, veiculo:veiculos(*), usuario:usuarios(*)')
    .eq('status', 'finalizada')
    .gte('data_saida', filtros.inicio)
    .lte('data_saida', filtros.fim)
    .order('data_saida', { ascending: false })

  if (filtros.veiculo_id) query = query.eq('veiculo_id', filtros.veiculo_id)
  if (filtros.usuario_id) query = query.eq('usuario_id', filtros.usuario_id)

  const { data: reservas, error } = await query
  if (error || !reservas) return null

  const total_km = reservas.reduce((sum, r) => {
    const km = (r.km_retorno ?? 0) - (r.km_saida ?? 0)
    return sum + (km > 0 ? km : 0)
  }, 0)

  const veiculoMap = new Map<string, { veiculo: Veiculo; viagens: number; km: number }>()
  const usuarioMap = new Map<string, { usuario: Usuario; viagens: number; km: number }>()
  const destinoMap = new Map<string, number>()

  for (const r of reservas) {
    const km = Math.max(0, (r.km_retorno ?? 0) - (r.km_saida ?? 0))
    const vid = r.veiculo_id
    const uid = r.usuario_id

    if (!veiculoMap.has(vid)) {
      veiculoMap.set(vid, { veiculo: r.veiculo, viagens: 0, km: 0 })
    }
    const v = veiculoMap.get(vid)!
    v.viagens++
    v.km += km

    if (!usuarioMap.has(uid)) {
      usuarioMap.set(uid, { usuario: r.usuario, viagens: 0, km: 0 })
    }
    const u = usuarioMap.get(uid)!
    u.viagens++
    u.km += km

    const destino = r.destino?.trim() || 'Não informado'
    destinoMap.set(destino, (destinoMap.get(destino) ?? 0) + 1)
  }

  return {
    total_viagens: reservas.length,
    total_km,
    veiculos_usados: veiculoMap.size,
    por_veiculo: Array.from(veiculoMap.values()).sort((a, b) => b.km - a.km),
    por_usuario: Array.from(usuarioMap.values()).sort((a, b) => b.viagens - a.viagens),
    destinos_frequentes: Array.from(destinoMap.entries())
      .map(([destino, count]) => ({ destino, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    reservas,
  }
}
