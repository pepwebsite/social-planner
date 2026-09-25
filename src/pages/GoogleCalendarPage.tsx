import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Check, ChevronDown, ClipboardCopy, ExternalLink, Loader2, Plus, RefreshCw, ShieldCheck, Smartphone, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { useUi } from '../ui'
import { useAuth } from '../auth'
import { cloudEnabled, supabase } from '../lib/supabase'
import { feedUrls, fetchExternal, newFeedToken } from '../lib/calendarLinks'
import { GoogleCalendarIcon } from '../components/GoogleCalendarIcon'
import { AppLogo } from '../components/AppLogo'
import { Button, Card, Input, cx } from '../components/ui'

const isPhone = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
const isApple = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)
const ADD_BY_URL = 'https://calendar.google.com/calendar/r/settings/addbyurl'
const SETTINGS_URL = 'https://calendar.google.com/calendar/r/settings'
const CAL_COLORS = ['#64748b', '#0ea5e9', '#16a34a', '#f59e0b', '#e11d48', '#7c3aed']

/* ------------------------------------------------------------ Pezzi ---- */

function StatusPill({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', on ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500')}>
      <span className={cx('size-1.5 rounded-full', on ? 'bg-emerald-500' : 'bg-stone-400')} />
      {children}
    </span>
  )
}

/** Passaggi numerati uniti da una linea */
function Steps({ children }: { children: ReactNode[] }) {
  return (
    <ol className="relative space-y-4">
      {children.map((c, i) => (
        <li key={i} className="relative flex gap-3">
          {i < children.length - 1 && <span className="absolute top-7 bottom-[-1rem] left-[13px] w-0.5 bg-stone-200" />}
          <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
          <div className="min-w-0 flex-1 pt-0.5 text-sm leading-relaxed text-stone-700">{c}</div>
        </li>
      ))}
    </ol>
  )
}

/** Sezione che si apre con un tocco */
function Disclosure({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl bg-stone-50 ring-1 ring-stone-900/5">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-stone-700">
        {title}
        <ChevronDown size={17} className={cx('shrink-0 text-stone-400 transition', open && 'rotate-180')} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function DesktopHint() {
  return (
    <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
      {isApple() ? (
        <>
          Se si apre l’app: torna in Safari, tocca <b>aA</b> e scegli <b>Richiedi sito desktop</b>.
        </>
      ) : (
        <>
          Se si apre l’app: torna in Chrome, tocca <b>⋮</b> e spunta <b>Sito desktop</b>.
        </>
      )}
    </p>
  )
}

function SectionHeader({ from, to, title, text, status }: { from: ReactNode; to: ReactNode; title: string; text: string; status: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex w-fit shrink-0 items-center gap-1 rounded-2xl bg-stone-50 p-2 ring-1 ring-stone-900/5">
        {from}
        <span className="text-stone-300">→</span>
        {to}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">{title}</h2>
          {status}
        </div>
        <p className="mt-0.5 text-sm text-stone-500">{text}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Pagina ---- */

export function GoogleCalendarPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-5 pb-10 md:px-8 md:pt-8">
      <Link to="/impostazioni" className="inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-800">
        <ArrowLeft size={15} /> Impostazioni
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-surface shadow-soft ring-1 ring-stone-900/5">
          <GoogleCalendarIcon size={32} />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight">Google Calendar</h1>
          <p className="text-sm text-stone-500">Tieni allineati Social Planner e il calendario del telefono.</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <ExportCard />
        <ImportCard />
      </div>

      <p className="mt-6 flex items-start gap-2 px-1 text-xs leading-relaxed text-stone-500">
        <ShieldCheck size={15} className="mt-px shrink-0 text-emerald-600" />
        I collegamenti sono personali. Verso Google passano solo date, orari e titoli, mai testi o contatti. Google aggiorna i calendari collegati ogni qualche ora.
      </p>
    </div>
  )
}

/* ------------------------------------------------ Social Planner → Google ---- */

function ExportCard() {
  const user = useAuth((s) => s.user)
  const toast = useUi((s) => s.toast)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const phone = isPhone()

  useEffect(() => {
    if (!supabase || !user) return setLoading(false)
    void supabase
      .from('calendar_feeds')
      .select('token')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError('Non riesco a leggere il collegamento. Riprova tra poco.')
        const t = (data?.token as string | undefined) ?? null
        setToken(t)
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
    if (error) return setError('Non sono riuscito ad attivarlo. Riprova tra poco.')
    if (token) toast('Nuovo link creato: quello vecchio non funziona più', 'info')
    setToken(t)
  }

  const urls = token ? feedUrls(token) : null
  const copy = () =>
    urls &&
    navigator.clipboard.writeText(urls.https).then(() => {
      setCopied(true)
      toast('Link copiato')
      setTimeout(() => setCopied(false), 3000)
    })

  return (
    <Card className="p-5">
      <SectionHeader
        from={<AppLogo size={28} />}
        to={<GoogleCalendarIcon size={28} />}
        title="Social Planner in Google Calendar"
        text="Contenuti, eventi e promemoria compaiono nel calendario del telefono."
        status={!loading && <StatusPill on={Boolean(token)}>{token ? 'Attivo' : 'Non attivo'}</StatusPill>}
      />

      <div className="mt-5">
        {!cloudEnabled || !user ? (
          <p className="text-sm text-stone-500">Serve l’accesso con un account.</p>
        ) : loading ? (
          <p className="flex items-center gap-2 text-sm text-stone-500">
            <Loader2 size={15} className="animate-spin" /> Controllo…
          </p>
        ) : !urls ? (
          <Button variant="primary" className="h-12 w-full text-[15px]" disabled={busy} onClick={create} icon={busy ? <Loader2 size={17} className="animate-spin" /> : <Plus size={18} />}>
            Attiva
          </Button>
        ) : phone ? (
          <Steps>
            {[
              <>
                <Button variant="primary" className="h-11 w-full" onClick={copy} icon={copied ? <Check size={17} /> : <ClipboardCopy size={17} />}>
                  {copied ? 'Copiato!' : 'Copia il link'}
                </Button>
              </>,
              <>
                <a href={ADD_BY_URL} target="_blank" rel="noreferrer" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface font-semibold text-stone-800 ring-1 ring-stone-200">
                  <GoogleCalendarIcon size={19} /> Apri Google Calendar <ExternalLink size={14} className="text-stone-400" />
                </a>
                <DesktopHint />
              </>,
              <>
                Incolla il link in <b>URL del calendario</b> e tocca <b>Aggiungi calendario</b>.
              </>,
            ]}
          </Steps>
        ) : (
          <a href={urls.google} target="_blank" rel="noreferrer" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[15px] font-semibold text-white shadow-sm transition hover:brightness-110">
            <GoogleCalendarIcon size={20} className="rounded bg-white p-px" /> Aggiungi a Google Calendar
          </a>
        )}
        {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}
      </div>

      {urls && (
        <div className="mt-4 space-y-2">
          <Disclosure title="Altre opzioni">
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-stone-500">Il tuo link (per Outlook o altre app)</p>
                <div className="flex gap-2">
                  <Input readOnly value={urls.https} onFocus={(e) => e.target.select()} className="h-10 font-mono text-xs" />
                  <Button onClick={copy} icon={copied ? <Check size={15} /> : <ClipboardCopy size={15} />}>
                    {copied ? '' : 'Copia'}
                  </Button>
                </div>
              </div>
              <a href={urls.webcal} className="flex items-center gap-2 text-sm font-semibold text-brand-600">
                <Smartphone size={16} /> Aggiungi al Calendario di iPhone
              </a>
              <button type="button" onClick={create} disabled={busy} className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-rose-600">
                <RefreshCw size={15} /> Crea un nuovo link (quello attuale smette di funzionare)
              </button>
            </div>
          </Disclosure>
        </div>
      )}
    </Card>
  )
}

/* ------------------------------------------------ Google → Social Planner ---- */

function ImportCard() {
  const calendars = useStore((s) => s.externalCalendars)
  const { addExternalCalendar, removeExternalCalendar } = useStore.getState()
  const toast = useUi((s) => s.toast)
  const [adding, setAdding] = useState(false)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const phone = isPhone()

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
      setAdding(false)
      toast(`Collegato: ${items.length} impegni trovati`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const paste = async () => {
    try {
      setUrl((await navigator.clipboard.readText()).trim())
      setError(null)
    } catch {
      /* incolla manuale */
    }
  }

  return (
    <Card className="p-5">
      <SectionHeader
        from={<GoogleCalendarIcon size={28} />}
        to={<AppLogo size={28} />}
        title="Google Calendar in Social Planner"
        text="Riunioni e appuntamenti compaiono nel tuo calendario di lavoro."
        status={<StatusPill on={calendars.length > 0}>{calendars.length ? 'Attivo' : 'Non attivo'}</StatusPill>}
      />

      {calendars.length > 0 && (
        <div className="mt-5 space-y-2">
          {calendars.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-stone-50 px-4 py-3 ring-1 ring-stone-900/5">
              <span className="flex size-9 items-center justify-center rounded-xl" style={{ background: `${c.color}22`, color: c.color }}>
                <CalendarDays size={18} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.name}</span>
              <button
                type="button"
                aria-label={`Scollega ${c.name}`}
                onClick={() => {
                  removeExternalCalendar(c.id)
                  toast('Calendario scollegato', 'info')
                }}
                className="rounded-lg p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5">
        {!adding ? (
          <Button variant={calendars.length ? 'secondary' : 'primary'} className="h-12 w-full text-[15px]" onClick={() => setAdding(true)} icon={<Plus size={18} />}>
            {calendars.length ? 'Collega un altro calendario' : 'Collega il mio Google Calendar'}
          </Button>
        ) : (
          <div className="space-y-4">
            <Steps>
              {[
                <>
                  <a href={SETTINGS_URL} target="_blank" rel="noreferrer" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface font-semibold text-stone-800 ring-1 ring-stone-200">
                    <GoogleCalendarIcon size={19} /> Apri le impostazioni di Google <ExternalLink size={14} className="text-stone-400" />
                  </a>
                  {phone && <DesktopHint />}
                </>,
                <>
                  Tocca il tuo calendario, poi <b>Integra calendario</b>, e copia l’<b>Indirizzo segreto in formato iCal</b>.
                </>,
                <>
                  <div className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value)
                        setError(null)
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && connect()}
                      placeholder="Incolla qui l’indirizzo"
                      className="h-11"
                      spellCheck={false}
                      autoComplete="off"
                    />
                    <Button className="h-11" onClick={paste} icon={<ClipboardCopy size={15} />}>
                      Incolla
                    </Button>
                  </div>
                  <Button variant="primary" className="mt-2 h-11 w-full" onClick={connect} disabled={busy || !url.trim()} icon={busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}>
                    Collega
                  </Button>
                </>,
              ]}
            </Steps>
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}
            <Disclosure title="Dove trovo l’indirizzo segreto?">
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-stone-600">
                <li>Nelle impostazioni di Google Calendar, a sinistra c’è la sezione <b>Impostazioni dei miei calendari</b>: il tuo calendario di solito ha il tuo nome.</li>
                <li>
                  Dentro il calendario scorri fino a <b>Integra calendario</b>: l’ultimo indirizzo, <b>Indirizzo segreto in formato iCal</b>, finisce con <code className="rounded bg-stone-200/70 px-1 text-xs">basic.ics</code>.
                </li>
                <li>Sul telefono tieni premuto sull’indirizzo e scegli <b>Copia</b>.</li>
              </ul>
            </Disclosure>
            <button type="button" onClick={() => setAdding(false)} className="w-full text-center text-sm font-semibold text-stone-500">
              Annulla
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
