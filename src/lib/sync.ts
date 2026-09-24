import { create } from 'zustand'
import { supabase } from './supabase'
import { snapshot, useStore } from '../store'
import { useAi } from '../aiStore'

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
    data: { ...snapshot(), onboarded: useStore.getState().onboarded },
    ai: { entries, activeId },
  }
}

function applyRemote(row: RemoteRow) {
  applyingRemote = true
  const d = (row.data ?? {}) as Record<string, unknown>
  useStore.setState({
    clients: (d.clients as never) ?? [],
    posts: (d.posts as never) ?? [],
    events: (d.events as never) ?? [],
    tasks: (d.tasks as never) ?? [],
    lastWorked: (d.lastWorked as never) ?? {},
    onboarded: Boolean(d.onboarded),
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
  // La copia locale appartiene a un altro utente: non va né mostrata né caricata
  if (owner && owner !== uid) {
    useStore.getState().resetAll()
    useAi.setState({ entries: {}, activeId: null })
    ls.del(DIRTY_KEY)
  }
  userId = uid

  const { data, error } = await supabase.from('workspaces').select('data, ai, updated_at').eq('user_id', uid).maybeSingle()
  if (error) throw new Error('Impossibile caricare i tuoi dati. Controlla la connessione e riprova.')
  const row = data as RemoteRow | null
  const localUnsaved = owner === uid && ls.get(DIRTY_KEY) === '1'
  const localHasData = useStore.getState().clients.length > 0

  if (hasData(row) && !localUnsaved) {
    applyRemote(row!)
  } else if (localUnsaved || (!owner && localHasData) || !hasData(row)) {
    // Primo accesso (i dati usati prima del login vengono portati nell'account) o modifiche non ancora salvate
    ls.set(OWNER_KEY, uid)
    await saveNow()
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
