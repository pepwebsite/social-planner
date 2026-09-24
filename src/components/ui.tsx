import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import type { Client, Platform, PostStatus } from '../types'
import { PLATFORM_META, STATUS_META } from '../lib/meta'
import { PlatformIcon } from './PlatformIcon'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20',
  secondary: 'bg-white text-stone-800 ring-1 ring-stone-200 hover:bg-stone-50 hover:ring-stone-300',
  ghost: 'text-stone-600 hover:bg-stone-900/5 hover:text-stone-900',
  danger: 'bg-white text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50',
  ai: 'bg-gradient-to-r from-violet-600 to-brand-600 text-white hover:brightness-110 shadow-sm shadow-violet-600/25',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; icon?: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-10 px-3.5 text-sm',
        VARIANTS[variant],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-stone-500 transition hover:bg-stone-900/5 hover:text-stone-900 disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  )
}

const fieldCls =
  'w-full rounded-xl border-0 bg-white px-3 py-2 text-sm text-stone-900 ring-1 ring-stone-200 transition placeholder:text-stone-400 hover:ring-stone-300 focus:ring-2 focus:ring-brand-500 focus:outline-none'

export const Input = ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...rest} className={cx(fieldCls, 'h-10', className)} />
)

export const Textarea = ({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...rest} className={cx(fieldCls, 'min-h-20 resize-y leading-relaxed', className)} />
)

export const Select = ({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...rest} className={cx(fieldCls, 'h-10 cursor-pointer pr-8', className)}>
    {children}
  </select>
)

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-semibold text-stone-700">
        {label}
        {hint && <span className="text-xs font-normal text-stone-400">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function StatusPill({ status, className }: { status: PostStatus; className?: string }) {
  const m = STATUS_META[status]
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', m.pill, className)}>
      <span className={cx('size-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  )
}

export function PlatformBadge({ platform, className, size = 20 }: { platform: Platform; className?: string; size?: number }) {
  return (
    <span className={cx('inline-flex shrink-0 items-center justify-center', className)} title={PLATFORM_META[platform].label}>
      <PlatformIcon platform={platform} size={size} />
    </span>
  )
}

export function ClientAvatar({ client, size = 'md' }: { client: Pick<Client, 'name' | 'color'>; size?: 'sm' | 'md' | 'lg' }) {
  const initials = client.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-xl font-bold text-white',
        size === 'sm' && 'size-6 rounded-lg text-[10px]',
        size === 'md' && 'size-9 text-xs',
        size === 'lg' && 'size-12 rounded-2xl text-base',
      )}
      style={{ background: `linear-gradient(135deg, ${client.color}, color-mix(in srgb, ${client.color} 70%, black))` }}
    >
      {initials || '?'}
    </span>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-2xl bg-white shadow-soft ring-1 ring-stone-900/5', className)}>{children}</div>
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">{icon}</div>
      <p className="font-semibold text-stone-800">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-stone-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 'max-w-lg',
}: {
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  useEscape(onClose)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-in bg-stone-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'relative flex max-h-[92dvh] w-full animate-pop flex-col rounded-t-3xl bg-canvas shadow-lift sm:rounded-3xl',
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>}
          </div>
          <IconButton label="Chiudi" onClick={onClose} className="-mt-1 -mr-2">
            <X size={18} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
        {footer && (
          <div className="pb-safe flex flex-wrap items-center justify-end gap-2 border-t border-stone-200/70 px-5 py-3.5 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function Drawer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEscape(onClose)
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 animate-in bg-stone-900/30" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl animate-slide flex-col bg-canvas shadow-lift">{children}</aside>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cx('inline-flex rounded-xl bg-stone-900/5 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-lg px-3 py-1.5 text-[13px] font-semibold transition',
            value === o.value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded-md bg-white px-1.5 py-0.5 font-sans text-[11px] font-semibold text-stone-500 ring-1 ring-stone-200">{children}</kbd>
)
