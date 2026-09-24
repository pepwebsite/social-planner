import { useEffect, useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import { it } from 'date-fns/locale'
import { Cloud, HardDrive, History, Loader2, RotateCcw } from 'lucide-react'
import { useAuth } from '../auth'
import { useUi } from '../ui'
import { cloudEnabled, supabase } from '../lib/supabase'
import { restoreSnapshot, safetyCopies, type SafetyCopy } from '../lib/sync'
import { fmt } from '../lib/dates'
import { Button, Card, Modal } from './ui'

interface CloudVersion {
  id: number
  created_at: string
  clients_count: number
  posts_count: number
}

type Pending = { label: string; load: () => Promise<Record<string, unknown> | null> }

const when = (iso: string) => `${fmt(iso.slice(0, 10), 'd MMM')} alle ${new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} · ${formatDistanceToNowStrict(new Date(iso), { locale: it, addSuffix: true })}`

/** Copie di sicurezza: versioni salvate nel database e copie nel browser, con ripristino */
export function RecoveryCard() {
  const user = useAuth((s) => s.user)
  const [versions, setVersions] = useState<CloudVersion[] | null>(null)
  const [cloudError, setCloudError] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [showAll, setShowAll] = useState(false)
  const local: SafetyCopy[] = safetyCopies().filter((c) => !user || !c.owner || c.owner === user.id)

  useEffect(() => {
    if (!supabase || !user) return
    void supabase
      .from('workspace_history')
      .select('id, created_at, clients_count, posts_count')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) setCloudError(/workspace_history|does not exist|schema cache/i.test(error.message) ? 'setup' : 'errore')
        else setVersions((data as CloudVersion[]) ?? [])
      })
  }, [user])

  const cloudList = (versions ?? []).slice(0, showAll ? 50 : 5)

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <History size={19} />
        </span>
        <div>
          <p className="font-bold">Copie di sicurezza</p>
          <p className="mt-0.5 text-sm text-stone-500">Se qualcosa è sparito, qui puoi recuperarlo. Il ripristino non cancella nulla senza lasciarne una copia.</p>
        </div>
      </div>

      {cloudEnabled && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-stone-700">
            <Cloud size={14} /> Nel tuo account
          </p>
          {cloudError === 'setup' ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">Cronologia non ancora attiva: esegui il file supabase/history.sql nell’SQL Editor di Supabase.</p>
          ) : cloudError ? (
            <p className="text-sm text-stone-500">Impossibile leggere la cronologia adesso.</p>
          ) : versions === null ? (
            <p className="flex items-center gap-2 text-sm text-stone-500">
              <Loader2 size={14} className="animate-spin" /> Carico…
            </p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-stone-500">Nessuna versione precedente ancora: le copie si creano da sole mentre lavori.</p>
          ) : (
            <div className="space-y-1.5">
              {cloudList.map((v) => (
                <VersionRow
                  key={v.id}
                  title={when(v.created_at)}
                  detail={`${v.clients_count} clienti · ${v.posts_count} contenuti`}
                  onRestore={() =>
                    setPending({
                      label: when(v.created_at),
                      load: async () => {
                        const { data } = await supabase!.from('workspace_history').select('data').eq('id', v.id).single()
                        return (data?.data as Record<string, unknown>) ?? null
                      },
                    })
                  }
                />
              ))}
              {versions.length > 5 && (
                <button type="button" onClick={() => setShowAll((s) => !s)} className="text-sm font-semibold text-brand-600">
                  {showAll ? 'Mostra meno' : `Mostra tutte (${versions.length})`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {local.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-stone-700">
            <HardDrive size={14} /> Su questo dispositivo
          </p>
          <div className="space-y-1.5">
            {local.map((c) => (
              <VersionRow
                key={c.at}
                title={when(c.at)}
                detail={`${c.reason} · ${c.clients} clienti · ${c.posts} contenuti`}
                onRestore={() => setPending({ label: when(c.at), load: async () => c.data })}
              />
            ))}
          </div>
        </div>
      )}

      {pending && <RestoreDialog pending={pending} onClose={() => setPending(null)} />}
    </Card>
  )
}

function VersionRow({ title, detail, onRestore }: { title: string; detail: string; onRestore: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2.5 ring-1 ring-stone-900/5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-stone-500">{detail}</p>
      </div>
      <Button size="sm" variant="secondary" icon={<RotateCcw size={13} />} onClick={onRestore}>
        Ripristina
      </Button>
    </div>
  )
}

function RestoreDialog({ pending, onClose }: { pending: Pending; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const toast = useUi((s) => s.toast)

  const run = async (mode: 'unisci' | 'sostituisci') => {
    setBusy(true)
    const data = await pending.load().catch(() => null)
    setBusy(false)
    if (!data) return toast('Impossibile leggere questa copia', 'error')
    restoreSnapshot(data, mode)
    toast(mode === 'unisci' ? 'Recuperato ciò che mancava' : 'Dati ripristinati a quella versione')
    onClose()
  }

  return (
    <Modal
      title="Ripristina copia"
      subtitle={pending.label}
      onClose={onClose}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Annulla
        </Button>
      }
    >
      <div className="space-y-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => run('unisci')}
          className="w-full rounded-2xl bg-surface p-4 text-left ring-2 ring-emerald-400 transition hover:bg-emerald-50/50 disabled:opacity-50"
        >
          <p className="font-bold text-emerald-800">Recupera ciò che manca (consigliato)</p>
          <p className="mt-0.5 text-sm text-stone-600">Rimette clienti, contenuti, eventi e attività che non ci sono più. Quello che hai adesso resta com’è.</p>
        </button>
        <button type="button" disabled={busy} onClick={() => run('sostituisci')} className="w-full rounded-2xl bg-surface p-4 text-left ring-1 ring-stone-200 transition hover:bg-stone-50 disabled:opacity-50">
          <p className="font-bold">Torna esattamente a questa versione</p>
          <p className="mt-0.5 text-sm text-stone-600">Sostituisce tutto con la copia scelta. Anche i dati attuali vengono conservati in una copia di sicurezza.</p>
        </button>
        {busy && (
          <p className="flex items-center gap-2 text-sm text-stone-500">
            <Loader2 size={14} className="animate-spin" /> Recupero la copia…
          </p>
        )}
      </div>
    </Modal>
  )
}
