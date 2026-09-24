import { useEffect, useState } from 'react'
import { Check, ChevronDown, Loader2, PartyPopper, RefreshCw, Sparkles } from 'lucide-react'
import type { Client } from '../types'
import { useStore } from '../store'
import { useUi } from '../ui'
import { generateWeek, type AiPostDraft } from '../lib/ai'
import { capitalize, fmt, toISO, weekDays, weekLabel } from '../lib/dates'
import { FORMAT_LABEL, PLATFORM_META } from '../lib/meta'
import { slotLabel, uncoveredSlots } from '../lib/insights'
import { Button, Field, Modal, PlatformBadge, Textarea, cx } from './ui'

const LOADING = ['Rileggo la scheda del cliente…', 'Studio il tono di voce…', 'Scrivo i copy…', 'Preparo i brief per le grafiche…', 'Ultimi ritocchi…']

export function AiWeekModal({ client, start, onClose }: { client: Client; start: Date; onClose: () => void }) {
  const posts = useStore((s) => s.posts)
  const events = useStore((s) => s.events)
  const addPosts = useStore((s) => s.addPosts)
  const toast = useUi((s) => s.toast)

  const days = weekDays(start).map(toISO)
  const slots = uncoveredSlots(client, posts, start)
  const weekEvents = events.filter((e) => e.clientId === client.id && e.date >= days[0] && e.date <= days[6])
  const existing = posts.filter((p) => p.clientId === client.id && p.date >= days[0] && p.date <= days[6])

  const [picked, setPicked] = useState<string[]>(slots.map((s) => s.slotId))
  const [instructions, setInstructions] = useState('')
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<AiPostDraft[] | null>(null)
  const [keep, setKeep] = useState<number[]>([])
  const [expanded, setExpanded] = useState<number | null>(0)

  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => setStep((s) => Math.min(s + 1, LOADING.length - 1)), 4000)
    return () => clearInterval(t)
  }, [busy])

  const run = async () => {
    setBusy(true)
    setStep(0)
    try {
      const out = await generateWeek({
        client,
        weekLabel: weekLabel(start),
        slots: slots.filter((s) => picked.includes(s.slotId)),
        events: weekEvents,
        existing,
        instructions,
      })
      setResult(out)
      setKeep(out.map((_, i) => i))
      setExpanded(0)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const accept = () => {
    if (!result) return
    const chosen = result.filter((_, i) => keep.includes(i))
    addPosts(chosen.map((p) => ({ ...p, clientId: client.id, status: 'bozza', aiGenerated: true })))
    toast(`${chosen.length} bozze aggiunte al calendario di ${client.name}`)
    onClose()
  }

  const briefWeak = !client.tone.trim()

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-brand-600 text-white">
            <Sparkles size={15} />
          </span>
          Bozza AI della settimana
        </span>
      }
      subtitle={`${client.name} · ${weekLabel(start)}`}
      onClose={busy ? () => {} : onClose}
      width="max-w-2xl"
      footer={
        result ? (
          <>
            <Button variant="ghost" icon={<RefreshCw size={15} />} onClick={() => setResult(null)} className="mr-auto">
              Rigenera
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Annulla
            </Button>
            <Button variant="primary" onClick={accept} disabled={keep.length === 0} icon={<Check size={16} />}>
              Aggiungi {keep.length} al calendario
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Annulla
            </Button>
            <Button variant="ai" onClick={run} disabled={busy} icon={busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}>
              {busy ? 'Sto scrivendo…' : slots.length && picked.length ? `Genera ${picked.length} ${picked.length === 1 ? 'bozza' : 'bozze'}` : 'Proponi uscite'}
            </Button>
          </>
        )
      }
    >
      {busy ? (
        <div className="flex flex-col items-center py-14 text-center">
          <div className="relative mb-5">
            <div className="size-16 animate-spin rounded-full border-4 border-violet-100 border-t-violet-500" />
            <Sparkles size={22} className="absolute inset-0 m-auto text-violet-500" />
          </div>
          <p key={step} className="animate-in font-semibold">{LOADING[step]}</p>
          <p className="mt-1 text-sm text-stone-500">Di solito ci vogliono 20-40 secondi.</p>
        </div>
      ) : result ? (
        <div className="space-y-2">
          <p className="mb-3 text-sm text-stone-500">Scegli cosa tenere. Arriveranno come <b>bozze</b>: potrai rifinirle prima di mandarle in approvazione.</p>
          {result.map((p, i) => {
            const on = keep.includes(i)
            const open = expanded === i
            return (
              <div key={i} className={cx('rounded-2xl bg-white ring-1 transition', on ? 'ring-stone-200' : 'opacity-50 ring-stone-100')}>
                <div className="flex items-center gap-3 p-3">
                  <button
                    type="button"
                    aria-label={on ? 'Escludi' : 'Includi'}
                    onClick={() => setKeep((k) => (on ? k.filter((x) => x !== i) : [...k, i]))}
                    className={cx('flex size-5 shrink-0 items-center justify-center rounded-md transition', on ? 'bg-brand-600 text-white' : 'bg-white ring-1 ring-stone-300')}
                  >
                    {on && <Check size={13} strokeWidth={3} />}
                  </button>
                  <button type="button" onClick={() => setExpanded(open ? null : i)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <PlatformBadge platform={p.platform} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.title}</p>
                      <p className="text-xs text-stone-500">
                        {capitalize(fmt(p.date, 'EEEE d'))} · {p.time} · {PLATFORM_META[p.platform].label} {FORMAT_LABEL[p.format]}
                      </p>
                    </div>
                    <ChevronDown size={16} className={cx('shrink-0 text-stone-400 transition', open && 'rotate-180')} />
                  </button>
                </div>
                {open && (
                  <div className="space-y-2 border-t border-stone-100 px-4 py-3 text-sm">
                    <p className="whitespace-pre-wrap text-stone-800">{p.copy}</p>
                    {p.visual && (
                      <p className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
                        <b>Visual:</b> {p.visual}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-5">
          {briefWeak && (
            <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
              La scheda di questo cliente non ha ancora il <b>tono di voce</b>: le bozze saranno più generiche. Compilala per risultati migliori.
            </p>
          )}
          <div>
            <p className="mb-2 text-[13px] font-semibold text-stone-700">Uscite da coprire</p>
            {slots.length === 0 ? (
              <p className="rounded-xl bg-white px-3 py-3 text-sm text-stone-500 ring-1 ring-stone-200">
                {client.slots.length === 0 ? 'Nessuna uscita fissa nella scheda: l’AI proporrà 3-4 contenuti distribuiti nella settimana.' : 'Tutte le uscite di questa settimana sono già coperte. L’AI proporrà contenuti extra.'}
              </p>
            ) : (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {slots.map((s) => {
                  const on = picked.includes(s.slotId)
                  return (
                    <button
                      key={s.slotId}
                      type="button"
                      onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s.slotId) : [...p, s.slotId]))}
                      className={cx('flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm ring-1 transition', on ? 'bg-white font-medium shadow-soft ring-brand-300' : 'text-stone-400 ring-stone-200')}
                    >
                      <span className={cx('flex size-4 shrink-0 items-center justify-center rounded', on ? 'bg-brand-600 text-white' : 'ring-1 ring-stone-300')}>{on && <Check size={11} strokeWidth={3} />}</span>
                      {slotLabel(s)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          {weekEvents.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-semibold text-stone-700">Eventi di cui terrà conto</p>
              {weekEvents.map((e) => (
                <p key={e.id} className="flex items-center gap-2 text-sm text-pink-700">
                  <PartyPopper size={14} /> {e.name} · {fmt(e.date, 'EEEE d')}
                </p>
              ))}
            </div>
          )}
          <Field label="Indicazioni per questa settimana" hint="opzionale ma utilissimo">
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={'Es. “Offerte del volantino: pasta Barilla 0,79 €, fesa di tacchino 9,90 €/kg. Spingere il reparto ortofrutta.”'}
              className="min-h-24"
              autoFocus
            />
          </Field>
        </div>
      )}
    </Modal>
  )
}
