import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePref = 'light' | 'dark' | 'auto'
export type CvdPref = 'none' | 'protan' | 'deutan' | 'tritan' | 'achroma'

interface PrefsState {
  theme: ThemePref
  cvd: CvdPref
  setTheme: (t: ThemePref) => void
  setCvd: (c: CvdPref) => void
}

/** Preferenze di aspetto di questo dispositivo (tema chiaro/scuro e visione dei colori) */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: 'auto',
      cvd: 'none',
      setTheme: (theme) => set({ theme }),
      setCvd: (cvd) => set({ cvd }),
    }),
    { name: 'regia-prefs', version: 1 },
  ),
)

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

export const isDark = (t: ThemePref) => t === 'dark' || (t === 'auto' && Boolean(media?.matches))

function apply() {
  const { theme, cvd } = usePrefs.getState()
  const root = document.documentElement
  const dark = isDark(theme)
  root.dataset.theme = dark ? 'dark' : 'light'
  if (cvd === 'none') delete root.dataset.cvd
  else root.dataset.cvd = cvd
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121110' : '#a855f7')
}

apply()
usePrefs.subscribe(apply)
media?.addEventListener('change', () => usePrefs.getState().theme === 'auto' && apply())
