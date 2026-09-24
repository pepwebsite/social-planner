import { useNavigate } from 'react-router-dom'
import { addDays, formatDistanceToNowStrict } from 'date-fns'
import { it } from 'date-fns/locale'
import { ArrowRight, Bell, CalendarClock, CalendarDays, CheckCircle2, ChevronRight, ListTodo, Play, PlayCircle, Plus, Send, Sparkles, UserPlus, Users } from 'lucide-react'
import { useStore } from '../store'
import { useUi } from '../ui'
import { displayName, useAuth } from '../auth'
import { capitalize, fmt, relativeDay, todayISO, toISO } from '../lib/dates'
import { clientPulse, isDueToday, isOverdue, needsNudge, URGENCY_META } from '../lib/insights'
import { firstName, greeting, type Greeting } from '../lib/mood'
import { cloudEnabled } from '../lib/supabase'
import { QuickCreate } from '../components/Layout'
import { TaskRow } from '../components/Tasks'
import { PostCard } from '../components/PostCard'
import { openTutorial } from '../components/Tutorial'
import { Button, Card, ClientAvatar, EmptyState, cx } from '../components/ui'

const HERO_BG: Record<Greeting['period'], string> = {
  mattina: 'from-amber-400 via-orange-400 to-rose-500',
  pomeriggio: 'from-sky-500 via-indigo-500 to-violet-500',
  sera: 'from-indigo-600 via-violet-600 to-fuchsia-600',
  notte: 'from-slate-800 via-indigo-900 to-violet-900',
}

function useFirstName() {
  const user = useAuth((s) => s.user)
  return cloudEnabled && user ? firstName(displayName(user)) : null
}

/** Anello di avanzamento della giornata */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 1 : done / total
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="white"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-base font-extrabold">{total === 0 ? '✓' : `${done}/${total}`}</span>
      </span>
    </div>
  )
}

export function Today() {
  const clients = useStore((s) => s.clients)
  const posts = useStore((s) => s.posts)
  const tasks = useStore((s) => s.tasks)
  const events = useStore((s) => s.events)
  const lastWorked = useStore((s) => s.lastWorked)
  const onboarded = useStore((s) => s.onboarded)
  const session = useStore((s) => s.session)
  const name = useFirstName()
  const nav = useNavigate()

  const active = clients.filter((c) => !c.archived)
  if (!onboarded && active.length === 0) return <Welcome name={name} />

  const today = todayISO()
  const in3 = toISO(addDays(new Date(), 3))
  const urgentTasks = tasks.filter((t) => !t.done && t.due <= in3).sort((a, b) => a.due.localeCompare(b.due))
  const dueNow = tasks.filter((t) => isOverdue(t) || isDueToday(t)).length
  const doneToday = tasks.filter((t) => t.done && t.doneAt?.slice(0, 10) === today).length
  const nudge = posts.filter(needsNudge)
  const toSchedule = posts.filter((p) => p.status === 'approvato' && p.date >= today)
  const outToday = posts.filter((p) => p.date === today).sort((a, b) => a.time.localeCompare(b.time))
  const upcomingEvents = events
    .filter((e) => e.date >= today && e.date <= toISO(addDays(new Date(), 14)))
    .sort((a, b) => a.date.localeCompare(b.date))

  const ranked = active
    .map((c) => ({ c, p: clientPulse(c, posts, tasks, events) }))
    .sort((a, b) => b.p.score - a.p.score || (lastWorked[a.c.id] ?? '').localeCompare(lastWorked[b.c.id] ?? ''))
  const top = ranked[0] && ranked[0].p.urgency !== 'ok' ? ranked[0] : null
  const urgentCount = ranked.filter((r) => r.p.urgency === 'alta').length

  const g = greeting({
    firstName: name,
    urgent: urgentCount,
    dueToday: dueNow,
    doneToday,
    outToday: outToday.length,
    topClient: top?.c.name ?? null,
    topAction: top?.p.nextAction ?? null,
  })

  const stats = [
    { label: 'Da fare oggi', value: dueNow, icon: ListTodo, tone: dueNow ? 'text-rose-600 bg-rose-50' : 'text-stone-400 bg-stone-100', to: '/attivita' },
    { label: 'Da sollecitare', value: nudge.length, icon: Bell, tone: nudge.length ? 'text-amber-600 bg-amber-50' : 'text-stone-400 bg-stone-100', to: '/approvazioni' },
    { label: 'Da programmare', value: toSchedule.length, icon: Send, tone: toSchedule.length ? 'text-emerald-600 bg-emerald-50' : 'text-stone-400 bg-stone-100', to: '/approvazioni' },
    { label: 'In uscita oggi', value: outToday.length, icon: CalendarClock, tone: outToday.length ? 'text-brand-600 bg-brand-50' : 'text-stone-400 bg-stone-100', to: '/calendario' },
  ]

  const startSession = (clientId: string) => {
    useStore.getState().startSession(clientId, 60)
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
    nav(`/clienti/${clientId}`)
  }

  return (
    <div className="mx-auto max-w-7xl pb-10">
      {/* Saluto */}
      <div className="px-4 pt-4 md:px-8 md:pt-8">
        <div className={cx('relative overflow-clip rounded-3xl bg-gradient-to-br p-5 text-white shadow-lift md:p-7', HERO_BG[g.period])}>
          <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-10 size-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white/80">{capitalize(fmt(new Date(), 'EEEE d MMMM'))}</p>
              <h1 className="mt-1 animate-rise text-[26px] leading-tight font-extrabold tracking-tight md:text-4xl">
                {g.hello} <span className="inline-block animate-wave">{g.emoji}</span>
              </h1>
              <p className="mt-2 max-w-xl animate-rise text-[15px] leading-snug text-white/90 [animation-delay:120ms] md:text-base">{g.mood}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ProgressRing done={doneToday} total={doneToday + dueNow} />
              <span className="text-[11px] font-semibold text-white/80">oggi</span>
            </div>
          </div>
          <div className="relative mt-4 hidden md:block">
            <QuickCreate />
          </div>
        </div>
      </div>

      {/* Prossima mossa */}
      {top && (
        <div className="px-4 pt-4 md:px-8">
          <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-soft ring-1 ring-stone-900/5 md:p-4">
            <ClientAvatar client={top.c} size="lg" />
            <button type="button" onClick={() => nav(`/clienti/${top.c.id}`)} className="min-w-0 flex-1 text-left">
              <p className="text-[11px] font-bold tracking-wider text-brand-600 uppercase">La tua prossima mossa</p>
              <p className="truncate font-bold">{top.c.name}</p>
              <p className="truncate text-sm text-stone-500">{top.p.nextAction}</p>
            </button>
            {session?.clientId === top.c.id ? (
              <Button variant="secondary" onClick={() => nav(`/clienti/${top.c.id}`)} icon={<ArrowRight size={16} />}>
                <span className="hidden sm:inline">Continua</span>
              </Button>
            ) : (
              <Button variant="primary" className="h-11 px-4" onClick={() => startSession(top.c.id)} icon={<Play size={15} />}>
                <span className="hidden sm:inline">Inizia</span> 60′
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Numeri del giorno: scorrevoli su telefono */}
      <div className="-mb-1 flex snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pt-4 pb-1 md:grid md:grid-cols-4 md:gap-3 md:overflow-visible md:px-8 [&::-webkit-scrollbar]:hidden">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => nav(s.to)}
            className="flex min-w-[42%] shrink-0 snap-start items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-soft ring-1 ring-stone-900/5 transition active:scale-[0.98] md:min-w-0 md:hover:-translate-y-px md:hover:shadow-lift"
          >
            <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-xl', s.tone)}>
              <s.icon size={19} />
            </span>
            <span>
              <span className="block text-2xl leading-none font-extrabold tabular-nums">{s.value}</span>
              <span className="mt-1 block text-[13px] leading-tight font-medium text-stone-500">{s.label}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 px-4 md:px-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="min-w-0 space-y-6">
          {/* Clienti */}
          <div>
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 className="text-lg font-bold tracking-tight">I tuoi clienti</h2>
              <span className="text-xs text-stone-400">dal più urgente</span>
            </div>
            <Card className="divide-y divide-stone-100 overflow-hidden">
              {ranked.map(({ c, p }) => {
                const worked = lastWorked[c.id]
                const isCurrent = session?.clientId === c.id
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 transition active:bg-stone-50 md:p-3.5 md:hover:bg-stone-50/70">
                    <button type="button" onClick={() => nav(`/clienti/${c.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="relative">
                        <ClientAvatar client={c} />
                        <span className={cx('absolute -top-0.5 -right-0.5 size-3 rounded-full ring-2 ring-white', URGENCY_META[p.urgency].dot)} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{c.name}</p>
                        <p className="truncate text-[13px] text-stone-500">
                          {p.nextAction}
                          {worked && (
                            <span className="hidden text-stone-400 sm:inline"> · ultima sessione {formatDistanceToNowStrict(new Date(worked), { locale: it, addSuffix: true })}</span>
                          )}
                        </p>
                      </div>
                    </button>
                    {isCurrent ? (
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">In corso</span>
                    ) : (
                      <>
                        <span className="hidden sm:block">
                          <Button size="sm" variant="secondary" icon={<Play size={13} />} onClick={() => startSession(c.id)}>
                            Inizia 60′
                          </Button>
                        </span>
                        <ChevronRight size={18} className="shrink-0 text-stone-300 sm:hidden" />
                      </>
                    )}
                  </div>
                )
              })}
              {ranked.length === 0 && (
                <EmptyState icon={<Users size={22} />} title="Nessun cliente" text="Aggiungi i tuoi clienti per vedere qui su chi concentrarti." action={<Button variant="primary" onClick={() => nav('/clienti?nuovo=1')}>Aggiungi cliente</Button>} />
              )}
            </Card>
          </div>

          {outToday.length > 0 && (
            <div>
              <h2 className="mb-2.5 text-lg font-bold tracking-tight">In uscita oggi</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {outToday.map((p) => (
                  <PostCard key={p.id} post={p} client={clients.find((c) => c.id === p.clientId)} showClient />
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="min-w-0 space-y-6">
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Da fare</h2>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => useUi.getState().openTask({})}>
                  Aggiungi
                </Button>
              </div>
            </div>
            <Card className="p-1.5">
              {urgentTasks.length === 0 ? (
                <EmptyState icon={<CheckCircle2 size={22} />} title="Niente in scadenza" text="Nei prossimi 3 giorni non scade niente. 🎉" />
              ) : (
                urgentTasks.map((t) => <TaskRow key={t.id} task={t} />)
              )}
              <button type="button" onClick={() => nav('/attivita')} className="flex w-full items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50">
                Tutte le attività <ChevronRight size={15} />
              </button>
            </Card>
          </div>

          <div>
            <h2 className="mb-2.5 text-lg font-bold tracking-tight">Prossimi eventi</h2>
            <Card className="divide-y divide-stone-100">
              {upcomingEvents.length === 0 ? (
                <EmptyState icon={<CalendarDays size={22} />} title="Nessun evento nelle prossime 2 settimane" />
              ) : (
                upcomingEvents.map((e) => {
                  const c = clients.find((x) => x.id === e.clientId)
                  const pending = e.influencers.filter((i) => !i.received).length
                  return (
                    <button key={e.id} type="button" onClick={() => useUi.getState().openEvent({ eventId: e.id })} className="flex w-full items-center gap-3 p-3.5 text-left active:bg-stone-50 md:hover:bg-stone-50/70">
                      <div className="flex w-11 shrink-0 flex-col items-center rounded-xl bg-pink-50 py-1 text-pink-700">
                        <span className="text-[10px] font-bold uppercase">{fmt(e.date, 'MMM')}</span>
                        <span className="text-lg leading-none font-extrabold">{fmt(e.date, 'd')}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{e.name}</p>
                        <p className="truncate text-sm text-stone-500">
                          {c?.name} · {relativeDay(e.date)}
                          {pending > 0 && <span className="font-medium text-pink-600"> · {pending} influencer da sentire</span>}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}

function Welcome({ name }: { name: string | null }) {
  const nav = useNavigate()
  const { loadDemo, setOnboarded } = useStore.getState()
  const g = greeting({ firstName: name, urgent: 0, dueToday: 0, doneToday: 0, outToday: 0, topClient: null, topAction: null })
  const steps = [
    { icon: Users, title: 'Aggiungi i clienti', text: 'Tono di voce, giorni e orari: una volta sola, poi li hai sempre davanti.' },
    { icon: Sparkles, title: 'Fatti aiutare dall’AI', text: 'Le bozze della settimana arrivano già nel tono giusto.' },
    { icon: Bell, title: 'Rilassati', text: 'Volantini, influencer e approvazioni: te li ricordo io.' },
  ]
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-5 py-8 md:px-6 md:py-12">
      <p className="text-4xl">{g.emoji}</p>
      <h1 className="mt-3 animate-rise text-3xl font-extrabold tracking-tight md:text-4xl">
        {name ? `Benvenuto in Regia, ${name}!` : 'Benvenuto in Regia!'}
      </h1>
      <p className="mt-3 max-w-xl animate-rise text-lg text-stone-500 [animation-delay:120ms]">Tutti i tuoi clienti sotto controllo, in tre passi.</p>

      <button
        type="button"
        onClick={openTutorial}
        className="group relative mt-6 flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 p-4 text-left text-white shadow-lift transition active:scale-[0.99]"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30 transition group-hover:scale-110">
          <PlayCircle size={28} />
        </span>
        <span>
          <span className="block font-bold">Guarda come funziona</span>
          <span className="block text-sm text-white/80">Tutorial di 1 minuto</span>
        </span>
      </button>

      <ol className="mt-6 space-y-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-stone-900/5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <s.icon size={18} />
            </span>
            <div>
              <p className="font-semibold">
                {i + 1}. {s.title}
              </p>
              <p className="mt-0.5 text-sm text-stone-500">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Button
          variant="primary"
          className="h-12 text-[15px]"
          icon={<UserPlus size={17} />}
          onClick={() => {
            setOnboarded()
            nav('/clienti?nuovo=1')
          }}
        >
          Aggiungi il primo cliente
        </Button>
        <Button variant="secondary" className="h-12 text-[15px]" onClick={loadDemo}>
          Prova con dati di esempio
        </Button>
      </div>
    </div>
  )
}
