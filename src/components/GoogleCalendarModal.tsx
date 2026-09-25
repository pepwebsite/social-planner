import { useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Check, ClipboardCopy, ExternalLink, Loader2, RefreshCw, Smartphone, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { useUi } from '../ui'
import { useAuth } from '../auth'
import { cloudEnabled, supabase } from '../lib/supabase'
import { feedUrls, fetchExternal, newFeedToken } from '../lib/calendarLinks'
import { GCAL_PATH } from './brandPaths'
import { Button, Field, Input, Modal, Segmented, cx } from './ui'

export function GoogleCalendarIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path d={GCAL_PATH} fill="#4285F4" />
    </svg>
  )
}

const isPhone = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
const ADD_BY_URL = 'https://calendar.google.com/calendar/r/settings/addbyurl'

function DesktopTip() {
  return (
    <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
      Se si apre l’app o una pagina semplificata: torna in Chrome, tocca <b>⋮</b> in alto a destra e spunta <b>“Sito desktop”</b> (su iPhone in Safari: <b>aA → Richiedi sito desktop</b>).
    </p>
  )
}

const CAL_COLORS = ['#64748b', '#0ea5e9', '#16a34a', '#f59e0b', '#e11d48', '#7c3aed']

type Tab = 'esporta' | 'importa'

export function GoogleCalendarModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('esporta')
  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <GoogleCalendarIcon size={22} /> Google Calendar
        </span>
      }
      subtitle="Collega Social Planner al calendario del telefono, in entrambe le direzioni."
      onClose={onClose}
      width="max-w-xl"
    >
      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-5 grid w-full grid-cols-2"
        options={[
          { value: 'esporta', label: <span className="flex items-center justify-center gap-1.5"><ArrowUpFromLine size={14} /> Social Planner → Google</span> },
          { value: 'importa', label: <span className="flex items-center justify-center gap-1.5"><ArrowDownToLine size={14} /> Google → Social Planner</span> },
        ]}
      />
      {tab === 'esporta' ? <ExportPanel /> : <ImportPanel />}
    </Modal>
  )
}

/* ------------------------------------------------- Social Planner → Google / telefono ---- */

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-chip text-xs font-bold text-white">{n}</span>
      <div className="min-w-0 flex-1 text-sm text-stone-700">{children}</div>
    </li>
  )
}

function ExportPanel() {
  const user = useAuth((s) => s.user)
  const toast = useUi((s) => s.toast)
  const [token, setToken] = useState<string | null>(null)
  const phone = isPhone()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase || !user) return setLoading(false)
    void supabase
      .from('calendar_feeds')
      .select('token')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(dbError(error.message))
        else setToken((data?.token as string | undefined) ?? null)
        setLoading(false)
      })
  }, [user])

  const create = async () => {
    if (!supabase || !user) return
    setBusy(true)
    setError(null)
    const t = newFeedToken()
    const { error } = await supabase.from('calendar_feeds').upsert({ user_id: user.id, token: t })
    setBusy(false)
    if (error) return setError(dbError(error.message))
    if (token) toast('Nuovo link creato: quello vecchio non funziona più', 'info')
    setToken(t)
  }

  if (!cloudEnabled || !user) {
    return <p className="rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-900 ring-1 ring-amber-200">Per avere il link del calendario serve l’accesso con un account.</p>
  }
  if (loading) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-stone-500">
        <Loader2 size={15} className="animate-spin" /> Carico…
      </p>
    )
  }

  const urls = token ? feedUrls(token) : null
  return (
    <div className="space-y-5">
      <p className="text-sm text-stone-600">
        I contenuti programmati, gli eventi e le attività di Social Planner compaiono nel tuo <b>Google Calendar</b>, e quindi anche nel calendario del telefono. Si aggiornano da soli.
      </p>

      {error === SETUP ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">Il link del calendario non è disponibile in questo momento. Riprova tra poco.</p>
      ) : (
        error && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p>
      )}

      {!urls ? (
        <Button variant="primary" className="h-11 w-full" disabled={busy} onClick={create} icon={busy ? <Loader2 size={16} className="animate-spin" /> : <GoogleCalendarIcon size={18} className="rounded bg-surface" />}>
          Crea il mio link del calendario
        </Button>
      ) : (
        <>
          {phone ? (
            <ol className="space-y-3">
              <Step n={1}>
                <Button className="w-full" icon={<ClipboardCopy size={15} />} onClick={() => navigator.clipboard.writeText(urls.https).then(() => toast('Link copiato: ora apri Google Calendar'))}>
                  Copia il link del calendario
                </Button>
              </Step>
              <Step n={2}>
                <a href={ADD_BY_URL} target="_blank" rel="noreferrer" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface font-semibold text-stone-800 ring-1 ring-stone-200">
                  <GoogleCalendarIcon size={20} /> Apri “Aggiungi da URL” <ExternalLink size={14} className="text-stone-400" />
                </a>
                <DesktopTip />
              </Step>
              <Step n={3}>
                Incolla il link nel campo <b>“URL del calendario”</b> e tocca <b>“Aggiungi calendario”</b>. Dopo qualche minuto compare anche nell’app Google Calendar.
              </Step>
              <Step n={4}>
                <a href={urls.webcal} className="font-semibold text-brand-600">
                  Hai un iPhone e usi il Calendario di Apple? Tocca qui.
                </a>
              </Step>
            </ol>
          ) : (
          <ol className="space-y-3">
            <Step n={1}>
              <a href={urls.google} target="_blank" rel="noreferrer" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface font-semibold text-stone-800 ring-1 ring-stone-200 transition hover:bg-stone-50">
                <GoogleCalendarIcon size={20} /> Aggiungi a Google Calendar <ExternalLink size={14} className="text-stone-400" />
              </a>
              <p className="mt-1.5 text-xs text-stone-500">Si apre Google Calendar: conferma con “Aggiungi”. Poi comparirà da solo anche nell’app Google Calendar del telefono.</p>
            </Step>
            <Step n={2}>
              <a href={urls.webcal} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface font-semibold text-stone-800 ring-1 ring-stone-200 transition hover:bg-stone-50">
                <Smartphone size={18} /> iPhone: aggiungi al Calendario
              </a>
              <p className="mt-1.5 text-xs text-stone-500">Solo se usi il calendario di Apple invece di Google.</p>
            </Step>
          </ol>
          )}

          <Field label="Oppure copia il link" hint="per Outlook o altre app">
            <div className="flex gap-2">
              <Input readOnly value={urls.https} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
              <Button icon={<ClipboardCopy size={15} />} onClick={() => navigator.clipboard.writeText(urls.https).then(() => toast('Link copiato'))}>
                Copia
              </Button>
            </div>
          </Field>

          <div className="rounded-xl bg-stone-100/80 px-3 py-2.5 text-xs leading-relaxed text-stone-600">
            <b>Da sapere:</b> Google Calendar aggiorna i calendari aggiunti con un link ogni qualche ora (non all’istante); il calendario dell’iPhone più spesso. Il link è personale: chi lo ha vede date e titoli dei contenuti, senza testi né contatti.
          </div>

          <button type="button" onClick={create} disabled={busy} className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-rose-600">
            <RefreshCw size={14} /> Crea un nuovo link (disattiva quello attuale)
          </button>
        </>
      )}
    </div>
  )
}

const SETUP = 'setup'

function dbError(message: string) {
  if (/calendar_feeds|does not exist|schema cache/i.test(message)) {
    return SETUP
  }
  return 'Impossibile creare il link. Riprova tra poco.'
}

/* ----------------------------------------------------- Google → Social Planner ---- */

function ImportPanel() {
  const calendars = useStore((s) => s.externalCalendars)
  const { addExternalCalendar, removeExternalCalendar } = useStore.getState()
  const toast = useUi((s) => s.toast)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = async () => {
    const clean = url.trim()
    if (!clean) return
    if (calendars.some((c) => c.url === clean)) return setError('Questo calendario è già collegato.')
    setBusy(true)
    setError(null)
    try {
      const { name, items } = await fetchExternal(clean, true)
      addExternalCalendar({ url: clean, name: name || 'Google Calendar', color: CAL_COLORS[calendars.length % CAL_COLORS.length] })
      setUrl('')
      toast(`Calendario collegato: ${items.length} impegni trovati`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-stone-600">I tuoi impegni di Google Calendar (riunioni, appuntamenti, ferie) compaiono dentro il calendario di Social Planner, così pianifichi tenendone conto.</p>

      <ol className="space-y-3">
        <Step n={1}>
          Apri{' '}
          <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noreferrer" className="font-semibold text-brand-600 hover:underline">
            le impostazioni di Google Calendar
          </a>
          .
          {isPhone() && <DesktopTip />}
        </Step>
        <Step n={2}>
          Nel menu a sinistra, sotto <b>“Impostazioni dei miei calendari”</b>, tocca il tuo calendario (di solito il tuo nome) e poi <b>“Integra calendario”</b>.
        </Step>
        <Step n={3}>
          Copia l’<b>“Indirizzo segreto in formato iCal”</b> (sul telefono: tieni premuto sull’indirizzo → Copia; finisce con <code className="rounded bg-stone-100 px-1 text-xs">basic.ics</code>) e incollalo qui sotto.
        </Step>
      </ol>

      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && connect()}
          placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
          className="font-mono text-xs"
          spellCheck={false}
          autoComplete="off"
        />
        <Button variant="primary" onClick={connect} disabled={busy || !url.trim()} icon={busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}>
          Collega
        </Button>
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p>}

      {calendars.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] font-semibold text-stone-700">Calendari collegati</p>
          <div className="space-y-1.5">
            {calendars.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-stone-200">
                <span className="size-3 rounded-full" style={{ background: c.color }} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.name}</span>
                <button
                  type="button"
                  aria-label={`Scollega ${c.name}`}
                  onClick={() => {
                    removeExternalCalendar(c.id)
                    toast('Calendario scollegato', 'info')
                  }}
                  className={cx('rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600')}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-stone-500">Gli impegni si aggiornano ogni 10 minuti mentre usi Social Planner. Sono in sola lettura: per modificarli usa Google Calendar. L’indirizzo segreto resta nel tuo account.</p>
    </div>
  )
}
