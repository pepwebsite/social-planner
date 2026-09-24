import type { Client, ClientEvent, Format, Platform, Post } from '../types'
import { FORMAT_LABEL, PLATFORM_META } from './meta'
import type { SlotInstance } from './insights'
import { activeProvider, type ModelOption } from '../aiStore'

export interface AiPostDraft {
  date: string
  time: string
  platform: Platform
  format: Format
  title: string
  copy: string
  visual: string
}

const brief = (c: Client) => ({
  name: c.name,
  sector: c.sector,
  audience: c.audience,
  tone: c.tone,
  doList: c.doList,
  dontList: c.dontList,
  hashtags: c.hashtags,
  copyExamples: c.copyExamples,
  notes: c.notes,
})

async function post<T>(body: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    // Se l'utente ha collegato un provider, la sua chiave viaggia con la richiesta
    const provider = body.provider ?? activeProvider()
    res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, provider }),
    })
  } catch {
    throw new Error('Connessione assente: controlla la rete e riprova.')
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string } & T
  if (!res.ok) throw new Error(json.error ?? `Errore ${res.status}`)
  return json
}

export interface AiStatus {
  enabled: boolean
  source: 'browser' | 'server' | null
  provider: string | null
  model: string | null
}

export async function aiStatus(): Promise<AiStatus> {
  const local = activeProvider()
  if (local) return { enabled: true, source: 'browser', provider: local.id, model: local.model }
  try {
    const res = await fetch('/api/ai')
    if (!res.ok) throw new Error()
    const json = (await res.json()) as { enabled?: boolean; provider?: string | null; model?: string | null }
    return { enabled: Boolean(json.enabled), source: json.enabled ? 'server' : null, provider: json.provider ?? null, model: json.model ?? null }
  } catch {
    return { enabled: false, source: null, provider: null, model: null }
  }
}

export function validateProvider(id: string, apiKey: string) {
  return post<{ ok: boolean; models: ModelOption[] }>({ action: 'validate', provider: { id, apiKey, model: '' } })
}

export async function generateWeek(args: {
  client: Client
  weekLabel: string
  slots: SlotInstance[]
  events: ClientEvent[]
  existing: Post[]
  instructions: string
}) {
  const { posts } = await post<{ posts: AiPostDraft[] }>({
    action: 'week',
    client: brief(args.client),
    weekLabel: args.weekLabel,
    slots: args.slots.map((s) => ({
      date: s.date,
      weekday: s.weekday,
      time: s.time,
      platform: PLATFORM_META[s.platform].label,
      format: FORMAT_LABEL[s.format],
    })),
    events: args.events.map((e) => ({ name: e.name, date: e.date, location: e.location, notes: e.notes })),
    existing: args.existing.map((p) => ({ date: p.date, title: p.title || FORMAT_LABEL[p.format], format: p.format })),
    instructions: args.instructions,
  })
  return posts
}

export async function generateCopy(client: Client, p: Post, instructions: string) {
  const { copy } = await post<{ copy: string }>({
    action: 'copy',
    client: brief(client),
    post: {
      date: p.date,
      platform: PLATFORM_META[p.platform].label,
      format: FORMAT_LABEL[p.format],
      title: p.title,
      copy: p.copy,
      visual: p.visual,
    },
    instructions,
  })
  return copy
}
