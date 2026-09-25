import { useState } from 'react'
import { Check, ClipboardCopy, ExternalLink } from 'lucide-react'
import calendarSql from '../../supabase/calendar.sql?raw'
import historySql from '../../supabase/history.sql?raw'
import { cx } from './ui'

const projectRef = /^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(import.meta.env.VITE_SUPABASE_URL ?? '')?.[1]
const editorUrl = projectRef ? `https://supabase.com/dashboard/project/${projectRef}/sql/new` : 'https://supabase.com/dashboard'

/** Aiuto per completare la configurazione del database direttamente dall'app (anche da telefono) */
export function DbSetupHelp({ what, tone = 'rose' }: { what: string; tone?: 'rose' | 'amber' }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(`${calendarSql}\n\n${historySql}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 4000)
  }
  return (
    <div className={cx('rounded-xl px-3 py-3 text-sm ring-1', tone === 'rose' ? 'bg-rose-50 text-rose-800 ring-rose-200' : 'bg-amber-50 text-amber-900 ring-amber-200')}>
      <p className="font-semibold">{what} ha bisogno di un ultimo passaggio nel database (una volta sola).</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>Tocca <b>Copia il codice</b>.</li>
        <li>
          Tocca <b>Apri Supabase</b>, accedi e incolla nell’editor (tieni premuto → <b>Incolla</b>).
        </li>
        <li>
          Premi <b>Run</b>: deve comparire “Success”. Poi torna qui e riprova.
        </li>
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-surface px-3 font-semibold text-stone-800 ring-1 ring-stone-200">
          {copied ? <Check size={15} className="text-emerald-600" /> : <ClipboardCopy size={15} />}
          {copied ? 'Copiato!' : 'Copia il codice'}
        </button>
        <a href={editorUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 font-semibold text-white">
          Apri Supabase <ExternalLink size={14} />
        </a>
      </div>
    </div>
  )
}
