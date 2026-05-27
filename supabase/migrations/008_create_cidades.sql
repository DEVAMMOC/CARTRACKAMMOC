-- Catálogo de cidades AMMOC + colunas estruturadas em reservas.
-- A coluna `destino` legada permanece NOT NULL e continua sendo preenchida (cidade — endereço)
-- para não quebrar listas/cards/relatórios existentes nem o que está no banco hoje.

CREATE TABLE IF NOT EXISTS cidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cidades_nome ON cidades(nome);

-- Seed das 12 cidades associadas à AMMOC.
INSERT INTO cidades (nome) VALUES
  ('Água Doce'),
  ('Capinzal'),
  ('Catanduvas'),
  ('Erval Velho'),
  ('Herval d''Oeste'),
  ('Ibicaré'),
  ('Joaçaba'),
  ('Lacerdópolis'),
  ('Luzerna'),
  ('Ouro'),
  ('Treze Tílias'),
  ('Vargem Bonita')
ON CONFLICT (nome) DO NOTHING;

-- Reservas: novas colunas estruturadas (nullable pra não quebrar dados antigos).
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS cidade_destino_id uuid REFERENCES cidades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS endereco_destino text;

CREATE INDEX IF NOT EXISTS idx_reservas_cidade_destino ON reservas(cidade_destino_id);

-- RLS na nova tabela:
-- - todos os autenticados podem ler (alimenta o dropdown)
-- - todos os autenticados podem inserir uma cidade nova (usuário comum pode cadastrar)
-- - só gestores podem editar/remover (limpeza de catálogo)
ALTER TABLE cidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cidades_read" ON cidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "cidades_insert" ON cidades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cidades_update_gestor" ON cidades FOR UPDATE TO authenticated
  USING (get_user_papel() = 'gestor');
CREATE POLICY "cidades_delete_gestor" ON cidades FOR DELETE TO authenticated
  USING (get_user_papel() = 'gestor');
