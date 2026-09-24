/**
 * Calendario iCal (.ics) privato di un utente: /api/calendar?t=<token>
 * Si aggiunge a Google Calendar ("Da URL") o al calendario dell'iPhone e si aggiorna da solo.
 * I dati arrivano da Supabase tramite la funzione `calendar_feed`, che espone solo
 * le informazioni del calendario a chi conosce il token segreto.
 */

const TZ = 'Europe/Rome'

interface FeedClient {
  id: string
  name: string
}
interface FeedPost {
  id: string
  clientId: string
  date: string
  time: string
  platform: string
  format: string
  title: string
  status: string
}
interface FeedEvent {
  id: string
  clientId: string
  name: string
  date: string
  time: string
  location: string
}
interface FeedTask {
  id: string
  clientId: string | null
  title: string
  due: string
  done: boolean
}
interface Feed {
  clients: FeedClient[]
  posts: FeedPost[]
  events: FeedEvent[]
  tasks: FeedTask[]
}

const PLATFORM: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', linkedin: 'LinkedIn', youtube: 'YouTube' }
const FORMAT: Record<string, string> = { post: 'Post', carosello: 'Carosello', reel: 'Reel', story: 'Story', live: 'Live', video: 'Video' }
const STATUS: Record<string, { icon: string; label: string }> = {
  idea: { icon: '💡', label: 'Idea' },
  bozza: { icon: '✏️', label: 'Bozza' },
  in_approvazione: { icon: '⏳', label: 'In approvazione' },
  approvato: { icon: '✅', label: 'Approvato' },
  programmato: { icon: '📅', label: 'Programmato' },
  pubblicato: { icon: '✔️', label: 'Pubblicato' },
}

/* ------------------------------------------------------------- Orari ---- */

/** Differenza (ms) tra l'ora di Roma e UTC in un dato istante */
function tzOffset(ts: number) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
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

/** Data e ora "di Roma" → istante UTC (gestisce l'ora legale) */
function romeToUtc(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = (time || '00:00').split(':').map(Number)
  const wall = Date.UTC(y, m - 1, d, hh || 0, mm || 0)
  let utc = wall - tzOffset(wall)
  utc = wall - tzOffset(utc)
  return utc
}

const pad = (n: number) => String(n).padStart(2, '0')
function utcStamp(ts: number) {
  const d = new Date(ts)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
}
const dateStamp = (date: string) => date.replaceAll('-', '')
function nextDay(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const n = new Date(Date.UTC(y, m - 1, d + 1))
  return `${n.getUTCFullYear()}${pad(n.getUTCMonth() + 1)}${pad(n.getUTCDate())}`
}

/* ------------------------------------------------------------ Formato ---- */

const escapeText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Righe lunghe spezzate a 75 byte, come richiesto dallo standard iCal */
function fold(line: string) {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const out: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const b = enc.encode(ch).length
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(cur)
      cur = ''
      bytes = 0
    }
    cur += ch
    bytes += b
  }
  out.push(cur)
  return out.join('\r\n ')
}

export function buildIcs(feed: Feed, appUrl: string) {
  const now = utcStamp(Date.now())
  const clientName = (id: string | null) => feed.clients.find((c) => c.id === id)?.name ?? ''
  const cutoff = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10)
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Social Planner//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Social Planner · Piano social',
    `X-WR-TIMEZONE:${TZ}`,
    'X-WR-CALDESC:Contenuti\\, eventi e promemoria da Social Planner',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]
  const event = (props: string[]) => lines.push('BEGIN:VEVENT', `DTSTAMP:${now}`, ...props, 'END:VEVENT')

  for (const p of feed.posts) {
    if (!p.date || p.date < cutoff) continue
    const st = STATUS[p.status] ?? { icon: '📱', label: p.status }
    const start = romeToUtc(p.date, p.time)
    const what = `${PLATFORM[p.platform] ?? p.platform} ${FORMAT[p.format] ?? p.format}`
    event([
      `UID:post-${p.id}@regia`,
      `DTSTART:${utcStamp(start)}`,
      `DTEND:${utcStamp(start + 30 * 60_000)}`,
      `SUMMARY:${escapeText(`${st.icon} ${clientName(p.clientId)} · ${what}${p.title ? `: ${p.title}` : ''}`)}`,
      `DESCRIPTION:${escapeText(`Stato: ${st.label}\n${what}\n\nApri in Social Planner: ${appUrl}`)}`,
      `CATEGORIES:${escapeText(clientName(p.clientId) || 'Social Planner')}`,
      `URL:${appUrl}`,
    ])
  }

  for (const e of feed.events) {
    if (!e.date || e.date < cutoff) continue
    const summary = `🎉 ${e.name}${clientName(e.clientId) ? ` · ${clientName(e.clientId)}` : ''}`
    const timing = e.time
      ? [`DTSTART:${utcStamp(romeToUtc(e.date, e.time))}`, `DTEND:${utcStamp(romeToUtc(e.date, e.time) + 2 * 3_600_000)}`]
      : [`DTSTART;VALUE=DATE:${dateStamp(e.date)}`, `DTEND;VALUE=DATE:${nextDay(e.date)}`]
    event([`UID:event-${e.id}@regia`, ...timing, `SUMMARY:${escapeText(summary)}`, ...(e.location ? [`LOCATION:${escapeText(e.location)}`] : []), `URL:${appUrl}`])
  }

  for (const t of feed.tasks) {
    if (t.done || !t.due) continue
    const who = clientName(t.clientId)
    event([
      `UID:task-${t.id}@regia`,
      `DTSTART;VALUE=DATE:${dateStamp(t.due)}`,
      `DTEND;VALUE=DATE:${nextDay(t.due)}`,
      `SUMMARY:${escapeText(`☑️ ${t.title}${who ? ` · ${who}` : ''}`)}`,
      'TRANSP:TRANSPARENT',
      `URL:${appUrl}`,
    ])
  }

  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

/* ------------------------------------------------------------ Handler ---- */

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = (url.searchParams.get('t') ?? '').replace(/\.ics$/, '')
  const base = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!base || !key) return new Response('Calendario non disponibile: database non configurato.', { status: 503 })
  if (!/^[a-f0-9]{32,128}$/.test(token)) return new Response('Link non valido.', { status: 404 })

  const res = await fetch(`${base}/rest/v1/rpc/calendar_feed`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ feed_token: token }),
  }).catch(() => null)
  if (!res?.ok) return new Response('Calendario momentaneamente non disponibile.', { status: 502 })
  const feed = (await res.json()) as Feed | null
  if (!feed) return new Response('Link non valido o revocato.', { status: 404 })

  return new Response(buildIcs(feed, `${url.protocol}//${url.host}/calendario`), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="regia.ics"',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
