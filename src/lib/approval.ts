import type { Client, Post } from '../types'
import { FORMAT_LABEL, PLATFORM_META } from './meta'
import { capitalize, fmt } from './dates'

/** Messaggio pronto da incollare su WhatsApp/email per chiedere l'approvazione del piano */
export function approvalMessage(client: Client, posts: Post[], period: string) {
  const contact = client.contacts.find((c) => c.id === client.approvalContactId)
  const firstName = contact?.name.split(/[\s(]/)[0]
  const sorted = [...posts].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const blocks = sorted.map((p, i) => {
    const head = `*${i + 1}. ${capitalize(fmt(p.date, 'EEEE d MMMM'))} · ${p.time} · ${PLATFORM_META[p.platform].label} ${FORMAT_LABEL[p.format]}*`
    const lines = [head]
    if (p.title) lines.push(p.title)
    if (p.copy) lines.push(`Testo: ${p.copy}`)
    if (p.visual) lines.push(`Immagine/video: ${p.visual}`)
    if (p.assetLink) lines.push(`Anteprima: ${p.assetLink}`)
    return lines.join('\n')
  })
  return [
    `Ciao${firstName ? ` ${firstName}` : ''}! Ecco il piano social di ${client.name} per ${period} 📅`,
    '',
    blocks.join('\n\n'),
    '',
    `Mi confermi se va bene? Se vuoi modifiche indicami pure il numero del contenuto. Grazie!`,
  ].join('\n')
}

export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/[^\d]/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function mailtoLink(email: string, subject: string, text: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
}
