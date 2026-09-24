/** Saluti e messaggi positivi: cambiano con l'ora, il giorno e il carico di lavoro. */

export interface MoodContext {
  firstName: string | null
  urgent: number
  dueToday: number
  doneToday: number
  outToday: number
  topClient: string | null
  topAction: string | null
}

export interface Greeting {
  hello: string
  emoji: string
  mood: string
  period: 'mattina' | 'pomeriggio' | 'sera' | 'notte'
}

/** Numero stabile per giornata: il messaggio non cambia a ogni apertura, ma ogni giorno sì */
function daySeed(d = new Date()) {
  return d.getFullYear() * 1000 + Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000)
}
const pick = <T,>(list: T[], salt = 0) => list[(daySeed() + salt) % list.length]

const QUOTES = [
  'Ogni post pubblicato è una storia raccontata bene.',
  'La costanza batte la perfezione: un contenuto alla volta.',
  'Le idee migliori arrivano mentre lavori, non mentre aspetti.',
  'Oggi è un buon giorno per far brillare i tuoi clienti.',
  'Organizzata oggi, tranquilla domani.',
  'Piccoli passi, grandi risultati.',
  'Il tuo lavoro si vede: centinaia di persone leggono quello che scrivi.',
  'Un caffè, un piano chiaro e si parte.',
  'La creatività ama l’ordine: il resto lo ricordo io.',
  'Chiudi una cosa, poi la prossima. Funziona sempre.',
]

export function greeting(ctx: MoodContext, now = new Date()): Greeting {
  const h = now.getHours()
  const day = now.getDay() // 0 domenica … 6 sabato
  const name = ctx.firstName ? `, ${ctx.firstName}` : ''

  let period: Greeting['period']
  let hello: string
  let emoji: string
  if (h >= 5 && h < 13) {
    period = 'mattina'
    hello = `Buongiorno${name}`
    emoji = '☀️'
  } else if (h >= 13 && h < 18) {
    period = 'pomeriggio'
    hello = `Buon pomeriggio${name}`
    emoji = '🌤️'
  } else if (h >= 18 && h < 23) {
    period = 'sera'
    hello = `Buonasera${name}`
    emoji = '🌙'
  } else {
    period = 'notte'
    hello = `Ancora al lavoro${name}?`
    emoji = '🌙'
  }

  let mood: string
  if (period === 'notte') {
    mood = 'Il riposo fa parte del lavoro: domani i tuoi clienti saranno ancora qui 💤'
  } else if (ctx.doneToday >= 5) {
    mood = `${ctx.doneToday} cose chiuse oggi: sei una macchina! 🔥`
  } else if (ctx.urgent === 0 && ctx.dueToday === 0) {
    mood = pick([
      'Tutto sotto controllo: oggi puoi portarti avanti con calma ✨',
      'Niente di urgente: momento perfetto per nuove idee 💡',
      'Agenda pulita! Prepara la prossima settimana e goditi il vantaggio 🌿',
    ])
  } else if (ctx.urgent >= 4) {
    mood = `Giornata piena, ma ce la fai: una cosa alla volta${ctx.topClient ? `, parti da ${ctx.topClient}` : ''} 💪`
  } else if (ctx.doneToday > 0) {
    mood = `Già ${ctx.doneToday} ${ctx.doneToday === 1 ? 'cosa fatta' : 'cose fatte'} oggi, continua così! 🚀`
  } else if (day === 1 && period === 'mattina') {
    mood = 'Nuova settimana, nuove idee: partiamo col piede giusto 🚀'
  } else if (day === 5) {
    mood = 'È venerdì! Chiudiamo la settimana in bellezza 🎉'
  } else if (day === 0 || day === 6) {
    mood = 'Anche nel weekend? Sistemiamo il necessario e poi relax 🌿'
  } else {
    mood = pick(QUOTES)
  }

  return { hello, emoji, mood, period }
}

/** Frase breve per quando si completa qualcosa */
export function cheer() {
  const list = ['Fatto! 🎉', 'Grande! 💪', 'Una in meno! ✨', 'Ottimo lavoro! 🚀', 'Così si fa! 🔥', 'Spuntata! ✅']
  return list[Math.floor(Math.random() * list.length)]
}

export const firstName = (full: string | null | undefined) => full?.trim().split(/\s+/)[0] || null
