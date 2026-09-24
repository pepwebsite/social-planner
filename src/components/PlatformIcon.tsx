import { useId } from 'react'
import type { Platform } from '../types'
import { FB_PATH, IG_PATH, TT_PATH, YT_PATH } from './brandPaths'

/** Logo reale del social, nello stile dell'icona dell'app */
export function PlatformIcon({ platform, size = 20, className }: { platform: Platform; size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  const common = { width: size, height: size, viewBox: '0 0 24 24', className, 'aria-hidden': true as const }

  switch (platform) {
    case 'instagram':
      return (
        <svg {...common}>
          <defs>
            <radialGradient id={`ig-${id}`} cx="30%" cy="107%" r="150%">
              <stop offset="0" stopColor="#fdf497" />
              <stop offset="0.05" stopColor="#fdf497" />
              <stop offset="0.45" stopColor="#fd5949" />
              <stop offset="0.6" stopColor="#d6249f" />
              <stop offset="0.9" stopColor="#285AEB" />
            </radialGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill={`url(#ig-${id})`} />
          <g transform="translate(4.2 4.2) scale(0.65)">
            <path d={IG_PATH} fill="#fff" />
          </g>
        </svg>
      )
    case 'facebook':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11.5" fill="#fff" />
          <path d={FB_PATH} fill="#0866FF" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg {...common}>
          <rect width="24" height="24" rx="6" fill="#000" />
          <g transform="translate(5 4.6) scale(0.6)">
            <path d={TT_PATH} fill="#25F4EE" transform="translate(-0.9 -0.7)" />
            <path d={TT_PATH} fill="#FE2C55" transform="translate(0.9 0.7)" />
            <path d={TT_PATH} fill="#fff" />
          </g>
        </svg>
      )
    case 'linkedin':
      return (
        <svg {...common}>
          <rect width="24" height="24" rx="5" fill="#0A66C2" />
          <circle cx="7.1" cy="7" r="1.95" fill="#fff" />
          <rect x="5.4" y="9.6" width="3.4" height="9.4" rx="0.4" fill="#fff" />
          <path d="M10.7 9.6h3.2v1.4c.55-.95 1.75-1.7 3.3-1.7 2.8 0 3.45 1.85 3.45 4.3V19h-3.35v-4.7c0-1.15-.05-2.5-1.55-2.5-1.55 0-1.75 1.2-1.75 2.45V19h-3.3z" fill="#fff" />
        </svg>
      )
    case 'youtube':
      return (
        <svg {...common}>
          <rect x="2" y="6.5" width="20" height="11" rx="2" fill="#fff" />
          <path d={YT_PATH} fill="#FF0000" />
        </svg>
      )
  }
}
