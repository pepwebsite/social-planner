import { addDays, differenceInCalendarDays, parseISO } from 'date-fns'
import type { Client, ClientEvent, Post, Task } from '../types'
import { APPROVAL_NUDGE_DAYS, FORMAT_LABEL, PLATFORM_META, WEEKDAYS } from './meta'
import { todayISO, toISO, weekDays, weekStart } from './dates'

export const isOverdue = (t: Task) => !t.done && t.due < todayISO()
export const isDueToday = (t: Task) => !t.done && t.due === todayISO()

export const daysWaiting = (p: Post) => differenceInCalendarDays(new Date(), parseISO(p.statusChangedAt))
export const needsNudge = (p: Post) => p.status === 'in_approvazione' && daysWaiting(p) >= APPROVAL_NUDGE_DAYS

export interface SlotInstance {
  date: string
  time: string
  platform: Client['slots'][number]['platform']
  format: Client['slots'][number]['format']
  weekday: string
  slotId: string
}

export function slotsForWeek(client: Client, start: Date): SlotInstance[] {
  const days = weekDays(start)
  return client.slots
    .map((s) => ({
      slotId: s.id,
      date: toISO(days[s.weekday]),
      time: s.time,
      platform: s.platform,
      format: s.format,
      weekday: WEEKDAYS[s.weekday],
    }))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
}

/** Uno slot è coperto se esiste un contenuto quel giorno sulla stessa piattaforma con lo stesso formato o orario */
export const slotCovered = (slot: SlotInstance, posts: Post[]) =>
  posts.some(
    (p) => p.date === slot.date && p.platform === slot.platform && (p.format === slot.format || p.time === slot.time),
  )

export function uncoveredSlots(client: Client, posts: Post[], start: Date, fromToday = true) {
  const today = todayISO()
  const own = posts.filter((p) => p.clientId === client.id)
  return slotsForWeek(client, start).filter((s) => (!fromToday || s.date >= today) && !slotCovered(s, own))
}

export const slotLabel = (s: SlotInstance) =>
  `${s.weekday} ${s.time} · ${PLATFORM_META[s.platform].label} ${FORMAT_LABEL[s.format]}`

export type Urgency = 'alta' | 'media' | 'bassa' | 'ok'

export interface ClientPulse {
  urgency: Urgency
  score: number
  nextAction: string
  overdue: number
  today: number
  toNudge: number
  awaiting: number
  toSchedule: number
  drafts: number
  uncoveredThisWeek: number
  uncoveredNextWeek: number
  nextEvent: ClientEvent | null
}

/** Riassume lo stato di un cliente e la prossima cosa da fare */
export function clientPulse(client: Client, posts: Post[], tasks: Task[], events: ClientEvent[]): ClientPulse {
  const today = todayISO()
  const soon = toISO(addDays(new Date(), 3))
  const own = posts.filter((p) => p.clientId === client.id)
  const ownTasks = tasks.filter((t) => t.clientId === client.id && !t.done)
  const overdue = ownTasks.filter(isOverdue).length
  const dueToday = ownTasks.filter(isDueToday).length
  const toNudge = own.filter(needsNudge).length
  const awaiting = own.filter((p) => p.status === 'in_approvazione').length
  const toSchedule = own.filter((p) => p.status === 'approvato' && p.date >= today).length
  const toScheduleSoon = own.filter((p) => p.status === 'approvato' && p.date >= today && p.date <= soon).length
  const drafts = own.filter((p) => (p.status === 'bozza' || p.status === 'idea') && p.date >= today).length
  const thisWeek = weekStart(new Date())
  const uncoveredThisWeek = uncoveredSlots(client, posts, thisWeek).length
  const uncoveredNextWeek = uncoveredSlots(client, posts, addDays(thisWeek, 7), false).length
  const nextEvent =
    events
      .filter((e) => e.clientId === client.id && e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null

  let nextAction = 'Tutto in ordine per ora'
  let urgency: Urgency = 'ok'
  let score = 0
  if (overdue) {
    nextAction = `${overdue} ${overdue === 1 ? 'attività scaduta' : 'attività scadute'}`
    urgency = 'alta'
    score = 100 + overdue
  } else if (toScheduleSoon) {
    nextAction = `Programma ${toScheduleSoon} ${toScheduleSoon === 1 ? 'contenuto approvato' : 'contenuti approvati'}`
    urgency = 'alta'
    score = 90
  } else if (uncoveredThisWeek) {
    nextAction = `${uncoveredThisWeek} ${uncoveredThisWeek === 1 ? 'uscita scoperta' : 'uscite scoperte'} questa settimana`
    urgency = 'alta'
    score = 85
  } else if (toNudge) {
    nextAction = `Sollecita l'approvazione (${toNudge} in attesa)`
    urgency = 'media'
    score = 70
  } else if (dueToday) {
    nextAction = `${dueToday} ${dueToday === 1 ? 'attività' : 'attività'} per oggi`
    urgency = 'media'
    score = 60
  } else if (uncoveredNextWeek) {
    nextAction = `Prepara la prossima settimana (${uncoveredNextWeek} uscite)`
    urgency = 'media'
    score = 50
  } else if (drafts) {
    nextAction = `Completa ${drafts} ${drafts === 1 ? 'bozza' : 'bozze'} e invia in approvazione`
    urgency = 'bassa'
    score = 30
  } else if (awaiting) {
    nextAction = `In attesa del cliente (${awaiting})`
    urgency = 'bassa'
    score = 10
  }

  return {
    urgency,
    score,
    nextAction,
    overdue,
    today: dueToday,
    toNudge,
    awaiting,
    toSchedule,
    drafts,
    uncoveredThisWeek,
    uncoveredNextWeek,
    nextEvent,
  }
}

export const URGENCY_META: Record<Urgency, { label: string; cls: string; dot: string }> = {
  alta: { label: 'Urgente', cls: 'text-rose-700 bg-rose-50 ring-rose-200', dot: 'bg-rose-500' },
  media: { label: 'Da fare', cls: 'text-amber-800 bg-amber-50 ring-amber-200', dot: 'bg-amber-500' },
  bassa: { label: 'Con calma', cls: 'text-sky-700 bg-sky-50 ring-sky-200', dot: 'bg-sky-500' },
  ok: { label: 'In ordine', cls: 'text-emerald-700 bg-emerald-50 ring-emerald-200', dot: 'bg-emerald-500' },
}
