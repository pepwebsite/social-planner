/**
 * Legge un calendario esterno in formato iCal (es. l'"indirizzo segreto" di Google Calendar)
 * e restituisce gli impegni del periodo in JSON: /api/ical?url=<indirizzo>
 * Accetta solo indirizzi dei servizi di calendario noti, per non diventare un proxy aperto.
 */

const TZ = 'Europe/Rome'
const ALLOWED_HOSTS = [/^calendar\.google\.com$/, /^([a-z0-9-]+\.)*icloud\.com$/, /^outlook\.(office365|live)\.com$/, /^outlook\.office\.com$/]
const MAX_BYTES = 5_000_000
const MAX_OCCURRENCES = 800

export interface ExternalItem {
  id: string
  title: string
  date: string // yyyy-MM-dd (ora di Roma)
  time: string // HH:mm, vuoto se tutto il giorno
  endTime: string
  allDay: boolean
  location: string
}

/* ------------------------------------------------------------- Orari ---- */

function tzOffset(ts: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ts))
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - ts
}

function validTz(tz: string | undefined) {
  if (!tz) return TZ
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return tz
  } catch {
    return TZ
  }
}

/** Ora "da muro" in un fuso → istante UTC */
function wallToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string) {
  const wall = Date.UTC(y, mo, d, h, mi)
  let utc = wall - tzOffset(wall, tz)
  utc = wall - tzOffset(utc, tz)
  return utc
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Istante → data e ora di Roma */
function toRome(ts: number) {
  const local = new Date(ts + tzOffset(ts, TZ))
  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  }
}

/* ------------------------------------------------------------ Lettura ---- */

interface Prop {
  value: string
  params: Record<string, string>
}

interface RawEvent {
  props: Record<string, Prop[]>
}

export function parseIcs(text: string): RawEvent[] {
  const lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/)
  const events: RawEvent[] = []
  let cur: RawEvent | null = null
  let depth = 0
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      cur = { props: {} }
      depth = 0
      continue
    }
    if (!cur) continue
    if (line.startsWith('BEGIN:')) depth++
    else if (line === 'END:VEVENT') {
      events.push(cur)
      cur = null
    } else if (line.startsWith('END:')) depth--
    else if (depth === 0) {
      const colon = line.indexOf(':')
      if (colon < 0) continue
      const [name, ...params] = line.slice(0, colon).split(';')
      const p: Record<string, string> = {}
      for (const kv of params) {
        const [k, v] = kv.split('=')
        if (k && v) p[k.toUpperCase()] = v.replace(/^"|"$/g, '')
      }
      const key = name.toUpperCase()
      ;(cur.props[key] ??= []).push({ value: line.slice(colon + 1), params: p })
    }
  }
  return events
}

const unescape = (s: string) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1')

interface Moment {
  allDay: boolean
  // componenti "da muro" nel fuso dell'evento
  y: number
  mo: number
  d: number
  h: number
  mi: number
  tz: string
  utc: boolean
}

function parseMoment(p: Prop | undefined): Moment | null {
  if (!p) return null
  const v = p.value.trim()
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v)
  if (!m) return null
  const allDay = p.params.VALUE === 'DATE' || !m[4]
  return {
    allDay,
    y: +m[1],
    mo: +m[2] - 1,
    d: +m[3],
    h: allDay ? 0 : +m[4],
    mi: allDay ? 0 : +m[5],
    tz: validTz(p.params.TZID),
    utc: Boolean(m[7]),
  }
}

const momentUtc = (m: Moment) => (m.utc ? Date.UTC(m.y, m.mo, m.d, m.h, m.mi) : wallToUtc(m.y, m.mo, m.d, m.h, m.mi, m.tz))

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

/** Espande le ripetizioni più comuni (giornaliere, settimanali, mensili, annuali) */
function occurrences(start: Moment, rrule: string | undefined, windowStart: number, windowEnd: number): Moment[] {
  if (!rrule) return [start]
  const r: Record<string, string> = {}
  for (const part of rrule.split(';')) {
    const [k, v] = part.split('=')
    if (k && v) r[k.toUpperCase()] = v
  }
  const freq = r.FREQ
  const interval = Math.max(1, Number(r.INTERVAL) || 1)
  const count = r.COUNT ? Number(r.COUNT) : Infinity
  const until = r.UNTIL ? parseMoment({ value: r.UNTIL, params: {} }) : null
  const untilTs = until ? momentUtc(until) : Infinity
  const byDay = r.BYDAY ? r.BYDAY.split(',').map((x) => DAYS.indexOf(x.slice(-2))).filter((x) => x >= 0) : null

  const out: Moment[] = []
  let n = 0
  const at = (y: number, mo: number, d: number): Moment => {
    const dt = new Date(Date.UTC(y, mo, d))
    return { ...start, y: dt.getUTCFullYear(), mo: dt.getUTCMonth(), d: dt.getUTCDate() }
  }
  const push = (m: Moment) => {
    const ts = momentUtc(m)
    if (ts > untilTs || n >= count) return false
    n++
    if (ts >= windowStart - 86_400_000 && ts <= windowEnd) out.push(m)
    return ts <= windowEnd
  }

  for (let i = 0; i < 3000 && out.length < MAX_OCCURRENCES; i++) {
    if (freq === 'DAILY') {
      if (!push(at(start.y, start.mo, start.d + i * interval))) break
    } else if (freq === 'WEEKLY') {
      const weekStart = at(start.y, start.mo, start.d + i * 7 * interval)
      const days = byDay ?? [new Date(Date.UTC(start.y, start.mo, start.d)).getUTCDay()]
      const base = new Date(Date.UTC(weekStart.y, weekStart.mo, weekStart.d))
      const baseDow = base.getUTCDay()
      let keep = true
      for (const dow of [...days].sort((a, b) => ((a - baseDow + 7) % 7) - ((b - baseDow + 7) % 7))) {
        const m = at(weekStart.y, weekStart.mo, weekStart.d + ((dow - baseDow + 7) % 7))
        if (momentUtc(m) < momentUtc(start)) continue
        if (!push(m)) {
          keep = false
          break
        }
      }
      if (!keep) break
    } else if (freq === 'MONTHLY') {
      const m = at(start.y, start.mo + i * interval, 1)
      const last = new Date(Date.UTC(m.y, m.mo + 1, 0)).getUTCDate()
      if (start.d <= last && !push({ ...m, d: start.d })) break
    } else if (freq === 'YEARLY') {
      if (!push({ ...start, y: start.y + i * interval })) break
    } else {
      return [start]
    }
  }
  return out
}

export function toItems(raw: RawEvent[], windowStart: number, windowEnd: number): ExternalItem[] {
  const items: ExternalItem[] = []
  // Istanze modificate singolarmente (RECURRENCE-ID) sostituiscono quelle della serie
  const overridden = new Set<string>()
  for (const e of raw) {
    const rid = parseMoment(e.props['RECURRENCE-ID']?.[0])
    if (rid) overridden.add(`${e.props.UID?.[0]?.value}|${momentUtc(rid)}`)
  }
  for (const e of raw) {
    if (e.props.STATUS?.[0]?.value === 'CANCELLED') continue
    const start = parseMoment(e.props.DTSTART?.[0])
    if (!start) continue
    const end = parseMoment(e.props.DTEND?.[0])
    const uid = e.props.UID?.[0]?.value ?? Math.random().toString(36)
    const isOverride = Boolean(e.props['RECURRENCE-ID'])
    const exdates = new Set(
      (e.props.EXDATE ?? []).flatMap((p) => p.value.split(',').map((v) => parseMoment({ value: v, params: p.params }))).filter(Boolean).map((m) => momentUtc(m!)),
    )
    const durationMs = end ? momentUtc(end) - momentUtc(start) : start.allDay ? 86_400_000 : 3_600_000
    const title = unescape(e.props.SUMMARY?.[0]?.value ?? '(senza titolo)')
    const location = unescape(e.props.LOCATION?.[0]?.value ?? '')

    for (const occ of occurrences(start, isOverride ? undefined : e.props.RRULE?.[0]?.value, windowStart, windowEnd)) {
      const ts = momentUtc(occ)
      if (exdates.has(ts) || (!isOverride && overridden.has(`${uid}|${ts}`))) continue
      if (ts + durationMs < windowStart || ts > windowEnd) continue
      if (occ.allDay) {
        // Eventi di più giorni: uno per giorno (massimo 31)
        const days = Math.max(1, Math.min(31, Math.round(durationMs / 86_400_000)))
        for (let k = 0; k < days; k++) {
          const dt = new Date(Date.UTC(occ.y, occ.mo, occ.d + k))
          const date = `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
          items.push({ id: `${uid}|${date}`, title, date, time: '', endTime: '', allDay: true, location })
        }
      } else {
        const s = toRome(ts)
        const f = toRome(ts + durationMs)
        items.push({ id: `${uid}|${ts}`, title, date: s.date, time: s.time, endTime: f.date === s.date ? f.time : '', allDay: false, location })
      }
    }
  }
  return items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
}

/* ------------------------------------------------------------ Handler ---- */

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': status === 200 ? 'private, max-age=300' : 'no-store' } })

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  let target: URL
  try {
    target = new URL((params.get('url') ?? '').trim().replace(/^webcals?:\/\//i, 'https://'))
  } catch {
    return json({ error: 'Indirizzo non valido.' }, 400)
  }
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.some((re) => re.test(target.hostname))) {
    return json({ error: 'Sono supportati gli indirizzi iCal di Google Calendar, iCloud e Outlook.' }, 400)
  }

  const now = Date.now()
  const from = Number(params.get('from')) || now - 45 * 86_400_000
  const to = Number(params.get('to')) || now + 180 * 86_400_000

  let res: Response
  try {
    res = await fetch(target, { headers: { Accept: 'text/calendar' }, signal: AbortSignal.timeout(12_000), redirect: 'follow' })
  } catch {
    return json({ error: 'Il calendario non risponde. Riprova più tardi.' }, 502)
  }
  if (res.status === 404 || res.status === 403 || res.status === 401) {
    return json({ error: 'Indirizzo non trovato o non più valido: ricopialo da Google Calendar.' }, 404)
  }
  if (!res.ok) return json({ error: `Il calendario ha risposto con un errore (${res.status}).` }, 502)
  const text = await res.text()
  if (text.length > MAX_BYTES) return json({ error: 'Calendario troppo grande.' }, 413)
  if (!text.includes('BEGIN:VCALENDAR')) return json({ error: 'L’indirizzo non contiene un calendario iCal.' }, 400)

  const nameMatch = /^X-WR-CALNAME:(.+)$/m.exec(text)
  const items = toItems(parseIcs(text), from, to)
  return json({ name: nameMatch ? unescape(nameMatch[1].trim()) : null, items })
}
