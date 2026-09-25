import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CalendarPlus, CheckSquare, KanbanSquare, ListTodo, PenSquare, Search, Sparkles, Sun, UserPlus, Users } from 'lucide-react'
import { useStore } from '../store'
import { useUi } from '../ui'
import { todayISO } from '../lib/dates'
import { ClientAvatar, Kbd, cx } from './ui'

interface Item {
  id: string
  label: string
  hint?: string
  icon: ReactNode
  run: () => void
  group: string
}

export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen)
  const setPalette = useUi((s) => s.setPalette)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(!useUi.getState().paletteOpen)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [setPalette])

  if (!open) return null
  return <Palette onClose={() => setPalette(false)} />
}

function Palette({ onClose }: { onClose: () => void }) {
  const nav = useNavigate()
  const clients = useStore((s) => s.clients)
  const posts = useStore((s) => s.posts)
  const ui = useUi.getState()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const items = useMemo<Item[]>(() => {
    const go = (path: string) => () => nav(path)
    const base: Item[] = [
      ...clients
        .filter((c) => !c.archived)
        .map((c) => ({
          id: `c-${c.id}`,
          label: c.name,
          hint: c.sector,
          icon: <ClientAvatar client={c} size="sm" />,
          run: go(`/clienti/${c.id}`),
          group: 'Clienti',
        })),
      { id: 'n-post', label: 'Nuovo contenuto', icon: <PenSquare size={16} />, run: () => clients[0] && ui.newPost({ clientId: clients[0].id, date: todayISO() }), group: 'Crea' },
      { id: 'n-task', label: 'Nuova attività', icon: <CheckSquare size={16} />, run: () => ui.openTask({}), group: 'Crea' },
      { id: 'n-event', label: 'Nuovo evento', icon: <CalendarPlus size={16} />, run: () => ui.openEvent({}), group: 'Crea' },
      { id: 'n-client', label: 'Nuovo cliente', icon: <UserPlus size={16} />, run: go('/clienti?nuovo=1'), group: 'Crea' },
      { id: 'g-today', label: 'Oggi', icon: <Sun size={16} />, run: go('/'), group: 'Vai a' },
      { id: 'g-cal', label: 'Calendario', icon: <CalendarDays size={16} />, run: go('/calendario'), group: 'Vai a' },
      { id: 'g-pipe', label: 'Approvazioni', icon: <KanbanSquare size={16} />, run: go('/approvazioni'), group: 'Vai a' },
      { id: 'g-tasks', label: 'Attività', icon: <ListTodo size={16} />, run: go('/attivita'), group: 'Vai a' },
      { id: 'g-clients', label: 'Tutti i clienti', icon: <Users size={16} />, run: go('/clienti'), group: 'Vai a' },
      { id: 'g-gcal', label: 'Google Calendar', hint: 'collega il calendario', icon: <CalendarDays size={16} />, run: go('/impostazioni/google-calendar'), group: 'Vai a' },
      { id: 'g-ai', label: 'Provider AI', hint: 'chiavi e modelli', icon: <Sparkles size={16} />, run: go('/impostazioni/ai'), group: 'Vai a' },
    ]
    if (q.trim().length >= 2) {
      const needle = q.toLowerCase()
      posts
        .filter((p) => `${p.title} ${p.copy}`.toLowerCase().includes(needle))
        .slice(0, 8)
        .forEach((p) => {
          const c = clients.find((x) => x.id === p.clientId)
          base.push({
            id: `p-${p.id}`,
            label: p.title || p.copy.slice(0, 60),
            hint: `${c?.name ?? ''} · ${p.date}`,
            icon: <Search size={16} />,
            run: () => ui.openPost(p.id),
            group: 'Contenuti',
          })
        })
    }
    const needle = q.trim().toLowerCase()
    return needle
      ? base.filter((i) => i.group === 'Contenuti' || `${i.label} ${i.hint ?? ''}`.toLowerCase().includes(needle))
      : base
  }, [q, clients, posts, nav, ui])

  const run = (i: Item | undefined) => {
    if (!i) return
    onClose()
    i.run()
  }

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  let lastGroup = ''
  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 animate-in bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-pop overflow-hidden rounded-2xl bg-surface shadow-lift ring-1 ring-stone-900/10">
        <div className="flex items-center gap-3 border-b border-stone-100 px-4">
          <Search size={18} className="text-stone-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, items.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter') run(items[active])
              else if (e.key === 'Escape') onClose()
            }}
            placeholder="Cerca un cliente, un contenuto o un comando…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-stone-400"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-stone-500">Nessun risultato</p>}
          {items.map((i, idx) => {
            const header = i.group !== lastGroup ? i.group : null
            lastGroup = i.group
            return (
              <div key={i.id}>
                {header && <p className="px-3 pt-2 pb-1 text-[11px] font-bold tracking-wider text-stone-400 uppercase">{header}</p>}
                <button
                  type="button"
                  data-active={idx === active}
                  onMouseMove={() => setActive(idx)}
                  onClick={() => run(i)}
                  className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm', idx === active ? 'bg-brand-50 text-brand-700' : 'text-stone-700')}
                >
                  <span className="flex size-6 items-center justify-center text-stone-500">{i.icon}</span>
                  <span className="flex-1 truncate font-medium">{i.label}</span>
                  {i.hint && <span className="max-w-40 truncate text-xs text-stone-400">{i.hint}</span>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
