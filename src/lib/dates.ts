import { addDays, addMonths, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns'
import { it } from 'date-fns/locale'
import type { Recurrence } from '../types'

export const ISO = 'yyyy-MM-dd'

export const todayISO = () => format(new Date(), ISO)
export const toISO = (d: Date) => format(d, ISO)
export const fromISO = (s: string) => parseISO(s)

export const weekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 1 })
export const weekDays = (start: Date) => Array.from({ length: 7 }, (_, i) => addDays(start, i))

export const fmt = (d: Date | string, pattern: string) =>
  format(typeof d === 'string' ? parseISO(d) : d, pattern, { locale: it })

export function weekLabel(start: Date) {
  const end = addDays(start, 6)
  if (start.getMonth() === end.getMonth()) return `${fmt(start, 'd')}–${fmt(end, 'd MMMM yyyy')}`
  return `${fmt(start, 'd MMM')} – ${fmt(end, 'd MMM yyyy')}`
}

/** "oggi", "domani", "ieri", "tra 3 giorni", "2 giorni fa" */
export function relativeDay(iso: string) {
  const diff = differenceInCalendarDays(parseISO(iso), new Date())
  if (diff === 0) return 'oggi'
  if (diff === 1) return 'domani'
  if (diff === -1) return 'ieri'
  if (diff > 1 && diff < 7) return fmt(iso, 'EEEE')
  if (diff > 0) return `tra ${diff} giorni`
  return `${-diff} giorni fa`
}

export const daysFromToday = (iso: string) => differenceInCalendarDays(parseISO(iso), new Date())

export function nextOccurrence(iso: string, r: Recurrence) {
  const d = parseISO(iso)
  if (r === 'weekly') return toISO(addDays(d, 7))
  if (r === 'biweekly') return toISO(addDays(d, 14))
  if (r === 'monthly') return toISO(addMonths(d, 1))
  return iso
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
