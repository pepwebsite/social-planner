import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn'
  user: User | null
  /** L'utente è arrivato dal link "reimposta password" */
  recovery: boolean
  setRecovery: (v: boolean) => void
}

export const useAuth = create<AuthState>()((set) => ({
  status: supabase ? 'loading' : 'signedOut',
  user: null,
  recovery: false,
  setRecovery: (recovery) => set({ recovery }),
}))

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') useAuth.setState({ recovery: true })
    const user = session?.user ?? null
    // Evita di ricaricare tutto quando cambia solo il token (refresh automatico)
    if (user?.id === useAuth.getState().user?.id && useAuth.getState().status !== 'loading') {
      useAuth.setState({ user })
      return
    }
    useAuth.setState({ user, status: user ? 'signedIn' : 'signedOut' })
  })
}

export const displayName = (u: User | null) =>
  (u?.user_metadata?.full_name as string | undefined)?.trim() || u?.email?.split('@')[0] || 'Utente'
