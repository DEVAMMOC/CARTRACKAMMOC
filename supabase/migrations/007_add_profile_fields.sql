-- Add profile fields to usuarios.
-- Roles continue to live in usuarios.papel: 'gestor' = admin, 'funcionario' = usuário comum.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS cargo text,
  ADD COLUMN IF NOT EXISTS telefone text;
