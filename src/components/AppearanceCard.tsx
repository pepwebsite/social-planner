import { Check, Eye, MonitorSmartphone, Moon, Sun } from 'lucide-react'
import { usePrefs, type CvdPref, type ThemePref } from '../prefs'
import { ThemeToggle } from './ThemeToggle'
import { Card, cx } from './ui'

const THEMES: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Giorno', icon: Sun },
  { value: 'dark', label: 'Notte', icon: Moon },
  { value: 'auto', label: 'Come il telefono', icon: MonitorSmartphone },
]

const CVD: { value: CvdPref; label: string; text: string }[] = [
  { value: 'none', label: 'Colori standard', text: 'Nessun adattamento' },
  { value: 'protan', label: 'Protanopia', text: 'Difficoltà con il rosso' },
  { value: 'deutan', label: 'Deuteranopia', text: 'Difficoltà con il verde (la più comune)' },
  { value: 'tritan', label: 'Tritanopia', text: 'Difficoltà con blu e giallo' },
  { value: 'achroma', label: 'Acromatopsia', text: 'Visione senza colori: toni di grigio' },
]

// Colori che nell'app hanno un significato: urgente, in approvazione, approvato, bozza, programmato, eventi
const SWATCHES = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-indigo-500', 'bg-pink-500']

export function AppearanceCard() {
  const theme = usePrefs((s) => s.theme)
  const cvd = usePrefs((s) => s.cvd)
  const { setTheme, setCvd } = usePrefs.getState()

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold">Aspetto</p>
          <p className="text-sm text-stone-500">Valgono per questo dispositivo.</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {THEMES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTheme(t.value)}
            aria-pressed={theme === t.value}
            className={cx(
              'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-[13px] font-semibold ring-1 transition',
              theme === t.value ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-500' : 'bg-surface text-stone-600 ring-stone-200 hover:ring-stone-300',
            )}
          >
            <t.icon size={19} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <p className="flex items-center gap-1.5 font-bold">
          <Eye size={16} /> Visione dei colori
        </p>
        <p className="mt-0.5 text-sm text-stone-500">Per chi ha una forma di daltonismo: i colori degli stati (urgente, in approvazione, approvato…) diventano più facili da distinguere.</p>
        <div className="mt-3 space-y-2">
          {CVD.map((o) => {
            const on = cvd === o.value
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setCvd(o.value)}
                aria-pressed={on}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ring-1 transition',
                  on ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-surface ring-stone-200 hover:ring-stone-300',
                )}
              >
                <span className={cx('flex size-5 shrink-0 items-center justify-center rounded-full ring-1', on ? 'bg-brand-600 text-white ring-brand-600' : 'ring-stone-300')}>
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{o.label}</span>
                  <span className="block text-xs text-stone-500">{o.text}</span>
                </span>
                <span data-cvd-scope={o.value} className="flex shrink-0 -space-x-1">
                  {SWATCHES.map((c) => (
                    <span key={c} className={cx('size-4 rounded-full ring-2 ring-surface', c)} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
