import { useState } from 'react'
import { create } from 'zustand'
import { Check, Loader2 } from 'lucide-react'
import { useAuth } from '../auth'
import { usePrefs } from '../prefs'
import { useUi } from '../ui'
import { supabase } from '../lib/supabase'
import { ANIMALS, AnimalTile, animalById, defaultAnimal, type AnimalId } from './AnimalAvatars'
import { Modal, cx } from './ui'

/** Personaggio dell'utente: dall'account (sincronizzato), altrimenti dal dispositivo, altrimenti uno assegnato */
export function useUserAnimal(): AnimalId {
  const user = useAuth((s) => s.user)
  const local = usePrefs((s) => s.avatar)
  const fromAccount = user?.user_metadata?.avatar as string | undefined
  return (animalById(fromAccount) ?? animalById(local) ?? defaultAnimal(user?.id ?? 'dispositivo')).id
}

async function saveAnimal(id: AnimalId) {
  usePrefs.getState().setAvatar(id)
  const { user } = useAuth.getState()
  if (supabase && user) {
    const { data, error } = await supabase.auth.updateUser({ data: { avatar: id } })
    if (error) throw error
    if (data.user) useAuth.setState({ user: data.user })
  }
}

const usePicker = create<{ open: boolean }>()(() => ({ open: false }))
export const openAvatarPicker = () => usePicker.setState({ open: true })

/** Avatar dell'utente; se `editable`, toccandolo si sceglie il personaggio */
export function UserAvatar({ size = 36, editable = false, className }: { size?: number; editable?: boolean; className?: string }) {
  const id = useUserAnimal()
  const tile = <AnimalTile id={id} size={size} className={className} />
  if (!editable) return tile
  return (
    <button type="button" onClick={openAvatarPicker} aria-label="Cambia personaggio" title="Cambia personaggio" className="rounded-[28%] transition hover:scale-105 active:scale-95">
      {tile}
    </button>
  )
}

/** Scelta del personaggio, in stile profili Netflix */
export function AvatarPicker() {
  const open = usePicker((s) => s.open)
  if (!open) return null
  return <PickerInner />
}

function PickerInner() {
  const current = useUserAnimal()
  const [saving, setSaving] = useState<AnimalId | null>(null)
  const toast = useUi((s) => s.toast)
  const close = () => usePicker.setState({ open: false })

  const pick = async (id: AnimalId) => {
    setSaving(id)
    try {
      await saveAnimal(id)
      toast(`Ciao, ${animalById(id)?.name.toLowerCase()}! 🐾`)
      close()
    } catch {
      toast('Non sono riuscito a salvare: riprova', 'error')
    } finally {
      setSaving(null)
    }
  }

  return (
    <Modal title="Scegli il tuo personaggio" subtitle="Comparirà al posto dell’iniziale, su tutti i tuoi dispositivi." onClose={close} width="max-w-xl">
      <div className="grid grid-cols-3 gap-3 pb-1 sm:grid-cols-4">
        {ANIMALS.map((a, i) => {
          const on = a.id === current
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => pick(a.id)}
              disabled={saving !== null}
              style={{ animationDelay: `${i * 35}ms` }}
              className="group flex animate-pop flex-col items-center gap-1.5 rounded-2xl p-1.5 transition disabled:opacity-70"
            >
              <span className={cx('relative rounded-[28%] ring-offset-2 ring-offset-canvas transition duration-200 group-hover:scale-105 group-active:scale-95', on ? 'ring-4 ring-brand-500' : 'group-hover:ring-4 group-hover:ring-stone-300')}>
                <AnimalTile id={a.id} size={84} />
                {on && (
                  <span className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-canvas">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
                {saving === a.id && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-[28%] bg-black/25">
                    <Loader2 size={22} className="animate-spin text-white" />
                  </span>
                )}
              </span>
              <span className={cx('text-[13px] font-semibold', on ? 'text-brand-700' : 'text-stone-600 group-hover:text-stone-900')}>{a.name}</span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
