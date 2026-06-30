-- Configuração de notificações: linha única (singleton) com os parâmetros de
-- "quando enviar". Acessada só pelo service_role (rotas /api/admin/*), por isso
-- RLS habilitado sem policies = nega acesso direto de clientes.
CREATE TABLE IF NOT EXISTS configuracoes_notificacao (
  id boolean PRIMARY KEY DEFAULT true,
  alerta_nao_finalizada_ativo boolean NOT NULL DEFAULT true,
  alerta_hora_local integer NOT NULL DEFAULT 18 CHECK (alerta_hora_local BETWEEN 0 AND 23),
  email_confirmacao_ativo boolean NOT NULL DEFAULT true,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT configuracoes_singleton CHECK (id)
);

INSERT INTO configuracoes_notificacao (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE configuracoes_notificacao ENABLE ROW LEVEL SECURITY;
