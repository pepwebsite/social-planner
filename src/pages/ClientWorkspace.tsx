import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronDown, ClipboardCopy, MessageCircle, PartyPopper, Play, Plus, Printer, Send, Sparkles, UserRound } from 'lucide-react'
import type { Client } from '../types'
import { useStore } from '../store'
import { useUi } from '../ui'
import { capitalize, fmt, fromISO, relativeDay, todayISO, toISO, weekDays, weekLabel, weekStart } from '../lib/dates'
import { FORMAT_LABEL, PLATFORM_META } from '../lib/meta'
import { clientPulse, slotCovered, slotsForWeek, URGENCY_META } from '../lib/insights'
import { whatsappLink } from '../lib/approval'
import { QuickCreate } from '../components/Layout'
import { WeekNav } from '../components/WeekNav'
import { PostCard } from '../components/PostCard'
import { TaskRow } from '../components/Tasks'
import { AiWeekModal } from '../components/AiWeekModal'
import { ApprovalModal } from '../components/ApprovalModal'
import { Button, Card, ClientAvatar, EmptyState, PlatformBadge, cx } from '../components/ui'
import { ClientProfile } from './ClientProfile'

type Tab = 'settimana' | 'attivita' | 'eventi' | 'scheda'
const TABS: { value: Tab; label: string }[] = [
  { value: 'settimana', label: 'Settimana' },
  { value: 'attivita', label: 'Attività' },
  { value: 'eventi', label: 'Eventi' },
  { value: 'scheda', label: 'Scheda' },
]

export function ClientWorkspace() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const client = useStore((s) => s.clients.find((c) => c.id === id))
  const posts = useStore((s) => s.posts)
  const tasks = useStore((s) => s.tasks)
  const events = useStore((s) => s.events)
  const session = useStore((s) => s.session)
  const tab = (params.get('tab') as Tab) || 'settimana'
  const wParam = params.get('w')
  const start = wParam ? weekStart(fromISO(wParam)) : weekStart(new Date())

  const setTab = (t: Tab) => setParams((p) => ({ ...Object.fromEntries(p), tab: t }), { replace: true })
  const setStart = (d: Date) => setParams((p) => ({ ...Object.fromEntries(p), w: toISO(d) }), { replace: true })

  useEffect(() => {
    if (id) useStore.getState().touchClient(id)
  }, [id])

  if (!client) {
    return (
      <EmptyState icon={<UserRound size={22} />} title="Cliente non trovato" action={<Link to="/clienti" className="font-semibold text-brand-600">Torna ai clienti</Link>} />
    )
  }

  const pulse = clientPulse(client, posts, tasks, events)
  const openTasks = tasks.filter((t) => t.clientId === client.id && !t.done).length

  return (
    <div className="pb-10">
      {/* Header cliente */}
      <div className="px-4 pt-6 md:px-8 md:pt-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 basis-64 items-center gap-4">
            <ClientAvatar client={client} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="truncate text-2xl font-extrabold tracking-tight">{client.name}</h1>
                <span className={cx('rounded-full px-2 py-px text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset', URGENCY_META[pulse.urgency].cls)}>{pulse.nextAction}</span>
              </div>
              <p className="truncate text-sm text-stone-500">{[client.sector, client.platforms.map((p) => PLATFORM_META[p].label).join(' · ')].filter(Boolean).join(' — ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session?.clientId !== client.id && (
              <Button
                variant="secondary"
                icon={<Play size={14} />}
                onClick={() => {
                  useStore.getState().startSession(client.id, 60)
                  if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
                }}
              >
                Sessione 60′
              </Button>
            )}
            <QuickCreate clientId={client.id} />
          </div>
        </div>

        <div className="mt-5 flex gap-1 overflow-x-auto border-b border-stone-200">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cx('-mb-px border-b-2 px-3 pb-2.5 whitespace-nowrap text-sm font-semibold transition', tab === t.value ? 'border-brand-600 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800')}
            >
              {t.label}
              {t.value === 'attivita' && openTasks > 0 && <span className="ml-1.5 rounded-full bg-stone-200 px-1.5 text-[11px]">{openTasks}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 md:px-8">
        {tab === 'settimana' && <WeekTab client={client} start={start} setStart={setStart} />}
        {tab === 'attivita' && <TasksTab client={client} />}
        {tab === 'eventi' && <EventsTab client={client} />}
        {tab === 'scheda' && (
          <div className="max-w-3xl">
            <ClientProfile client={client} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- Settimana ---- */

function WeekTab({ client, start, setStart }: { client: Client; start: Date; setStart: (d: Date) => void }) {
  const posts = useStore((s) => s.posts)
  const events = useStore((s) => s.events)
  const ui = useUi.getState()
  const [ai, setAi] = useState(false)
  const [approval, setApproval] = useState(false)

  const days = weekDays(start)
  const iso = days.map(toISO)
  const today = todayISO()
  const own = posts.filter((p) => p.clientId === client.id && p.date >= iso[0] && p.date <= iso[6])
  const slots = slotsForWeek(client, start)
  const covered = slots.filter((s) => slotCovered(s, own)).length
  const toApprove = own.filter((p) => p.status === 'bozza' || p.status === 'idea')
  const approvalCandidates = own.filter((p) => ['idea', 'bozza', 'in_approvazione'].includes(p.status))

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <WeekNav start={start} onChange={setStart} />
          <div className="flex-1" />
          <Button variant="ai" icon={<Sparkles size={15} />} onClick={() => setAi(true)}>
            Bozza AI
          </Button>
          <Button variant="secondary" icon={<Send size={15} />} onClick={() => setApproval(true)} disabled={approvalCandidates.length === 0}>
            Invia in approvazione{toApprove.length > 0 && ` (${toApprove.length})`}
          </Button>
          <Link
            to={`/clienti/${client.id}/stampa?w=${iso[0]}`}
            target="_blank"
            className="inline-flex size-10 items-center justify-center rounded-xl bg-surface text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
            title="Piano editoriale stampabile / PDF"
          >
            <Printer size={16} />
          </Link>
        </div>

        {slots.length > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-soft ring-1 ring-stone-900/5">
            <p className="text-sm font-semibold whitespace-nowrap">
              {covered}/{slots.length} uscite coperte
            </p>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
              <div className={cx('h-full rounded-full transition-all', covered === slots.length ? 'bg-emerald-500' : 'bg-brand-500')} style={{ width: `${(covered / slots.length) * 100}%` }} />
            </div>
            {covered < slots.length && (
              <button type="button" onClick={() => setAi(true)} className="text-sm font-semibold whitespace-nowrap text-violet-600 hover:text-violet-800">
                Completa con AI →
              </button>
            )}
          </div>
        )}

        <div className="space-y-2">
          {iso.map((date, i) => {
            const dayPosts = own.filter((p) => p.date === date).sort((a, b) => a.time.localeCompare(b.time))
            const missing = slots.filter((s) => s.date === date && !slotCovered(s, own))
            const dayEvents = events.filter((e) => e.clientId === client.id && e.date === date)
            const past = date < today
            return (
              <div key={date} className={cx('flex flex-col gap-3 rounded-2xl p-3 sm:flex-row', date === today ? 'bg-brand-50/70 ring-1 ring-brand-200' : 'bg-surface/60 ring-1 ring-stone-900/5', past && 'opacity-70')}>
                <div className="flex w-24 shrink-0 items-baseline gap-2 sm:flex-col sm:gap-0">
                  <p className={cx('text-xs font-bold tracking-wide uppercase', date === today ? 'text-brand-600' : 'text-stone-400')}>{fmt(days[i], 'EEEE')}</p>
                  <p className="text-xl font-extrabold whitespace-nowrap">{fmt(days[i], 'd MMM')}</p>
                </div>
                <div className="grid flex-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                  {dayEvents.map((e) => (
                    <button key={e.id} type="button" onClick={() => ui.openEvent({ eventId: e.id })} className="flex items-center gap-2 rounded-xl bg-pink-50 px-3 py-2.5 text-left text-sm font-semibold text-pink-700 ring-1 ring-pink-200">
                      <PartyPopper size={15} /> <span className="truncate">{e.name}</span>
                    </button>
                  ))}
                  {dayPosts.map((p) => (
                    <PostCard key={p.id} post={p} client={client} />
                  ))}
                  {missing.map((s) => (
                    <button
                      key={s.slotId}
                      type="button"
                      onClick={() => ui.newPost({ clientId: client.id, date, time: s.time, platform: s.platform, format: s.format, status: 'bozza' })}
                      className={cx('flex min-h-16 items-center gap-2 rounded-xl border-2 border-dashed px-3 py-2 text-left text-sm font-medium transition', past ? 'border-stone-200 text-stone-400' : 'border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50/50')}
                    >
                      <Plus size={15} />
                      <span>
                        {s.time} · {PLATFORM_META[s.platform].label} {FORMAT_LABEL[s.format]}
                        <span className="block text-xs font-normal opacity-80">uscita da coprire</span>
                      </span>
                    </button>
                  ))}
                  {dayPosts.length === 0 && missing.length === 0 && (
                    <button type="button" onClick={() => ui.newPost({ clientId: client.id, date })} className="flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm text-stone-400 transition hover:bg-surface hover:text-stone-600">
                      <Plus size={15} /> Aggiungi
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <BriefPanel client={client} />

      {ai && <AiWeekModal client={client} start={start} onClose={() => setAi(false)} />}
      {approval && <ApprovalModal client={client} posts={approvalCandidates} period={`la settimana ${weekLabel(start)}`} onClose={() => setApproval(false)} />}
    </div>
  )
}

/** Promemoria rapido della scheda: sempre visibile mentre si lavora */
function BriefPanel({ client }: { client: Client }) {
  const [open, setOpen] = useState(true)
  const toast = useUi((s) => s.toast)
  const rows = [
    { label: 'Tono di voce', value: client.tone },
    { label: '✅ Da fare', value: client.doList },
    { label: '⛔ Da evitare', value: client.dontList },
  ].filter((r) => r.value.trim())

  return (
    <aside className="xl:sticky xl:top-16 xl:self-start">
      <Card className="overflow-hidden">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
          <span className="font-bold">Promemoria cliente</span>
          <ChevronDown size={16} className={cx('text-stone-400 transition xl:hidden', open && 'rotate-180')} />
        </button>
        <div className={cx('space-y-4 border-t border-stone-100 px-4 py-4 text-sm', !open && 'hidden xl:block')}>
          {rows.length === 0 && (
            <p className="text-stone-500">
              La scheda è vuota. <Link to="?tab=scheda" className="font-semibold text-brand-600">Compilala</Link> per avere tono e regole sempre sott’occhio.
            </p>
          )}
          {rows.map((r) => (
            <div key={r.label}>
              <p className="mb-1 text-xs font-bold tracking-wide text-stone-400 uppercase">{r.label}</p>
              <p className="whitespace-pre-line text-stone-700">{r.value}</p>
            </div>
          ))}
          {client.hashtags && (
            <div>
              <p className="mb-1 text-xs font-bold tracking-wide text-stone-400 uppercase">Hashtag</p>
              <button type="button" onClick={() => navigator.clipboard.writeText(client.hashtags).then(() => toast('Hashtag copiati'))} className="group flex w-full items-start gap-2 rounded-lg bg-stone-50 px-2.5 py-2 text-left text-brand-700 hover:bg-brand-50">
                <span className="flex-1">{client.hashtags}</span>
                <ClipboardCopy size={14} className="mt-0.5 shrink-0 text-stone-400 group-hover:text-brand-600" />
              </button>
            </div>
          )}
          {client.slots.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-bold tracking-wide text-stone-400 uppercase">Uscite fisse</p>
              <div className="space-y-1">
                {[...client.slots]
                  .sort((a, b) => a.weekday - b.weekday)
                  .map((s) => (
                    <p key={s.id} className="flex items-center gap-2 text-stone-700">
                      <PlatformBadge platform={s.platform} />
                      <span className="w-9 font-semibold">{['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][s.weekday]}</span>
                      {s.time} · {FORMAT_LABEL[s.format]}
                    </p>
                  ))}
              </div>
            </div>
          )}
          {client.contacts.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-bold tracking-wide text-stone-400 uppercase">Contatti</p>
              <div className="space-y-1.5">
                {client.contacts.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.name}</p>
                      {c.role && <p className="truncate text-xs text-stone-500">{c.role}</p>}
                    </div>
                    {c.phone && (
                      <a href={whatsappLink(c.phone, '')} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-[#25a35a] hover:bg-emerald-50" title={`WhatsApp ${c.phone}`}>
                        <MessageCircle size={16} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <Link to="?tab=scheda" className="block text-xs font-semibold text-brand-600">
            Modifica scheda →
          </Link>
        </div>
      </Card>
    </aside>
  )
}

/* ------------------------------------------------------------ Attività ---- */

function TasksTab({ client }: { client: Client }) {
  const tasks = useStore((s) => s.tasks)
  const [showDone, setShowDone] = useState(false)
  const own = tasks.filter((t) => t.clientId === client.id)
  const open = own.filter((t) => !t.done).sort((a, b) => a.due.localeCompare(b.due))
  const done = own.filter((t) => t.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">Promemoria e cose da chiedere per {client.name}.</p>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => useUi.getState().openTask({ clientId: client.id })}>
          Nuova attività
        </Button>
      </div>
      <Card className="p-1.5">
        {open.length ? open.map((t) => <TaskRow key={t.id} task={t} showClient={false} />) : <EmptyState icon={<Plus size={20} />} title="Nessuna attività aperta" text="Es. “Chiedere il volantino ogni lunedì” come attività ricorrente." />}
      </Card>
      {done.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowDone((s) => !s)} className="text-sm font-semibold text-stone-500 hover:text-stone-800">
            {showDone ? 'Nascondi' : 'Mostra'} completate ({done.length})
          </button>
          {showDone && <Card className="mt-2 p-1.5">{done.slice(0, 30).map((t) => <TaskRow key={t.id} task={t} showClient={false} />)}</Card>}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- Eventi ---- */

function EventsTab({ client }: { client: Client }) {
  const events = useStore((s) => s.events)
  const toggle = useStore((s) => s.toggleInfluencerReceived)
  const today = todayISO()
  const own = events.filter((e) => e.clientId === client.id).sort((a, b) => a.date.localeCompare(b.date))
  const upcoming = own.filter((e) => e.date >= today)
  const past = own.filter((e) => e.date < today).reverse()

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">Eventi, influencer e materiali da raccogliere.</p>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => useUi.getState().openEvent({ clientId: client.id })}>
          Nuovo evento
        </Button>
      </div>
      {upcoming.length === 0 && (
        <Card>
          <EmptyState icon={<PartyPopper size={22} />} title="Nessun evento in programma" text="Crea un evento e aggiungi gli influencer: ti ricorderò di chiedere script e video in tempo." />
        </Card>
      )}
      {[...upcoming, ...past].map((e) => {
        const isPast = e.date < today
        return (
          <Card key={e.id} className={cx('p-4', isPast && 'opacity-60')}>
            <div className="flex items-start gap-3">
              <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-pink-50 py-1.5 text-pink-700">
                <span className="text-[10px] font-bold uppercase">{fmt(e.date, 'MMM')}</span>
                <span className="text-xl leading-none font-extrabold">{fmt(e.date, 'd')}</span>
              </div>
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => useUi.getState().openEvent({ eventId: e.id })} className="text-left font-bold hover:text-brand-700">
                  {e.name}
                </button>
                <p className="text-sm text-stone-500">
                  {capitalize(fmt(e.date, 'EEEE'))}
                  {e.time && ` · ${e.time}`}
                  {e.location && ` · ${e.location}`} · {relativeDay(e.date)}
                </p>
                {e.notes && <p className="mt-1 text-sm text-stone-600">{e.notes}</p>}
              </div>
            </div>
            {e.influencers.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-stone-100 pt-3">
                {e.influencers.map((i) => (
                  <label key={i.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-1 hover:bg-stone-50">
                    <input type="checkbox" checked={i.received} onChange={() => toggle(e.id, i.id)} className="size-4 accent-emerald-600" />
                    <span className={cx('flex-1 text-sm', i.received && 'text-stone-400 line-through')}>
                      <b>{i.name}</b> {i.handle && <span className="text-stone-500">{i.handle}</span>} {i.deliverables && `— ${i.deliverables}`}
                    </span>
                    <span className={cx('rounded-full px-2 py-px text-[11px] font-semibold', i.received ? 'bg-emerald-50 text-emerald-700' : 'bg-pink-50 text-pink-700')}>
                      {i.received ? 'Ricevuto' : 'In attesa'}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
