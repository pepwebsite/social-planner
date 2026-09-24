import { create } from 'zustand'
import type { Post } from './types'

export interface Toast {
  id: number
  message: string
  tone: 'ok' | 'error' | 'info'
  action?: { label: string; run: () => void }
}

type PostDraft = Partial<Post> & Pick<Post, 'clientId' | 'date'>

interface UiState {
  /** Contenuto aperto nel pannello laterale: id esistente oppure bozza nuova */
  editor: { postId: string } | { draft: PostDraft } | null
  openPost: (postId: string) => void
  newPost: (draft: PostDraft) => void
  closeEditor: () => void

  eventEditor: { eventId?: string; clientId?: string; date?: string } | null
  openEvent: (e: { eventId?: string; clientId?: string; date?: string }) => void
  closeEvent: () => void

  taskEditor: { taskId?: string; clientId?: string | null } | null
  openTask: (t: { taskId?: string; clientId?: string | null }) => void
  closeTask: () => void

  paletteOpen: boolean
  setPalette: (open: boolean) => void

  toasts: Toast[]
  toast: (message: string, tone?: Toast['tone'], action?: Toast['action']) => void
  dismissToast: (id: number) => void
}

let toastId = 0

export const useUi = create<UiState>()((set) => ({
  editor: null,
  openPost: (postId) => set({ editor: { postId } }),
  newPost: (draft) => set({ editor: { draft } }),
  closeEditor: () => set({ editor: null }),

  eventEditor: null,
  openEvent: (e) => set({ eventEditor: e }),
  closeEvent: () => set({ eventEditor: null }),

  taskEditor: null,
  openTask: (t) => set({ taskEditor: t }),
  closeTask: () => set({ taskEditor: null }),

  paletteOpen: false,
  setPalette: (paletteOpen) => set({ paletteOpen }),

  toasts: [],
  toast: (message, tone = 'ok', action) => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, message, tone, action }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), action ? 6000 : 3500)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
