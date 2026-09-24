import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sparkles, CalendarDays, CalendarPlus, CheckSquare, KanbanSquare, ListTodo, PenSquare, Plus, Search, Settings, Sun, Users } from 'lucide-react'
import { useStore } from '../store'
import { useUi } from '../ui'
import { todayISO } from '../lib/dates'
import { clientPulse, isDueToday, isOverdue, needsNudge, URGENCY_META } from '../lib/insights'
import { ClientAvatar, Kbd, cx } from './ui'
import { SessionBar } from './SessionBar'

const NAV = [
  { to: '/', label: 'Oggi', icon: Sun, end: true },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/approvazioni', label: 'Approvazioni', icon: KanbanSquare },
  { to: '/attivita', label: 'Attività', icon: ListTodo },
  { to: '/clienti', label: 'Clienti', icon: Users, end: true },
]

function useBadges() {
  const tasks = useStore((s) => s.tasks)
  const posts = useStore((s) => s.posts)
  return {
    '/': tasks.filter((t) => isOverdue(t) || isDueToday(t)).length,
    '/approvazioni': posts.filter(needsNudge).length,
  } as Record<string, number>
}

export function Layout() {
  const clients = useStore((s) => s.clients)
  const posts = useStore((s) => s.posts)
  const tasks = useStore((s) => s.tasks)
  const events = useStore((s) => s.events)
  const setPalette = useUi((s) => s.setPalette)
  const badges = useBadges()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [location.pathname])

  const active = clients.filter((c) => !c.archived)

  return (
    <div className="flex h-full">
      {/* Sidebar desktop */}
      <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-stone-200/70 bg-white/50 md:flex">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <img src="/favicon.svg" alt="" className="size-8" />
          <div>
            <p className="leading-none font-extrabold tracking-tight">Regia</p>
            <p className="mt-0.5 text-[11px] font-medium text-stone-400">Social planner</p>
          </div>
        </div>
        <div className="px-3">
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-stone-400 ring-1 ring-stone-200 transition hover:ring-stone-300"
          >
            <Search size={15} />
            <span className="flex-1 text-left">Cerca…</span>
            <Kbd>Ctrl K</Kbd>
          </button>
        </div>
        <nav className="mt-4 space-y-0.5 px-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition',
                  isActive ? 'bg-white text-stone-900 shadow-soft ring-1 ring-stone-900/5' : 'text-stone-500 hover:bg-stone-900/5 hover:text-stone-800',
                )
              }
            >
              <n.icon size={17} />
              <span className="flex-1">{n.label}</span>
              {badges[n.to] > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-px text-[11px] font-bold text-white">{badges[n.to]}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 flex items-center justify-between px-6">
          <p className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">I miei clienti</p>
          <NavLink to="/clienti?nuovo=1" className="rounded-md p-0.5 text-stone-400 hover:bg-stone-900/5 hover:text-stone-700" title="Nuovo cliente">
            <Plus size={15} />
          </NavLink>
        </div>
        <div className="mt-1.5 flex-1 space-y-px overflow-y-auto px-3 pb-3">
          {active.map((c) => {
            const pulse = clientPulse(c, posts, tasks, events)
            return (
              <NavLink
                key={c.id}
                to={`/clienti/${c.id}`}
                className={({ isActive }) =>
                  cx('flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm transition', isActive ? 'bg-white font-semibold shadow-soft ring-1 ring-stone-900/5' : 'text-stone-600 hover:bg-stone-900/5')
                }
                title={pulse.nextAction}
              >
                <ClientAvatar client={c} size="sm" />
                <span className="flex-1 truncate">{c.name}</span>
                {pulse.urgency !== 'ok' && <span className={cx('size-2 rounded-full', URGENCY_META[pulse.urgency].dot)} />}
              </NavLink>
            )
          })}
          {active.length === 0 && <p className="px-3 py-2 text-xs text-stone-400">Nessun cliente ancora.</p>}
        </div>
        <div className="space-y-0.5 border-t border-stone-200/70 p-3">
          <NavLink
            to="/impostazioni/ai"
            className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold', isActive ? 'bg-white text-stone-900 shadow-soft' : 'text-stone-500 hover:bg-stone-900/5')}
          >
            <Sparkles size={17} /> Provider AI
          </NavLink>
          <NavLink
            end
            to="/impostazioni"
            className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold', isActive ? 'bg-white text-stone-900 shadow-soft' : 'text-stone-500 hover:bg-stone-900/5')}
          >
            <Settings size={17} /> Impostazioni e backup
          </NavLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header mobile */}
        <header className="no-print flex items-center gap-2 border-b border-stone-200/70 bg-white/80 px-4 py-2.5 backdrop-blur md:hidden">
          <img src="/favicon.svg" alt="" className="size-7" />
          <p className="flex-1 font-extrabold tracking-tight">Regia</p>
          <button type="button" aria-label="Cerca" onClick={() => setPalette(true)} className="rounded-xl p-2 text-stone-500 hover:bg-stone-900/5">
            <Search size={19} />
          </button>
          <NavLink to="/impostazioni" aria-label="Impostazioni" className="rounded-xl p-2 text-stone-500 hover:bg-stone-900/5">
            <Settings size={19} />
          </NavLink>
        </header>

        <main ref={mainRef} className="relative flex-1 overflow-y-auto pb-24 md:pb-0">
          <SessionBar />
          <Outlet />
        </main>

        {/* Tab bar mobile */}
        <nav className="no-print pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-200/70 bg-white/95 backdrop-blur md:hidden">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => cx('relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold', isActive ? 'text-brand-600' : 'text-stone-400')}
            >
              <n.icon size={21} />
              {n.label}
              {badges[n.to] > 0 && (
                <span className="absolute top-1 left-1/2 ml-2 rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{badges[n.to]}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

/** Intestazione standard delle pagine */
export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 px-4 pt-6 pb-5 md:px-8 md:pt-8">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-sm font-semibold text-stone-500">{eyebrow}</div>}
        <h1 className="text-2xl font-extrabold tracking-tight md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-stone-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Menu "+ Nuovo" per creare velocemente contenuti, attività ed eventi */
export function QuickCreate({ clientId, date }: { clientId?: string; date?: string }) {
  const [open, setOpen] = useState(false)
  const clients = useStore((s) => s.clients)
  const ui = useUi.getState()
  const nav = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const cid = clientId ?? clients.find((c) => !c.archived)?.id
  const items = [
    { label: 'Contenuto', icon: PenSquare, run: () => (cid ? ui.newPost({ clientId: cid, date: date ?? todayISO() }) : nav('/clienti?nuovo=1')) },
    { label: 'Attività / promemoria', icon: CheckSquare, run: () => ui.openTask({ clientId: clientId ?? null }) },
    { label: 'Evento', icon: CalendarPlus, run: () => ui.openEvent({ clientId, date }) },
  ]
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.98]"
      >
        <Plus size={16} strokeWidth={2.5} /> Nuovo
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 animate-pop rounded-2xl bg-white p-1.5 shadow-lift ring-1 ring-stone-900/10">
          {items.map((i) => (
            <button
              key={i.label}
              type="button"
              onClick={() => {
                setOpen(false)
                i.run()
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              <i.icon size={16} className="text-stone-400" /> {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
