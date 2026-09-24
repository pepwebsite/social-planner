import { useState } from 'react'
import { Bell, Check, MessageSquareWarning, Send } from 'lucide-react'
import type { PostStatus } from '../types'
import { useStore } from '../store'
import { useUi } from '../ui'
import { STATUSES, STATUS_META } from '../lib/meta'
import { todayISO } from '../lib/dates'
import { daysWaiting, needsNudge } from '../lib/insights'
import { PageHeader } from '../components/Layout'
import { PostCard } from '../components/PostCard'
import { Button, Select, cx } from '../components/ui'

export function Pipeline() {
  const allClients = useStore((s) => s.clients)
  const posts = useStore((s) => s.posts)
  const setPostStatus = useStore((s) => s.setPostStatus)
  const toast = useUi((s) => s.toast)
  const [clientFilter, setClientFilter] = useState('')
  const [showPast, setShowPast] = useState(false)
  const [over, setOver] = useState<PostStatus | null>(null)

  const clients = allClients.filter((c) => !c.archived)
  const today = todayISO()
  const list = posts
    .filter((p) => (!clientFilter || p.clientId === clientFilter) && (showPast || p.date >= today || (p.status !== 'pubblicato' && p.status !== 'programmato')))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  const nudges = list.filter(needsNudge)

  const move = (id: string, status: PostStatus) => {
    const p = posts.find((x) => x.id === id)
    if (!p || p.status === status) return
    setPostStatus([id], status)
    toast(`Spostato in «${STATUS_META[status].label}»`, 'ok', { label: 'Annulla', run: () => useStore.getState().setPostStatus([id], p.status) })
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="Approvazioni"
        subtitle="Il percorso di ogni contenuto, dall’idea alla pubblicazione. Trascina le card per cambiare stato."
        actions={
          <>
            <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="w-48">
              <option value="">Tutti i clienti</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-600">
              <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} className="size-4 accent-brand-600" />
              Mostra passati
            </label>
          </>
        }
      />

      {nudges.length > 0 && (
        <div className="mx-4 mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 md:mx-8">
          <span className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Bell size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-amber-900">
              {nudges.length} {nudges.length === 1 ? 'contenuto aspetta' : 'contenuti aspettano'} una risposta da più di 2 giorni
            </p>
            <p className="text-sm text-amber-800">
              {[...new Set(nudges.map((p) => allClients.find((c) => c.id === p.clientId)?.name))].join(', ')}: manda un sollecito o segna la risposta.
            </p>
          </div>
        </div>
      )}

      <div className="flex snap-x gap-3 overflow-x-auto px-4 pb-4 md:px-8">
        {STATUSES.map((s) => {
          const col = list.filter((p) => p.status === s)
          const meta = STATUS_META[s]
          return (
            <div
              key={s}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(s)
              }}
              onDragLeave={() => setOver((o) => (o === s ? null : o))}
              onDrop={(e) => {
                e.preventDefault()
                setOver(null)
                move(e.dataTransfer.getData('text/post-id'), s)
              }}
              className={cx('flex w-72 shrink-0 snap-start flex-col rounded-2xl bg-stone-900/[0.035] p-2 transition', over === s && 'bg-brand-100/60 ring-2 ring-brand-400')}
            >
              <div className="flex items-center gap-2 px-2 pt-1 pb-2.5">
                <span className={cx('size-2 rounded-full', meta.dot)} />
                <p className="text-sm font-bold">{meta.label}</p>
                <span className="rounded-full bg-white px-1.5 text-xs font-semibold text-stone-500 ring-1 ring-stone-200">{col.length}</span>
              </div>
              <p className="-mt-1.5 px-2 pb-2 text-xs text-stone-400">{meta.hint}</p>
              <div className="flex-1 space-y-2">
                {col.map((p) => {
                  const client = allClients.find((c) => c.id === p.clientId)
                  return (
                    <div key={p.id}>
                      <PostCard post={p} client={client} showClient showDate draggable />
                      {s === 'in_approvazione' && (
                        <div className="mt-1 flex gap-1 px-0.5">
                          <button type="button" onClick={() => move(p.id, 'approvato')} className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">
                            <Check size={12} /> Approvato
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPostStatus([p.id], 'bozza')
                              useUi.getState().openPost(p.id)
                            }}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-100"
                          >
                            <MessageSquareWarning size={12} /> Modifiche
                          </button>
                        </div>
                      )}
                      {s === 'in_approvazione' && daysWaiting(p) > 0 && !needsNudge(p) && (
                        <p className="px-1 text-[11px] text-stone-400">inviato {daysWaiting(p)} g fa</p>
                      )}
                      {s === 'approvato' && (
                        <div className="mt-1 px-0.5">
                          <button type="button" onClick={() => move(p.id, 'programmato')} className="flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50">
                            <Send size={12} /> Segna come programmato
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {col.length === 0 && <p className="rounded-xl border border-dashed border-stone-300 px-3 py-6 text-center text-xs text-stone-400">Vuoto</p>}
              </div>
            </div>
          )
        })}
      </div>
      {list.length === 0 && (
        <div className="px-8 text-center text-sm text-stone-500">
          Nessun contenuto. <Button size="sm" variant="ghost" onClick={() => setShowPast(true)}>Mostra anche i passati</Button>
        </div>
      )}
    </div>
  )
}
