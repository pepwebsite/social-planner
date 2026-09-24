import { useEffect, useState, type ReactNode } from 'react'
import { Cloud, CloudOff, Loader2, LogOut, RefreshCw, TriangleAlert } from 'lucide-react'
import { cloudEnabled } from '../lib/supabase'
import { signOutAndClear, startSync, useSync } from '../lib/sync'
import { displayName, useAuth } from '../auth'
import { AuthScreen, ResetPassword } from '../pages/AuthScreen'
import { Button, cx } from './ui'

function Splash({ text }: { text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <img src="/favicon.svg" alt="" className="size-12 animate-pulse" />
      <p className="flex items-center gap-2 text-sm font-medium text-stone-500">
        <Loader2 size={15} className="animate-spin" /> {text}
      </p>
    </div>
  )
}

/** Mostra l'app solo agli utenti autenticati, dopo aver caricato i loro dati */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status)
  const userId = useAuth((s) => s.user?.id)
  const recovery = useAuth((s) => s.recovery)
  const [ready, setReady] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!cloudEnabled || !userId) return
    let cancelled = false
    setError(null)
    startSync(userId)
      .then(() => !cancelled && setReady(userId))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [userId, attempt])

  if (!cloudEnabled) return <>{children}</>
  if (recovery && status === 'signedIn') return <ResetPassword />
  if (status === 'loading') return <Splash text="Un attimo…" />
  if (status === 'signedOut') return <AuthScreen />
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <TriangleAlert size={28} className="text-rose-500" />
        <p className="max-w-sm text-stone-600">{error}</p>
        <div className="flex gap-2">
          <Button variant="primary" icon={<RefreshCw size={15} />} onClick={() => setAttempt((a) => a + 1)}>
            Riprova
          </Button>
          <Button variant="ghost" onClick={() => void signOutAndClear()}>
            Esci
          </Button>
        </div>
      </div>
    )
  }
  if (ready !== userId) return <Splash text="Carico i tuoi dati…" />
  return <>{children}</>
}

export function SyncBadge({ className }: { className?: string }) {
  const status = useSync((s) => s.status)
  const map = {
    idle: { icon: Cloud, text: 'Sincronizzato', cls: 'text-stone-400' },
    saved: { icon: Cloud, text: 'Salvato', cls: 'text-stone-400' },
    saving: { icon: Loader2, text: 'Salvataggio…', cls: 'text-stone-400' },
    offline: { icon: CloudOff, text: 'Offline: salvo appena torni online', cls: 'text-amber-600' },
    error: { icon: TriangleAlert, text: 'Errore di salvataggio, riprovo…', cls: 'text-rose-600' },
  }[status]
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-xs font-medium', map.cls, className)}>
      <map.icon size={13} className={cx(status === 'saving' && 'animate-spin')} /> {map.text}
    </span>
  )
}

/** Riquadro account nella barra laterale */
export function AccountBox() {
  const user = useAuth((s) => s.user)
  const [busy, setBusy] = useState(false)
  if (!cloudEnabled || !user) return null
  const name = displayName(user)
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-chip text-xs font-bold text-white">{initials}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <SyncBadge />
      </div>
      <button
        type="button"
        title="Esci"
        aria-label="Esci"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await signOutAndClear()
        }}
        className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-900/5 hover:text-stone-800"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
      </button>
    </div>
  )
}
