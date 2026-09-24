import { addDays } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { weekLabel, weekStart } from '../lib/dates'
import { IconButton } from './ui'

export function WeekNav({ start, onChange }: { start: Date; onChange: (d: Date) => void }) {
  const isCurrent = weekStart(new Date()).getTime() === start.getTime()
  return (
    <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-soft ring-1 ring-stone-900/5">
      <IconButton label="Settimana precedente" className="size-8" onClick={() => onChange(addDays(start, -7))}>
        <ChevronLeft size={17} />
      </IconButton>
      <span className="min-w-36 px-1 text-center text-sm font-semibold tabular-nums">{weekLabel(start)}</span>
      <IconButton label="Settimana successiva" className="size-8" onClick={() => onChange(addDays(start, 7))}>
        <ChevronRight size={17} />
      </IconButton>
      <button
        type="button"
        disabled={isCurrent}
        onClick={() => onChange(weekStart(new Date()))}
        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:text-stone-300 disabled:hover:bg-transparent"
      >
        Oggi
      </button>
    </div>
  )
}
