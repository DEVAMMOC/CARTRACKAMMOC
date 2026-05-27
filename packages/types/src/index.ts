export type Papel = 'funcionario' | 'gestor'
export type StatusReserva = 'confirmada' | 'em_andamento' | 'finalizada' | 'cancelada'
export type TipoVeiculo = 'carro' | 'van' | 'caminhonete' | 'onibus' | 'outro'
export type TipoNotificacao = 'confirmacao' | 'alerta_nao_finalizada'

export interface Usuario {
  id: string
  email: string
  nome: string
  papel: Papel
  cargo: string | null
  telefone: string | null
  avatar_url: string | null
  ativo: boolean
  criado_em: string
}

export interface Veiculo {
  id: string
  placa: string
  modelo: string
  ano: number
  tipo: TipoVeiculo
  km_atual: number
  foto_url: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface Cidade {
  id: string
  nome: string
  criado_em: string
}

export interface Reserva {
  id: string
  veiculo_id: string
  usuario_id: string
  data_saida: string
  data_retorno_prevista: string
  data_retorno_real: string | null
  /** Texto legado: "<cidade> — <endereço>" para compatibilidade com listas/cards/relatórios. */
  destino: string
  /** Cidade catalogada — referencia `cidades.id`. Nullable em reservas legadas. */
  cidade_destino_id: string | null
  /** Endereço/rua dentro da cidade. Nullable em reservas legadas. */
  endereco_destino: string | null
  servico: string
  km_saida: number | null
  km_retorno: number | null
  observacoes: string | null
  status: StatusReserva
  alerta_nao_finalizada_enviado: boolean
  criado_em: string
  atualizado_em: string
  veiculo?: Veiculo
  usuario?: Usuario
  cidade_destino?: Cidade | null
}

export interface ReservaComDetalhes extends Reserva {
  veiculo: Veiculo
  usuario: Usuario
}

export interface CriarReservaInput {
  veiculo_id: string
  data_saida: string
  data_retorno_prevista: string
  cidade_destino_id: string
  endereco_destino?: string
  servico: string
}

export interface CriarCidadeInput {
  nome: string
}

export interface FinalizarViagemInput {
  km_retorno: number
  observacoes?: string
}

export interface CriarVeiculoInput {
  placa: string
  modelo: string
  ano: number
  tipo: TipoVeiculo
  km_atual: number
  foto_url?: string
}

export interface RelatorioFiltros {
  inicio: string
  fim: string
  veiculo_id?: string
  usuario_id?: string
  cidade_destino_id?: string
}

export interface RelatorioData {
  total_viagens: number
  total_km: number
  veiculos_usados: number
  por_veiculo: { veiculo: Veiculo; viagens: number; km: number }[]
  por_usuario: { usuario: Usuario; viagens: number; km: number }[]
  destinos_frequentes: { destino: string; count: number }[]
  reservas: ReservaComDetalhes[]
}
