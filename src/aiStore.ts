import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ModelOption {
  id: string
  free?: boolean
}

export interface ProviderEntry {
  apiKey: string
  model: string
  models: ModelOption[]
  verifiedAt: string | null
}

interface AiState {
  entries: Record<string, ProviderEntry>
  activeId: string | null
  saveVerified: (id: string, apiKey: string, models: ModelOption[], model: string) => void
  setModel: (id: string, model: string) => void
  setActive: (id: string | null) => void
  remove: (id: string) => void
}

/**
 * Chiavi dei provider AI: restano solo in questo browser, separate dai dati dei clienti
 * (non finiscono nel backup). Il server le usa per inoltrare la richiesta e non le salva.
 */
export const useAi = create<AiState>()(
  persist(
    (set) => ({
      entries: {},
      activeId: null,
      saveVerified: (id, apiKey, models, model) =>
        set((s) => ({
          entries: { ...s.entries, [id]: { apiKey, models, model, verifiedAt: new Date().toISOString() } },
          activeId: s.activeId ?? id,
        })),
      setModel: (id, model) =>
        set((s) => (s.entries[id] ? { entries: { ...s.entries, [id]: { ...s.entries[id], model } } } : s)),
      setActive: (activeId) => set({ activeId }),
      remove: (id) =>
        set((s) => {
          const entries = { ...s.entries }
          delete entries[id]
          return { entries, activeId: s.activeId === id ? (Object.keys(entries)[0] ?? null) : s.activeId }
        }),
    }),
    { name: 'regia-ai', version: 1 },
  ),
)

/** Provider da usare per le richieste, se l'utente ne ha collegato uno */
export function activeProvider() {
  const { entries, activeId } = useAi.getState()
  const e = activeId ? entries[activeId] : undefined
  return activeId && e?.apiKey ? { id: activeId, apiKey: e.apiKey, model: e.model } : undefined
}
