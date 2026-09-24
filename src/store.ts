import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays, format } from 'date-fns'
import type { Client, ClientEvent, Post, PostStatus, Task } from './types'
import { CLIENT_COLORS } from './lib/meta'
import { fromISO, nextOccurrence, toISO } from './lib/dates'

export const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()

export interface Session {
  clientId: string
  startedAt: string
  minutes: number
}

export interface DataSnapshot {
  clients: Client[]
  posts: Post[]
  events: ClientEvent[]
  tasks: Task[]
  lastWorked: Record<string, string>
}

interface State extends DataSnapshot {
  session: Session | null
  onboarded: boolean

  addClient: (c?: Partial<Client>) => string
  updateClient: (id: string, patch: Partial<Client>) => void
  deleteClient: (id: string) => void

  addPost: (p: Partial<Post> & Pick<Post, 'clientId' | 'date'>) => string
  addPosts: (ps: (Partial<Post> & Pick<Post, 'clientId' | 'date'>)[]) => void
  updatePost: (id: string, patch: Partial<Post>) => void
  setPostStatus: (ids: string[], status: PostStatus, feedback?: string) => void
  deletePost: (id: string) => void
  duplicatePost: (id: string) => string | null

  saveEvent: (e: Partial<ClientEvent> & Pick<ClientEvent, 'clientId' | 'name' | 'date'>) => string
  deleteEvent: (id: string) => void
  toggleInfluencerReceived: (eventId: string, influencerId: string) => void

  addTask: (t: Partial<Task> & Pick<Task, 'title' | 'due'>) => string
  updateTask: (id: string, patch: Partial<Task>) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void

  startSession: (clientId: string, minutes: number) => void
  endSession: () => void
  touchClient: (clientId: string) => void

  importData: (d: DataSnapshot) => void
  loadDemo: () => void
  resetAll: () => void
  setOnboarded: () => void
}

export function newClient(partial: Partial<Client> = {}, index = 0): Client {
  return {
    id: uid(),
    name: 'Nuovo cliente',
    color: CLIENT_COLORS[index % CLIENT_COLORS.length],
    sector: '',
    audience: '',
    platforms: ['instagram', 'facebook'],
    tone: '',
    doList: '',
    dontList: '',
    hashtags: '',
    copyExamples: '',
    notes: '',
    slots: [],
    contacts: [],
    approvalContactId: null,
    archived: false,
    createdAt: now(),
    ...partial,
  }
}

function newPost(p: Partial<Post> & Pick<Post, 'clientId' | 'date'>): Post {
  return {
    id: uid(),
    time: '18:00',
    platform: 'instagram',
    format: 'post',
    title: '',
    copy: '',
    visual: '',
    assetLink: '',
    status: 'idea',
    feedback: '',
    eventId: null,
    aiGenerated: false,
    statusChangedAt: now(),
    createdAt: now(),
    ...p,
  }
}

function newTask(t: Partial<Task> & Pick<Task, 'title' | 'due'>): Task {
  return {
    id: uid(),
    clientId: null,
    done: false,
    doneAt: null,
    recurrence: 'none',
    waitingOn: 'me',
    eventId: null,
    notes: '',
    createdAt: now(),
    ...t,
  }
}

/** Attività generate automaticamente da un evento: richiesta materiali agli influencer + live */
function eventTasks(e: ClientEvent): Task[] {
  const request = toISO(addDays(fromISO(e.date), -5))
  const tasks = e.influencers.map((inf) =>
    newTask({
      clientId: e.clientId,
      eventId: e.id,
      title: `Chiedere a ${inf.name || inf.handle} ${inf.deliverables || 'script e video'} per «${e.name}»`,
      due: request < toISO(new Date()) ? toISO(new Date()) : request,
      waitingOn: 'influencer',
    }),
  )
  tasks.push(
    newTask({
      clientId: e.clientId,
      eventId: e.id,
      title: `Pubblicare stories/live durante «${e.name}»`,
      due: e.date,
    }),
  )
  return tasks
}

const empty: DataSnapshot = { clients: [], posts: [], events: [], tasks: [], lastWorked: {} }

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...empty,
      session: null,
      onboarded: false,

      addClient: (c) => {
        const client = newClient(c, get().clients.length)
        set((s) => ({ clients: [...s.clients, client] }))
        return client.id
      },
      updateClient: (id, patch) => set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteClient: (id) =>
        set((s) => ({
          clients: s.clients.filter((c) => c.id !== id),
          posts: s.posts.filter((p) => p.clientId !== id),
          events: s.events.filter((e) => e.clientId !== id),
          tasks: s.tasks.filter((t) => t.clientId !== id),
          session: s.session?.clientId === id ? null : s.session,
        })),

      addPost: (p) => {
        const post = newPost(p)
        set((s) => ({ posts: [...s.posts, post] }))
        return post.id
      },
      addPosts: (ps) => set((s) => ({ posts: [...s.posts, ...ps.map(newPost)] })),
      updatePost: (id, patch) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id
              ? { ...p, ...patch, statusChangedAt: patch.status && patch.status !== p.status ? now() : p.statusChangedAt }
              : p,
          ),
        })),
      setPostStatus: (ids, status, feedback) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            ids.includes(p.id)
              ? { ...p, status, statusChangedAt: now(), feedback: feedback !== undefined ? feedback : p.feedback }
              : p,
          ),
        })),
      deletePost: (id) => set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),
      duplicatePost: (id) => {
        const src = get().posts.find((p) => p.id === id)
        if (!src) return null
        const copy = newPost({ ...src, id: uid(), status: 'bozza', title: `${src.title} (copia)`, feedback: '' })
        set((s) => ({ posts: [...s.posts, copy] }))
        return copy.id
      },

      saveEvent: (e) => {
        const existing = e.id ? get().events.find((x) => x.id === e.id) : undefined
        if (existing) {
          const updated = { ...existing, ...e }
          // Nuovi influencer aggiunti a un evento esistente → nuove attività di richiesta
          const newInf = updated.influencers.filter((i) => !existing.influencers.some((x) => x.id === i.id))
          const extra = eventTasks({ ...updated, influencers: newInf }).slice(0, newInf.length)
          set((s) => ({ events: s.events.map((x) => (x.id === updated.id ? updated : x)), tasks: [...s.tasks, ...extra] }))
          return updated.id
        }
        const ev: ClientEvent = {
          id: uid(),
          time: '',
          location: '',
          notes: '',
          influencers: [],
          createdAt: now(),
          ...e,
        }
        set((s) => ({ events: [...s.events, ev], tasks: [...s.tasks, ...eventTasks(ev)] }))
        return ev.id
      },
      deleteEvent: (id) =>
        set((s) => ({
          events: s.events.filter((e) => e.id !== id),
          tasks: s.tasks.filter((t) => t.eventId !== id || t.done),
          posts: s.posts.map((p) => (p.eventId === id ? { ...p, eventId: null } : p)),
        })),
      toggleInfluencerReceived: (eventId, influencerId) =>
        set((s) => ({
          events: s.events.map((e) =>
            e.id === eventId
              ? { ...e, influencers: e.influencers.map((i) => (i.id === influencerId ? { ...i, received: !i.received } : i)) }
              : e,
          ),
        })),

      addTask: (t) => {
        const task = newTask(t)
        set((s) => ({ tasks: [...s.tasks, task] }))
        return task.id
      },
      updateTask: (id, patch) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      toggleTask: (id) =>
        set((s) => {
          const t = s.tasks.find((x) => x.id === id)
          if (!t) return s
          const done = !t.done
          let tasks = s.tasks.map((x) => (x.id === id ? { ...x, done, doneAt: done ? now() : null } : x))
          if (t.recurrence !== 'none') {
            const due = nextOccurrence(t.due, t.recurrence)
            const isNext = (x: Task) => x.id !== id && x.title === t.title && x.clientId === t.clientId && x.due === due
            if (done) {
              // Attività ricorrente completata → crea la prossima occorrenza (se non esiste già)
              if (!s.tasks.some(isNext)) tasks.push(newTask({ ...t, id: uid(), due, done: false, doneAt: null, createdAt: now() }))
            } else {
              // Annullata → rimuovi la prossima occorrenza creata automaticamente, se ancora da fare
              tasks = tasks.filter((x) => !(isNext(x) && !x.done))
            }
          }
          return { tasks }
        }),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      startSession: (clientId, minutes) =>
        set((s) => ({
          session: { clientId, minutes, startedAt: now() },
          lastWorked: { ...s.lastWorked, [clientId]: now() },
        })),
      endSession: () => set({ session: null }),
      touchClient: (clientId) => set((s) => ({ lastWorked: { ...s.lastWorked, [clientId]: now() } })),

      importData: (d) =>
        set({
          clients: d.clients ?? [],
          posts: d.posts ?? [],
          events: d.events ?? [],
          tasks: d.tasks ?? [],
          lastWorked: d.lastWorked ?? {},
          session: null,
          onboarded: true,
        }),
      loadDemo: () => set({ ...demoData(), session: null, onboarded: true }),
      resetAll: () => set({ ...empty, session: null, onboarded: false }),
      setOnboarded: () => set({ onboarded: true }),
    }),
    { name: 'regia-data', version: 1 },
  ),
)

export const snapshot = (): DataSnapshot => {
  const { clients, posts, events, tasks, lastWorked } = useStore.getState()
  return { clients, posts, events, tasks, lastWorked }
}

/* ---------------------------------------------------------------- Demo ---- */

function demoData(): DataSnapshot {
  const d = (offset: number) => toISO(addDays(new Date(), offset))
  const monday = (() => {
    const t = new Date()
    const diff = (t.getDay() + 6) % 7
    return addDays(t, -diff)
  })()
  const w = (dayIdx: number, weekOffset = 0) => format(addDays(monday, dayIdx + weekOffset * 7), 'yyyy-MM-dd')

  const sigma = newClient(
    {
      name: 'Sigma Via Roma',
      color: '#ef4444',
      sector: 'Supermercato di quartiere',
      audience: 'Famiglie del quartiere, 30-65 anni, attente alle offerte',
      platforms: ['facebook', 'instagram'],
      tone: 'Caldo, familiare, concreto. Si dà del tu. Emoji con moderazione (🛒🍅🔥). Frasi brevi, sempre con prezzo e scadenza dell’offerta.',
      doList: 'Mettere sempre le date di validità del volantino\nCitare il reparto (macelleria, ortofrutta…)\nChiudere con orari e indirizzo',
      dontList: 'Niente ironia sui prezzi della concorrenza\nMai inventare offerte non presenti nel volantino',
      hashtags: '#SigmaViaRoma #SpesaIntelligente #OfferteDellaSettimana',
      copyExamples:
        '🔥 Da giovedì a mercoledì il volantino è pieno di occasioni! Il nostro banco macelleria ti aspetta con la fesa di tacchino a 9,90 €/kg. Ti aspettiamo in Via Roma 12, aperti tutti i giorni 8-20.',
      slots: [
        { id: uid(), weekday: 0, time: '09:00', platform: 'facebook', format: 'carosello' },
        { id: uid(), weekday: 3, time: '12:30', platform: 'instagram', format: 'reel' },
        { id: uid(), weekday: 5, time: '10:00', platform: 'facebook', format: 'post' },
      ],
      contacts: [
        { id: 'c-sigma-1', name: 'Marco (direttore)', role: 'Approvazioni', phone: '+39 333 000 0001', email: '' },
        { id: uid(), name: 'Ufficio volantini Sigma', role: 'Invia il volantino', phone: '', email: 'volantini@esempio.it' },
      ],
      approvalContactId: 'c-sigma-1',
    },
    0,
  )

  const luna = newClient(
    {
      name: 'Bistrot Luna',
      color: '#8b5cf6',
      sector: 'Ristorante / cocktail bar',
      audience: 'Giovani adulti 25-40, coppie, aperitivi e cene del weekend',
      platforms: ['instagram', 'tiktok'],
      tone: 'Elegante ma ironico, evocativo. Parla di atmosfera e ingredienti. Poche emoji (🌙🍸).',
      doList: 'Valorizzare lo chef e le materie prime\nCall to action per prenotare in DM o al link in bio',
      dontList: 'Niente foto con flash\nNon usare "imperdibile" e "top"',
      hashtags: '#BistrotLuna #AperitivoMilano',
      copyExamples: 'Il venerdì ha un sapore diverso quando la luna si riflette nel bicchiere. 🌙 Nuovo signature cocktail al bergamotto: vieni a scoprirlo. Prenota al link in bio.',
      slots: [
        { id: uid(), weekday: 1, time: '18:30', platform: 'instagram', format: 'reel' },
        { id: uid(), weekday: 4, time: '17:00', platform: 'instagram', format: 'carosello' },
        { id: uid(), weekday: 5, time: '20:00', platform: 'tiktok', format: 'video' },
      ],
      contacts: [{ id: 'c-luna-1', name: 'Giulia (titolare)', role: 'Approvazioni', phone: '+39 333 000 0002', email: '' }],
      approvalContactId: 'c-luna-1',
    },
    1,
  )

  const fit = newClient(
    {
      name: 'FitZone Palestra',
      color: '#10b981',
      sector: 'Palestra e corsi fitness',
      audience: 'Uomini e donne 20-45, principianti e sportivi abituali',
      platforms: ['instagram', 'facebook', 'tiktok'],
      tone: 'Energico, motivante, inclusivo. Mai giudicante sul corpo. Emoji sportive.',
      doList: 'Mostrare persone reali e i trainer\nRicordare la prova gratuita',
      dontList: 'Niente prima/dopo\nNiente promesse di dimagrimento',
      hashtags: '#FitZone #AllenatiConNoi',
      copyExamples: '',
      slots: [
        { id: uid(), weekday: 0, time: '07:30', platform: 'instagram', format: 'story' },
        { id: uid(), weekday: 2, time: '19:00', platform: 'instagram', format: 'reel' },
        { id: uid(), weekday: 4, time: '13:00', platform: 'facebook', format: 'post' },
      ],
      contacts: [{ id: 'c-fit-1', name: 'Luca (manager)', role: 'Approvazioni', phone: '+39 333 000 0003', email: '' }],
      approvalContactId: 'c-fit-1',
    },
    2,
  )

  const eventLuna: ClientEvent = {
    id: uid(),
    clientId: luna.id,
    name: 'Serata jazz & cocktail',
    date: w(4, 1),
    time: '21:00',
    location: 'Bistrot Luna',
    notes: 'Live band, menu degustazione',
    influencers: [
      { id: uid(), name: 'Sara', handle: '@sara.eats', deliverables: 'script reel + 3 stories', received: false },
      { id: uid(), name: 'Davide', handle: '@davide.drinks', deliverables: 'video recensione', received: false },
    ],
    createdAt: now(),
  }

  const p = (x: Partial<Post> & Pick<Post, 'clientId' | 'date'>) => newPost(x)
  const posts: Post[] = [
    p({ clientId: sigma.id, date: w(0), time: '09:00', platform: 'facebook', format: 'carosello', title: 'Volantino della settimana', status: 'programmato', copy: '🛒 È arrivato il nuovo volantino! …' }),
    p({ clientId: sigma.id, date: w(3), time: '12:30', platform: 'instagram', format: 'reel', title: 'Reparto ortofrutta: frutta di stagione', status: 'in_approvazione' }),
    p({ clientId: sigma.id, date: w(5), time: '10:00', platform: 'facebook', format: 'post', title: 'Ricetta del weekend con i prodotti in offerta', status: 'bozza' }),
    p({ clientId: luna.id, date: w(1), time: '18:30', platform: 'instagram', format: 'reel', title: 'Chef al lavoro: il nuovo risotto', status: 'approvato' }),
    p({ clientId: luna.id, date: w(4), time: '17:00', platform: 'instagram', format: 'carosello', title: 'Teaser serata jazz', status: 'in_approvazione', eventId: eventLuna.id }),
    p({ clientId: fit.id, date: w(2), time: '19:00', platform: 'instagram', format: 'reel', title: 'Un giorno con il trainer Paolo', status: 'idea' }),
    p({ clientId: fit.id, date: w(4), time: '13:00', platform: 'facebook', format: 'post', title: 'Prova gratuita di ottobre', status: 'bozza' }),
  ]
  // Una richiesta di approvazione "vecchia" per mostrare il sollecito
  posts[1].statusChangedAt = addDays(new Date(), -3).toISOString()

  const tasks: Task[] = [
    newTask({ clientId: sigma.id, title: 'Chiedere il nuovo volantino a Sigma', due: w(0), recurrence: 'weekly', waitingOn: 'fornitore' }),
    newTask({ clientId: fit.id, title: 'Farsi mandare le foto dei nuovi corsi', due: d(1), waitingOn: 'cliente' }),
    newTask({ clientId: null, title: 'Report mensile di ottobre per tutti i clienti', due: d(6) }),
    ...eventTasks(eventLuna),
  ]

  return { clients: [sigma, luna, fit], posts, events: [eventLuna], tasks, lastWorked: { [sigma.id]: addDays(new Date(), -1).toISOString() } }
}
