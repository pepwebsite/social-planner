import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { addDays, addMonths, endOfMonth, isSameMonth, startOfMonth } from 'date-fns'
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, LayoutGrid, List, PartyPopper, Plus, Users } from 'lucide-react'
import type { Client, ClientEvent, Post, PostStatus } from '../types'
import { useStore } from '../store'
import { useUi } from '../ui'
import { capitalize, fmt, todayISO, toISO, weekDays, weekLabel, weekStart } from '../lib/dates'
import { FORMAT_LABEL, STATUSES, STATUS_META, WEEKDAYS_SHORT } from '../lib/meta'
import { slotsForWeek, slotCovered, type SlotInstance } from '../lib/insights'
import { PageHeader, QuickCreate } from '../components/Layout'
import { GoogleCalendarIcon, GoogleCalendarModal } from '../components/GoogleCalendarModal'
import { useExternalItems, type ExternalEntry } from '../lib/calendarLinks'
import { PostCard } from '../components/PostCard'
import { ClientAvatar, EmptyState, IconButton, PlatformBadge, Select, cx } from '../components/ui'

type View = 'mese' | 'settimana' | 'clienti' | 'agenda'

const VIEWS: { value: View; label: string; icon: typeof CalendarDays }[] = [
  { value: 'mese', label: 'Mese', icon: LayoutGrid },
  { value: 'settimana', label: 'Settimana', icon: CalendarRange },
  { value: 'clienti', label: 'Clienti', icon: Users },
  { value: 'agenda', label: 'Agenda', icon: List },
]

const VIEW_KEY = 'regia-cal-view'
function initialView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY) as View | null
    if (v && VIEWS.some((x) => x.value === v)) return v
  } catch {
    /* storage non disponibile */
  }
  return window.matchMedia('(min-width: 768px)').matches ? 'clienti' : 'agenda'
}

interface Missing {
  client: Client
  slot: SlotInstance
}

/* ------------------------------------------------------------------ Pagina ---- */

export function CalendarPage() {
  const [view, setViewState] = useState<View>(initialView)
  const [anchor, setAnchor] = useState(() => new Date())
  const [selected, setSelected] = useState(() => todayISO())
  const [hidden, setHidden] = useState<string[]>([])
  const [status, setStatus] = useState<PostStatus | ''>('')
  const allClients = useStore((s) => s.clients)
  const posts = useStore((s) => s.posts)
  const events = useStore((s) => s.events)
  const [gcal, setGcal] = useState(false)
  const { items: external, errors: extErrors } = useExternalItems()

  const setView = (v: View) => {
    setViewState(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* storage non disponibile */
    }
  }

  const clients = allClients.filter((c) => !c.archived)
  const visible = clients.filter((c) => !hidden.includes(c.id))
  const visibleIds = new Set(visible.map((c) => c.id))
  const filteredPosts = posts.filter((p) => visibleIds.has(p.clientId) && (!status || p.status === status))
  const filteredEvents = events.filter((e) => visibleIds.has(e.clientId))

  // Intervallo mostrato
  const monthMode = view === 'mese' || view === 'agenda'
  const wStart = weekStart(anchor)
  const range = monthMode
    ? { from: weekStart(startOfMonth(anchor)), to: addDays(weekStart(endOfMonth(anchor)), 6) }
    : { from: wStart, to: addDays(wStart, 6) }

  // Uscite previste ma senza contenuto, per giorno
  const missing = useMemo(() => {
    const map = new Map<string, Missing[]>()
    const today = todayISO()
    for (let w = range.from; w <= range.to; w = addDays(w, 7)) {
      for (const c of visible) {
        const own = posts.filter((p) => p.clientId === c.id)
        for (const s of slotsForWeek(c, w)) {
          if (s.date < today || slotCovered(s, own)) continue
          map.set(s.date, [...(map.get(s.date) ?? []), { client: c, slot: s }])
        }
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, visible.map((c) => c.id + c.slots.length).join(), range.from.getTime(), range.to.getTime()])

  const step = (dir: 1 | -1) => setAnchor((a) => (monthMode ? addMonths(a, dir) : addDays(a, 7 * dir)))
  const goToday = () => {
    setAnchor(new Date())
    setSelected(todayISO())
  }
  const wEnd = addDays(wStart, 6)
  const periodLabel = monthMode ? capitalize(fmt(anchor, 'MMMM yyyy')) : weekLabel(wStart)
  const periodShort = monthMode
    ? capitalize(fmt(anchor, 'MMM yyyy'))
    : isSameMonth(wStart, wEnd)
      ? `${fmt(wStart, 'd')}–${fmt(wEnd, 'd MMM')}`
      : `${fmt(wStart, 'd MMM')} – ${fmt(wEnd, 'd MMM')}`
  const isCurrent = monthMode ? isSameMonth(anchor, new Date()) : weekStart(new Date()).getTime() === wStart.getTime()

  const ctx: ViewProps = { clients, visible, posts: filteredPosts, events: filteredEvents, missing, anchor, selected, setSelected, external }
  const calendars = useStore((s) => s.externalCalendars)

  return (
    <div className="pb-10">
      <PageHeader title="Calendario" subtitle="Tutti i clienti, nel formato che preferisci." actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGcal(true)}
              title="Collega Google Calendar"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-surface px-3 text-sm font-semibold text-stone-700 shadow-soft ring-1 ring-stone-900/5 transition hover:bg-stone-50"
            >
              <GoogleCalendarIcon size={20} />
              Google Calendar
            </button>
            <div className="hidden md:block">
              <QuickCreate />
            </div>
          </div>
        } />

      {/* Barra comandi */}
      <div className="flex flex-col gap-3 px-4 pb-3 md:flex-row md:items-center md:px-8">
        <div className="grid grid-cols-4 rounded-xl bg-stone-900/5 p-1 md:inline-grid md:w-auto">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => setView(v.value)}
              className={cx(
                'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition',
                view === v.value ? 'bg-surface text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800',
              )}
            >
              <v.icon size={15} className="hidden sm:block" />
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 md:ml-auto">
          <div className="flex min-w-0 flex-1 items-center gap-1 rounded-xl bg-surface p-1 shadow-soft ring-1 ring-stone-900/5 md:flex-none">
            <IconButton label="Periodo precedente" className="size-8" onClick={() => step(-1)}>
              <ChevronLeft size={17} />
            </IconButton>
            <span className="min-w-0 flex-1 truncate px-1 text-center text-sm font-semibold tabular-nums md:min-w-36"><span className="md:hidden">{periodShort}</span><span className="hidden md:inline">{periodLabel}</span></span>
            <IconButton label="Periodo successivo" className="size-8" onClick={() => step(1)}>
              <ChevronRight size={17} />
            </IconButton>
            <button
              type="button"
              disabled={isCurrent}
              onClick={goToday}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:text-stone-300 disabled:hover:bg-transparent"
            >
              Oggi
            </button>
          </div>
          <div className="w-[108px] shrink-0 md:w-44">
          <Select value={status} onChange={(e) => setStatus(e.target.value as PostStatus | '')} aria-label="Filtra per stato">
              <option value="">Tutti</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Filtro clienti */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 md:flex-wrap md:px-8 [&::-webkit-scrollbar]:hidden">
        {clients.map((c) => {
          const off = hidden.includes(c.id)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setHidden((h) => (off ? h.filter((x) => x !== c.id) : [...h, c.id]))}
              className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-xs font-semibold ring-1 transition', off ? 'bg-transparent text-stone-400 ring-stone-200' : 'bg-surface text-stone-700 shadow-soft ring-stone-900/5')}
            >
              <span className={cx(off && 'opacity-40 grayscale')}>
                <ClientAvatar client={c} size="sm" />
              </span>
              {c.name}
            </button>
          )
        })}
      </div>

      {Object.entries(extErrors).map(([id, msg]) => (
        <p key={id} className="mx-4 mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200 md:mx-8">
          Non riesco a leggere «{calendars.find((c) => c.id === id)?.name ?? 'Google Calendar'}»: {msg}
        </p>
      ))}
      {gcal && <GoogleCalendarModal onClose={() => setGcal(false)} />}

      <div className="px-4 md:px-8">
        {clients.length === 0 ? (
          <EmptyState icon={<CalendarDays size={22} />} title="Nessun cliente" text="Aggiungi un cliente per iniziare a pianificare." />
        ) : view === 'mese' ? (
          <MonthView {...ctx} />
        ) : view === 'settimana' ? (
          <WeekView {...ctx} />
        ) : view === 'clienti' ? (
          <ClientsView {...ctx} />
        ) : (
          <AgendaView {...ctx} />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 text-xs text-stone-500 md:px-8">
        {STATUSES.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={cx('size-2 rounded-full', STATUS_META[s].dot)} /> {STATUS_META[s].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full border border-dashed border-rose-400" /> Uscita da coprire
        </span>
        {calendars.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <GoogleCalendarIcon size={12} /> Impegni Google Calendar
          </span>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- Condivisi ---- */

interface ViewProps {
  clients: Client[]
  visible: Client[]
  posts: Post[]
  events: ClientEvent[]
  missing: Map<string, Missing[]>
  anchor: Date
  selected: string
  setSelected: (d: string) => void
  external: ExternalEntry[]
}

const byTime = (a: Post, b: Post) => a.time.localeCompare(b.time)
const clientOf = (clients: Client[], id: string) => clients.find((c) => c.id === id)

/** Sposta un contenuto trascinato su un altro giorno (e, se indicato, controlla il cliente) */
function useDropHandlers(requireClient?: string) {
  const [over, setOver] = useState<string | null>(null)
  const drop = (date: string, key = date) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      setOver(key)
    },
    onDragLeave: () => setOver((k) => (k === key ? null : k)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      setOver(null)
      const id = e.dataTransfer.getData('text/post-id')
      const p = useStore.getState().posts.find((x) => x.id === id)
      if (!p || p.date === date) return
      const clientId = key.includes('|') ? key.split('|')[0] : requireClient
      if (clientId && p.clientId !== clientId) {
        useUi.getState().toast('Puoi spostare un contenuto solo nei giorni dello stesso cliente', 'info')
        return
      }
      useStore.getState().updatePost(id, { date })
      useUi.getState().toast(`Spostato a ${fmt(date, 'EEEE d')}`, 'ok', { label: 'Annulla', run: () => useStore.getState().updatePost(id, { date: p.date }) })
    },
  })
  return { over, drop }
}

function EventChip({ e, compact }: { e: ClientEvent; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => useUi.getState().openEvent({ eventId: e.id })}
      className={cx('flex w-full items-center gap-1 rounded-lg bg-pink-50 text-left font-semibold text-pink-700 ring-1 ring-pink-200', compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1.5 text-xs')}
    >
      <PartyPopper size={compact ? 10 : 12} className="shrink-0" /> <span className="truncate">{e.name}</span>
    </button>
  )
}

function ExternalChip({ x, compact }: { x: ExternalEntry; compact?: boolean }) {
  const when = x.allDay ? 'Tutto il giorno' : `${x.time}${x.endTime ? `–${x.endTime}` : ''}`
  return (
    <div
      title={`${x.title} · ${when}${x.location ? ` · ${x.location}` : ''} (${x.calendar.name})`}
      className={cx('flex w-full items-center gap-1.5 rounded-lg bg-stone-100 text-left text-stone-600', compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1.5 text-xs')}
      style={{ boxShadow: `inset 3px 0 0 ${x.calendar.color}` }}
    >
      <GoogleCalendarIcon size={compact ? 10 : 12} className="shrink-0" />
      {!x.allDay && <span className="shrink-0 font-semibold">{x.time}</span>}
      <span className="truncate">{x.title}</span>
    </div>
  )
}

function MissingChip({ m, date, withClient }: { m: Missing; date: string; withClient?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => useUi.getState().newPost({ clientId: m.client.id, date, time: m.slot.time, platform: m.slot.platform, format: m.slot.format, status: 'bozza' })}
      className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-rose-300 bg-rose-50/40 px-2 py-1.5 text-left text-[11px] font-medium text-rose-600 transition hover:bg-rose-50"
      title="Uscita prevista ma ancora senza contenuto: tocca per crearlo"
    >
      <Plus size={11} className="shrink-0" />
      <PlatformBadge platform={m.slot.platform} size={14} />
      <span className="truncate">
        {m.slot.time} {FORMAT_LABEL[m.slot.format]}
        {withClient && ` · ${m.client.name}`}
      </span>
    </button>
  )
}

/** Elenco dei contenuti di un giorno (usato sotto mese e settimana su telefono) */
function DayList({ date, clients, posts, events, missing, external }: { date: string } & Pick<ViewProps, 'clients' | 'posts' | 'events' | 'missing' | 'external'>) {
  const dayPosts = posts.filter((p) => p.date === date).sort(byTime)
  const dayEvents = events.filter((e) => e.date === date)
  const dayMissing = missing.get(date) ?? []
  const dayExt = external.filter((x) => x.date === date)
  const empty = !dayPosts.length && !dayEvents.length && !dayMissing.length && !dayExt.length
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-bold">
          {capitalize(fmt(date, 'EEEE d MMMM'))}
          {date === todayISO() && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">oggi</span>}
        </p>
        <button
          type="button"
          onClick={() => clients[0] && useUi.getState().newPost({ clientId: clients[0].id, date })}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-brand-600 hover:bg-brand-50"
        >
          <Plus size={15} /> Aggiungi
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {dayEvents.map((e) => (
          <EventChip key={e.id} e={e} />
        ))}
        {dayExt.map((x) => (
          <ExternalChip key={x.id} x={x} />
        ))}
        {dayPosts.map((p) => (
          <PostCard key={p.id} post={p} client={clientOf(clients, p.clientId)} showClient />
        ))}
        {dayMissing.map((m) => (
          <MissingChip key={m.client.id + m.slot.slotId} m={m} date={date} withClient />
        ))}
      </div>
      {empty && <p className="rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-400">Niente in programma</p>}
    </div>
  )
}

/* ------------------------------------------------------------------- Mese ---- */

function MonthView(props: ViewProps) {
  const { clients, posts, events, missing, anchor, selected, setSelected, external } = props
  const { over, drop } = useDropHandlers()
  const start = weekStart(startOfMonth(anchor))
  const end = addDays(weekStart(endOfMonth(anchor)), 6)
  const days: Date[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
  const today = todayISO()

  return (
    <div>
      <div className="overflow-hidden rounded-2xl bg-surface shadow-soft ring-1 ring-stone-900/5">
        <div className="grid grid-cols-7 border-b border-stone-100">
          {WEEKDAYS_SHORT.map((w) => (
            <p key={w} className="py-2 text-center text-[11px] font-bold tracking-wide text-stone-400 uppercase">
              {w}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const date = toISO(d)
            const inMonth = isSameMonth(d, anchor)
            const dayPosts = posts.filter((p) => p.date === date).sort(byTime)
            const dayEvents = events.filter((e) => e.date === date)
            const dayMissing = missing.get(date) ?? []
            const dayExt = external.filter((x) => x.date === date)
            const isSel = date === selected
            const shown = dayPosts.slice(0, 3)
            return (
              <div
                key={date}
                {...drop(date)}
                onClick={() => setSelected(date)}
                className={cx(
                  'relative min-h-16 cursor-pointer border-stone-100 p-1 transition md:min-h-28 md:p-1.5',
                  i % 7 !== 0 && 'border-l',
                  i >= 7 && 'border-t',
                  !inMonth && 'bg-stone-50/70',
                  isSel && 'bg-brand-50/70',
                  over === date && 'bg-brand-100/70 ring-2 ring-brand-400 ring-inset',
                )}
              >
                <span
                  className={cx(
                    'mb-1 flex size-6 items-center justify-center rounded-full text-xs font-bold md:size-7 md:text-[13px]',
                    date === today ? 'bg-brand-600 text-white' : inMonth ? 'text-stone-800' : 'text-stone-300',
                  )}
                >
                  {d.getDate()}
                </span>

                {/* Telefono: pallini */}
                <div className="flex flex-wrap gap-0.5 md:hidden">
                  {dayEvents.length > 0 && <span className="size-1.5 rounded-full bg-pink-500" />}
                  {dayExt.slice(0, 3).map((x) => (
                    <span key={x.id} className="size-1.5 rounded-full" style={{ background: x.calendar.color }} />
                  ))}
                  {dayPosts.slice(0, 6).map((p) => (
                    <span key={p.id} className={cx('size-1.5 rounded-full', STATUS_META[p.status].dot)} />
                  ))}
                  {dayMissing.length > 0 && <span className="size-1.5 rounded-full border border-rose-400" />}
                </div>

                {/* Computer: mini schede */}
                <div className="hidden space-y-1 md:block">
                  {dayEvents.slice(0, 1).map((e) => (
                    <EventChip key={e.id} e={e} compact />
                  ))}
                  {dayExt.slice(0, 2).map((x) => (
                    <ExternalChip key={x.id} x={x} compact />
                  ))}
                  {dayExt.length > 2 && <p className="px-1 text-[10px] font-semibold text-stone-400">+{dayExt.length - 2} impegni</p>}
                  {shown.map((p) => {
                    const c = clientOf(clients, p.clientId)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/post-id', p.id)}
                        onClick={(e) => {
                          e.stopPropagation()
                          useUi.getState().openPost(p.id)
                        }}
                        className="flex w-full items-center gap-1 rounded-md bg-surface px-1 py-0.5 text-left text-[11px] shadow-sm ring-1 ring-stone-900/5 hover:ring-stone-300"
                      >
                        <span className="h-3 w-0.5 shrink-0 rounded-full" style={{ background: c?.color }} />
                        <span className={cx('size-1.5 shrink-0 rounded-full', STATUS_META[p.status].dot)} />
                        <span className="shrink-0 font-semibold text-stone-500">{p.time}</span>
                        <span className="truncate text-stone-700">{p.title || FORMAT_LABEL[p.format]}</span>
                      </button>
                    )
                  })}
                  {dayPosts.length > shown.length && <p className="px-1 text-[10px] font-semibold text-stone-400">+{dayPosts.length - shown.length} altri</p>}
                  {dayMissing.length > 0 && (
                    <p className="px-1 text-[10px] font-semibold text-rose-500">
                      {dayMissing.length} da coprire
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <DayList date={selected} {...props} />
    </div>
  )
}

/* -------------------------------------------------------------- Settimana ---- */

function WeekView(props: ViewProps) {
  const { clients, posts, events, missing, anchor, selected, setSelected, external } = props
  const { over, drop } = useDropHandlers()
  const days = weekDays(weekStart(anchor))
  const today = todayISO()
  const sel = days.some((d) => toISO(d) === selected) ? selected : toISO(days.find((d) => toISO(d) === today) ?? days[0])

  return (
    <div>
      {/* Telefono: striscia dei giorni + elenco */}
      <div className="md:hidden">
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const date = toISO(d)
            const n = posts.filter((p) => p.date === date).length
            const m = (missing.get(date) ?? []).length
            const active = date === sel
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelected(date)}
                className={cx(
                  'flex flex-col items-center gap-0.5 rounded-2xl py-2 transition',
                  active ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30' : date === today ? 'bg-brand-50 text-brand-700' : 'bg-surface text-stone-700 ring-1 ring-stone-900/5',
                )}
              >
                <span className={cx('text-[10px] font-bold uppercase', active ? 'text-white/80' : 'text-stone-400')}>{fmt(d, 'EEEEEE')}</span>
                <span className="text-base font-extrabold">{d.getDate()}</span>
                <span className="flex h-1.5 gap-0.5">
                  {external.some((x) => x.date === date) && <span className={cx('size-1.5 rounded-full', active ? 'bg-surface/60' : 'bg-stone-400')} />}
                  {n > 0 && <span className={cx('size-1.5 rounded-full', active ? 'bg-surface' : 'bg-brand-500')} />}
                  {m > 0 && <span className={cx('size-1.5 rounded-full', active ? 'bg-rose-200' : 'bg-rose-400')} />}
                </span>
              </button>
            )
          })}
        </div>
        <DayList date={sel} {...props} />
      </div>

      {/* Computer: sette colonne */}
      <div className="hidden overflow-x-auto rounded-2xl bg-surface shadow-soft ring-1 ring-stone-900/5 md:block">
        <div className="grid min-w-[900px] grid-cols-7">
          {days.map((d, i) => {
            const date = toISO(d)
            const dayPosts = posts.filter((p) => p.date === date).sort(byTime)
            const dayEvents = events.filter((e) => e.date === date)
            const dayMissing = missing.get(date) ?? []
            return (
              <div key={date} {...drop(date)} className={cx('group/col flex min-h-[420px] flex-col', i > 0 && 'border-l border-stone-100', date === today && 'bg-brand-50/40', over === date && 'bg-brand-100/60 ring-2 ring-brand-400 ring-inset')}>
                <div className="flex items-center justify-between border-b border-stone-100 px-2.5 py-2.5">
                  <div>
                    <p className={cx('text-[11px] font-bold tracking-wide uppercase', date === today ? 'text-brand-600' : 'text-stone-400')}>{fmt(d, 'EEE')}</p>
                    <p className={cx('text-lg leading-tight font-extrabold', date === today && 'text-brand-700')}>{d.getDate()}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Aggiungi contenuto"
                    onClick={() => clients[0] && useUi.getState().newPost({ clientId: clients[0].id, date })}
                    className="rounded-lg p-1 text-stone-300 opacity-0 transition group-hover/col:opacity-100 hover:bg-stone-100 hover:text-stone-600"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex-1 space-y-1.5 p-1.5">
                  {dayEvents.map((e) => (
                    <EventChip key={e.id} e={e} />
                  ))}
                  {external
                    .filter((x) => x.date === date)
                    .map((x) => (
                      <ExternalChip key={x.id} x={x} />
                    ))}
                  {dayPosts.map((p) => (
                    <PostCard key={p.id} post={p} client={clientOf(clients, p.clientId)} showClient draggable className="p-2 pl-2.5" />
                  ))}
                  {dayMissing.map((m) => (
                    <MissingChip key={m.client.id + m.slot.slotId} m={m} date={date} withClient />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Clienti ---- */

function ClientsView({ visible, posts, events, missing, anchor }: ViewProps) {
  const { over, drop } = useDropHandlers()
  const days = weekDays(weekStart(anchor))
  const iso = days.map(toISO)
  const today = todayISO()
  const missingFor = (clientId: string, date: string) => (missing.get(date) ?? []).filter((m) => m.client.id === clientId)

  return (
    <>
      {/* Telefono: tabella compatta a pallini */}
      <div className="overflow-hidden rounded-2xl bg-surface shadow-soft ring-1 ring-stone-900/5 md:hidden">
        <div className="grid grid-cols-[88px_repeat(7,minmax(0,1fr))] border-b border-stone-100">
          <span />
          {days.map((d, i) => (
            <p key={i} className={cx('py-2 text-center text-[10px] font-bold uppercase', iso[i] === today ? 'text-brand-600' : 'text-stone-400')}>
              {fmt(d, 'EEEEEE')}
              <span className="block text-[13px] text-stone-800">{d.getDate()}</span>
            </p>
          ))}
        </div>
        {visible.map((c) => (
          <div key={c.id} className="grid grid-cols-[88px_repeat(7,minmax(0,1fr))] border-b border-stone-100 last:border-0">
            <Link to={`/clienti/${c.id}`} className="flex min-w-0 items-center gap-1.5 px-2 py-2.5">
              <ClientAvatar client={c} size="sm" />
              <span className="truncate text-[11px] font-semibold">{c.name}</span>
            </Link>
            {iso.map((date) => {
              const cell = posts.filter((p) => p.clientId === c.id && p.date === date).sort(byTime)
              const miss = missingFor(c.id, date)
              const ev = events.some((e) => e.clientId === c.id && e.date === date)
              return (
                <div key={date} className={cx('flex flex-wrap content-center items-center justify-center gap-1 p-1', date === today && 'bg-brand-50/50')}>
                  {ev && <span className="size-2.5 rounded-full bg-pink-500" />}
                  {cell.map((p) => (
                    <button key={p.id} type="button" aria-label={p.title || 'Contenuto'} onClick={() => useUi.getState().openPost(p.id)} className={cx('size-3.5 rounded-full ring-2 ring-surface', STATUS_META[p.status].dot)} />
                  ))}
                  {miss.map((m) => (
                    <button
                      key={m.slot.slotId}
                      type="button"
                      aria-label="Uscita da coprire"
                      onClick={() => useUi.getState().newPost({ clientId: c.id, date, time: m.slot.time, platform: m.slot.platform, format: m.slot.format, status: 'bozza' })}
                      className="size-3.5 rounded-full border-2 border-dashed border-rose-400"
                    />
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Computer: griglia completa */}
      <div className="hidden overflow-x-auto rounded-2xl bg-surface shadow-soft ring-1 ring-stone-900/5 md:block">
        <div className="grid min-w-[980px]" style={{ gridTemplateColumns: '170px repeat(7, minmax(0, 1fr))' }}>
          <div className="sticky left-0 z-10 border-b border-stone-100 bg-surface" />
          {days.map((d, i) => (
            <div key={i} className={cx('border-b border-l border-stone-100 px-2.5 py-2.5', iso[i] === today && 'bg-brand-50/60')}>
              <p className={cx('text-[11px] font-bold tracking-wide uppercase', iso[i] === today ? 'text-brand-600' : 'text-stone-400')}>{fmt(d, 'EEE')}</p>
              <p className={cx('text-lg leading-tight font-extrabold', iso[i] === today && 'text-brand-700')}>{d.getDate()}</p>
            </div>
          ))}
          {visible.map((c) => (
            <div key={c.id} className="contents">
              <Link to={`/clienti/${c.id}`} className="sticky left-0 z-10 flex items-start gap-2 border-b border-stone-100 bg-surface px-3 py-3 hover:bg-stone-50">
                <ClientAvatar client={c} size="sm" />
                <span className="text-[13px] leading-tight font-semibold">{c.name}</span>
              </Link>
              {iso.map((date) => {
                const key = `${c.id}|${date}`
                const cell = posts.filter((p) => p.clientId === c.id && p.date === date).sort(byTime)
                const miss = missingFor(c.id, date)
                const dayEvents = events.filter((e) => e.clientId === c.id && e.date === date)
                return (
                  <div
                    key={date}
                    {...drop(date, key)}
                    className={cx(
                      'group/cell relative min-h-24 space-y-1.5 border-b border-l border-stone-100 p-1.5 transition-colors',
                      date === today && 'bg-brand-50/30',
                      date < today && 'bg-stone-50/60',
                      over === key && 'bg-brand-100/60 ring-2 ring-brand-400 ring-inset',
                    )}
                  >
                    {dayEvents.map((e) => (
                      <EventChip key={e.id} e={e} compact />
                    ))}
                    {cell.map((p) => (
                      <PostCard key={p.id} post={p} client={c} draggable className="p-2 pl-2.5" />
                    ))}
                    {miss.map((m) => (
                      <MissingChip key={m.slot.slotId} m={m} date={date} />
                    ))}
                    {cell.length === 0 && miss.length === 0 && dayEvents.length === 0 && (
                      <button
                        type="button"
                        aria-label="Aggiungi contenuto"
                        onClick={() => useUi.getState().newPost({ clientId: c.id, date })}
                        className="absolute inset-1.5 flex items-center justify-center rounded-lg text-stone-300 opacity-0 transition group-hover/cell:opacity-100 hover:bg-stone-50 hover:text-stone-500"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {visible.length === 0 && <p className="mt-4 text-center text-sm text-stone-400">Tutti i clienti sono nascosti dal filtro.</p>}
    </>
  )
}

/* ----------------------------------------------------------------- Agenda ---- */

function AgendaView({ clients, posts, events, missing, anchor, external }: ViewProps) {
  const today = todayISO()
  const from = toISO(startOfMonth(anchor))
  const to = toISO(endOfMonth(anchor))
  const dates = new Set<string>()
  posts.forEach((p) => p.date >= from && p.date <= to && dates.add(p.date))
  events.forEach((e) => e.date >= from && e.date <= to && dates.add(e.date))
  missing.forEach((_, d) => d >= from && d <= to && dates.add(d))
  external.forEach((x) => x.date >= from && x.date <= to && dates.add(x.date))
  const sorted = [...dates].sort()

  if (sorted.length === 0) {
    return <EmptyState icon={<List size={22} />} title="Niente in programma questo mese" text="Usa il pulsante + per aggiungere un contenuto." />
  }

  let todayShown = false
  const blocks: ReactNode[] = []
  for (const date of sorted) {
    // Segnaposto "oggi" se oggi non ha elementi
    if (!todayShown && date > today && from <= today && today <= to) {
      todayShown = true
      blocks.push(
        <div key="today-marker" className="flex items-center gap-2 py-1 text-xs font-bold text-brand-600">
          <span className="size-2 rounded-full bg-brand-600" /> Oggi, {fmt(today, 'd MMMM')} <span className="h-px flex-1 bg-brand-200" />
        </div>,
      )
    }
    if (date === today) todayShown = true
    const dayPosts = posts.filter((p) => p.date === date).sort(byTime)
    const dayEvents = events.filter((e) => e.date === date)
    const dayMissing = missing.get(date) ?? []
    const dayExt = external.filter((x) => x.date === date)
    const past = date < today
    blocks.push(
      <section key={date} className={cx('flex gap-3', past && 'opacity-60')}>
        <div className={cx('flex w-12 shrink-0 flex-col items-center rounded-2xl py-2 md:w-14', date === today ? 'bg-brand-600 text-white' : 'bg-surface ring-1 ring-stone-900/5')}>
          <span className={cx('text-[10px] font-bold uppercase', date === today ? 'text-white/80' : 'text-stone-400')}>{fmt(date, 'EEE')}</span>
          <span className="text-xl leading-tight font-extrabold">{fmt(date, 'd')}</span>
        </div>
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {dayEvents.map((e) => (
            <EventChip key={e.id} e={e} />
          ))}
          {dayExt.map((x) => (
            <ExternalChip key={x.id} x={x} />
          ))}
          {dayPosts.map((p) => (
            <PostCard key={p.id} post={p} client={clientOf(clients, p.clientId)} showClient />
          ))}
          {dayMissing.map((m) => (
            <MissingChip key={m.client.id + m.slot.slotId} m={m} date={date} withClient />
          ))}
        </div>
      </section>,
    )
  }
  return <div className="space-y-3">{blocks}</div>
}
