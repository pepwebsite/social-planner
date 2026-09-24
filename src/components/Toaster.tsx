import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { useUi } from '../ui'
import { cx } from './ui'

export function Toaster() {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismissToast)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex max-w-md animate-pop items-center gap-3 rounded-2xl bg-stone-900 py-2.5 pr-2 pl-3.5 text-sm text-white shadow-lift"
        >
          {t.tone === 'ok' && <CheckCircle2 size={17} className="shrink-0 text-emerald-400" />}
          {t.tone === 'error' && <TriangleAlert size={17} className="shrink-0 text-rose-400" />}
          {t.tone === 'info' && <Info size={17} className="shrink-0 text-sky-300" />}
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="rounded-lg px-2 py-1 font-semibold text-brand-100 hover:bg-white/10"
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" aria-label="Chiudi" onClick={() => dismiss(t.id)} className={cx('rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white')}>
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}
