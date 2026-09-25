import { GCAL_PATH } from './brandPaths'

export function GoogleCalendarIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path d={GCAL_PATH} fill="#4285F4" />
    </svg>
  )
}
