CREATE TABLE IF NOT EXISTS veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa varchar(8) NOT NULL UNIQUE,
  modelo varchar(100) NOT NULL,
  ano integer NOT NULL,
  tipo varchar(50) NOT NULL
    CHECK (tipo IN ('carro', 'van', 'caminhonete', 'onibus', 'outro')),
  km_atual integer NOT NULL DEFAULT 0,
  foto_url text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);
