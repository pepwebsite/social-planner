export type Platform = 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'youtube'
export type Format = 'post' | 'carosello' | 'reel' | 'story' | 'live' | 'video'
export type PostStatus = 'idea' | 'bozza' | 'in_approvazione' | 'approvato' | 'programmato' | 'pubblicato'
export type WaitingOn = 'me' | 'cliente' | 'influencer' | 'fornitore'
export type Recurrence = 'none' | 'weekly' | 'biweekly' | 'monthly'

/** Uscita fissa settimanale del cliente. weekday: 0 = lunedì … 6 = domenica */
export interface Slot {
  id: string
  weekday: number
  time: string
  platform: Platform
  format: Format
}

export interface Contact {
  id: string
  name: string
  role: string
  phone: string
  email: string
}

export interface Client {
  id: string
  name: string
  color: string
  sector: string
  audience: string
  platforms: Platform[]
  tone: string
  doList: string
  dontList: string
  hashtags: string
  copyExamples: string
  notes: string
  slots: Slot[]
  contacts: Contact[]
  approvalContactId: string | null
  archived: boolean
  createdAt: string
}

export interface Post {
  id: string
  clientId: string
  date: string // yyyy-MM-dd
  time: string // HH:mm
  platform: Platform
  format: Format
  title: string
  copy: string
  visual: string
  assetLink: string
  status: PostStatus
  feedback: string
  eventId: string | null
  aiGenerated: boolean
  statusChangedAt: string
  createdAt: string
}

export interface Influencer {
  id: string
  name: string
  handle: string
  deliverables: string
  received: boolean
}

export interface ClientEvent {
  id: string
  clientId: string
  name: string
  date: string
  time: string
  location: string
  notes: string
  influencers: Influencer[]
  createdAt: string
}

/** Calendario esterno in sola lettura (es. Google Calendar tramite indirizzo iCal segreto) */
export interface ExternalCalendar {
  id: string
  name: string
  url: string
  color: string
}

export interface Task {
  id: string
  clientId: string | null
  title: string
  due: string
  done: boolean
  doneAt: string | null
  recurrence: Recurrence
  waitingOn: WaitingOn
  eventId: string | null
  notes: string
  createdAt: string
}
