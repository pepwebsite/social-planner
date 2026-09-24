import { useEffect, useState } from 'react'
import type { ExternalCalendar } from '../types'
import { useStore } from '../store'

/* ---------------------------------------- Da Social Planner verso Google Calendar ---- */

const compact = (date: string, time: string) => `${date.replaceAll('-', '')}T${time.replace(':', '')}00`

function addMinutes(date: string, time: string, minutes: number) {
  const [y, m, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d, h, mi + minutes))
  const p = (n: number) => String(n).padStart(2, '0')
  return compact(`${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`, `${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`)
}

function nextDay(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + 1))
  const p = (n: number) => String(n).padStart(2, '0')
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}`
}

/** Link "Aggiungi a Google Calendar" per un singolo appuntamento (ora di Roma) */
export function googleEventLink({ title, date, time, minutes = 30, details = '', location = '' }: { title: string; date: string; time?: string; minutes?: number; details?: string; location?: string }) {
  const dates = time ? `${compact(date, time)}/${addMinutes(date, time, minutes)}` : `${date.replaceAll('-', '')}/${nextDay(date)}`
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates, ctz: 'Europe/Rome', details, location })
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}

/** Indirizzo del calendario privato di Social Planner da aggiungere a Google Calendar / iPhone */
export function feedUrls(token: string) {
  const https = `${window.location.origin}/api/calendar?t=${token}`
  const webcal = https.replace(/^https?:\/\//, 'webcal://')
  return {
    https,
    webcal,
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
  }
}

export function newFeedToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/* ----------------------------------------- Da Google Calendar verso Social Planner ---- */

export interface ExternalItem {
  id: string
  title: string
  date: string
  time: string
  endTime: string
  allDay: boolean
  location: string
}

export interface ExternalEntry extends ExternalItem {
  calendar: ExternalCalendar
}

const TTL = 10 * 60_000
const cache = new Map<string, { at: number; items: ExternalItem[] }>()
const inflight = new Map<string, Promise<ExternalItem[]>>()

export async function fetchExternal(url: string, force = false): Promise<{ name: string | null; items: ExternalItem[] }> {
  const hit = cache.get(url)
  if (!force && hit && Date.now() - hit.at < TTL) return { name: null, items: hit.items }
  let res: Response
  try {
    res = await fetch(`/api/ical?url=${encodeURIComponent(url)}`)
  } catch {
    throw new Error('Connessione assente: controlla la rete.')
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string; name?: string | null; items?: ExternalItem[] }
  if (!res.ok) throw new Error(json.error ?? `Errore ${res.status}`)
  cache.set(url, { at: Date.now(), items: json.items ?? [] })
  return { name: json.name ?? null, items: json.items ?? [] }
}

/** Impegni dei calendari esterni collegati (si aggiornano ogni 10 minuti) */
export function useExternalItems() {
  const calendars = useStore((s) => s.externalCalendars)
  const [items, setItems] = useState<ExternalEntry[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const key = calendars.map((c) => c.id + c.url + c.color).join()

  useEffect(() => {
    let alive = true
    const load = () =>
      Promise.all(
        calendars.map(async (cal) => {
          try {
            let p = inflight.get(cal.url)
            if (!p) {
              p = fetchExternal(cal.url).then((r) => r.items)
              inflight.set(cal.url, p)
              p.finally(() => inflight.delete(cal.url))
            }
            const list = await p
            return { cal, list, error: null as string | null }
          } catch (e) {
            return { cal, list: [] as ExternalItem[], error: (e as Error).message }
          }
        }),
      ).then((results) => {
        if (!alive) return
        setItems(results.flatMap((r) => r.list.map((i) => ({ ...i, calendar: r.cal }))))
        setErrors(Object.fromEntries(results.filter((r) => r.error).map((r) => [r.cal.id, r.error!])))
      })
    if (calendars.length) void load()
    else setItems([])
    const timer = setInterval(() => calendars.length && void load(), TTL)
    return () => {
      alive = false
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { items, errors }
}
