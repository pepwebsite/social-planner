import { useState } from 'react'
import { addDays } from 'date-fns'
import { CheckCircle2, Plus } from 'lucide-react'
import type { Task, WaitingOn } from '../types'
import { useStore } from '../store'
import { useUi } from '../ui'
import { todayISO, toISO, weekStart } from '../lib/dates'
import { WAITING_META } from '../lib/meta'
import { PageHeader } from '../components/Layout'
import { TaskRow } from '../components/Tasks'
import { Button, Card, EmptyState, Segmented, Select } from '../components/ui'

type View = 'aperte' | 'fatte'

export function TasksPage() {
  const tasks = useStore((s) => s.tasks)
  const allClients = useStore((s) => s.clients)
  const [view, setView] = useState<View>('aperte')
  const [clientFilter, setClientFilter] = useState('')
  const [waiting, setWaiting] = useState<WaitingOn | ''>('')

  const clients = allClients.filter((c) => !c.archived)
  const filtered = tasks.filter(
    (t) => (view === 'aperte' ? !t.done : t.done) && (!clientFilter || t.clientId === clientFilter) && (!waiting || t.waitingOn === waiting),
  )

  const today = todayISO()
  const endOfWeek = toISO(addDays(weekStart(new Date()), 6))
  const groups: { title: string; items: Task[] }[] =
    view === 'aperte'
      ? [
          { title: 'Scadute', items: filtered.filter((t) => t.due < today) },
          { title: 'Oggi', items: filtered.filter((t) => t.due === today) },
          { title: 'Questa settimana', items: filtered.filter((t) => t.due > today && t.due <= endOfWeek) },
          { title: 'Più avanti', items: filtered.filter((t) => t.due > endOfWeek) },
        ]
      : [{ title: 'Completate', items: [...filtered].sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')).slice(0, 50) }]

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <PageHeader
        title="Attività e promemoria"
        subtitle="Le cose da chiedere, sollecitare e ricordare. Quelle ricorrenti si rigenerano da sole."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => useUi.getState().openTask({})}>
            Nuova attività
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4 md:px-8">
        <Segmented value={view} onChange={setView} options={[{ value: 'aperte', label: 'Da fare' }, { value: 'fatte', label: 'Fatte' }]} />
        <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="w-44">
          <option value="">Tutti i clienti</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={waiting} onChange={(e) => setWaiting(e.target.value as WaitingOn | '')} className="w-48">
          <option value="">Chiunque</option>
          {Object.entries(WAITING_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-5 px-4 md:px-8">
        {groups
          .filter((g) => g.items.length)
          .map((g) => (
            <section key={g.title}>
              <h2 className={`mb-2 text-sm font-bold ${g.title === 'Scadute' ? 'text-rose-600' : 'text-stone-500'}`}>
                {g.title} <span className="font-medium text-stone-400">· {g.items.length}</span>
              </h2>
              <Card className="p-1.5">
                {[...g.items].sort((a, b) => a.due.localeCompare(b.due)).map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </Card>
            </section>
          ))}
        {filtered.length === 0 && (
          <Card>
            <EmptyState icon={<CheckCircle2 size={22} />} title={view === 'aperte' ? 'Nessuna attività aperta' : 'Ancora niente di completato'} text={view === 'aperte' ? 'Aggiungi promemoria ricorrenti come “Chiedere il volantino a Sigma ogni lunedì”.' : undefined} />
          </Card>
        )}
      </div>
    </div>
  )
}
