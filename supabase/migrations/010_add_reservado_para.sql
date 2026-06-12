-- Beneficiário/passageiro da viagem, quando diferente de quem marcou a reserva.
-- Opcional ("se for o caso"). Preenchido sobretudo via API do bot (OpenClaw).
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS reservado_para text;
