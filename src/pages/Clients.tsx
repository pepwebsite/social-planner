import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Archive, Plus, Users } from 'lucide-react'
import type { Platform } from '../types'
import { useStore } from '../store'
import { useUi } from '../ui'
import { clientPulse, URGENCY_META } from '../lib/insights'
import { PLATFORMS, CLIENT_COLORS } from '../lib/meta'
import { PageHeader } from '../components/Layout'
import { Button, Card, ClientAvatar, EmptyState, Field, Input, Modal, PlatformBadge, cx } from '../components/ui'

export function Clients() {
  const clients = useStore((s) => s.clients)
  const posts = useStore((s) => s.posts)
  const tasks = useStore((s) => s.tasks)
  const events = useStore((s) => s.events)
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    if (params.get('nuovo')) {
      setCreating(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const list = clients.filter((c) => c.archived === showArchived)
  const archivedCount = clients.filter((c) => c.archived).length

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <PageHeader
        title="Clienti"
        subtitle={`${clients.filter((c) => !c.archived).length} clienti attivi`}
        actions={
          <>
            {archivedCount > 0 && (
              <Button variant="ghost" icon={<Archive size={15} />} onClick={() => setShowArchived((s) => !s)}>
                {showArchived ? 'Attivi' : `Archiviati (${archivedCount})`}
              </Button>
            )}
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
              Nuovo cliente
            </Button>
          </>
        }
      />
      <div className="grid gap-3 px-4 sm:grid-cols-2 md:px-8 xl:grid-cols-3">
        {list.map((c) => {
          const p = clientPulse(c, posts, tasks, events)
          const missingBrief = !c.tone.trim() || c.slots.length === 0
          return (
            <button key={c.id} type="button" onClick={() => nav(`/clienti/${c.id}`)} className="group rounded-2xl bg-surface p-4 text-left shadow-soft ring-1 ring-stone-900/5 transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start gap-3">
                <ClientAvatar client={c} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{c.name}</p>
                  <p className="truncate text-sm text-stone-500">{c.sector || 'Settore non indicato'}</p>
                  <div className="mt-1.5 flex gap-1">
                    {c.platforms.map((pl) => (
                      <PlatformBadge key={pl} platform={pl} />
                    ))}
                  </div>
                </div>
                <span className={cx('rounded-full px-2 py-px text-[11px] font-semibold ring-1 ring-inset', URGENCY_META[p.urgency].cls)}>{URGENCY_META[p.urgency].label}</span>
              </div>
              <p className="mt-4 rounded-xl bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700">→ {p.nextAction}</p>
              <div className="mt-3 flex gap-4 text-xs text-stone-500">
                <span>
                  <b className="text-stone-800">{c.slots.length}</b> uscite/sett.
                </span>
                <span>
                  <b className="text-stone-800">{p.awaiting}</b> in approvazione
                </span>
                <span>
                  <b className="text-stone-800">{p.drafts}</b> bozze
                </span>
              </div>
              {missingBrief && <p className="mt-3 text-xs font-medium text-amber-700">⚠ Completa la scheda (tono e giorni di uscita) per sfruttare l’AI</p>}
            </button>
          )
        })}
      </div>
      {list.length === 0 && (
        <Card className="mx-4 md:mx-8">
          <EmptyState icon={<Users size={22} />} title={showArchived ? 'Nessun cliente archiviato' : 'Nessun cliente'} text="Aggiungi il primo cliente: bastano nome e colore, il resto lo completi dopo." action={!showArchived && <Button variant="primary" onClick={() => setCreating(true)}>Nuovo cliente</Button>} />
        </Card>
      )}
      {creating && <NewClientModal onClose={() => setCreating(false)} />}
    </div>
  )
}

function NewClientModal({ onClose }: { onClose: () => void }) {
  const count = useStore((s) => s.clients.length)
  const addClient = useStore((s) => s.addClient)
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [sector, setSector] = useState('')
  const [color, setColor] = useState(CLIENT_COLORS[count % CLIENT_COLORS.length])
  const [platforms, setPlatforms] = useState<Platform[]>(['instagram', 'facebook'])

  const submit = () => {
    if (!name.trim()) return
    const id = addClient({ name: name.trim(), sector, color, platforms })
    useStore.getState().setOnboarded()
    useUi.getState().toast('Cliente creato: completa la scheda per avere bozze AI su misura')
    onClose()
    nav(`/clienti/${id}?tab=scheda`)
  }

  return (
    <Modal
      title="Nuovo cliente"
      subtitle="Bastano pochi dati: tono di voce e giorni di uscita li aggiungi nella scheda."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button variant="primary" onClick={submit} disabled={!name.trim()}>
            Crea e apri scheda
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ClientAvatar client={{ name: name || '?', color }} size="lg" />
          <Field label="Nome" className="flex-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Es. Pizzeria Da Mario" autoFocus />
          </Field>
        </div>
        <Field label="Settore">
          <Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Es. Ristorazione" />
        </Field>
        <Field label="Colore">
          <div className="flex flex-wrap gap-2">
            {CLIENT_COLORS.map((c) => (
              <button key={c} type="button" aria-label={c} onClick={() => setColor(c)} className={cx('size-8 rounded-full transition', color === c && 'ring-2 ring-offset-2')} style={{ background: c, ['--tw-ring-color' as string]: c }} />
            ))}
          </div>
        </Field>
        <Field label="Piattaforme">
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const on = platforms.includes(p)
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatforms((ps) => (on ? ps.filter((x) => x !== p) : [...ps, p]))}
                  className={cx('inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-sm font-medium ring-1 transition', on ? 'bg-surface shadow-soft ring-stone-300' : 'text-stone-400 ring-stone-200')}
                >
                  <PlatformBadge platform={p} className={cx(!on && 'opacity-30')} /> {p[0].toUpperCase() + p.slice(1)}
                </button>
              )
            })}
          </div>
        </Field>
      </div>
    </Modal>
  )
}
