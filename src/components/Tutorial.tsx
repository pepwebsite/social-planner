import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { create } from 'zustand'
import { Bell, Check, ChevronLeft, ChevronRight, MessageCircle, Pause, Play, Share, Smartphone, Sparkles, X } from 'lucide-react'
import { useStore } from '../store'
import { cx } from './ui'

/**
 * Tutorial animato "come un video": scene a tempo in stile storie di Instagram.
 * Parte da solo al primo accesso e si può rivedere da Impostazioni o dal benvenuto.
 */

const useTutorial = create<{ open: boolean }>()(() => ({ open: false }))
export const openTutorial = () => useTutorial.setState({ open: true })

const SCENE_MS = 6500

const d = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` })

/* ------------------------------------------------------------ Pezzi grafici ---- */

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[270px] animate-pop rounded-[28px] bg-chip p-2 shadow-2xl ring-1 ring-white/20">
      <div className="relative overflow-hidden rounded-[22px] bg-[#f7f6f3] text-stone-900">
        <div className="mx-auto mt-1.5 h-1.5 w-16 rounded-full bg-stone-300" />
        <div className="space-y-2 p-3 pt-2.5">{children}</div>
      </div>
    </div>
  )
}

function Typing({ text, start = 0, speed = 28 }: { text: string; start?: number; speed?: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let i = 0
    let timer: ReturnType<typeof setInterval>
    const t = setTimeout(() => {
      timer = setInterval(() => {
        i += 1
        setN(i)
        if (i >= text.length) clearInterval(timer)
      }, speed)
    }, start)
    return () => {
      clearTimeout(t)
      clearInterval(timer)
    }
  }, [text, start, speed])
  return (
    <span>
      {text.slice(0, n)}
      {n < text.length && <span className="ml-px inline-block h-3 w-0.5 animate-pulse bg-current align-middle" />}
    </span>
  )
}

const Avatar = ({ l, c }: { l: string; c: string }) => (
  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white" style={{ background: c }}>
    {l}
  </span>
)

function MiniRow({ l, c, name, text, dot, delay, highlight }: { l: string; c: string; name: string; text: string; dot: string; delay: number; highlight?: boolean }) {
  return (
    <div className={cx('flex animate-slide-left items-center gap-2 rounded-xl bg-surface p-2 shadow-sm', highlight && 'ring-2 ring-brand-500')} style={d(delay)}>
      <span className="relative">
        <Avatar l={l} c={c} />
        <span className={cx('absolute -top-0.5 -right-0.5 size-2 rounded-full ring-2 ring-surface', dot)} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold">{name}</p>
        <p className="truncate text-[10px] text-stone-500">{text}</p>
      </div>
      {highlight && (
        <span className="animate-pulse-ring rounded-lg bg-brand-600 px-1.5 py-1 text-[9px] font-bold text-white" style={d(delay + 600)}>
          ▶ 60′
        </span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ Scene ---- */

interface Scene {
  bg: string
  title: string
  text: string
  art: () => ReactNode
}

const SCENES: Scene[] = [
  {
    bg: 'from-brand-600 via-violet-600 to-fuchsia-600',
    title: 'Benvenuto in Regia',
    text: 'Il tuo centro di controllo per gestire tanti clienti social senza impazzire. Vediamo come funziona in un minuto.',
    art: () => (
      <div className="relative mx-auto flex size-56 items-center justify-center">
        {[
          ['SV', '#ef4444', 'top-2 left-6'],
          ['BL', '#8b5cf6', 'top-8 right-2'],
          ['FP', '#10b981', 'bottom-6 left-0'],
          ['PM', '#f59e0b', 'bottom-2 right-8'],
        ].map(([l, c, pos], i) => (
          <span key={l} className={cx('absolute animate-float', pos)} style={d(i * 250)}>
            <span className="flex size-11 animate-pop items-center justify-center rounded-2xl text-sm font-bold text-white shadow-lg ring-2 ring-white/40" style={{ background: c, ...d(300 + i * 200) }}>
              {l}
            </span>
          </span>
        ))}
        <span className="flex size-24 animate-pop items-center justify-center rounded-[28px] bg-surface text-5xl font-extrabold text-brand-600 shadow-2xl">R</span>
      </div>
    ),
  },
  {
    bg: 'from-amber-400 via-orange-400 to-rose-500',
    title: 'Ogni giorno sai da chi partire',
    text: 'La home ti saluta e mette in cima il cliente più urgente, con la prossima cosa da fare. Premi “Inizia 60′” e lavora a blocchi di un’ora.',
    art: () => (
      <Phone>
        <div className="animate-rise rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 p-2.5 text-white">
          <p className="text-[9px] font-semibold opacity-80">Lunedì 6 ottobre</p>
          <p className="text-[13px] font-extrabold">Buongiorno, Giulia ☀️</p>
          <p className="text-[9px] opacity-90">Nuova settimana, nuove idee 🚀</p>
        </div>
        <MiniRow l="SV" c="#ef4444" name="Sigma Via Roma" text="Chiedere il volantino" dot="bg-rose-500" delay={500} highlight />
        <MiniRow l="BL" c="#8b5cf6" name="Bistrot Luna" text="1 uscita scoperta" dot="bg-amber-500" delay={800} />
        <MiniRow l="FP" c="#10b981" name="FitZone Palestra" text="In attesa del cliente" dot="bg-sky-500" delay={1100} />
      </Phone>
    ),
  },
  {
    bg: 'from-emerald-500 via-teal-500 to-sky-500',
    title: 'Una scheda per ogni cliente',
    text: 'Tono di voce, cose da evitare, giorni e orari di uscita: li scrivi una volta sola e li ritrovi sempre mentre lavori.',
    art: () => (
      <Phone>
        <div className="flex animate-rise items-center gap-2">
          <Avatar l="BL" c="#8b5cf6" />
          <p className="text-[12px] font-extrabold">Bistrot Luna</p>
        </div>
        <div className="animate-rise rounded-xl bg-surface p-2.5 shadow-sm" style={d(200)}>
          <p className="text-[9px] font-bold tracking-wide text-stone-400 uppercase">Tono di voce</p>
          <p className="mt-0.5 min-h-10 text-[11px] text-stone-700">
            <Typing text="Elegante ma ironico. Parla di atmosfera e ingredienti. Poche emoji 🌙🍸" start={500} />
          </p>
        </div>
        <div className="animate-rise rounded-xl bg-surface p-2.5 shadow-sm" style={d(2600)}>
          <p className="text-[9px] font-bold tracking-wide text-stone-400 uppercase">Uscite fisse</p>
          {[
            ['Mar', '18:30', 'Reel'],
            ['Ven', '17:00', 'Carosello'],
            ['Sab', '20:00', 'TikTok'],
          ].map(([g, h, f], i) => (
            <p key={g} className="mt-1 flex animate-slide-left items-center gap-1.5 text-[10px]" style={d(2900 + i * 250)}>
              <span className="rounded bg-[#d62976] px-1 text-[8px] font-bold text-white">IG</span>
              <b className="w-6">{g}</b> {h} · {f}
            </p>
          ))}
        </div>
      </Phone>
    ),
  },
  {
    bg: 'from-violet-600 via-purple-600 to-indigo-600',
    title: 'L’AI scrive le bozze',
    text: 'Premi “Bozza AI”: in pochi secondi hai i post della settimana con testi e idee per le grafiche, già nel tono del cliente. Tu rivedi e rifinisci.',
    art: () => (
      <Phone>
        <div className="flex animate-rise items-center justify-between">
          <p className="text-[11px] font-extrabold">Settimana 6–12 ott</p>
          <span className="flex animate-press items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-brand-600 px-2 py-1 text-[9px] font-bold text-white" style={d(600)}>
            <Sparkles size={10} /> Bozza AI
          </span>
        </div>
        {[
          ['Mar 18:30 · Reel', 'Il risotto dello chef, dal chicco al piatto'],
          ['Ven 17:00 · Carosello', 'Serata jazz: 5 motivi per non perderla'],
          ['Sab 20:00 · TikTok', 'Il cocktail al bergamotto in 15 secondi'],
        ].map(([when, what], i) => (
          <div key={when} className="animate-rise rounded-xl bg-surface p-2 shadow-sm" style={d(1400 + i * 700)}>
            <p className="flex items-center gap-1 text-[9px] font-semibold text-stone-500">
              <Sparkles size={9} className="text-violet-500" /> {when}
            </p>
            <p className="text-[11px] font-semibold">{what}</p>
            <div className="mt-1 space-y-1">
              <div className="h-1.5 w-full animate-shimmer rounded bg-stone-200" />
              <div className="h-1.5 w-3/4 animate-shimmer rounded bg-stone-200" />
            </div>
          </div>
        ))}
      </Phone>
    ),
  },
  {
    bg: 'from-green-500 via-emerald-500 to-teal-600',
    title: 'Approvazione in un tocco',
    text: '“Invia in approvazione” prepara il messaggio con tutto il piano e lo apre su WhatsApp. Se il cliente non risponde entro 2 giorni, te lo ricordo.',
    art: () => (
      <Phone>
        <div className="animate-rise rounded-xl bg-[#e7ffdb] p-2.5 text-[10px] leading-snug shadow-sm">
          <p className="mb-1 flex items-center gap-1 text-[9px] font-bold text-emerald-700">
            <MessageCircle size={10} /> WhatsApp · Giulia (titolare)
          </p>
          <Typing text="Ciao Giulia! Ecco il piano social di Bistrot Luna per la settimana 📅 1. Mar 18:30 · Reel… Mi confermi? Grazie!" start={400} speed={22} />
        </div>
        <div className="animate-rise space-y-1.5 rounded-xl bg-surface p-2.5 shadow-sm" style={d(2800)}>
          <p className="text-[11px] font-semibold">Il risotto dello chef</p>
          <div className="relative h-5">
            <span style={d(3000)} className="absolute animate-status-1 rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-bold text-sky-700 ring-1 ring-sky-200">● Bozza</span>
            <span style={d(3000)} className="absolute animate-status-2 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-800 ring-1 ring-amber-200">● In approvazione</span>
            <span style={d(3000)} className="absolute animate-status-3 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-200">✓ Approvato</span>
          </div>
        </div>
      </Phone>
    ),
  },
  {
    bg: 'from-pink-500 via-rose-500 to-orange-400',
    title: 'Te le ricordo io',
    text: 'Il volantino da chiedere ogni lunedì, script e video degli influencer prima degli eventi: quando spunti un’attività ricorrente, preparo già la prossima.',
    art: () => (
      <Phone>
        <div className="flex animate-rise items-center gap-2">
          <span className="flex size-7 animate-shake items-center justify-center rounded-lg bg-rose-100 text-rose-600" style={d(300)}>
            <Bell size={14} />
          </span>
          <p className="text-[12px] font-extrabold">Da fare</p>
        </div>
        <div className="animate-rise rounded-xl bg-surface p-2 shadow-sm" style={d(300)}>
          <div className="flex items-center gap-2">
            <span className="relative flex size-4 shrink-0 items-center justify-center rounded bg-surface ring-1 ring-stone-300">
              <span className="absolute inset-0 flex animate-check items-center justify-center rounded bg-emerald-500 text-white" style={d(1600)}>
                <Check size={10} strokeWidth={3} />
              </span>
            </span>
            <div>
              <p className="animate-strike text-[11px] font-semibold" style={d(1700)}>Chiedere il volantino a Sigma</p>
              <p className="text-[9px] text-stone-500">oggi · ogni settimana</p>
            </div>
          </div>
        </div>
        <div className="animate-slide-left rounded-xl bg-surface p-2 shadow-sm ring-2 ring-emerald-400" style={d(2600)}>
          <p className="text-[11px] font-semibold">Chiedere il volantino a Sigma</p>
          <p className="text-[9px] font-semibold text-emerald-700">✨ Creata per lunedì prossimo</p>
        </div>
        <div className="animate-slide-left rounded-xl bg-pink-50 p-2 ring-1 ring-pink-200" style={d(3400)}>
          <p className="text-[11px] font-semibold text-pink-800">Chiedere a Sara script + 3 stories</p>
          <p className="text-[9px] text-pink-700">5 giorni prima di «Serata jazz»</p>
        </div>
      </Phone>
    ),
  },
  {
    bg: 'from-brand-600 via-violet-600 to-fuchsia-600',
    title: 'Sempre con te',
    text: 'Installala sul telefono: menu del browser → “Aggiungi a schermata Home”. I tuoi dati sono salvati nell’account e ti seguono su ogni dispositivo.',
    art: () => (
      <div className="relative mx-auto flex h-56 w-full max-w-[270px] items-center justify-center">
        <span className="absolute animate-float">
          <span className="flex size-36 animate-pop items-center justify-center rounded-[32px] bg-white/15 ring-1 ring-white/30">
            <Smartphone size={72} strokeWidth={1.4} />
          </span>
        </span>
        <span className="absolute top-6 right-6 flex animate-pop items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-stone-800 shadow-lg" style={d(700)}>
          <Share size={13} /> Aggiungi a Home
        </span>
        <span className="absolute bottom-8 left-4 flex size-14 animate-pop items-center justify-center rounded-2xl bg-surface text-2xl font-extrabold text-brand-600 shadow-xl" style={d(1300)}>
          R
        </span>
      </div>
    ),
  },
]

/* ----------------------------------------------------------------- Player ---- */

export function Tutorial() {
  const open = useTutorial((s) => s.open)
  const seen = useStore((s) => s.tutorialSeen)
  const onboarded = useStore((s) => s.onboarded)
  const hasClients = useStore((s) => s.clients.length > 0)

  // Prima volta: parte da solo
  useEffect(() => {
    if (!seen && !onboarded && !hasClients) {
      const t = setTimeout(() => useTutorial.setState({ open: true }), 600)
      return () => clearTimeout(t)
    }
  }, [seen, onboarded, hasClients])

  if (!open) return null
  return <Player />
}

function Player() {
  const [i, setI] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const holdRef = useRef(false)
  const last = i === SCENES.length - 1
  const scene = SCENES[i]

  const close = useCallback(() => {
    useStore.setState({ tutorialSeen: true })
    useTutorial.setState({ open: false })
  }, [])
  const go = useCallback((n: number) => {
    setI(Math.max(0, Math.min(SCENES.length - 1, n)))
    setElapsed(0)
  }, [])

  // Avanzamento a tempo
  useEffect(() => {
    if (paused) return
    let raf = 0
    let prev = performance.now()
    const tick = (now: number) => {
      const delta = now - prev
      setElapsed((e) => e + delta)
      prev = now
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paused, i])

  useEffect(() => {
    if (elapsed < SCENE_MS) return
    if (last) setPaused(true)
    else go(i + 1)
  }, [elapsed, last, i, go])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') go(i + 1)
      else if (e.key === 'ArrowLeft') go(i - 1)
      else if (e.key === ' ') {
        e.preventDefault()
        setPaused((p) => !p)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [i, go, close])

  const progress = Math.min(1, elapsed / SCENE_MS)

  return (
    <div className="force-light fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm md:p-6">
      <div
        className={cx('relative flex h-full w-full select-none flex-col overflow-clip bg-gradient-to-br text-white transition-[background] duration-700 md:h-[min(760px,92dvh)] md:max-w-[420px] md:rounded-[32px] md:shadow-2xl', scene.bg)}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return
          const rect = e.currentTarget.getBoundingClientRect()
          holdRef.current = false
          const t = setTimeout(() => {
            holdRef.current = true
            setPaused(true)
          }, 220)
          const up = (ev: PointerEvent) => {
            clearTimeout(t)
            window.removeEventListener('pointerup', up)
            if (holdRef.current) {
              setPaused(false)
              return
            }
            // Tocco breve: sinistra indietro, destra avanti
            if (ev.clientX - rect.left < rect.width * 0.3) go(i - 1)
            else if (!last) go(i + 1)
          }
          window.addEventListener('pointerup', up)
        }}
      >
        <div className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 size-72 rounded-full bg-black/10 blur-3xl" />

        {/* Barre di avanzamento */}
        <div className="relative flex gap-1 px-4 pt-[max(14px,env(safe-area-inset-top))]">
          {SCENES.map((_, n) => (
            <div key={n} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div className="h-full rounded-full bg-surface" style={{ width: `${n < i ? 100 : n === i ? progress * 100 : 0}%` }} />
            </div>
          ))}
        </div>
        <div className="relative flex items-center gap-2 px-4 pt-3">
          <span className="flex size-8 items-center justify-center rounded-xl bg-surface text-sm font-extrabold text-brand-600">R</span>
          <span className="text-sm font-bold">Come funziona Regia</span>
          <span className="text-xs text-white/70">
            {i + 1}/{SCENES.length}
          </span>
          <div className="flex-1" />
          <button type="button" aria-label={paused ? 'Riprendi' : 'Pausa'} onClick={() => setPaused((p) => !p)} className="rounded-full p-2 hover:bg-white/15">
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button type="button" aria-label="Chiudi tutorial" onClick={close} className="rounded-full p-2 hover:bg-white/15">
            <X size={20} />
          </button>
        </div>

        {/* Scena */}
        <div key={i} className="relative flex flex-1 flex-col justify-center gap-8 px-6 py-4">
          <div>{scene.art()}</div>
          <div>
            <h2 className="animate-rise text-[26px] leading-tight font-extrabold tracking-tight" style={d(150)}>
              {scene.title}
            </h2>
            <p className="mt-2 animate-rise text-[15px] leading-relaxed text-white/90" style={d(300)}>
              {scene.text}
            </p>
          </div>
        </div>

        {/* Comandi */}
        <div className="relative flex items-center gap-2 px-4 pb-[max(18px,env(safe-area-inset-bottom))]">
          {last ? (
            <button type="button" onClick={close} className="h-13 flex-1 animate-pop rounded-2xl bg-surface py-3.5 text-[15px] font-bold text-stone-900 shadow-lg active:scale-[0.98]">
              Inizia a usare Regia
            </button>
          ) : (
            <>
              <button type="button" onClick={close} className="rounded-xl px-3 py-3 text-sm font-semibold text-white/80 hover:text-white">
                Salta
              </button>
              <div className="flex-1" />
              <button type="button" aria-label="Indietro" disabled={i === 0} onClick={() => go(i - 1)} className="flex size-11 items-center justify-center rounded-full bg-white/15 disabled:opacity-30">
                <ChevronLeft size={20} />
              </button>
              <button type="button" onClick={() => go(i + 1)} className="flex h-11 items-center gap-1 rounded-full bg-surface px-5 text-sm font-bold text-stone-900 shadow-lg active:scale-[0.97]">
                Avanti <ChevronRight size={17} />
              </button>
            </>
          )}
        </div>
        {paused && !last && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center">
            <span className="animate-in rounded-full bg-black/30 px-3 py-1 text-xs font-semibold">In pausa</span>
          </div>
        )}
      </div>
    </div>
  )
}
