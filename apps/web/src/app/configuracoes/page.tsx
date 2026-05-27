import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Usuario } from '@cartracking/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProfileForm } from '@/components/configuracoes/ProfileForm'
import { UserManagement } from '@/components/configuracoes/UserManagement'
import { ThemeSelect } from '@/components/ui/theme-select'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const admin = createAdminClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!usuario || !(usuario as Usuario).ativo) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Usuário inativo ou não encontrado.
        </div>
      </div>
    )
  }

  const u = usuario as Usuario

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seu perfil e preferências da conta
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha o tema da interface. &quot;Sistema&quot; segue a preferência do seu dispositivo.
          </p>
        </CardHeader>
        <CardContent>
          <ThemeSelect />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meu perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm usuario={u} />
        </CardContent>
      </Card>

      {u.papel === 'gestor' && (
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar perfis</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Promova ou remova administradores do sistema
            </p>
          </CardHeader>
          <CardContent>
            <UserManagement currentUserId={u.id} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
