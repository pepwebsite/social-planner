import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, ChevronDown, ExternalLink, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Sparkles, Unplug, Zap } from 'lucide-react'
import { useAi } from '../aiStore'
import { useUi } from '../ui'
import { validateProvider } from '../lib/ai'
import { PROVIDERS, TIER_META, pickDefaultModel, providerById, type ProviderInfo, type ProviderTier } from '../lib/providers'
import { PageHeader } from '../components/Layout'
import { Button, Card, Input, Segmented, Select, cx } from '../components/ui'

type Filter = 'tutti' | 'gratis'

export function Providers() {
  const entries = useAi((s) => s.entries)
  const activeId = useAi((s) => s.activeId)
  const [filter, setFilter] = useState<Filter>('tutti')
  const [open, setOpen] = useState<string | null>(() => (Object.keys(useAi.getState().entries).length ? null : 'gemini'))

  const active = providerById(activeId)
  const activeEntry = activeId ? entries[activeId] : undefined
  const order: Record<ProviderTier, number> = { free: 0, credits: 1, paid: 2 }
  const list = PROVIDERS.filter((p) => filter === 'tutti' || p.tier !== 'paid').sort(
    (a, b) => Number(Boolean(entries[b.id])) - Number(Boolean(entries[a.id])) || order[a.tier] - order[b.tier],
  )

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader
        eyebrow={
          <Link to="/impostazioni" className="inline-flex items-center gap-1 hover:text-stone-800">
            <ArrowLeft size={14} /> Impostazioni
          </Link>
        }
        title="Provider AI"
        subtitle="Collega il servizio che scrive le bozze. Molti sono gratuiti: accedi, crea una chiave, incollala qui e premi Verifica."
      />

      <div className="space-y-4 px-4 md:px-8">
        {/* Provider in uso */}
        <Card className="flex items-center gap-3 p-4">
          <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-xl', active ? 'bg-gradient-to-br from-violet-500 to-brand-600 text-white' : 'bg-stone-100 text-stone-400')}>
            <Sparkles size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold tracking-wide text-stone-400 uppercase">In uso</p>
            {active && activeEntry ? (
              <p className="truncate font-semibold">
                {active.name} <span className="font-normal text-stone-500">· {activeEntry.model || 'nessun modello scelto'}</span>
              </p>
            ) : (
              <p className="font-semibold text-stone-500">Nessun provider collegato</p>
            )}
          </div>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'tutti', label: 'Tutti' },
              { value: 'gratis', label: 'Solo gratuiti' },
            ]}
          />
          <p className="flex items-center gap-1.5 text-xs text-stone-500">
            <ShieldCheck size={14} className="text-emerald-600" /> Chiavi salvate solo in questo browser
          </p>
        </div>

        <div className="space-y-2.5">
          {list.map((p) => (
            <ProviderCard key={p.id} info={p} expanded={open === p.id} onToggle={() => setOpen((o) => (o === p.id ? null : p.id))} />
          ))}
        </div>

        <p className="px-1 text-xs leading-relaxed text-stone-500">
          Le chiavi restano in questo browser e non entrano nel backup. Quando generi una bozza, la chiave passa dal server di Regia solo per inoltrare la richiesta al provider e non viene salvata. I piani gratuiti hanno limiti di utilizzo e condizioni che possono cambiare: in caso di “limite raggiunto” passa a un altro provider collegato.
        </p>
      </div>
    </div>
  )
}

function ProviderCard({ info, expanded, onToggle }: { info: ProviderInfo; expanded: boolean; onToggle: () => void }) {
  const entry = useAi((s) => s.entries[info.id])
  const isActive = useAi((s) => s.activeId === info.id)
  const { saveVerified, setModel, setActive, remove } = useAi.getState()
  const toast = useUi((s) => s.toast)
  const [key, setKey] = useState(entry?.apiKey ?? '')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tier = TIER_META[info.tier]

  const verify = async () => {
    const apiKey = key.trim()
    if (!apiKey) return
    setBusy(true)
    setError(null)
    try {
      const { models } = await validateProvider(info.id, apiKey)
      const keep = entry?.model && models.some((m) => m.id === entry.model) ? entry.model : pickDefaultModel(info, models)
      const hadActive = useAi.getState().activeId !== null
      saveVerified(info.id, apiKey, models, keep)
      toast(hadActive ? `${info.name} collegato` : `${info.name} collegato e in uso`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const freeCount = entry?.models.filter((m) => m.free).length ?? 0

  return (
    <Card className={cx('overflow-hidden transition', isActive && 'ring-2 ring-brand-500')}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white" style={{ background: info.color }}>
          {info.name[0]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">{info.name}</p>
            <span className={cx('rounded-full px-2 py-px text-[11px] font-semibold ring-1 ring-inset', tier.cls)}>{tier.label}</span>
            {isActive && <span className="rounded-full bg-brand-600 px-2 py-px text-[11px] font-semibold text-white">In uso</span>}
          </div>
          <p className="truncate text-sm text-stone-500">
            {entry ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <Check size={13} strokeWidth={3} /> Collegato · {entry.model || 'scegli un modello'}
              </span>
            ) : (
              info.note
            )}
          </p>
        </div>
        <ChevronDown size={18} className={cx('shrink-0 text-stone-400 transition', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-stone-100 px-4 pt-4 pb-5">
          {entry && <p className="text-sm text-stone-600">{info.note}</p>}

          {/* 1. Login e chiave */}
          <div className="flex gap-3">
            <Step n={1} />
            <div className="flex-1">
              <p className="text-sm font-semibold">Accedi e crea una chiave API</p>
              <a href={info.keyUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                Apri {new URL(info.keyUrl).hostname} <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* 2. Incolla e verifica */}
          <div className="flex gap-3">
            <Step n={2} />
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-sm font-semibold">Incolla la chiave e verificala</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
                  <Input
                    type={show ? 'text' : 'password'}
                    value={key}
                    onChange={(e) => {
                      setKey(e.target.value)
                      setError(null)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && verify()}
                    placeholder={info.keyHint}
                    autoComplete="off"
                    spellCheck={false}
                    className="pr-10 pl-9 font-mono text-[13px]"
                  />
                  <button type="button" aria-label={show ? 'Nascondi chiave' : 'Mostra chiave'} onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-stone-400 hover:text-stone-700">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <Button variant="primary" onClick={verify} disabled={busy || !key.trim()} icon={busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}>
                  Verifica
                </Button>
              </div>
              {error && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              {entry && !error && (
                <p className="mt-2 text-sm text-emerald-700">
                  ✓ Chiave valida · {entry.models.length} modelli disponibili
                  {freeCount > 0 && ` (${freeCount} gratuiti)`}
                </p>
              )}
            </div>
          </div>

          {/* 3. Modello e attivazione */}
          {entry && (
            <div className="flex gap-3">
              <Step n={3} />
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-sm font-semibold">Scegli il modello</p>
                <Select value={entry.model} onChange={(e) => setModel(info.id, e.target.value)}>
                  {entry.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                      {m.free ? ' · gratis' : ''}
                    </option>
                  ))}
                </Select>
                {info.id === 'openrouter' && entry.model && !entry.models.find((m) => m.id === entry.model)?.free && (
                  <p className="mt-1.5 text-xs text-amber-700">Questo modello è a pagamento: serve credito su OpenRouter.</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {!isActive && (
                    <Button variant="primary" icon={<Zap size={15} />} onClick={() => { setActive(info.id); toast(`Ora le bozze usano ${info.name}`) }}>
                      Usa questo provider
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    icon={<Unplug size={15} />}
                    onClick={() => {
                      remove(info.id)
                      setKey('')
                      toast(`${info.name} scollegato`, 'info')
                    }}
                  >
                    Scollega
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

const Step = ({ n }: { n: number }) => (
  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-chip text-xs font-bold text-white">{n}</span>
)
