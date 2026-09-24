import { useState } from 'react'
import { Plus, Trash2, UserRound } from 'lucide-react'
import type { ClientEvent, Influencer } from '../types'
import { uid, useStore } from '../store'
import { useUi } from '../ui'
import { todayISO } from '../lib/dates'
import { googleEventLink } from '../lib/calendarLinks'
import { GoogleCalendarIcon } from './GoogleCalendarModal'
import { Button, Field, IconButton, Input, Modal, Select, Textarea } from './ui'

export function EventEditor() {
  const ed = useUi((s) => s.eventEditor)
  if (!ed) return null
  return <Inner key={ed.eventId ?? 'new'} />
}

function Inner() {
  const ed = useUi((s) => s.eventEditor)!
  const close = useUi((s) => s.closeEvent)
  const toast = useUi((s) => s.toast)
  const allClients = useStore((s) => s.clients)
  const clients = allClients.filter((c) => !c.archived)
  const existing = useStore((s) => s.events.find((e) => e.id === ed.eventId))
  const { saveEvent, deleteEvent } = useStore.getState()

  const [form, setForm] = useState<Omit<ClientEvent, 'createdAt'>>(
    existing ?? {
      id: '',
      clientId: ed.clientId ?? clients[0]?.id ?? '',
      name: '',
      date: ed.date ?? todayISO(),
      time: '',
      location: '',
      notes: '',
      influencers: [],
    },
  )
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setInf = (id: string, patch: Partial<Influencer>) =>
    set('influencers', form.influencers.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  const submit = () => {
    if (!form.name.trim() || !form.clientId) return
    const influencers = form.influencers.filter((i) => i.name.trim() || i.handle.trim())
    saveEvent({ ...form, id: existing ? form.id : undefined, influencers })
    toast(
      existing
        ? 'Evento aggiornato'
        : influencers.length
          ? `Evento creato con ${influencers.length + 1} promemoria automatici`
          : 'Evento creato con promemoria per le stories',
    )
    close()
  }

  return (
    <Modal
      title={existing ? 'Modifica evento' : 'Nuovo evento'}
      subtitle="Creo io i promemoria: richiesta materiali agli influencer 5 giorni prima e le stories il giorno stesso."
      onClose={close}
      width="max-w-xl"
      footer={
        <>
          {existing && (
            <Button
              variant="danger"
              className="mr-auto"
              icon={<Trash2 size={15} />}
              onClick={() => {
                deleteEvent(existing.id)
                toast('Evento eliminato', 'info')
                close()
              }}
            >
              Elimina
            </Button>
          )}
          {existing && (
            <a
              href={googleEventLink({ title: `🎉 ${form.name}`, date: form.date, time: form.time || undefined, minutes: 120, details: form.notes, location: form.location })}
              target="_blank"
              rel="noreferrer"
              title="Aggiungi a Google Calendar"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-stone-600 hover:bg-stone-900/5"
            >
              <GoogleCalendarIcon size={17} /> <span className="hidden sm:inline">Google Calendar</span>
            </a>
          )}
          <Button variant="ghost" onClick={close}>
            Annulla
          </Button>
          <Button variant="primary" onClick={submit} disabled={!form.name.trim() || !form.clientId}>
            {existing ? 'Salva' : 'Crea evento'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome evento" className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Es. Inaugurazione nuovo punto vendita" autoFocus />
          </Field>
          <Field label="Cliente">
            <Select value={form.clientId} onChange={(e) => set('clientId', e.target.value)}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Luogo">
            <Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Opzionale" />
          </Field>
          <Field label="Data">
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Ora">
            <Input type="time" value={form.time} onChange={(e) => set('time', e.target.value)} />
          </Field>
          <Field label="Note" className="sm:col-span-2">
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Programma, ospiti, cosa riprendere…" className="min-h-16" />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-stone-700">Influencer coinvolti</p>
            <Button
              size="sm"
              variant="ghost"
              icon={<Plus size={14} />}
              onClick={() => set('influencers', [...form.influencers, { id: uid(), name: '', handle: '', deliverables: '', received: false }])}
            >
              Aggiungi
            </Button>
          </div>
          {form.influencers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500">
              Nessun influencer. Aggiungili per ricevere il promemoria di chiedere script e video.
            </p>
          ) : (
            <div className="space-y-2">
              {form.influencers.map((i) => (
                <div key={i.id} className="flex items-start gap-2 rounded-xl bg-white p-2.5 ring-1 ring-stone-200">
                  <span className="mt-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-600">
                    <UserRound size={13} />
                  </span>
                  <div className="grid flex-1 gap-2 sm:grid-cols-3">
                    <Input value={i.name} onChange={(e) => setInf(i.id, { name: e.target.value })} placeholder="Nome" className="h-9" />
                    <Input value={i.handle} onChange={(e) => setInf(i.id, { handle: e.target.value })} placeholder="@profilo" className="h-9" />
                    <Input value={i.deliverables} onChange={(e) => setInf(i.id, { deliverables: e.target.value })} placeholder="Cosa deve mandare" className="h-9" />
                  </div>
                  <IconButton label="Rimuovi" onClick={() => set('influencers', form.influencers.filter((x) => x.id !== i.id))}>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
