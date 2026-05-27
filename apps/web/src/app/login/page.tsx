'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'

const REMEMBERED_EMAIL_KEY = 'login:rememberedEmail'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [view, setView] = useState<'login' | 'forgot'>('login')
  const [resetEmail, setResetEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem(REMEMBERED_EMAIL_KEY)
    if (saved) {
      setEmail(saved)
      setRememberMe(true)
    }
  }, [])

  function persistRememberedEmail(currentEmail: string) {
    if (rememberMe && currentEmail) {
      window.localStorage.setItem(REMEMBERED_EMAIL_KEY, currentEmail)
    } else {
      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY)
    }
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function signInWithMicrosoft() {
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    persistRememberedEmail(email)
    router.push('/reservas')
    router.refresh()
  }

  async function signUpWithEmail() {
    setMessage(null)
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Informe email e senha.' })
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    if (data.session) {
      persistRememberedEmail(email)
      router.push('/reservas')
      router.refresh()
      return
    }
    setMessage({
      type: 'success',
      text: 'Conta criada. Verifique seu email para confirmar o cadastro.',
    })
  }

  async function sendPasswordReset(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!resetEmail) {
      setMessage({ type: 'error', text: 'Informe o email da conta.' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    setMessage({
      type: 'success',
      text: 'Enviamos um link de recuperação para o seu email.',
    })
  }

  function openForgotView() {
    setMessage(null)
    setResetEmail(email)
    setView('forgot')
  }

  function backToLogin() {
    setMessage(null)
    setView('login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <Image
              src="/ammoc.png"
              alt="AMMOC"
              width={120}
              height={120}
              className="hidden dark:block object-contain"
              priority
            />
            <Image
              src="/ammoc-transparent.png"
              alt="AMMOC"
              width={120}
              height={120}
              className="block dark:hidden object-contain"
              priority
            />
          </div>
          <CardTitle className="text-xl font-bold text-foreground tracking-tight">AMMOC Frotas</CardTitle>
          <p className="text-muted-foreground text-sm">
            {view === 'forgot' ? 'Recuperar senha' : 'Sistema de Reserva de Veículos'}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-4">
          {view === 'login' ? (
            <>
              <Button
                onClick={signInWithGoogle}
                variant="outline"
                className="w-full flex items-center gap-2 h-11"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Entrar com Google
              </Button>
              <Button
                onClick={signInWithMicrosoft}
                variant="outline"
                className="w-full flex items-center gap-2 h-11"
              >
                <svg className="w-5 h-5" viewBox="0 0 23 23">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                Entrar com Microsoft
              </Button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <form onSubmit={signInWithEmail} className="flex flex-col gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-10"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
                      tabIndex={0}
                    >
                      {showPassword ? (
                        <EyeOffIcon className="w-4 h-4" />
                      ) : (
                        <EyeIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                      disabled={loading}
                    />
                    <span className="text-muted-foreground">Lembrar-me</span>
                  </label>
                  <button
                    type="button"
                    onClick={openForgotView}
                    className="text-primary hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                {message && (
                  <p
                    className={
                      message.type === 'error'
                        ? 'text-sm text-destructive'
                        : 'text-sm text-primary'
                    }
                    role={message.type === 'error' ? 'alert' : undefined}
                  >
                    {message.text}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 h-11" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-11"
                    onClick={signUpWithEmail}
                    disabled={loading}
                  >
                    Criar conta
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <form onSubmit={sendPasswordReset} className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Informe seu email e enviaremos um link para redefinir sua senha.
              </p>
              <div className="grid gap-1.5">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-10"
                />
              </div>

              {message && (
                <p
                  className={
                    message.type === 'error'
                      ? 'text-sm text-destructive'
                      : 'text-sm text-primary'
                  }
                  role={message.type === 'error' ? 'alert' : undefined}
                >
                  {message.text}
                </p>
              )}

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full h-9"
                onClick={backToLogin}
                disabled={loading}
              >
                Voltar para o login
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
