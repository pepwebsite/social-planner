import { useState } from 'react'
import { Check, Repeat, Trash2 } from 'lucide-react'
import type { Recurrence, Task, WaitingOn } from '../types'
import { useStore } from '../store'
import { useUi } from '../ui'
import { RECURRENCE_LABEL, WAITING_META } from '../lib/meta'
import { relativeDay, todayISO } from '../lib/dates'
import { isOverdue } from '../lib/insights'
import { cheer } from '../lib/mood'
import { Button, ClientAvatar, Field, Input, Modal, Select, Textarea, cx } from './ui'

export function TaskRow({ task, showClient = true }: { task: Task; showClient?: boolean }) {
  const client = useStore((s) => s.clients.find((c) => c.id === task.clientId))
  const toggleTask = useStore((s) => s.toggleTask)
  const openTask = useUi((s) => s.openTask)
  const toast = useUi((s) => s.toast)
  const overdue = isOverdue(task)

  return (
    <div className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-stone-50">
      <button
        type="button"
        aria-label={task.done ? 'Segna come da fare' : 'Segna come fatto'}
        onClick={() => {
          toggleTask(task.id)
          if (!task.done) {
            toast(task.recurrence !== 'none' ? `${cheer()} Ho già preparato la prossima` : cheer(), 'ok', {
              label: 'Annulla',
              run: () => useStore.getState().toggleTask(task.id),
            })
          }
        }}
        className={cx(
          'flex size-5 shrink-0 items-center justify-center rounded-md transition',
          task.done ? 'bg-emerald-500 text-white' : 'bg-white hover:bg-brand-50',
        )}
        style={{ boxShadow: task.done ? undefined : 'inset 0 0 0 1.5px rgb(214 211 209)' }}
      >
        {task.done && <Check size={13} strokeWidth={3} />}
      </button>
      <button type="button" onClick={() => openTask({ taskId: task.id })} className="min-w-0 flex-1 text-left">
        <p className={cx('truncate text-sm font-medium', task.done && 'text-stone-400 line-through')}>{task.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
          <span className={cx(overdue && 'font-semibold text-rose-600')}>{overdue ? `Scaduta ${relativeDay(task.due)}` : relativeDay(task.due)}</span>
          {task.waitingOn !== 'me' && <span className={cx('rounded-full px-1.5 py-px font-medium', WAITING_META[task.waitingOn].cls)}>{WAITING_META[task.waitingOn].label}</span>}
          {task.recurrence !== 'none' && (
            <span className="inline-flex items-center gap-1">
              <Repeat size={11} /> {RECURRENCE_LABEL[task.recurrence].toLowerCase()}
            </span>
          )}
        </div>
      </button>
      {showClient && client && (
        <span className="hidden items-center gap-1.5 text-xs font-medium text-stone-500 sm:flex">
          <ClientAvatar client={client} size="sm" />
          <span className="max-w-28 truncate">{client.name}</span>
        </span>
      )}
    </div>
  )
}

export function TaskEditor() {
  const ed = useUi((s) => s.taskEditor)
  if (!ed) return null
  return <TaskEditorInner key={ed.taskId ?? 'new'} />
}

function TaskEditorInner() {
  const ed = useUi((s) => s.taskEditor)!
  const close = useUi((s) => s.closeTask)
  const toast = useUi((s) => s.toast)
  const allClients = useStore((s) => s.clients)
  const clients = allClients.filter((c) => !c.archived)
  const existing = useStore((s) => s.tasks.find((t) => t.id === ed.taskId))
  const { addTask, updateTask, deleteTask } = useStore.getState()

  const [form, setForm] = useState({
    title: existing?.title ?? '',
    clientId: existing?.clientId ?? ed.clientId ?? null,
    due: existing?.due ?? todayISO(),
    recurrence: existing?.recurrence ?? ('none' as Recurrence),
    waitingOn: existing?.waitingOn ?? ('me' as WaitingOn),
    notes: existing?.notes ?? '',
  })
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = () => {
    if (!form.title.trim()) return
    if (existing) updateTask(existing.id, form)
    else addTask(form)
    toast(existing ? 'Attività aggiornata' : 'Attività aggiunta')
    close()
  }

  return (
    <Modal
      title={existing ? 'Attività' : 'Nuova attività'}
      onClose={close}
      footer={
        <>
          {existing && (
            <Button
              variant="danger"
              className="mr-auto"
              icon={<Trash2 size={15} />}
              onClick={() => {
                deleteTask(existing.id)
                toast('Attività eliminata', 'info')
                close()
              }}
            >
              Elimina
            </Button>
          )}
          <Button variant="ghost" onClick={close}>
            Annulla
          </Button>
          <Button variant="primary" onClick={submit} disabled={!form.title.trim()}>
            Salva
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Cosa devi fare">
          <Input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Es. Chiedere il nuovo volantino a Sigma"
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cliente">
            <Select value={form.clientId ?? ''} onChange={(e) => set('clientId', e.target.value || null)}>
              <option value="">Generale</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Scadenza">
            <Input type="date" value={form.due} onChange={(e) => set('due', e.target.value)} />
          </Field>
          <Field label="Si ripete">
            <Select value={form.recurrence} onChange={(e) => set('recurrence', e.target.value as Recurrence)}>
              {Object.entries(RECURRENCE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Chi deve muoversi">
            <Select value={form.waitingOn} onChange={(e) => set('waitingOn', e.target.value as WaitingOn)}>
              {Object.entries(WAITING_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Note">
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} className="min-h-16" />
        </Field>
        {form.recurrence !== 'none' && (
          <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-700">
            <Repeat size={15} /> Quando la segni come fatta, creo in automatico la prossima.
          </p>
        )}
      </div>
    </Modal>
  )
}
