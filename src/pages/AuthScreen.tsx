import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Bell, CalendarDays, Eye, EyeOff, Loader2, Lock, Mail, MailCheck, Sparkles, UserRound } from 'lucide-react'
import { authErrorMessage, supabase } from '../lib/supabase'
import { useAuth } from '../auth'
import { useUi } from '../ui'
import { Button, Input, cx } from '../components/ui'

type Mode = 'login' | 'register' | 'forgot'

/** Accesso, registrazione e recupero password */
export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [sentTo, setSentTo] = useState<{ email: string; kind: 'confirm' | 'reset' } | null>(null)

  return (
    <AuthLayout>
      {sentTo ? (
        <EmailSent {...sentTo} onBack={() => { setSentTo(null); setMode('login') }} />
      ) : mode === 'forgot' ? (
        <ForgotForm onBack={() => setMode('login')} onSent={(email) => setSentTo({ email, kind: 'reset' })} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-stone-900/5 p-1">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cx('rounded-lg py-2 text-sm font-semibold transition', mode === m ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800')}
              >
                {m === 'login' ? 'Accedi' : 'Registrati'}
              </button>
            ))}
          </div>
          {mode === 'login' ? (
            <LoginForm onForgot={() => setMode('forgot')} />
          ) : (
            <RegisterForm onConfirmNeeded={(email) => setSentTo({ email, kind: 'confirm' })} />
          )}
        </>
      )}
    </AuthLayout>
  )
}

export function AuthLayout({ children }: { children: ReactNode }) {
  const points = [
    { icon: Sparkles, text: 'Bozze della settimana scritte dall’AI nel tono di ogni cliente' },
    { icon: CalendarDays, text: 'Calendario, approvazioni ed eventi di tutti i clienti in un posto' },
    { icon: Bell, text: 'Promemoria automatici per volantini, influencer e solleciti' },
  ]
  return (
    <div className="flex min-h-full">
      <div className="relative hidden w-[44%] flex-col justify-between overflow-clip bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 p-10 text-white lg:flex">
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 text-lg font-extrabold ring-1 ring-white/25">R</span>
          <span className="text-lg font-extrabold tracking-tight">Regia</span>
        </div>
        <div className="relative">
          <h1 className="text-4xl leading-tight font-extrabold tracking-tight">Tutti i tuoi clienti,<br />sotto controllo.</h1>
          <ul className="mt-8 space-y-4">
            {points.map((p) => (
              <li key={p.text} className="flex items-start gap-3 text-[15px] text-white/90">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <p.icon size={16} />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">I tuoi dati sono salvati in modo sicuro e sincronizzati su tutti i tuoi dispositivi.</p>
      </div>

      <div className="flex flex-1 flex-col lg:items-center lg:justify-center">
        {/* Intestazione su telefono */}
        <div className="relative overflow-clip bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 px-6 pt-[max(28px,env(safe-area-inset-top))] pb-14 text-white lg:hidden">
          <div className="pointer-events-none absolute -top-16 -right-12 size-56 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white text-lg font-extrabold text-brand-600 shadow-lg">R</span>
            <span className="text-xl font-extrabold tracking-tight">Regia</span>
          </div>
          <p className="relative mt-6 animate-rise text-[26px] leading-tight font-extrabold tracking-tight">Tutti i tuoi clienti, sotto controllo.</p>
          <p className="relative mt-2 animate-rise text-[15px] text-white/85 [animation-delay:120ms]">Bozze con l’AI, calendari e promemoria in un’unica app.</p>
        </div>
        <div className="relative -mt-8 flex flex-1 justify-center rounded-t-[28px] bg-canvas px-5 pt-7 pb-10 lg:mt-0 lg:flex-none lg:rounded-none lg:bg-transparent lg:p-0">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  )
}

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-stone-700">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400">{icon}</span>
        {children}
      </div>
    </label>
  )
}

function PasswordInput({ value, onChange, autoComplete, placeholder }: { value: string; onChange: (v: string) => void; autoComplete: string; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <>
      <Input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} placeholder={placeholder} required className="h-11 pr-10 pl-9" />
      <button type="button" aria-label={show ? 'Nascondi password' : 'Mostra password'} onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-stone-400 hover:text-stone-700">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </>
  )
}

const ErrorBox = ({ text }: { text: string | null }) => (text ? <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{text}</p> : null)

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError(authErrorMessage(error))
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Ciao di nuovo 👋</h2>
        <p className="mt-1 text-sm text-stone-500">Accedi per ritrovare clienti e calendari.</p>
      </div>
      <Field icon={<Mail size={16} />} label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus placeholder="nome@esempio.it" className="h-11 pl-9" />
      </Field>
      <div>
        <Field icon={<Lock size={16} />} label="Password">
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <button type="button" onClick={onForgot} className="mt-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
          Password dimenticata?
        </button>
      </div>
      <ErrorBox text={error} />
      <Button type="submit" variant="primary" disabled={busy} className="h-11 w-full" icon={busy ? <Loader2 size={16} className="animate-spin" /> : undefined}>
        Accedi
      </Button>
    </form>
  )
}

function RegisterForm({ onConfirmNeeded }: { onConfirmNeeded: (email: string) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const strong = password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!strong) {
      setError('La password deve avere almeno 8 caratteri, con lettere e numeri.')
      return
    }
    setBusy(true)
    setError(null)
    const { data, error } = await supabase!.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) return setError(authErrorMessage(error))
    // Supabase non segnala le email già registrate: restituisce un utente senza identità
    if (data.user && data.user.identities?.length === 0) return setError('Esiste già un account con questa email. Prova ad accedere.')
    if (!data.session) onConfirmNeeded(email.trim())
    else useUi.getState().toast(`Benvenuto in Regia${name ? `, ${name.split(' ')[0]}` : ''}!`)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Crea il tuo account</h2>
        <p className="mt-1 text-sm text-stone-500">Gratis. I tuoi dati restano tuoi e li ritrovi su ogni dispositivo.</p>
      </div>
      <Field icon={<UserRound size={16} />} label="Nome">
        <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required autoFocus placeholder="Come ti chiami?" className="h-11 pl-9" />
      </Field>
      <Field icon={<Mail size={16} />} label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="nome@esempio.it" className="h-11 pl-9" />
      </Field>
      <div>
        <Field icon={<Lock size={16} />} label="Password">
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" placeholder="Almeno 8 caratteri" />
        </Field>
        {password && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200">
              <div className={cx('h-full rounded-full transition-all', strong ? 'w-full bg-emerald-500' : password.length >= 6 ? 'w-2/3 bg-amber-500' : 'w-1/3 bg-rose-500')} />
            </div>
            <span className={cx('text-xs font-medium', strong ? 'text-emerald-700' : 'text-stone-500')}>{strong ? 'Ottima' : 'Lettere + numeri, min. 8'}</span>
          </div>
        )}
      </div>
      <ErrorBox text={error} />
      <Button type="submit" variant="primary" disabled={busy} className="h-11 w-full" icon={busy ? <Loader2 size={16} className="animate-spin" /> : undefined}>
        Crea account
      </Button>
    </form>
  )
}

function ForgotForm({ onBack, onSent }: { onBack: () => void; onSent: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    setBusy(false)
    if (error) setError(authErrorMessage(error))
    else onSent(email.trim())
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-800">
        <ArrowLeft size={15} /> Torna all’accesso
      </button>
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Password dimenticata</h2>
        <p className="mt-1 text-sm text-stone-500">Ti mandiamo un link per sceglierne una nuova.</p>
      </div>
      <Field icon={<Mail size={16} />} label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus placeholder="nome@esempio.it" className="h-11 pl-9" />
      </Field>
      <ErrorBox text={error} />
      <Button type="submit" variant="primary" disabled={busy} className="h-11 w-full" icon={busy ? <Loader2 size={16} className="animate-spin" /> : undefined}>
        Invia il link
      </Button>
    </form>
  )
}

function EmailSent({ email, kind, onBack }: { email: string; kind: 'confirm' | 'reset'; onBack: () => void }) {
  return (
    <div className="text-center">
      <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <MailCheck size={26} />
      </span>
      <h2 className="text-2xl font-extrabold tracking-tight">Controlla la posta</h2>
      <p className="mt-2 text-[15px] text-stone-600">
        {kind === 'confirm' ? 'Per attivare l’account apri il link che abbiamo mandato a' : 'Per scegliere una nuova password apri il link che abbiamo mandato a'}
        <br />
        <b className="text-stone-900">{email}</b>
      </p>
      <p className="mt-3 text-sm text-stone-500">Non arriva? Controlla anche nello spam.</p>
      <Button variant="secondary" className="mt-6" onClick={onBack}>
        Torna all’accesso
      </Button>
    </div>
  )
}

/** Dopo il link "reimposta password": scelta della nuova password */
export function ResetPassword() {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const strong = password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!strong) return setError('La password deve avere almeno 8 caratteri, con lettere e numeri.')
    setBusy(true)
    const { error } = await supabase!.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(authErrorMessage(error))
    useAuth.getState().setRecovery(false)
    useUi.getState().toast('Password aggiornata')
  }

  return (
    <AuthLayout>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Nuova password</h2>
          <p className="mt-1 text-sm text-stone-500">Scegline una che non usi altrove.</p>
        </div>
        <Field icon={<Lock size={16} />} label="Nuova password">
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" placeholder="Almeno 8 caratteri" />
        </Field>
        <ErrorBox text={error} />
        <Button type="submit" variant="primary" disabled={busy} className="h-11 w-full" icon={busy ? <Loader2 size={16} className="animate-spin" /> : undefined}>
          Salva password
        </Button>
      </form>
    </AuthLayout>
  )
}
