import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Con Supabase configurato l'app richiede login e salva i dati nel database; senza, resta solo locale. */
export const cloudEnabled = Boolean(url && anonKey)

export const supabase = cloudEnabled
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null

/** Traduce i messaggi di errore di Supabase Auth */
export function authErrorMessage(err: { message?: string; code?: string } | null | undefined) {
  const m = (err?.message ?? '').toLowerCase()
  const code = err?.code ?? ''
  if (code === 'invalid_credentials' || m.includes('invalid login credentials')) return 'Email o password non corretti.'
  if (code === 'email_not_confirmed' || m.includes('email not confirmed')) return 'Devi prima confermare l’email: controlla la posta (anche lo spam).'
  if (code === 'user_already_exists' || m.includes('already registered')) return 'Esiste già un account con questa email. Prova ad accedere.'
  if (code === 'weak_password' || m.includes('password should')) return 'Password troppo debole: usa almeno 8 caratteri, con lettere e numeri.'
  if (code === 'over_email_send_rate_limit' || m.includes('rate limit')) return 'Troppi tentativi in poco tempo. Riprova tra qualche minuto.'
  if (m.includes('invalid email') || code === 'email_address_invalid') return 'Indirizzo email non valido.'
  if (m.includes('same_password') || code === 'same_password') return 'La nuova password deve essere diversa da quella attuale.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Connessione assente: controlla la rete e riprova.'
  return err?.message || 'Qualcosa è andato storto. Riprova.'
}
