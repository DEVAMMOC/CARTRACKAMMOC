CREATE TABLE IF NOT EXISTS reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES veiculos(id),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  data_saida timestamptz NOT NULL,
  data_retorno_prevista timestamptz NOT NULL,
  data_retorno_real timestamptz,
  destino text NOT NULL,
  servico text NOT NULL,
  km_saida integer,
  km_retorno integer,
  observacoes text,
  status varchar(20) NOT NULL DEFAULT 'confirmada'
    CHECK (status IN ('confirmada', 'em_andamento', 'finalizada', 'cancelada')),
  alerta_nao_finalizada_enviado boolean NOT NULL DEFAULT false,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservas_veiculo_data ON reservas(veiculo_id, data_saida, data_retorno_prevista);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario ON reservas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_reservas_status ON reservas(status);
