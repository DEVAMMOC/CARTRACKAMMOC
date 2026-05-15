CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  nome text NOT NULL,
  papel text NOT NULL DEFAULT 'funcionario'
    CHECK (papel IN ('funcionario', 'gestor')),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz DEFAULT now()
);
