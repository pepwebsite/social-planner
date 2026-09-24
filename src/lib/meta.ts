import type { Format, Platform, PostStatus, Recurrence, WaitingOn } from '../types'

export const STATUSES: PostStatus[] = ['idea', 'bozza', 'in_approvazione', 'approvato', 'programmato', 'pubblicato']

export const STATUS_META: Record<PostStatus, { label: string; short: string; dot: string; pill: string; hint: string }> = {
  idea: {
    label: 'Idea',
    short: 'Idea',
    dot: 'bg-stone-400',
    pill: 'bg-stone-100 text-stone-700 ring-stone-200',
    hint: 'Spunto da sviluppare',
  },
  bozza: {
    label: 'Bozza',
    short: 'Bozza',
    dot: 'bg-sky-500',
    pill: 'bg-sky-50 text-sky-700 ring-sky-200',
    hint: 'Copy e visual in lavorazione',
  },
  in_approvazione: {
    label: 'In approvazione',
    short: 'Approvaz.',
    dot: 'bg-amber-500',
    pill: 'bg-amber-50 text-amber-800 ring-amber-200',
    hint: 'Inviato al cliente, in attesa di risposta',
  },
  approvato: {
    label: 'Approvato',
    short: 'Approvato',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    hint: 'Pronto da programmare',
  },
  programmato: {
    label: 'Programmato',
    short: 'Program.',
    dot: 'bg-indigo-500',
    pill: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    hint: 'Già schedulato sulla piattaforma',
  },
  pubblicato: {
    label: 'Pubblicato',
    short: 'Pubblicato',
    dot: 'bg-violet-400',
    pill: 'bg-violet-50 text-violet-700 ring-violet-200',
    hint: 'Online',
  },
}

export const PLATFORMS: Platform[] = ['instagram', 'facebook', 'tiktok', 'linkedin', 'youtube']
export const PLATFORM_META: Record<Platform, { label: string; short: string; color: string }> = {
  instagram: { label: 'Instagram', short: 'IG', color: '#d62976' },
  facebook: { label: 'Facebook', short: 'FB', color: '#1877f2' },
  tiktok: { label: 'TikTok', short: 'TT', color: '#111111' },
  linkedin: { label: 'LinkedIn', short: 'IN', color: '#0a66c2' },
  youtube: { label: 'YouTube', short: 'YT', color: '#ff0000' },
}

export const FORMATS: Format[] = ['post', 'carosello', 'reel', 'story', 'live', 'video']
export const FORMAT_LABEL: Record<Format, string> = {
  post: 'Post',
  carosello: 'Carosello',
  reel: 'Reel',
  story: 'Story',
  live: 'Live',
  video: 'Video',
}

export const WAITING_META: Record<WaitingOn, { label: string; cls: string }> = {
  me: { label: 'Tocca a me', cls: 'bg-stone-100 text-stone-700' },
  cliente: { label: 'Aspetto il cliente', cls: 'bg-amber-50 text-amber-800' },
  influencer: { label: 'Aspetto influencer', cls: 'bg-pink-50 text-pink-700' },
  fornitore: { label: 'Aspetto fornitore', cls: 'bg-sky-50 text-sky-700' },
}

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: 'Una volta',
  weekly: 'Ogni settimana',
  biweekly: 'Ogni 2 settimane',
  monthly: 'Ogni mese',
}

export const WEEKDAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export const CLIENT_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#0ea5e9',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
  '#f97316',
  '#84cc16',
  '#a855f7',
  '#06b6d4',
]

/** Giorni oltre i quali un'approvazione senza risposta va sollecitata */
export const APPROVAL_NUDGE_DAYS = 2
