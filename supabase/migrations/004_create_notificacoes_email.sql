CREATE TABLE IF NOT EXISTS notificacoes_email (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id uuid NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  tipo varchar(50) NOT NULL
    CHECK (tipo IN ('confirmacao', 'alerta_nao_finalizada')),
  destinatario text NOT NULL,
  enviado_em timestamptz DEFAULT now(),
  sucesso boolean NOT NULL DEFAULT false,
  erro text
);
