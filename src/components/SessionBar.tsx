import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Square, Timer } from 'lucide-react'
import { useStore } from '../store'
import { clientPulse } from '../lib/insights'
import { Button, ClientAvatar, cx } from './ui'

/** Barra della sessione di lavoro a tempo su un cliente (es. 60 minuti) */
export function SessionBar() {
  const session = useStore((s) => s.session)
  const clients = useStore((s) => s.clients)
  const posts = useStore((s) => s.posts)
  const tasks = useStore((s) => s.tasks)
  const events = useStore((s) => s.events)
  const endSession = useStore((s) => s.endSession)
  const nav = useNavigate()
  const [nowMs, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!session) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [session])

  const client = clients.find((c) => c.id === session?.clientId)
  const total = (session?.minutes ?? 0) * 60_000
  const elapsed = session ? nowMs - new Date(session.startedAt).getTime() : 0
  const left = Math.max(0, total - elapsed)
  const over = session !== null && left === 0

  // Notifica di sistema allo scadere (se consentita)
  useEffect(() => {
    if (over && client && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Tempo scaduto', { body: `Sessione su ${client.name} terminata. Passa al prossimo cliente.` })
    }
  }, [over, client])

  if (!session || !client) return null

  const mm = Math.floor(left / 60_000)
  const ss = Math.floor((left % 60_000) / 1000)
  const pct = Math.min(100, (elapsed / total) * 100)

  const next = over
    ? clients
        .filter((c) => !c.archived && c.id !== client.id)
        .map((c) => ({ c, p: clientPulse(c, posts, tasks, events) }))
        .sort((a, b) => b.p.score - a.p.score)[0]
    : undefined

  return (
    <div className={cx('no-print sticky top-0 z-30 border-b backdrop-blur', over ? 'border-amber-200 bg-amber-50/95' : 'border-stone-200/70 bg-surface/85')}>
      <div className="flex items-center gap-3 px-4 py-2 md:px-8">
        <ClientAvatar client={client} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {over ? (
              <>Tempo scaduto su {client.name}</>
            ) : (
              <>
                Sessione su <button type="button" className="underline-offset-2 hover:underline" onClick={() => nav(`/clienti/${client.id}`)}>{client.name}</button>
              </>
            )}
          </p>
          {over && next ? (
            <p className="truncate text-xs text-amber-800">
              Prossimo consigliato: <b>{next.c.name}</b> · {next.p.nextAction}
            </p>
          ) : (
            <div className="mt-1 h-1 w-full max-w-60 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full rounded-full bg-brand-500 transition-[width] duration-1000" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        {!over && (
          <span className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-stone-700">
            <Timer size={15} className="text-brand-500" />
            {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
          </span>
        )}
        {over && next && (
          <Button
            size="sm"
            variant="primary"
            icon={<ArrowRight size={14} />}
            onClick={() => {
              useStore.getState().startSession(next.c.id, session.minutes)
              nav(`/clienti/${next.c.id}`)
            }}
          >
            <span className="hidden sm:inline">Passa a</span> {next.c.name.split(' ')[0]}
          </Button>
        )}
        <Button size="sm" variant="ghost" icon={<Square size={13} />} onClick={endSession}>
          <span className="hidden sm:inline">Termina</span>
        </Button>
      </div>
    </div>
  )
}
