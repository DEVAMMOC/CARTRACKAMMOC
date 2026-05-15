-- Enable RLS on all new tables
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_email ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's papel
CREATE OR REPLACE FUNCTION get_user_papel()
RETURNS text AS $$
  SELECT papel FROM usuarios WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- veiculos: all authenticated users can read; only gestores can write
CREATE POLICY "veiculos_read" ON veiculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "veiculos_insert" ON veiculos FOR INSERT TO authenticated
  WITH CHECK (get_user_papel() = 'gestor');
CREATE POLICY "veiculos_update" ON veiculos FOR UPDATE TO authenticated
  USING (get_user_papel() = 'gestor');
CREATE POLICY "veiculos_delete" ON veiculos FOR DELETE TO authenticated
  USING (get_user_papel() = 'gestor');

-- reservas: all authenticated can read (for calendar); own writes for funcionarios; gestores write all
CREATE POLICY "reservas_read" ON reservas FOR SELECT TO authenticated USING (true);
CREATE POLICY "reservas_insert_own" ON reservas FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "reservas_update_own" ON reservas FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR get_user_papel() = 'gestor');
CREATE POLICY "reservas_delete_own" ON reservas FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR get_user_papel() = 'gestor');

-- usuarios: read own or all for gestores
CREATE POLICY "usuarios_read_own" ON usuarios FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_user_papel() = 'gestor');
CREATE POLICY "usuarios_insert_own" ON usuarios FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "usuarios_update_own" ON usuarios FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- notificacoes_email: only gestores can read
CREATE POLICY "notificacoes_gestores_read" ON notificacoes_email FOR SELECT TO authenticated
  USING (get_user_papel() = 'gestor');
CREATE POLICY "notificacoes_service_insert" ON notificacoes_email FOR INSERT TO authenticated
  WITH CHECK (true);
