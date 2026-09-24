import { create } from 'zustand'
import { supabase } from './supabase'
import { snapshot, useStore } from '../store'
import { useAi } from '../aiStore'
import { useUi } from '../ui'

/**
 * Sincronizzazione con il database: al login scarica il workspace dell'utente, poi salva
 * (con un piccolo ritardo) ogni modifica. localStorage resta come copia locale per l'offline.
 */

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline'

export const useSync = create<{ status: SyncStatus; savedAt: string | null }>()(() => ({ status: 'idle', savedAt: null }))

const OWNER_KEY = 'regia-owner'
const DIRTY_KEY = 'regia-dirty'
const SAVE_DELAY = 1200

let userId: string | null = null
let lastRemoteAt: string | null = null
let applyingRemote = false
let timer: ReturnType<typeof setTimeout> | null = null
let unsubscribers: (() => void)[] = []

const ls = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* storage non disponibile */
    }
  },
  del: (k: string) => {
    try {
      localStorage.removeItem(k)
    } catch {
      /* storage non disponibile */
    }
  },
}

interface RemoteRow {
  data: Record<string, unknown> | null
  ai: Record<string, unknown> | null
  updated_at: string
}

function localPayload() {
  const { entries, activeId } = useAi.getState()
  return {
    data: { ...snapshot(), onboarded: useStore.getState().onboarded, tutorialSeen: useStore.getState().tutorialSeen },
    ai: { entries, activeId },
  }
}

/* ------------------------------------------------ Copie di sicurezza ---- */

const SAFETY_KEY = 'regia-safety'
const SAFETY_MAX = 8

export interface SafetyCopy {
  at: string
  reason: string
  owner: string | null
  clients: number
  posts: number
  data: DataPayload
}

type DataPayload = Record<string, unknown> & { clients?: { id: string }[]; posts?: { id: string }[] }

export function safetyCopies(): SafetyCopy[] {
  try {
    return JSON.parse(ls.get(SAFETY_KEY) ?? '[]') as SafetyCopy[]
  } catch {
    return []
  }
}

/** Conserva nel browser una copia dei dati locali prima di sostituirli */
function saveSafetyCopy(reason: string, owner: string | null) {
  const data = localPayload().data as DataPayload
  const clients = data.clients?.length ?? 0
  const posts = data.posts?.length ?? 0
  if (!clients && !posts) return
  const list = safetyCopies()
  // Evita doppioni identici consecutivi
  if (list[0] && JSON.stringify(list[0].data) === JSON.stringify(data)) return
  list.unshift({ at: new Date().toISOString(), reason, owner, clients, posts, data })
  ls.set(SAFETY_KEY, JSON.stringify(list.slice(0, SAFETY_MAX)))
}

/** true se la copia locale contiene clienti o contenuti che il remoto non ha */
function localHasExtra(remote: Record<string, unknown>) {
  const local = localPayload().data as DataPayload
  const ids = (arr: unknown) => new Set(((arr as { id: string }[] | undefined) ?? []).map((x) => x.id))
  const rc = ids(remote.clients)
  const rp = ids(remote.posts)
  return (local.clients ?? []).some((c) => !rc.has(c.id)) || (local.posts ?? []).some((p) => !rp.has(p.id))
}

/** Unisce due versioni dei dati senza perdere nulla: per gli elementi presenti in entrambe vince `prefer` */
export function mergeData(remote: Record<string, unknown>, local: Record<string, unknown>, prefer: 'remote' | 'local') {
  const merged: Record<string, unknown> = { ...remote }
  for (const key of ['clients', 'posts', 'events', 'tasks', 'externalCalendars']) {
    const r = ((remote[key] as { id: string }[] | undefined) ?? []).slice()
    const l = (local[key] as { id: string }[] | undefined) ?? []
    const byId = new Map(r.map((x) => [x.id, x]))
    for (const item of l) {
      if (!byId.has(item.id)) byId.set(item.id, item)
      else if (prefer === 'local') byId.set(item.id, item)
    }
    merged[key] = [...byId.values()]
  }
  merged.lastWorked = { ...((remote.lastWorked as object) ?? {}), ...((local.lastWorked as object) ?? {}) }
  merged.onboarded = Boolean(remote.onboarded || local.onboarded)
  merged.tutorialSeen = Boolean(remote.tutorialSeen || local.tutorialSeen)
  return merged
}

function applyRemote(row: RemoteRow) {
  // Prima di sostituire, se qui ci sono clienti o contenuti che il remoto non ha, ne tengo una copia
  if (localHasExtra(row.data ?? {})) saveSafetyCopy('Prima di caricare i dati dell’account', ls.get(OWNER_KEY))
  applyingRemote = true
  const d = (row.data ?? {}) as Record<string, unknown>
  useStore.setState({
    clients: (d.clients as never) ?? [],
    posts: (d.posts as never) ?? [],
    events: (d.events as never) ?? [],
    tasks: (d.tasks as never) ?? [],
    lastWorked: (d.lastWorked as never) ?? {},
    externalCalendars: (d.externalCalendars as never) ?? [],
    onboarded: Boolean(d.onboarded),
    tutorialSeen: Boolean(d.tutorialSeen),
    session: null,
  })
  const ai = (row.ai ?? {}) as Record<string, unknown>
  useAi.setState({ entries: (ai.entries as never) ?? {}, activeId: (ai.activeId as string | null) ?? null })
  lastRemoteAt = row.updated_at
  applyingRemote = false
}

const hasData = (row: RemoteRow | null) => Boolean(row?.data && Array.isArray((row.data as { clients?: unknown }).clients))

export async function saveNow() {
  if (!supabase || !userId) return
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (!navigator.onLine) {
    useSync.setState({ status: 'offline' })
    return
  }
  useSync.setState({ status: 'saving' })
  const updated_at = new Date().toISOString()
  const { error } = await supabase.from('workspaces').upsert({ user_id: userId, ...localPayload(), updated_at })
  if (error) {
    useSync.setState({ status: 'error' })
    return
  }
  lastRemoteAt = updated_at
  ls.del(DIRTY_KEY)
  useSync.setState({ status: 'saved', savedAt: updated_at })
}

function scheduleSave() {
  if (applyingRemote || !userId) return
  ls.set(DIRTY_KEY, '1')
  useSync.setState({ status: navigator.onLine ? 'saving' : 'offline' })
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void saveNow(), SAVE_DELAY)
}

/** Se un altro dispositivo ha salvato qualcosa di più recente, lo scarica */
async function pullIfNewer() {
  if (!supabase || !userId || ls.get(DIRTY_KEY) || !navigator.onLine) return
  const { data, error } = await supabase.from('workspaces').select('data, ai, updated_at').eq('user_id', userId).maybeSingle()
  if (error || !data) return
  const row = data as RemoteRow
  const newer = !lastRemoteAt || new Date(row.updated_at).getTime() > new Date(lastRemoteAt).getTime()
  if (hasData(row) && newer) applyRemote(row)
}

export async function startSync(uid: string) {
  if (!supabase) return
  stopSync()
  const owner = ls.get(OWNER_KEY)
  // La copia locale appartiene a un altro utente: non va né mostrata né caricata (ma resta una copia di sicurezza)
  if (owner && owner !== uid) {
    saveSafetyCopy('Dati di un altro account su questo dispositivo', owner)
    useStore.getState().resetAll()
    useAi.setState({ entries: {}, activeId: null })
    ls.del(DIRTY_KEY)
  }
  userId = uid

  const { data, error } = await supabase.from('workspaces').select('data, ai, updated_at').eq('user_id', uid).maybeSingle()
  if (error) throw new Error('Impossibile caricare i tuoi dati. Controlla la connessione e riprova.')
  const row = data as RemoteRow | null
  const localUnsaved = owner === uid && ls.get(DIRTY_KEY) === '1'
  const local = localPayload().data as DataPayload
  const localHasData = (local.clients?.length ?? 0) > 0 || (local.posts?.length ?? 0) > 0

  if (!hasData(row)) {
    // Account ancora vuoto: ci porto i dati di questo dispositivo
    ls.set(OWNER_KEY, uid)
    await saveNow()
  } else if ((localUnsaved || !owner) && localHasData && localHasExtra(row!.data ?? {})) {
    // Dati del dispositivo non ancora nell'account (uso prima del login o modifiche offline): li unisco, senza perdere nulla
    saveSafetyCopy('Prima di unire i dati del dispositivo all’account', owner)
    const merged = mergeData(row!.data ?? {}, local, localUnsaved ? 'local' : 'remote')
    applyRemote({ ...row!, data: merged })
    ls.set(OWNER_KEY, uid)
    await saveNow()
    useUi.getState().toast('Ho unito al tuo account i dati che erano su questo dispositivo')
  } else {
    applyRemote(row!)
  }
  ls.set(OWNER_KEY, uid)
  useSync.setState({ status: 'saved', savedAt: lastRemoteAt })

  unsubscribers = [useStore.subscribe(scheduleSave), useAi.subscribe(scheduleSave)]
  const onFocus = () => void pullIfNewer()
  const onVisible = () => document.visibilityState === 'visible' && void pullIfNewer()
  const onOnline = () => (ls.get(DIRTY_KEY) ? void saveNow() : void pullIfNewer())
  const onOffline = () => useSync.setState({ status: 'offline' })
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  unsubscribers.push(
    () => window.removeEventListener('focus', onFocus),
    () => document.removeEventListener('visibilitychange', onVisible),
    () => window.removeEventListener('online', onOnline),
    () => window.removeEventListener('offline', onOffline),
  )
}

export function stopSync() {
  unsubscribers.forEach((u) => u())
  unsubscribers = []
  if (timer) clearTimeout(timer)
  timer = null
  userId = null
  lastRemoteAt = null
}

/** All'uscita salva le ultime modifiche e cancella i dati locali, così il prossimo utente del dispositivo non li vede */
export async function signOutAndClear() {
  if (ls.get(DIRTY_KEY)) await saveNow()
  stopSync()
  await supabase?.auth.signOut()
  applyingRemote = true
  useStore.getState().resetAll()
  useAi.setState({ entries: {}, activeId: null })
  applyingRemote = false
  ls.del(OWNER_KEY)
  ls.del(DIRTY_KEY)
  useSync.setState({ status: 'idle', savedAt: null })
}

/** Ripristina una copia: "unisci" recupera ciò che manca senza togliere nulla, "sostituisci" torna esattamente a quella versione */
export function restoreSnapshot(data: Record<string, unknown>, mode: 'unisci' | 'sostituisci') {
  saveSafetyCopy('Prima di un ripristino', ls.get(OWNER_KEY))
  const current = localPayload().data
  const next = mode === 'unisci' ? mergeData(current, data, 'remote') : data
  useStore.getState().importData(next as never)
}
