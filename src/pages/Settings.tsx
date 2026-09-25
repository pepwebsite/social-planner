import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Download, Loader2, LogOut, PlayCircle, RotateCcw, Smartphone, Sparkles, Upload } from 'lucide-react'
import { isDemoClient, snapshot, useStore, type DataSnapshot } from '../store'
import { useUi } from '../ui'
import { aiStatus, type AiStatus } from '../lib/ai'
import { providerById } from '../lib/providers'
import { cloudEnabled } from '../lib/supabase'
import { signOutAndClear } from '../lib/sync'
import { displayName, useAuth } from '../auth'
import { SyncBadge } from '../components/AuthGate'
import { RecoveryCard } from '../components/Recovery'
import { AppearanceCard } from '../components/AppearanceCard'
import { openTutorial } from '../components/Tutorial'
import { todayISO } from '../lib/dates'
import { PageHeader } from '../components/Layout'
import { Button, Card, cx } from '../components/ui'
import { UserAvatar, openAvatarPicker } from '../components/UserAvatar'

export function Settings() {
  const { importData, resetAll, loadDemo } = useStore.getState()
  const counts = {
    c: useStore((s) => s.clients.length),
    p: useStore((s) => s.posts.length),
    t: useStore((s) => s.tasks.length),
    e: useStore((s) => s.events.length),
  }
  const toast = useUi((s) => s.toast)
  const user = useAuth((s) => s.user)
  const demoCount = useStore((s) => s.clients.filter(isDemoClient).length)
  const fileRef = useRef<HTMLInputElement>(null)
  const [ai, setAi] = useState<AiStatus | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    void aiStatus().then(setAi)
  }, [])

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ app: 'regia', version: 1, exportedAt: new Date().toISOString(), ...snapshot() }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `regia-backup-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Backup scaricato')
  }

  const onImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Partial<DataSnapshot>
      if (!Array.isArray(data.clients) || !Array.isArray(data.posts)) throw new Error()
      importData(data as DataSnapshot)
      toast(`Importati ${data.clients.length} clienti e ${data.posts.length} contenuti`)
    } catch {
      toast('File non valido: usa un backup esportato da Social Planner', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader title="Impostazioni e backup" />
      <div className="space-y-4 px-4 md:px-8">
        <Link to="/impostazioni/ai" className="block rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-stone-900/5 transition hover:-translate-y-px hover:shadow-lift">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-brand-600 text-white">
              <Sparkles size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">Provider AI</p>
              {ai === null ? (
                <p className="flex items-center gap-2 text-sm text-stone-500">
                  <Loader2 size={14} className="animate-spin" /> Verifico…
                </p>
              ) : ai.enabled ? (
                <p className="truncate text-sm text-emerald-700">
                  Attivo: {providerById(ai.provider)?.name ?? ai.provider}
                  {ai.model && ` · ${ai.model}`}
                  {ai.source === 'server' && ' (configurato sul server)'}
                </p>
              ) : (
                <p className="text-sm text-stone-600">Non collegato. Collega un provider gratuito (Gemini, Groq, OpenRouter…) in un minuto.</p>
              )}
            </div>
            <ChevronRight size={18} className="shrink-0 text-stone-400" />
          </div>
        </Link>

        {cloudEnabled && user && (
          <Card className="flex flex-wrap items-center gap-3 p-5">
            <UserAvatar size={52} editable />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{displayName(user)}</p>
              <p className="truncate text-sm text-stone-500">{user.email}</p>
              <SyncBadge className="mt-0.5" />
              <button type="button" onClick={openAvatarPicker} className="mt-1 block text-sm font-semibold text-brand-600 hover:underline">
                Cambia personaggio
              </button>
            </div>
            <Button variant="secondary" icon={<LogOut size={15} />} onClick={() => void signOutAndClear()}>
              Esci
            </Button>
          </Card>
        )}

        <AppearanceCard />

        <RecoveryCard />

        {demoCount > 0 && (
          <Card className="flex flex-wrap items-center gap-3 p-5">
            <div className="min-w-0 flex-1 basis-60">
              <p className="font-bold">Dati di esempio</p>
              <p className="text-sm text-stone-500">Ci sono {demoCount} clienti di esempio (Sigma Via Roma, Bistrot Luna, FitZone). Puoi toglierli: i tuoi clienti restano.</p>
            </div>
            <Button
              variant="danger"
              onClick={() => {
                const n = useStore.getState().removeDemo()
                toast(`Eliminati ${n} clienti di esempio`)
              }}
            >
              Elimina dati di esempio
            </Button>
          </Card>
        )}

        <Card className="p-5">
          <p className="font-bold">I tuoi dati</p>
          <p className="mt-0.5 text-sm text-stone-500">
            {cloudEnabled ? 'Salvati nel tuo account e sincronizzati su tutti i tuoi dispositivi' : 'Salvati in questo browser'}: {counts.c} clienti, {counts.p} contenuti, {counts.t} attività, {counts.e} eventi. Il backup è una copia di sicurezza in più, da conservare dove vuoi.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" icon={<Download size={15} />} onClick={exportData}>
              Scarica backup
            </Button>
            <Button variant="secondary" icon={<Upload size={15} />} onClick={() => fileRef.current?.click()}>
              Importa backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onImport(f)
                e.target.value = ''
              }}
            />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <Smartphone size={20} className="mt-0.5 text-stone-400" />
            <div>
              <p className="font-bold">Installa come app</p>
              <p className="mt-0.5 text-sm text-stone-500">
                Su telefono: apri il sito in Safari o Chrome → Condividi / menu ⋮ → <b>Aggiungi a schermata Home</b>. Su computer: icona di installazione nella barra degli indirizzi di Chrome o Edge.
              </p>
            </div>
          </div>
        </Card>

        <button
          type="button"
          onClick={openTutorial}
          className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 p-5 text-left text-white shadow-soft transition active:scale-[0.99]"
        >
          <PlayCircle size={28} className="shrink-0" />
          <span className="flex-1">
            <span className="block font-bold">Guarda il tutorial</span>
            <span className="block text-sm text-white/80">Come funziona Social Planner, in un minuto</span>
          </span>
          <ChevronRight size={18} className="text-white/70" />
        </button>

        <Card className="hidden p-5 md:block">
          <p className="font-bold">Scorciatoie</p>
          <ul className="mt-2 space-y-1 text-sm text-stone-600">
            <li>
              <b>Ctrl/⌘ + K</b> cerca clienti, contenuti e comandi
            </li>
            <li>
              <b>Ctrl/⌘ + Invio</b> salva il contenuto aperto
            </li>
            <li>
              <b>Esc</b> chiude finestre e pannelli
            </li>
          </ul>
        </Card>

        <Card className="flex flex-wrap items-center gap-3 p-5">
          <div className="min-w-0 flex-1 basis-60">
            <p className="font-bold">Ricomincia</p>
            <p className="text-sm text-stone-500">Cancella tutti i dati da questo browser. Scarica prima un backup.</p>
          </div>
          {counts.c === 0 && !cloudEnabled && (
            <Button variant="secondary" onClick={loadDemo}>
              Carica dati di esempio
            </Button>
          )}
          <Button
            variant="danger"
            icon={<RotateCcw size={15} />}
            className={cx(confirmReset && 'bg-rose-600 text-white ring-rose-600 hover:brightness-110')}
            onClick={() => {
              if (!confirmReset) return setConfirmReset(true)
              resetAll()
              setConfirmReset(false)
              toast('Dati cancellati', 'info')
            }}
          >
            {confirmReset ? 'Conferma: cancella tutto' : 'Cancella tutti i dati'}
          </Button>
        </Card>
      </div>
    </div>
  )
}
