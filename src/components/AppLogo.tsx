import { useId } from 'react'
import { cx } from './ui'

export const APP_NAME = 'Social Planner'

/** Logo dell'app: calendario con il simbolo "play" dei contenuti social */
export function AppLogo({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cx('shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={`lg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset=".55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#lg-${id})`} />
      <rect x="15" y="18" width="34" height="31" rx="7" fill="none" stroke="#fff" strokeWidth="3.6" />
      <path d="M15 27.5h34" stroke="#fff" strokeWidth="3.6" />
      <path d="M24 13v8M40 13v8" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M28.5 32.5v10.5l9-5.25z" fill="#fff" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

/** Logo + nome */
export function AppWordmark({ size = 32, light = false, className }: { size?: number; light?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <AppLogo size={size} />
      <span className={cx('leading-none font-extrabold tracking-tight', light ? 'text-white' : 'text-ink')} style={{ fontSize: size * 0.56 }}>
        Social <span className={light ? 'text-white/80' : 'text-brand-600'}>Planner</span>
      </span>
    </span>
  )
}
