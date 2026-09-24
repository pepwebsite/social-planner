import { cx } from './ui'

export const APP_NAME = 'Social Planner'

/** Logo dell'app (stesso file dell'icona: public/favicon.svg) */
export function AppLogo({ size = 32, className }: { size?: number; className?: string }) {
  return <img src="/favicon.svg" width={size} height={size} alt="" draggable={false} className={cx('shrink-0 select-none', className)} />
}

/** Logo + nome */
export function AppWordmark({ size = 32, light = false, className }: { size?: number; light?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <AppLogo size={size} />
      <span className={cx('leading-none font-extrabold tracking-tight', light ? 'text-white' : 'text-ink')} style={{ fontSize: size * 0.56 }}>
        Social{' '}
        <span className={light ? 'text-white/85' : 'bg-gradient-to-r from-[#8b5cf6] via-[#d946ef] to-[#fb7185] bg-clip-text text-transparent'}>Planner</span>
      </span>
    </span>
  )
}
