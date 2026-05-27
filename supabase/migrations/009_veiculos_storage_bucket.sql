-- Storage bucket público para fotos de veículos.
-- Espelha o padrão do bucket "avatars" que já é usado pra foto de perfil.
INSERT INTO storage.buckets (id, name, public)
VALUES ('veiculos', 'veiculos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- RLS: qualquer um pode ler (URLs são públicas), só gestor pode escrever/sobrescrever/apagar.
-- O service_role do server (createAdminClient) bypassa RLS, então o upload via
-- /api/veiculos/:id/foto continua funcionando independente dessas políticas;
-- as policies aqui são pra segurança de uploads diretos via SDK client (caso
-- algum dia decidamos fazer upload direto do browser sem passar pelo Next).

CREATE POLICY "veiculos_storage_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'veiculos');

CREATE POLICY "veiculos_storage_insert_gestor"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'veiculos' AND get_user_papel() = 'gestor');

CREATE POLICY "veiculos_storage_update_gestor"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'veiculos' AND get_user_papel() = 'gestor');

CREATE POLICY "veiculos_storage_delete_gestor"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'veiculos' AND get_user_papel() = 'gestor');
