import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PartyPopper, Plus } from 'lucide-react'
import { useStore } from '../store'
import { useUi } from '../ui'
import { capitalize, fmt, todayISO, toISO, weekDays, weekStart } from '../lib/dates'
import { FORMAT_LABEL, PLATFORM_META, STATUSES, STATUS_META } from '../lib/meta'
import { slotCovered, slotsForWeek } from '../lib/insights'
import { PageHeader, QuickCreate } from '../components/Layout'
import { WeekNav } from '../components/WeekNav'
import { PostCard } from '../components/PostCard'
import { ClientAvatar, cx } from '../components/ui'

export function CalendarPage() {
  const [start, setStart] = useState(() => weekStart(new Date()))
  const [hidden, setHidden] = useState<string[]>([])
  const allClients = useStore((s) => s.clients)
  const posts = useStore((s) => s.posts)
  const events = useStore((s) => s.events)
  const updatePost = useStore((s) => s.updatePost)
  const ui = useUi.getState()
  const [dragOver, setDragOver] = useState<string | null>(null)

  const clients = allClients.filter((c) => !c.archived)
  const visible = clients.filter((c) => !hidden.includes(c.id))
  const days = weekDays(start)
  const isoDays = days.map(toISO)
  const today = todayISO()
  const weekPosts = posts.filter((p) => p.date >= isoDays[0] && p.date <= isoDays[6])

  const cellPosts = (clientId: string, date: string) =>
    weekPosts.filter((p) => p.clientId === clientId && p.date === date).sort((a, b) => a.time.localeCompare(b.time))

  const onDrop = (clientId: string, date: string) => (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(null)
    const id = e.dataTransfer.getData('text/post-id')
    const p = posts.find((x) => x.id === id)
    if (!p || p.date === date) return
    if (p.clientId !== clientId) {
      ui.toast('Puoi spostare un contenuto solo nei giorni dello stesso cliente', 'info')
      return
    }
    updatePost(id, { date })
    ui.toast(`Spostato a ${fmt(date, 'EEEE d')}`, 'ok', { label: 'Annulla', run: () => useStore.getState().updatePost(id, { date: p.date }) })
  }

  return (
    <div className="pb-10">
      <PageHeader title="Calendario" subtitle="Tutti i clienti nella stessa settimana. Trascina un contenuto per spostarlo." actions={<><WeekNav start={start} onChange={setStart} /><QuickCreate /></>} />

      {/* Filtri clienti + legenda */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4 md:px-8">
        {clients.map((c) => {
          const off = hidden.includes(c.id)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setHidden((h) => (off ? h.filter((x) => x !== c.id) : [...h, c.id]))}
              className={cx('inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-xs font-semibold ring-1 transition', off ? 'bg-transparent text-stone-400 ring-stone-200' : 'bg-white text-stone-700 shadow-soft ring-stone-900/5')}
            >
              <span className={cx(off && 'opacity-40 grayscale')}>
                <ClientAvatar client={c} size="sm" />
              </span>
              {c.name}
            </button>
          )
        })}
        <div className="ml-auto hidden flex-wrap items-center gap-3 text-xs text-stone-500 lg:flex">
          {STATUSES.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={cx('size-2 rounded-full', STATUS_META[s].dot)} /> {STATUS_META[s].label}
            </span>
          ))}
        </div>
      </div>

      {/* Griglia desktop: righe = clienti, colonne = giorni */}
      <div className="hidden px-8 md:block">
        <div className="overflow-x-auto rounded-2xl bg-white shadow-soft ring-1 ring-stone-900/5">
          <div className="grid min-w-[980px]" style={{ gridTemplateColumns: '170px repeat(7, minmax(0, 1fr))' }}>
            <div className="sticky left-0 z-10 border-b border-stone-100 bg-white" />
            {days.map((d, i) => (
              <div key={i} className={cx('border-b border-l border-stone-100 px-2.5 py-2.5', isoDays[i] === today && 'bg-brand-50/60')}>
                <p className={cx('text-[11px] font-bold tracking-wide uppercase', isoDays[i] === today ? 'text-brand-600' : 'text-stone-400')}>{fmt(d, 'EEE')}</p>
                <p className={cx('text-lg leading-tight font-extrabold', isoDays[i] === today && 'text-brand-700')}>{fmt(d, 'd')}</p>
              </div>
            ))}

            {visible.map((c) => {
              const slots = slotsForWeek(c, start)
              const own = weekPosts.filter((p) => p.clientId === c.id)
              return (
                <div key={c.id} className="contents">
                  <Link to={`/clienti/${c.id}`} className="sticky left-0 z-10 flex items-start gap-2 border-b border-stone-100 bg-white px-3 py-3 hover:bg-stone-50">
                    <ClientAvatar client={c} size="sm" />
                    <span className="text-[13px] leading-tight font-semibold">{c.name}</span>
                  </Link>
                  {isoDays.map((date) => {
                    const cell = cellPosts(c.id, date)
                    const missing = slots.filter((s) => s.date === date && !slotCovered(s, own))
                    const dayEvents = events.filter((e) => e.clientId === c.id && e.date === date)
                    const key = `${c.id}|${date}`
                    return (
                      <div
                        key={date}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDragOver(key)
                        }}
                        onDragLeave={() => setDragOver((k) => (k === key ? null : k))}
                        onDrop={onDrop(c.id, date)}
                        className={cx(
                          'group/cell relative min-h-24 space-y-1.5 border-b border-l border-stone-100 p-1.5 transition-colors',
                          date === today && 'bg-brand-50/30',
                          date < today && 'bg-stone-50/60',
                          dragOver === key && 'bg-brand-100/60 ring-2 ring-brand-400 ring-inset',
                        )}
                      >
                        {dayEvents.map((e) => (
                          <button key={e.id} type="button" onClick={() => ui.openEvent({ eventId: e.id })} className="flex w-full items-center gap-1 rounded-lg bg-pink-50 px-2 py-1 text-left text-[11px] font-semibold text-pink-700 ring-1 ring-pink-200">
                            <PartyPopper size={11} className="shrink-0" /> <span className="truncate">{e.name}</span>
                          </button>
                        ))}
                        {cell.map((p) => (
                          <PostCard key={p.id} post={p} client={c} draggable className="p-2 pl-2.5" />
                        ))}
                        {missing.map((s) => (
                          <button
                            key={s.slotId}
                            type="button"
                            onClick={() => ui.newPost({ clientId: c.id, date, time: s.time, platform: s.platform, format: s.format, status: 'bozza' })}
                            className={cx('flex w-full items-center gap-1 rounded-lg border border-dashed px-2 py-1.5 text-left text-[11px] font-medium transition', date < today ? 'border-stone-200 text-stone-300' : 'border-rose-300 bg-rose-50/40 text-rose-600 hover:bg-rose-50')}
                            title="Uscita prevista ma ancora senza contenuto"
                          >
                            <Plus size={11} className="shrink-0" />
                            <span className="truncate">{s.time} {PLATFORM_META[s.platform].short} {FORMAT_LABEL[s.format]}</span>
                          </button>
                        ))}
                        {cell.length === 0 && missing.length === 0 && dayEvents.length === 0 && (
                          <button
                            type="button"
                            aria-label="Aggiungi contenuto"
                            onClick={() => ui.newPost({ clientId: c.id, date })}
                            className="absolute inset-1.5 flex items-center justify-center rounded-lg text-stone-300 opacity-0 transition group-hover/cell:opacity-100 hover:bg-stone-50 hover:text-stone-500"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Vista mobile: giorno per giorno */}
      <div className="space-y-4 px-4 md:hidden">
        {isoDays.map((date) => {
          const dayPosts = weekPosts.filter((p) => p.date === date && !hidden.includes(p.clientId)).sort((a, b) => a.time.localeCompare(b.time))
          const dayEvents = events.filter((e) => e.date === date && !hidden.includes(e.clientId))
          return (
            <div key={date}>
              <p className={cx('mb-2 text-sm font-bold', date === today ? 'text-brand-600' : 'text-stone-500')}>
                {capitalize(fmt(date, 'EEEE d MMMM'))}
                {date === today && ' · oggi'}
              </p>
              <div className="space-y-2">
                {dayEvents.map((e) => (
                  <button key={e.id} type="button" onClick={() => ui.openEvent({ eventId: e.id })} className="flex w-full items-center gap-2 rounded-xl bg-pink-50 px-3 py-2 text-left text-sm font-semibold text-pink-700 ring-1 ring-pink-200">
                    <PartyPopper size={14} /> {e.name}
                  </button>
                ))}
                {dayPosts.map((p) => (
                  <PostCard key={p.id} post={p} client={clients.find((c) => c.id === p.clientId)} showClient />
                ))}
                {dayPosts.length === 0 && dayEvents.length === 0 && <p className="text-sm text-stone-400">Niente in programma</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
