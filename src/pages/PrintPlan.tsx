import { useParams, useSearchParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useStore } from '../store'
import { capitalize, fmt, fromISO, toISO, weekDays, weekLabel, weekStart } from '../lib/dates'
import { FORMAT_LABEL, PLATFORM_META } from '../lib/meta'
import { Button, ClientAvatar, StatusPill } from '../components/ui'

/** Piano editoriale pulito da stampare o salvare in PDF per il cliente */
export function PrintPlan() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const client = useStore((s) => s.clients.find((c) => c.id === id))
  const posts = useStore((s) => s.posts)
  const start = weekStart(params.get('w') ? fromISO(params.get('w')!) : new Date())
  const iso = weekDays(start).map(toISO)

  if (!client) return <p className="p-8">Cliente non trovato.</p>

  const list = posts
    .filter((p) => p.clientId === client.id && p.date >= iso[0] && p.date <= iso[6])
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  return (
    <div className="force-light min-h-full bg-surface text-ink">
      <div className="mx-auto max-w-3xl px-6 py-10 print:px-0 print:py-0">
        <div className="no-print mb-8 flex items-center justify-between rounded-2xl bg-stone-50 p-4">
          <p className="text-sm text-stone-600">Stampa o scegli “Salva come PDF” per inviarlo al cliente.</p>
          <Button variant="primary" icon={<Printer size={15} />} onClick={() => window.print()}>
            Stampa / PDF
          </Button>
        </div>

        <header className="mb-8 flex items-center gap-4 border-b border-stone-200 pb-6">
          <ClientAvatar client={client} size="lg" />
          <div>
            <p className="text-xs font-bold tracking-widest text-stone-400 uppercase">Piano editoriale</p>
            <h1 className="text-2xl font-extrabold tracking-tight">{client.name}</h1>
            <p className="text-stone-500">Settimana {weekLabel(start)}</p>
          </div>
        </header>

        {list.length === 0 && <p className="text-stone-500">Nessun contenuto pianificato in questa settimana.</p>}

        <div className="space-y-5">
          {list.map((p, i) => (
            <article key={p.id} className="break-inside-avoid rounded-2xl border border-stone-200 p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-chip text-xs font-bold text-white">{i + 1}</span>
                <p className="font-bold">
                  {capitalize(fmt(p.date, 'EEEE d MMMM'))} · {p.time}
                </p>
                <span className="text-sm text-stone-500">
                  {PLATFORM_META[p.platform].label} · {FORMAT_LABEL[p.format]}
                </span>
                <StatusPill status={p.status} className="ml-auto" />
              </div>
              {p.title && <p className="mb-2 font-semibold">{p.title}</p>}
              {p.copy && <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-stone-800">{p.copy}</p>}
              {p.visual && (
                <p className="mt-3 rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  <b>Immagine / video:</b> {p.visual}
                </p>
              )}
              {p.assetLink && (
                <p className="mt-2 text-sm">
                  <b>Anteprima:</b>{' '}
                  <a href={p.assetLink} className="text-brand-600 underline">
                    {p.assetLink}
                  </a>
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
