import { useState } from 'react'
import { Check, ClipboardCopy, Mail, MessageCircle } from 'lucide-react'
import type { Client, Post } from '../types'
import { useStore } from '../store'
import { useUi } from '../ui'
import { approvalMessage, mailtoLink, whatsappLink } from '../lib/approval'
import { capitalize, fmt } from '../lib/dates'
import { FORMAT_LABEL } from '../lib/meta'
import { Button, Modal, PlatformBadge, StatusPill, Textarea, cx } from './ui'

export function ApprovalModal({ client, posts, period, onClose }: { client: Client; posts: Post[]; period: string; onClose: () => void }) {
  const setPostStatus = useStore((s) => s.setPostStatus)
  const toast = useUi((s) => s.toast)
  const candidates = [...posts].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const [picked, setPicked] = useState<string[]>(candidates.filter((p) => p.status === 'bozza' || p.status === 'idea').map((p) => p.id))
  const chosen = candidates.filter((p) => picked.includes(p.id))
  const generated = approvalMessage(client, chosen, period)
  const [edited, setEdited] = useState<string | null>(null)
  const text = edited ?? generated
  const contact = client.contacts.find((c) => c.id === client.approvalContactId) ?? client.contacts[0]
  const missingCopy = chosen.filter((p) => !p.copy.trim()).length

  const markSent = () => {
    setPostStatus(picked, 'in_approvazione')
    toast(`${picked.length} contenuti in approvazione. Ti avviso se non rispondono entro 2 giorni.`)
    onClose()
  }

  return (
    <Modal
      title="Invia in approvazione"
      subtitle={`${client.name} · ${period}`}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <Button
            variant="secondary"
            icon={<ClipboardCopy size={15} />}
            disabled={!picked.length}
            onClick={() => navigator.clipboard.writeText(text).then(() => toast('Messaggio copiato'))}
            className="mr-auto"
          >
            Copia testo
          </Button>
          {contact?.email && (
            <a href={mailtoLink(contact.email, `Piano social ${client.name} – ${period}`, text)} onClick={markSent} className={cx('inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3.5 text-sm font-semibold ring-1 ring-stone-200 hover:bg-stone-50', !picked.length && 'pointer-events-none opacity-50')}>
              <Mail size={15} /> Email
            </a>
          )}
          {contact?.phone ? (
            <a
              href={whatsappLink(contact.phone, text)}
              target="_blank"
              rel="noreferrer"
              onClick={markSent}
              className={cx('inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#25d366] px-3.5 text-sm font-semibold text-white shadow-sm hover:brightness-95', !picked.length && 'pointer-events-none opacity-50')}
            >
              <MessageCircle size={16} /> WhatsApp a {contact.name.split(/[\s(]/)[0]}
            </a>
          ) : (
            <Button variant="primary" icon={<Check size={16} />} disabled={!picked.length} onClick={markSent}>
              Segna come inviati
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[13px] font-semibold text-stone-700">Contenuti da includere</p>
          <div className="space-y-1.5">
            {candidates.map((p) => {
              const on = picked.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPicked((x) => (on ? x.filter((i) => i !== p.id) : [...x, p.id]))
                    setEdited(null)
                  }}
                  className={cx('flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2 text-left ring-1 transition', on ? 'ring-brand-300' : 'opacity-60 ring-stone-200')}
                >
                  <span className={cx('flex size-4 shrink-0 items-center justify-center rounded', on ? 'bg-brand-600 text-white' : 'ring-1 ring-stone-300')}>{on && <Check size={11} strokeWidth={3} />}</span>
                  <PlatformBadge platform={p.platform} />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <b>{capitalize(fmt(p.date, 'EEE d'))} {p.time}</b> · {p.title || FORMAT_LABEL[p.format]}
                  </span>
                  <StatusPill status={p.status} className="hidden sm:inline-flex" />
                </button>
              )
            })}
            {candidates.length === 0 && <p className="text-sm text-stone-500">Nessun contenuto in questa settimana.</p>}
          </div>
          {missingCopy > 0 && <p className="mt-2 text-xs font-medium text-amber-700">⚠ {missingCopy} {missingCopy === 1 ? 'contenuto non ha' : 'contenuti non hanno'} ancora il copy.</p>}
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-stone-700">Messaggio</span>
            {edited !== null && (
              <button type="button" className="text-xs font-semibold text-brand-600" onClick={() => setEdited(null)}>
                Ripristina
              </button>
            )}
          </div>
          <Textarea value={text} onChange={(e) => setEdited(e.target.value)} className="min-h-64 text-[13px]" />
          {!contact && <p className="mt-2 text-xs text-stone-500">Aggiungi un contatto per le approvazioni nella scheda cliente per inviare direttamente su WhatsApp.</p>}
        </div>
      </div>
    </Modal>
  )
}
