import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConfiguracaoNotificacao } from '@cartracking/types'

export const CONFIG_PADRAO: ConfiguracaoNotificacao = {
  alerta_nao_finalizada_ativo: true,
  alerta_hora_local: 18,
  email_confirmacao_ativo: true,
}

/**
 * Lê a linha única de configuração de notificações. Se a tabela ainda não tiver
 * sido populada (ou em qualquer erro), cai nos padrões — nunca lança, pra não
 * derrubar o cron nem o envio de confirmação.
 */
export async function getConfiguracaoNotificacao(
  supabase: SupabaseClient
): Promise<ConfiguracaoNotificacao> {
  try {
    const { data } = await supabase
      .from('configuracoes_notificacao')
      .select('alerta_nao_finalizada_ativo, alerta_hora_local, email_confirmacao_ativo, atualizado_em')
      .eq('id', true)
      .maybeSingle()
    if (!data) return CONFIG_PADRAO
    return data as ConfiguracaoNotificacao
  } catch {
    return CONFIG_PADRAO
  }
}
