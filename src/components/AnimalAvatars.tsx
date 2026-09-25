import type { ReactNode } from 'react'

/** Personaggi per il profilo utente: animaletti disegnati a mano, adatti a tutti */

export type AnimalId =
  | 'cane'
  | 'gatto'
  | 'criceto'
  | 'coniglio'
  | 'panda'
  | 'volpe'
  | 'orsetto'
  | 'pinguino'
  | 'koala'
  | 'rana'
  | 'pulcino'
  | 'unicorno'

const INK = '#2b1b17'

/* ------------------------------------------------------------ Dettagli ---- */

function Eyes({ y = 54, dx = 11, r = 4.2, color = INK }: { y?: number; dx?: number; r?: number; color?: string }) {
  return (
    <g>
      <circle cx={50 - dx} cy={y} r={r} fill={color} />
      <circle cx={50 + dx} cy={y} r={r} fill={color} />
      <circle cx={50 - dx + r * 0.35} cy={y - r * 0.4} r={r * 0.38} fill="#fff" />
      <circle cx={50 + dx + r * 0.35} cy={y - r * 0.4} r={r * 0.38} fill="#fff" />
    </g>
  )
}

const Blush = ({ y = 64, dx = 18, color = '#fb9fb8' }: { y?: number; dx?: number; color?: string }) => (
  <g opacity=".75">
    <ellipse cx={50 - dx} cy={y} rx="5.2" ry="3.2" fill={color} />
    <ellipse cx={50 + dx} cy={y} rx="5.2" ry="3.2" fill={color} />
  </g>
)

const Smile = ({ y = 66, w = 5 }: { y?: number; w?: number }) => (
  <path d={`M${50 - w} ${y} q${w / 2} ${w * 0.8} ${w} 0 q${w / 2} ${w * 0.8} ${w} 0`} stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
)

/* ------------------------------------------------------------- Animali ---- */

interface Animal {
  id: AnimalId
  name: string
  bg: string
  art: ReactNode
}

export const ANIMALS: Animal[] = [
  {
    id: 'cane',
    name: 'Cane',
    bg: '#fde68a',
    art: (
      <>
        <ellipse cx="24" cy="50" rx="11" ry="20" fill="#8b5a2b" transform="rotate(18 24 50)" />
        <ellipse cx="76" cy="50" rx="11" ry="20" fill="#8b5a2b" transform="rotate(-18 76 50)" />
        <circle cx="50" cy="56" r="29" fill="#d9a066" />
        <ellipse cx="62" cy="44" rx="9" ry="8" fill="#b97d44" />
        <ellipse cx="50" cy="67" rx="15" ry="11" fill="#f5deb8" />
        <Eyes y={52} dx={11} />
        <ellipse cx="50" cy="62" rx="5.5" ry="4" fill={INK} />
        <path d="M50 66v3" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M46 72q4 5 8 0" fill="#f87171" />
        <Blush y={64} dx={20} />
      </>
    ),
  },
  {
    id: 'gatto',
    name: 'Gatto',
    bg: '#bfdbfe',
    art: (
      <>
        <path d="M26 44L27 16 46 32z" fill="#f59e0b" />
        <path d="M74 44L73 16 54 32z" fill="#f59e0b" />
        <path d="M30 37L30.5 23 40 31z" fill="#fda4af" />
        <path d="M70 37L69.5 23 60 31z" fill="#fda4af" />
        <circle cx="50" cy="56" r="29" fill="#fbbf24" />
        <path d="M44 30q6 5 12 0" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round" />
        <Eyes y={53} dx={12} />
        <path d="M47 61h6l-3 3.5z" fill="#fb7185" />
        <path d="M44 67q3 3 6 0q3 3 6 0" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <g stroke={INK} strokeWidth="1.6" strokeLinecap="round" opacity=".55">
          <path d="M30 60h-10M31 65l-9 3M70 60h10M69 65l9 3" />
        </g>
        <Blush y={65} dx={19} />
      </>
    ),
  },
  {
    id: 'criceto',
    name: 'Criceto',
    bg: '#fbcfe8',
    art: (
      <>
        <circle cx="29" cy="31" r="9" fill="#e8964f" />
        <circle cx="71" cy="31" r="9" fill="#e8964f" />
        <circle cx="29" cy="31" r="5" fill="#fda4af" />
        <circle cx="71" cy="31" r="5" fill="#fda4af" />
        <ellipse cx="50" cy="58" rx="31" ry="28" fill="#f2a65a" />
        <ellipse cx="50" cy="68" rx="24" ry="17" fill="#fff4e6" />
        <path d="M50 32q-3 8 0 14q3-6 0-14z" fill="#fff4e6" />
        <Eyes y={52} dx={12} r={4} />
        <ellipse cx="50" cy="61" rx="3" ry="2.2" fill="#fb7185" />
        <path d="M46 65q2 2.5 4 0q2 2.5 4 0" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
        <Blush y={63} dx={21} />
      </>
    ),
  },
  {
    id: 'coniglio',
    name: 'Coniglio',
    bg: '#ddd6fe',
    art: (
      <>
        <ellipse cx="38" cy="26" rx="8" ry="21" fill="#fff" transform="rotate(-8 38 26)" />
        <ellipse cx="62" cy="26" rx="8" ry="21" fill="#fff" transform="rotate(8 62 26)" />
        <ellipse cx="38" cy="27" rx="4" ry="15" fill="#fbcfe8" transform="rotate(-8 38 27)" />
        <ellipse cx="62" cy="27" rx="4" ry="15" fill="#fbcfe8" transform="rotate(8 62 27)" />
        <circle cx="50" cy="61" r="27" fill="#fff" />
        <Eyes y={58} dx={11} />
        <path d="M47 65h6l-3 3z" fill="#fb7185" />
        <path d="M50 68v2.5M46 71q4 3 8 0" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
        <rect x="47" y="71" width="6" height="5" rx="1" fill="#fff" stroke={INK} strokeWidth="1.2" />
        <Blush y={68} dx={18} />
      </>
    ),
  },
  {
    id: 'panda',
    name: 'Panda',
    bg: '#bbf7d0',
    art: (
      <>
        <circle cx="27" cy="33" r="10" fill={INK} />
        <circle cx="73" cy="33" r="10" fill={INK} />
        <circle cx="50" cy="57" r="29" fill="#fff" />
        <ellipse cx="38" cy="54" rx="8" ry="10" fill={INK} transform="rotate(25 38 54)" />
        <ellipse cx="62" cy="54" rx="8" ry="10" fill={INK} transform="rotate(-25 62 54)" />
        <circle cx="39" cy="53" r="3.4" fill="#fff" />
        <circle cx="61" cy="53" r="3.4" fill="#fff" />
        <circle cx="39.8" cy="53.4" r="1.9" fill={INK} />
        <circle cx="61.8" cy="53.4" r="1.9" fill={INK} />
        <ellipse cx="50" cy="64" rx="4.5" ry="3.2" fill={INK} />
        <Smile y={69} w={4} />
        <Blush y={67} dx={20} />
      </>
    ),
  },
  {
    id: 'volpe',
    name: 'Volpe',
    bg: '#fed7aa',
    art: (
      <>
        <path d="M22 46L24 14 46 32z" fill="#ea580c" />
        <path d="M78 46L76 14 54 32z" fill="#ea580c" />
        <path d="M27 36L28 21 38 30z" fill="#fff7ed" />
        <path d="M73 36L72 21 62 30z" fill="#fff7ed" />
        <path d="M50 86C28 86 20 68 21 55 22 40 34 30 50 30S78 40 79 55C80 68 72 86 50 86z" fill="#f97316" />
        <path d="M50 86C36 86 26 76 24 64 32 64 42 68 50 76 58 68 68 64 76 64 74 76 64 86 50 86z" fill="#fff7ed" />
        <Eyes y={54} dx={12} />
        <ellipse cx="50" cy="74" rx="4.5" ry="3.3" fill={INK} />
        <Blush y={64} dx={19} color="#fb7185" />
      </>
    ),
  },
  {
    id: 'orsetto',
    name: 'Orsetto',
    bg: '#fecaca',
    art: (
      <>
        <circle cx="27" cy="32" r="11" fill="#a0622d" />
        <circle cx="73" cy="32" r="11" fill="#a0622d" />
        <circle cx="27" cy="32" r="6" fill="#e2a86b" />
        <circle cx="73" cy="32" r="6" fill="#e2a86b" />
        <circle cx="50" cy="57" r="29" fill="#b8753a" />
        <ellipse cx="50" cy="66" rx="13" ry="10" fill="#f1d3ad" />
        <Eyes y={52} dx={12} />
        <ellipse cx="50" cy="62" rx="5" ry="3.6" fill={INK} />
        <Smile y={67} w={4} />
        <Blush y={63} dx={20} />
      </>
    ),
  },
  {
    id: 'pinguino',
    name: 'Pinguino',
    bg: '#bae6fd',
    art: (
      <>
        <circle cx="50" cy="55" r="31" fill="#1e293b" />
        <path d="M50 42C44 34 30 36 29 50 28 64 38 78 50 78S72 64 71 50C70 36 56 34 50 42z" fill="#fff" />
        <Eyes y={53} dx={10} />
        <path d="M44 61h12l-6 7z" fill="#fb923c" />
        <Blush y={65} dx={16} />
      </>
    ),
  },
  {
    id: 'koala',
    name: 'Koala',
    bg: '#ccfbf1',
    art: (
      <>
        <circle cx="24" cy="40" r="15" fill="#9ca3af" />
        <circle cx="76" cy="40" r="15" fill="#9ca3af" />
        <circle cx="24" cy="40" r="9" fill="#f9a8d4" />
        <circle cx="76" cy="40" r="9" fill="#f9a8d4" />
        <circle cx="50" cy="57" r="27" fill="#b4b9c2" />
        <Eyes y={51} dx={12} r={3.8} />
        <ellipse cx="50" cy="61" rx="7.5" ry="9" fill="#374151" />
        <ellipse cx="48" cy="57" rx="2" ry="3" fill="#fff" opacity=".4" />
        <Smile y={73} w={3.5} />
        <Blush y={63} dx={19} />
      </>
    ),
  },
  {
    id: 'rana',
    name: 'Rana',
    bg: '#d9f99d',
    art: (
      <>
        <circle cx="33" cy="36" r="12" fill="#4ade80" />
        <circle cx="67" cy="36" r="12" fill="#4ade80" />
        <ellipse cx="50" cy="60" rx="33" ry="25" fill="#4ade80" />
        <circle cx="33" cy="36" r="7.5" fill="#fff" />
        <circle cx="67" cy="36" r="7.5" fill="#fff" />
        <circle cx="34" cy="37" r="4.2" fill={INK} />
        <circle cx="68" cy="37" r="4.2" fill={INK} />
        <circle cx="35.4" cy="35.5" r="1.5" fill="#fff" />
        <circle cx="69.4" cy="35.5" r="1.5" fill="#fff" />
        <path d="M32 62q18 16 36 0" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <circle cx="45" cy="52" r="1.3" fill={INK} opacity=".6" />
        <circle cx="55" cy="52" r="1.3" fill={INK} opacity=".6" />
        <Blush y={62} dx={24} />
      </>
    ),
  },
  {
    id: 'pulcino',
    name: 'Pulcino',
    bg: '#fef9c3',
    art: (
      <>
        <path d="M50 26q-4-10 2-12q-1 6 4 8q-3 1-6 4z" fill="#facc15" />
        <circle cx="50" cy="57" r="30" fill="#fde047" />
        <path d="M22 62q-6 4-2 10q6-2 8-8z" fill="#facc15" />
        <path d="M78 62q6 4 2 10q-6-2-8-8z" fill="#facc15" />
        <Eyes y={52} dx={12} />
        <path d="M43 60l7-3 7 3-7 5z" fill="#fb923c" />
        <path d="M43 60l7 5 7-5" stroke="#ea580c" strokeWidth="1" fill="none" />
        <Blush y={63} dx={19} />
      </>
    ),
  },
  {
    id: 'unicorno',
    name: 'Unicorno',
    bg: '#f5d0fe',
    art: (
      <>
        <path d="M30 42L30 22 44 34z" fill="#fff" />
        <path d="M70 42L70 22 56 34z" fill="#fff" />
        <circle cx="50" cy="58" r="28" fill="#fff" />
        <path d="M24 50C20 30 36 24 46 30 40 34 34 42 34 54 30 54 26 54 24 50z" fill="#c084fc" />
        <path d="M30 60C24 50 28 40 36 36 34 44 36 52 40 58z" fill="#f9a8d4" />
        <path d="M50 8l6 24h-12z" fill="#fcd34d" />
        <path d="M46 24h8M45 28h10M47.5 18h5" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
        <Eyes y={57} dx={11} />
        <ellipse cx="50" cy="70" rx="13" ry="8" fill="#fce7f3" />
        <circle cx="46" cy="69" r="1.4" fill={INK} opacity=".6" />
        <circle cx="54" cy="69" r="1.4" fill={INK} opacity=".6" />
        <Blush y={64} dx={20} />
      </>
    ),
  },
]

export const animalById = (id: string | null | undefined) => ANIMALS.find((a) => a.id === id)

/** Animaletto assegnato di default, stabile per ogni utente */
export function defaultAnimal(seed: string) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return ANIMALS[h % ANIMALS.length]
}

/** Riquadro in stile profilo Netflix */
export function AnimalTile({ id, size = 40, className, rounded = 'rounded-[28%]' }: { id: AnimalId; size?: number; className?: string; rounded?: string }) {
  const a = animalById(id) ?? ANIMALS[0]
  return (
    <span className={`inline-flex shrink-0 overflow-hidden ${rounded} ${className ?? ''}`} style={{ width: size, height: size, background: a.bg }} title={a.name}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        <circle cx="18" cy="16" r="26" fill="#fff" opacity=".28" />
        {a.art}
      </svg>
    </span>
  )
}
