import { useEffect, useMemo, useState } from 'react'
import { Check, ClipboardCopy, Copy, ExternalLink, Loader2, MessageSquareWarning, Sparkles, Trash2, X } from 'lucide-react'
import type { Post, PostStatus } from '../types'
import { useStore } from '../store'
import { useUi } from '../ui'
import { FORMATS, FORMAT_LABEL, PLATFORMS, PLATFORM_META, STATUSES, STATUS_META } from '../lib/meta'
import { capitalize, fmt, relativeDay } from '../lib/dates'
import { daysWaiting } from '../lib/insights'
import { generateCopy } from '../lib/ai'
import { googleEventLink } from '../lib/calendarLinks'
import { GoogleCalendarIcon } from './GoogleCalendarModal'
import { Button, ClientAvatar, Drawer, Field, IconButton, Input, PlatformBadge, Select, Textarea, cx } from './ui'

const QUICK_PROMPTS = ['Più breve', 'Più coinvolgente', 'Aggiungi una call to action', 'Adatta per una story', 'Meno emoji']

const CHAR_LIMIT: Record<Post['platform'], number> = {
  instagram: 2200,
  facebook: 5000,
  tiktok: 2200,
  linkedin: 3000,
  youtube: 5000,
}

export function PostEditor() {
  const editor = useUi((s) => s.editor)
  if (!editor) return null
  const key = 'postId' in editor ? editor.postId : 'new'
  return <EditorInner key={key} />
}

function EditorInner() {
  const editor = useUi((s) => s.editor)!
  const closeEditor = useUi((s) => s.closeEditor)
  const toast = useUi((s) => s.toast)
  const posts = useStore((s) => s.posts)
  const clients = useStore((s) => s.clients)
  const events = useStore((s) => s.events)
  const { addPost, updatePost, deletePost, duplicatePost, addPosts } = useStore.getState()

  const existing = 'postId' in editor ? posts.find((p) => p.id === editor.postId) : undefined
  const initial = useMemo<Post>(
    () =>
      existing ?? {
        id: '',
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
        statusChangedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ...('draft' in editor ? editor.draft : { clientId: '', date: '' }),
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const [form, setForm] = useState<Post>(initial)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiAsk, setAiAsk] = useState('')
  const [showFeedback, setShowFeedback] = useState(Boolean(initial.feedback))
  const client = clients.find((c) => c.id === form.clientId)
  const clientEvents = events.filter((e) => e.clientId === form.clientId)
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const isNew = !existing

  const set = <K extends keyof Post>(k: K, v: Post[K]) => setForm((f) => ({ ...f, [k]: v }))

  const save = (close = true) => {
    if (isNew) {
      if (!form.title.trim() && !form.copy.trim()) {
        if (close) closeEditor()
        return
      }
      const { id: _id, ...rest } = form
      void _id
      addPost(rest)
      toast('Contenuto creato')
    } else if (dirty) {
      updatePost(form.id, form)
      toast('Modifiche salvate')
    }
    if (close) closeEditor()
  }

  // Ctrl/Cmd + Invio per salvare
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  // Se il post viene eliminato altrove, chiudi
  if ('postId' in editor && !existing) return null

  const changeStatus = (status: PostStatus) => {
    setForm((f) => ({ ...f, status, statusChangedAt: status !== f.status ? new Date().toISOString() : f.statusChangedAt }))
  }

  const runAi = async (instructions: string) => {
    if (!client) return
    setAiBusy(true)
    try {
      const copy = await generateCopy(client, form, instructions)
      const previous = form.copy
      setForm((f) => ({ ...f, copy, aiGenerated: true }))
      setAiAsk('')
      toast('Copy aggiornato dall’AI', 'ok', previous ? { label: 'Annulla', run: () => set('copy', previous) } : undefined)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setAiBusy(false)
    }
  }

  const limit = CHAR_LIMIT[form.platform]
  const chars = form.copy.length

  return (
    <Drawer onClose={() => save()}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-stone-200/70 px-5 py-4">
        {client && <ClientAvatar client={client} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold tracking-wide text-stone-500 uppercase">{client?.name ?? 'Cliente'}</p>
          <p className="truncate font-bold">{isNew ? 'Nuovo contenuto' : form.title || 'Contenuto senza titolo'}</p>
        </div>
        {dirty && <span className="hidden text-xs text-stone-400 sm:inline">Modifiche non salvate</span>}
        <IconButton label="Chiudi" onClick={() => save()}>
          <X size={18} />
        </IconButton>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {/* Stato */}
        <div>
          <p className="mb-2 text-[13px] font-semibold text-stone-700">Stato</p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {STATUSES.map((s, i) => {
              const active = form.status === s
              const passed = STATUSES.indexOf(form.status) > i
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeStatus(s)}
                  className={cx(
                    'flex flex-col items-start gap-1 rounded-xl px-2.5 py-2 text-left text-xs font-semibold ring-1 transition',
                    active ? 'bg-white shadow-soft ring-2 ring-brand-500' : 'ring-stone-200 hover:bg-white',
                    passed && !active && 'text-stone-400',
                  )}
                >
                  <span className={cx('size-2 rounded-full', passed || active ? STATUS_META[s].dot : 'bg-stone-200')} />
                  {STATUS_META[s].short}
                </button>
              )
            })}
          </div>
          {form.status === 'in_approvazione' && !isNew && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
              <span className="mr-auto">
                {daysWaiting(form) === 0 ? 'Inviato oggi.' : <>In attesa da <b>{daysWaiting(form)} {daysWaiting(form) === 1 ? 'giorno' : 'giorni'}</b>.</>} Il cliente ha risposto?
              </span>
              <Button size="sm" variant="secondary" icon={<MessageSquareWarning size={14} />} onClick={() => { changeStatus('bozza'); setShowFeedback(true) }}>
                Modifiche
              </Button>
              <Button size="sm" variant="primary" icon={<Check size={14} />} onClick={() => changeStatus('approvato')}>
                Approvato
              </Button>
            </div>
          )}
          {showFeedback && (
            <Field label="Modifiche richieste dal cliente" className="mt-3">
              <Textarea
                value={form.feedback}
                onChange={(e) => set('feedback', e.target.value)}
                placeholder="Es. cambiare la foto, togliere il prezzo…"
                className="min-h-16 bg-amber-50/50"
              />
            </Field>
          )}
        </div>

        {/* Quando e dove */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" hint={form.date ? relativeDay(form.date) : undefined}>
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Ora">
            <Input type="time" value={form.time} onChange={(e) => set('time', e.target.value)} />
          </Field>
          <div className="col-span-2">
            <p className="mb-1.5 text-[13px] font-semibold text-stone-700">Piattaforma</p>
            <div className="grid grid-cols-5 gap-1.5">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set('platform', p)}
                  aria-pressed={form.platform === p}
                  className={cx(
                    'flex flex-col items-center gap-1 rounded-xl bg-white py-2 text-[11px] font-semibold ring-1 transition',
                    form.platform === p ? 'text-stone-900 shadow-soft ring-2 ring-brand-500' : 'text-stone-500 ring-stone-200 hover:ring-stone-300',
                  )}
                >
                  <PlatformBadge platform={p} size={26} />
                  {PLATFORM_META[p].label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Formato">
            <Select value={form.format} onChange={(e) => set('format', e.target.value as Post['format'])}>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {FORMAT_LABEL[f]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Idea / titolo interno">
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Es. Reel dietro le quinte in cucina" autoFocus={isNew} />
        </Field>

        {/* Copy + AI */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-stone-700">Copy</span>
            <span className={cx('text-xs tabular-nums', chars > limit ? 'font-semibold text-rose-600' : 'text-stone-400')}>
              {chars}/{limit}
            </span>
          </div>
          {client?.tone && (
            <p className="mb-2 line-clamp-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-900">
              <b>Tono:</b> {client.tone}
            </p>
          )}
          <Textarea
            value={form.copy}
            onChange={(e) => set('copy', e.target.value)}
            placeholder="Scrivi la caption, oppure fattela proporre dall’AI qui sotto"
            className="min-h-40"
          />
          <div className="mt-2 rounded-xl bg-white p-2.5 ring-1 ring-stone-200">
            <div className="flex gap-2">
              <Input
                value={aiAsk}
                onChange={(e) => setAiAsk(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !aiBusy && runAi(aiAsk)}
                placeholder={form.copy ? 'Cosa vuoi cambiare? (opzionale)' : 'Indicazioni per l’AI (opzionale)'}
                className="h-9 ring-0 hover:ring-0"
              />
              <Button variant="ai" size="sm" className="h-9" disabled={aiBusy} onClick={() => runAi(aiAsk)} icon={aiBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}>
                {form.copy ? 'Riscrivi' : 'Scrivi'}
              </Button>
            </div>
            {form.copy && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={aiBusy}
                    onClick={() => runAi(q)}
                    className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 transition hover:bg-violet-100 hover:text-violet-800 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Field label="Brief visivo" hint="per grafico/fotografo">
          <Textarea value={form.visual} onChange={(e) => set('visual', e.target.value)} placeholder="Cosa mostrare, testo in grafica, riferimenti…" />
        </Field>

        <Field label="Link materiale" hint="Canva, Drive, WeTransfer…">
          <div className="flex gap-2">
            <Input value={form.assetLink} onChange={(e) => set('assetLink', e.target.value)} placeholder="https://" />
            {/^https?:\/\//.test(form.assetLink) && (
              <a href={form.assetLink} target="_blank" rel="noreferrer" className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50" title="Apri link">
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        </Field>

        {clientEvents.length > 0 && (
          <Field label="Collegato all'evento">
            <Select value={form.eventId ?? ''} onChange={(e) => set('eventId', e.target.value || null)}>
              <option value="">Nessuno</option>
              {clientEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} · {fmt(ev.date, 'd MMM')}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {!isNew && (
          <p className="text-xs text-stone-400">
            {capitalize(fmt(form.date, 'EEEE d MMMM'))} · creato il {fmt(form.createdAt.slice(0, 10), 'd MMM')}
            {form.aiGenerated && ' · bozza AI'}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="pb-safe flex items-center gap-1 border-t border-stone-200/70 bg-white/60 px-3 py-3 sm:px-5">
        {!isNew && (
          <>
            <IconButton
              label="Elimina"
              className="hover:bg-rose-50 hover:text-rose-600"
              onClick={() => {
                const snapshot = existing!
                deletePost(form.id)
                closeEditor()
                toast('Contenuto eliminato', 'info', { label: 'Annulla', run: () => addPosts([snapshot]) })
              }}
            >
              <Trash2 size={17} />
            </IconButton>
            <IconButton
              label="Duplica"
              onClick={() => {
                save(false)
                const id = duplicatePost(form.id)
                if (id) useUi.getState().openPost(id)
                toast('Duplicato come bozza')
              }}
            >
              <Copy size={17} />
            </IconButton>
          </>
        )}
        {!isNew && form.date && (
          <a
            href={googleEventLink({
              title: `${client?.name ?? ''} · ${PLATFORM_META[form.platform].label} ${FORMAT_LABEL[form.format]}${form.title ? `: ${form.title}` : ''}`,
              date: form.date,
              time: form.time,
              details: form.copy,
            })}
            target="_blank"
            rel="noreferrer"
            aria-label="Aggiungi a Google Calendar"
            title="Aggiungi a Google Calendar"
            className="inline-flex size-9 items-center justify-center rounded-xl hover:bg-stone-900/5"
          >
            <GoogleCalendarIcon size={18} />
          </a>
        )}
        <IconButton
          label="Copia testo"
          disabled={!form.copy}
          onClick={() => navigator.clipboard.writeText(form.copy).then(() => toast('Copy copiato negli appunti'))}
        >
          <ClipboardCopy size={17} />
        </IconButton>
        <div className="flex-1" />
        <Button variant="ghost" onClick={closeEditor}>
          Annulla
        </Button>
        <Button variant="primary" onClick={() => save()} disabled={!isNew && !dirty}>
          {isNew ? 'Crea contenuto' : 'Salva'}
        </Button>
      </div>
    </Drawer>
  )
}
