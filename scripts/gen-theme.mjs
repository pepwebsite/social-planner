// Genera src/theme.css: modalità notturna e tavolozze per daltonismo.
// Uso: node scripts/gen-theme.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const tw = readFileSync(new URL('../node_modules/tailwindcss/theme.css', import.meta.url), 'utf8')
const defaults = Object.fromEntries([...tw.matchAll(/--color-([a-z]+-\d+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))

const HUES = ['rose', 'red', 'amber', 'orange', 'emerald', 'green', 'teal', 'sky', 'indigo', 'violet', 'purple', 'fuchsia', 'pink']
const SHADES = [50, 100, 200, 300, 400, 600, 700, 800, 900]

// Scala chiara ricavata dal colore base (usata quando il base cambia, es. daltonismo)
const LIGHT_MIX = { 50: ['white', 8], 100: ['white', 16], 200: ['white', 30], 300: ['white', 52], 400: ['white', 78], 600: ['black', 86], 700: ['black', 72], 800: ['black', 60], 900: ['black', 50] }
// Scala scura: sfondi tenui scuri e testi chiari
// 400-600 restano quelle vivaci (servono come sfondi pieni e sfumature)
const DARK_MIX = { 50: ['var(--color-surface)', 14], 100: ['var(--color-surface)', 22], 200: ['var(--color-surface)', 36], 300: ['var(--color-surface)', 55], 700: ['white', 62], 800: ['white', 48], 900: ['white', 38] }
const DARK_SHADES = [50, 100, 200, 300, 700, 800, 900]

const mix = (hue, [other, pct]) => `color-mix(in oklab, var(--b-${hue}) ${pct}%, ${other})`

// Colori base (500) per ogni tipo di visione, scelti per restare distinguibili
const CVD = {
  // Rosso-verde: tavolozza Okabe-Ito (blu / arancio / vermiglio / viola)
  protan: { rose: '#E66100', red: '#E66100', amber: '#F5B400', orange: '#F5B400', emerald: '#0072B2', green: '#0072B2', teal: '#56B4E9', sky: '#56B4E9', indigo: '#332288', violet: '#AA4499', purple: '#AA4499', fuchsia: '#CC79A7', pink: '#CC79A7' },
  deutan: { rose: '#D55E00', red: '#D55E00', amber: '#E69F00', orange: '#E69F00', emerald: '#0072B2', green: '#0072B2', teal: '#56B4E9', sky: '#56B4E9', indigo: '#332288', violet: '#AA4499', purple: '#AA4499', fuchsia: '#CC79A7', pink: '#CC79A7' },
  // Blu-giallo: rosso / ciano-verde / magenta / grigi
  tritan: { rose: '#D32F2F', red: '#D32F2F', amber: '#EF6C00', orange: '#EF6C00', emerald: '#00897B', green: '#00897B', teal: '#00897B', sky: '#607D8B', indigo: '#37474F', violet: '#AD1457', purple: '#AD1457', fuchsia: '#AD1457', pink: '#F06292' },
}

const block = (selector, decls) => `${selector} {\n${decls.map((d) => `  ${d}`).join('\n')}\n}\n`
let css = '/* File generato da scripts/gen-theme.mjs: non modificare a mano */\n\n'

// 0. Colori base sempre definiti (Tailwind emette solo le variabili che usa)
css += block(`html,\n[data-cvd-scope='none']`, HUES.flatMap((h) => [`--b-${h}: ${defaults[`${h}-500`]};`, `--color-${h}-500: var(--b-${h});`]))

// 1. Basi per daltonismo (anche per le anteprime con data-cvd-scope)
for (const [mode, bases] of Object.entries(CVD)) {
  css += block(`html[data-cvd='${mode}'],\n[data-cvd-scope='${mode}']`, Object.entries(bases).flatMap(([h, v]) => [`--b-${h}: ${v};`, `--color-${h}-500: var(--b-${h});`]))
}
css += block(`html[data-cvd='achroma'],\n[data-cvd-scope='achroma']`, ['filter: grayscale(1);'])

// 2. Con un daltonismo attivo: scala chiara ricalcolata dal nuovo base
css += block(
  `html[data-cvd='protan'],\nhtml[data-cvd='deutan'],\nhtml[data-cvd='tritan']`,
  HUES.flatMap((h) => SHADES.map((s) => `--color-${h}-${s}: ${mix(h, LIGHT_MIX[s])};`)),
)

// 3. Modalità notturna (solo a schermo: la stampa resta chiara)
const darkStone = {
  50: '#262422',
  100: '#2e2b28',
  200: '#3b3733',
  300: '#4d4843',
  400: '#7d766f',
  500: '#a19990',
  600: '#bdb5ad',
  700: '#d4cdc6',
  800: '#e7e1db',
  900: '#f3efea',
}
const darkDecls = [
  'color-scheme: dark;',
  '--color-canvas: #121110;',
  '--color-surface: #1e1c1a;',
  '--color-chip: #45403b;',
  '--color-ink: #f3efea;',
  ...Object.entries(darkStone).map(([k, v]) => `--color-stone-${k}: ${v};`),
  ...HUES.flatMap((h) => DARK_SHADES.map((s) => `--color-${h}-${s}: ${mix(h, DARK_MIX[s])};`)),
  '--color-brand-50: color-mix(in oklab, #6366f1 16%, var(--color-surface));',
  '--color-brand-100: color-mix(in oklab, #6366f1 26%, var(--color-surface));',
  '--color-brand-200: color-mix(in oklab, #6366f1 40%, var(--color-surface));',
  '--color-brand-300: color-mix(in oklab, #6366f1 60%, var(--color-surface));',
  '--color-brand-700: #a5b4fc;',
  '--shadow-soft: 0 1px 2px rgb(0 0 0 / 0.3), 0 4px 16px -4px rgb(0 0 0 / 0.5);',
  '--shadow-lift: 0 2px 4px rgb(0 0 0 / 0.3), 0 16px 40px -12px rgb(0 0 0 / 0.7);',
]
css += `@media screen {\n${block('html[data-theme=\'dark\']', darkDecls).replace(/^/gm, '  ').trimEnd()}\n}\n`

// 4. Zone che restano sempre chiare (anteprime del tutorial, stampa)
const lightReset = [
  'color-scheme: light;',
  '--color-canvas: #f7f6f3;',
  '--color-surface: #ffffff;',
  '--color-chip: #1c1917;',
  '--color-ink: #1c1917;',
  ...[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((k) => `--color-stone-${k}: ${defaults[`stone-${k}`]};`),
  ...HUES.flatMap((h) => [`--b-${h}: ${defaults[`${h}-500`]};`, ...SHADES.map((s) => `--color-${h}-${s}: ${defaults[`${h}-${s}`]};`)]),
  '--color-brand-50: #eef2ff;',
  '--color-brand-100: #e0e7ff;',
  '--color-brand-600: #4f46e5;',
  '--color-brand-700: #4338ca;',
]
css += block('.force-light', lightReset)

writeFileSync(new URL('../src/theme.css', import.meta.url), css)
console.log(`src/theme.css: ${css.length} caratteri`)
