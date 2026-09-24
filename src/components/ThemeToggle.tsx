import { useEffect, useState } from 'react'
import { isDark, usePrefs } from '../prefs'
import { cx } from './ui'

function useDark() {
  const theme = usePrefs((s) => s.theme)
  const [, force] = useState(0)
  useEffect(() => {
    const m = window.matchMedia('(prefers-color-scheme: dark)')
    const h = () => force((n) => n + 1)
    m.addEventListener('change', h)
    return () => m.removeEventListener('change', h)
  }, [])
  return isDark(theme)
}

/** Interruttore giorno/notte con sole e luna */
export function ThemeToggle({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) {
  const dark = useDark()
  const setTheme = usePrefs((s) => s.setTheme)
  const sm = size === 'sm'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Passa alla modalità giorno' : 'Passa alla modalità notte'}
      title={dark ? 'Modalità notte (tocca per il giorno)' : 'Modalità giorno (tocca per la notte)'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className={cx(
        'relative shrink-0 overflow-hidden rounded-full transition-colors duration-500',
        sm ? 'h-8 w-14' : 'h-9 w-16',
        dark ? 'bg-gradient-to-br from-[#1e1b4b] via-[#0f172a] to-[#312e81] ring-1 ring-white/10' : 'bg-gradient-to-br from-[#7dd3fc] via-[#38bdf8] to-[#60a5fa] ring-1 ring-black/10',
        className,
      )}
    >
      {/* Stelle (notte) */}
      <span className={cx('absolute inset-0 transition-opacity duration-500', dark ? 'opacity-100' : 'opacity-0')}>
        <span className="absolute top-[28%] left-[20%] size-[2px] rounded-full bg-white" />
        <span className="absolute top-[58%] left-[34%] size-[1.5px] rounded-full bg-white/80" />
        <span className="absolute top-[35%] left-[45%] size-[1.5px] rounded-full bg-white/70" />
      </span>
      {/* Nuvola (giorno) */}
      <span className={cx('absolute right-[14%] bottom-[18%] h-[28%] w-[34%] rounded-full bg-white/90 transition-all duration-500', dark ? 'translate-y-4 opacity-0' : 'opacity-100')} />
      {/* Pomello: sole che diventa luna */}
      <span
        className={cx(
          'absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full shadow-md transition-all duration-500 ease-[cubic-bezier(0.5,1.6,0.4,0.8)]',
          sm ? 'size-6' : 'size-7',
          dark ? (sm ? 'left-[calc(100%-1.75rem)]' : 'left-[calc(100%-2rem)]') + ' bg-[#f1f5f9]' : 'left-1 bg-[#fcd34d]',
        )}
      >
        {/* Raggi del sole */}
        <svg viewBox="0 0 24 24" className={cx('absolute inset-0 size-full transition-all duration-500', dark ? 'scale-50 rotate-90 opacity-0' : 'opacity-100')} aria-hidden>
          <circle cx="12" cy="12" r="5.2" fill="#fbbf24" />
          <circle cx="12" cy="12" r="4" fill="#fde68a" />
        </svg>
        {/* Crateri della luna */}
        <svg viewBox="0 0 24 24" className={cx('absolute inset-0 size-full transition-all duration-500', dark ? 'opacity-100' : 'scale-50 -rotate-90 opacity-0')} aria-hidden>
          <circle cx="9" cy="9" r="2" fill="#cbd5e1" />
          <circle cx="15" cy="14" r="2.6" fill="#cbd5e1" />
          <circle cx="9.5" cy="15.5" r="1.2" fill="#cbd5e1" />
        </svg>
      </span>
    </button>
  )
}
