import { useNavigate } from 'react-router-dom'
import { addDays, formatDistanceToNowStrict } from 'date-fns'
import { it } from 'date-fns/locale'
import { Bell, CalendarClock, CalendarDays, CheckCircle2, ListTodo, Play, Plus, Send, Sparkles, UserPlus, Users } from 'lucide-react'
import { useStore } from '../store'
import { useUi } from '../ui'
import { capitalize, fmt, relativeDay, todayISO, toISO } from '../lib/dates'
import { clientPulse, isDueToday, isOverdue, needsNudge, URGENCY_META } from '../lib/insights'
import { PageHeader, QuickCreate } from '../components/Layout'
import { TaskRow } from '../components/Tasks'
import { PostCard } from '../components/PostCard'
import { Button, Card, ClientAvatar, EmptyState, cx } from '../components/ui'

function greeting() {
  const h = new Date().getHours()
  if (h < 13) return 'Buongiorno'
  if (h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

export function Today() {
  const clients = useStore((s) => s.clients)
  const posts = useStore((s) => s.posts)
  const tasks = useStore((s) => s.tasks)
  const events = useStore((s) => s.events)
  const lastWorked = useStore((s) => s.lastWorked)
  const onboarded = useStore((s) => s.onboarded)
  const session = useStore((s) => s.session)
  const nav = useNavigate()

  const active = clients.filter((c) => !c.archived)
  if (!onboarded && active.length === 0) return <Welcome />

  const today = todayISO()
  const in3 = toISO(addDays(new Date(), 3))
  const urgentTasks = tasks
    .filter((t) => !t.done && t.due <= in3)
    .sort((a, b) => a.due.localeCompare(b.due))
  const dueNow = tasks.filter((t) => isOverdue(t) || isDueToday(t)).length
  const nudge = posts.filter(needsNudge)
  const toSchedule = posts.filter((p) => p.status === 'approvato' && p.date >= today)
  const outToday = posts.filter((p) => p.date === today).sort((a, b) => a.time.localeCompare(b.time))
  const upcomingEvents = events
    .filter((e) => e.date >= today && e.date <= toISO(addDays(new Date(), 14)))
    .sort((a, b) => a.date.localeCompare(b.date))

  const ranked = active
    .map((c) => ({ c, p: clientPulse(c, posts, tasks, events) }))
    .sort((a, b) => b.p.score - a.p.score || (lastWorked[a.c.id] ?? '').localeCompare(lastWorked[b.c.id] ?? ''))

  const stats = [
    { label: 'Da fare oggi', value: dueNow, icon: ListTodo, tone: dueNow ? 'text-rose-600 bg-rose-50' : 'text-stone-400 bg-stone-100', to: '/attivita' },
    { label: 'Da sollecitare', value: nudge.length, icon: Bell, tone: nudge.length ? 'text-amber-600 bg-amber-50' : 'text-stone-400 bg-stone-100', to: '/approvazioni' },
    { label: 'Da programmare', value: toSchedule.length, icon: Send, tone: toSchedule.length ? 'text-emerald-600 bg-emerald-50' : 'text-stone-400 bg-stone-100', to: '/approvazioni' },
    { label: 'In uscita oggi', value: outToday.length, icon: CalendarClock, tone: outToday.length ? 'text-brand-600 bg-brand-50' : 'text-stone-400 bg-stone-100', to: '/calendario' },
  ]

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <PageHeader
        eyebrow={capitalize(fmt(new Date(), 'EEEE d MMMM'))}
        title={`${greeting()} 👋`}
        subtitle={
          ranked[0] && ranked[0].p.urgency !== 'ok'
            ? `Parti da ${ranked[0].c.name}: ${ranked[0].p.nextAction.toLowerCase()}.`
            : 'Tutto sotto controllo. Ottimo momento per preparare la prossima settimana.'
        }
        actions={<QuickCreate />}
      />

      <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-4 md:px-8">
        {stats.map((s) => (
          <button key={s.label} type="button" onClick={() => nav(s.to)} className="group rounded-2xl bg-white p-3.5 text-left md:p-4 shadow-soft ring-1 ring-stone-900/5 transition hover:-translate-y-px hover:shadow-lift">
            <span className={cx('mb-2 flex size-8 md:mb-3 md:size-9 items-center justify-center rounded-xl', s.tone)}>
              <s.icon size={18} />
            </span>
            <p className="text-2xl font-extrabold tabular-nums">{s.value}</p>
            <p className="text-sm font-medium text-stone-500">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 px-4 md:px-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Su chi lavorare */}
        <section className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-bold tracking-tight">Su chi lavorare adesso</h2>
            <span className="text-xs text-stone-400">ordinati per urgenza</span>
          </div>
          <Card className="divide-y divide-stone-100">
            {ranked.map(({ c, p }) => {
              const worked = lastWorked[c.id]
              const isCurrent = session?.clientId === c.id
              return (
                <div key={c.id} className="flex items-center gap-3 p-3.5 transition hover:bg-stone-50/70">
                  <button type="button" onClick={() => nav(`/clienti/${c.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <ClientAvatar client={c} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{c.name}</p>
                        <span className={cx('hidden shrink-0 rounded-full px-2 py-px text-[11px] font-semibold ring-1 ring-inset sm:inline', URGENCY_META[p.urgency].cls)}>
                          {URGENCY_META[p.urgency].label}
                        </span>
                      </div>
                      <p className="truncate text-sm text-stone-500">
                        {p.nextAction}
                        {worked && <span className="text-stone-400"> · ultima sessione {formatDistanceToNowStrict(new Date(worked), { locale: it, addSuffix: true })}</span>}
                      </p>
                    </div>
                  </button>
                  {isCurrent ? (
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">In corso</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Play size={13} />}
                      title="Avvia una sessione di 60 minuti su questo cliente"
                      onClick={() => {
                        useStore.getState().startSession(c.id, 60)
                        if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
                        nav(`/clienti/${c.id}`)
                      }}
                    >
                      <span className="hidden sm:inline">Inizia</span> 60′
                    </Button>
                  )}
                </div>
              )
            })}
            {ranked.length === 0 && (
              <EmptyState icon={<Users size={22} />} title="Nessun cliente" text="Aggiungi i tuoi clienti per vedere qui su chi concentrarti." action={<Button variant="primary" onClick={() => nav('/clienti?nuovo=1')}>Aggiungi cliente</Button>} />
            )}
          </Card>

          {outToday.length > 0 && (
            <>
              <h2 className="mt-6 mb-3 text-lg font-bold tracking-tight">In uscita oggi</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {outToday.map((p) => (
                  <PostCard key={p.id} post={p} client={clients.find((c) => c.id === p.clientId)} showClient />
                ))}
              </div>
            </>
          )}
        </section>

        {/* Colonna destra */}
        <section className="min-w-0 space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Attività</h2>
              <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => useUi.getState().openTask({})}>
                Aggiungi
              </Button>
            </div>
            <Card className="p-1.5">
              {urgentTasks.length === 0 ? (
                <EmptyState icon={<CheckCircle2 size={22} />} title="Niente in scadenza" text="Nei prossimi 3 giorni non scade niente. 🎉" />
              ) : (
                urgentTasks.map((t) => <TaskRow key={t.id} task={t} />)
              )}
            </Card>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold tracking-tight">Prossimi eventi</h2>
            <Card className="divide-y divide-stone-100">
              {upcomingEvents.length === 0 ? (
                <EmptyState icon={<CalendarDays size={22} />} title="Nessun evento nelle prossime 2 settimane" />
              ) : (
                upcomingEvents.map((e) => {
                  const c = clients.find((x) => x.id === e.clientId)
                  const pending = e.influencers.filter((i) => !i.received).length
                  return (
                    <button key={e.id} type="button" onClick={() => useUi.getState().openEvent({ eventId: e.id })} className="flex w-full items-center gap-3 p-3.5 text-left hover:bg-stone-50/70">
                      <div className="flex w-11 shrink-0 flex-col items-center rounded-xl bg-stone-100 py-1">
                        <span className="text-[10px] font-bold text-stone-500 uppercase">{fmt(e.date, 'MMM')}</span>
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

function Welcome() {
  const nav = useNavigate()
  const { loadDemo, setOnboarded } = useStore.getState()
  const features = [
    { icon: Users, title: 'Una scheda per cliente', text: 'Tono di voce, giorni, orari e contatti sempre davanti. Cambi cliente in 30 secondi.' },
    { icon: Sparkles, title: 'Bozze scritte dall’AI', text: 'Il calendario della settimana, già nel tono giusto. Tu rivedi e rifinisci.' },
    { icon: Bell, title: 'Promemoria automatici', text: 'Volantino del lunedì, materiali degli influencer, approvazioni da sollecitare.' },
  ]
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-6 py-12">
      <img src="/favicon.svg" alt="" className="mb-6 size-14" />
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Tutti i tuoi clienti, sotto controllo.</h1>
      <p className="mt-3 max-w-xl text-lg text-stone-500">
        Regia ti dice su chi lavorare adesso, prepara le bozze della settimana e si ricorda al posto tuo di chiedere volantini, video e approvazioni.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title} className="p-4">
            <f.icon size={20} className="mb-2 text-brand-600" />
            <p className="font-semibold">{f.title}</p>
            <p className="mt-1 text-sm text-stone-500">{f.text}</p>
          </Card>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button
          variant="primary"
          icon={<UserPlus size={16} />}
          onClick={() => {
            setOnboarded()
            nav('/clienti?nuovo=1')
          }}
        >
          Aggiungi il primo cliente
        </Button>
        <Button variant="secondary" onClick={loadDemo}>
          Esplora con dati di esempio
        </Button>
      </div>
    </div>
  )
}
