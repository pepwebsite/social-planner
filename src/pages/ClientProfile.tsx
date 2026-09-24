import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, ArchiveRestore, Plus, Star, Trash2 } from 'lucide-react'
import type { Client, Contact, Format, Platform, Slot } from '../types'
import { uid, useStore } from '../store'
import { useUi } from '../ui'
import { CLIENT_COLORS, FORMATS, FORMAT_LABEL, PLATFORMS, PLATFORM_META, WEEKDAYS } from '../lib/meta'
import { Button, Card, ClientAvatar, Field, IconButton, Input, PlatformBadge, Select, Textarea, cx } from '../components/ui'

function Section({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="font-bold">{title}</h3>
      {text && <p className="mt-0.5 mb-4 text-sm text-stone-500">{text}</p>}
      <div className={cx(!text && 'mt-4')}>{children}</div>
    </Card>
  )
}

/** Scheda del cliente: tutto quello che serve per non dover ricordare niente. Salvataggio automatico. */
export function ClientProfile({ client }: { client: Client }) {
  const updateClient = useStore((s) => s.updateClient)
  const deleteClient = useStore((s) => s.deleteClient)
  const toast = useUi((s) => s.toast)
  const nav = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (patch: Partial<Client>) => updateClient(client.id, patch)

  const setSlot = (id: string, patch: Partial<Slot>) => set({ slots: client.slots.map((s) => (s.id === id ? { ...s, ...patch } : s)) })
  const setContact = (id: string, patch: Partial<Contact>) => set({ contacts: client.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) })

  const sortedSlots = [...client.slots].sort((a, b) => a.weekday - b.weekday || a.time.localeCompare(b.time))

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-sm text-stone-500">
        <span className="size-1.5 rounded-full bg-emerald-500" /> Le modifiche si salvano da sole.
      </p>

      <Section title="Identità">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <Input value={client.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Settore">
            <Input value={client.sector} onChange={(e) => set({ sector: e.target.value })} placeholder="Es. Supermercato" />
          </Field>
          <Field label="Pubblico" className="sm:col-span-2">
            <Input value={client.audience} onChange={(e) => set({ audience: e.target.value })} placeholder="Chi vogliamo raggiungere" />
          </Field>
          <Field label="Colore">
            <div className="flex flex-wrap items-center gap-2">
              <ClientAvatar client={client} />
              {CLIENT_COLORS.map((c) => (
                <button key={c} type="button" aria-label={c} onClick={() => set({ color: c })} className={cx('size-6 rounded-full transition hover:scale-110', client.color === c && 'ring-2 ring-stone-900 ring-offset-2')} style={{ background: c }} />
              ))}
            </div>
          </Field>
          <Field label="Piattaforme">
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => {
                const on = client.platforms.includes(p)
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set({ platforms: on ? client.platforms.filter((x) => x !== p) : [...client.platforms, p] })}
                    className={cx('inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-xs font-semibold ring-1 transition', on ? 'bg-white shadow-soft ring-stone-300' : 'text-stone-400 ring-stone-200')}
                  >
                    <PlatformBadge platform={p} className={cx(!on && 'opacity-30')} /> {PLATFORM_META[p].label}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Tono di voce e regole" text="Più sei precisa qui, più le bozze dell’AI saranno già pronte. Lo vedrai anche mentre scrivi ogni copy.">
        <div className="grid gap-4">
          <Field label="Tono di voce">
            <Textarea value={client.tone} onChange={(e) => set({ tone: e.target.value })} placeholder="Es. Caldo e familiare, si dà del tu, emoji con moderazione, frasi brevi…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="✅ Da fare sempre">
              <Textarea value={client.doList} onChange={(e) => set({ doList: e.target.value })} placeholder="Una regola per riga" />
            </Field>
            <Field label="⛔ Da evitare">
              <Textarea value={client.dontList} onChange={(e) => set({ dontList: e.target.value })} placeholder="Una regola per riga" />
            </Field>
          </div>
          <Field label="Hashtag ricorrenti">
            <Input value={client.hashtags} onChange={(e) => set({ hashtags: e.target.value })} placeholder="#brand #città" />
          </Field>
          <Field label="Esempi di copy approvati" hint="incolla 1-3 caption che al cliente sono piaciute">
            <Textarea value={client.copyExamples} onChange={(e) => set({ copyExamples: e.target.value })} className="min-h-28" />
          </Field>
          <Field label="Note interne">
            <Textarea value={client.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Password in cassaforte, preferenze, cose da ricordare…" />
          </Field>
        </div>
      </Section>

      <Section title="Uscite settimanali" text="I giorni e gli orari fissi di pubblicazione. Il calendario ti segnala in rosso le uscite ancora scoperte.">
        <div className="space-y-2">
          {sortedSlots.map((s) => (
            <div key={s.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-stone-50 p-2 sm:grid-cols-[1.2fr_0.8fr_1fr_1fr_auto]">
              <Select value={s.weekday} onChange={(e) => setSlot(s.id, { weekday: Number(e.target.value) })} className="h-9">
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
              <Input type="time" value={s.time} onChange={(e) => setSlot(s.id, { time: e.target.value })} className="h-9" />
              <div className="relative">
              <PlatformBadge platform={s.platform} size={18} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2" />
              <Select value={s.platform} onChange={(e) => setSlot(s.id, { platform: e.target.value as Platform })} className="h-9 pl-9">
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_META[p].label}
                  </option>
                ))}
              </Select>
              </div>
              <Select value={s.format} onChange={(e) => setSlot(s.id, { format: e.target.value as Format })} className="h-9">
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {FORMAT_LABEL[f]}
                  </option>
                ))}
              </Select>
              <IconButton label="Rimuovi uscita" onClick={() => set({ slots: client.slots.filter((x) => x.id !== s.id) })} className="row-start-1 sm:row-auto">
                <Trash2 size={15} />
              </IconButton>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => set({ slots: [...client.slots, { id: uid(), weekday: 0, time: '18:00', platform: client.platforms[0] ?? 'instagram', format: 'post' }] })}
          >
            Aggiungi uscita
          </Button>
        </div>
      </Section>

      <Section title="Contatti" text="La stella indica chi approva i contenuti: riceverà il messaggio di approvazione su WhatsApp.">
        <div className="space-y-2">
          {client.contacts.map((c) => {
            const approver = client.approvalContactId === c.id
            return (
              <div key={c.id} className="flex items-start gap-2 rounded-xl bg-stone-50 p-2">
                <IconButton label={approver ? 'Approva i contenuti' : 'Imposta come approvatore'} onClick={() => set({ approvalContactId: c.id })} className={cx(approver && 'text-amber-500 hover:text-amber-500')}>
                  <Star size={16} fill={approver ? 'currentColor' : 'none'} />
                </IconButton>
                <div className="grid flex-1 gap-2 sm:grid-cols-4">
                  <Input value={c.name} onChange={(e) => setContact(c.id, { name: e.target.value })} placeholder="Nome" className="h-9" />
                  <Input value={c.role} onChange={(e) => setContact(c.id, { role: e.target.value })} placeholder="Ruolo" className="h-9" />
                  <Input value={c.phone} onChange={(e) => setContact(c.id, { phone: e.target.value })} placeholder="Telefono / WhatsApp" className="h-9" inputMode="tel" />
                  <Input value={c.email} onChange={(e) => setContact(c.id, { email: e.target.value })} placeholder="Email" className="h-9" inputMode="email" />
                </div>
                <IconButton
                  label="Rimuovi contatto"
                  onClick={() => set({ contacts: client.contacts.filter((x) => x.id !== c.id), approvalContactId: approver ? null : client.approvalContactId })}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            )
          })}
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => {
              const id = uid()
              set({ contacts: [...client.contacts, { id, name: '', role: '', phone: '', email: '' }], approvalContactId: client.approvalContactId ?? id })
            }}
          >
            Aggiungi contatto
          </Button>
        </div>
      </Section>

      <Card className="flex flex-wrap items-center gap-3 p-5">
        <div className="min-w-0 flex-1 basis-60">
          <p className="font-bold">Archivio</p>
          <p className="text-sm text-stone-500">Archivia i clienti che non segui più: spariscono dalle liste ma restano nel backup.</p>
        </div>
        <Button
          variant="secondary"
          icon={client.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
          onClick={() => {
            set({ archived: !client.archived })
            toast(client.archived ? 'Cliente riattivato' : 'Cliente archiviato')
          }}
        >
          {client.archived ? 'Riattiva' : 'Archivia'}
        </Button>
        {confirmDelete ? (
          <Button
            variant="danger"
            icon={<Trash2 size={15} />}
            onClick={() => {
              deleteClient(client.id)
              toast('Cliente eliminato con tutti i suoi contenuti', 'info')
              nav('/clienti')
            }}
          >
            Conferma: elimina tutto
          </Button>
        ) : (
          <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => setConfirmDelete(true)}>
            Elimina
          </Button>
        )}
      </Card>
    </div>
  )
}
