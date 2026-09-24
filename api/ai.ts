import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

/**
 * Endpoint AI di Regia.
 * - action "week": genera la bozza del piano settimanale di un cliente
 * - action "copy": scrive o riscrive il copy di un singolo contenuto
 * - action "validate": verifica una chiave e restituisce i modelli disponibili
 *
 * Il provider arriva dal browser (chiave inserita dall'utente in "Provider AI") oppure,
 * in mancanza, dalle variabili d'ambiente del server (OPENROUTER_API_KEY / ANTHROPIC_API_KEY).
 * Gli indirizzi dei provider sono fissi qui: il browser sceglie solo l'id, mai l'URL.
 * In produzione gira come Vercel Function; in sviluppo lo monta vite.config.ts.
 */

const ANTHROPIC_DEFAULT_MODEL = 'claude-opus-5'

interface ProviderDef {
  kind: 'openai' | 'anthropic'
  baseUrl: string
  modelsUrl?: string
  /** Il catalogo modelli è pubblico: per verificare la chiave serve una chiamata di prova */
  publicModels?: boolean
  /** Endpoint dedicato alla verifica della chiave */
  keyCheckUrl?: string
  /** Riconosce i modelli gratuiti (OpenRouter) */
  freeFilter?: (m: Record<string, unknown>) => boolean
  maxOutput: number
}

const PROVIDERS: Record<string, ProviderDef> = {
  openrouter: {
    kind: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyCheckUrl: 'https://openrouter.ai/api/v1/key',
    maxOutput: 16000,
    freeFilter: (m) => {
      const pr = m.pricing as { prompt?: string; completion?: string } | undefined
      return pr?.prompt === '0' && pr?.completion === '0'
    },
  },
  gemini: { kind: 'openai', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', maxOutput: 16000 },
  groq: { kind: 'openai', baseUrl: 'https://api.groq.com/openai/v1', maxOutput: 8000 },
  mistral: { kind: 'openai', baseUrl: 'https://api.mistral.ai/v1', maxOutput: 8000 },
  cerebras: { kind: 'openai', baseUrl: 'https://api.cerebras.ai/v1', maxOutput: 8000 },
  github: {
    kind: 'openai',
    baseUrl: 'https://models.github.ai/inference',
    modelsUrl: 'https://models.github.ai/catalog/models',
    publicModels: true,
    maxOutput: 4000,
  },
  sambanova: { kind: 'openai', baseUrl: 'https://api.sambanova.ai/v1', publicModels: true, maxOutput: 8000 },
  nvidia: { kind: 'openai', baseUrl: 'https://integrate.api.nvidia.com/v1', publicModels: true, maxOutput: 8000 },
  huggingface: { kind: 'openai', baseUrl: 'https://router.huggingface.co/v1', publicModels: true, maxOutput: 8000 },
  cohere: {
    kind: 'openai',
    baseUrl: 'https://api.cohere.ai/compatibility/v1',
    modelsUrl: 'https://api.cohere.com/v1/models?endpoint=chat',
    maxOutput: 8000,
  },
  anthropic: { kind: 'anthropic', baseUrl: 'https://api.anthropic.com', maxOutput: 16000 },
}

/** Modelli non adatti alla scrittura di testi */
const NON_CHAT = /embed|whisper|tts|speech|audio|guard|rerank|moderation|image|imagen|veo|transcri|ocr|aqa|bison|gecko|safety|lyria|learnlm|clip|diffusion/i

interface ProviderConfig {
  id: string
  apiKey: string
  model: string
}

const ProviderSchema = z.object({ id: z.string(), apiKey: z.string().min(1), model: z.string().default('') })

/** Provider dalla richiesta, altrimenti quello configurato sul server */
function resolveProvider(fromClient: ProviderConfig | undefined): ProviderConfig | null {
  if (fromClient) return fromClient
  if (process.env.OPENROUTER_API_KEY) {
    return { id: 'openrouter', apiKey: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL || 'anthropic/claude-opus-5' }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { id: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY, model: ANTHROPIC_DEFAULT_MODEL }
  }
  return null
}

const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'linkedin', 'youtube'] as const
const FORMATS = ['post', 'carosello', 'reel', 'story', 'live', 'video'] as const

const BriefSchema = z.object({
  name: z.string(),
  sector: z.string().default(''),
  audience: z.string().default(''),
  tone: z.string().default(''),
  doList: z.string().default(''),
  dontList: z.string().default(''),
  hashtags: z.string().default(''),
  copyExamples: z.string().default(''),
  notes: z.string().default(''),
})

const WeekRequest = z.object({
  action: z.literal('week'),
  provider: ProviderSchema.optional(),
  client: BriefSchema,
  weekLabel: z.string(),
  slots: z.array(
    z.object({ date: z.string(), weekday: z.string(), time: z.string(), platform: z.string(), format: z.string() }),
  ),
  events: z.array(
    z.object({ name: z.string(), date: z.string(), location: z.string().default(''), notes: z.string().default('') }),
  ),
  existing: z.array(z.object({ date: z.string(), title: z.string(), format: z.string() })),
  instructions: z.string().default(''),
})

const CopyRequest = z.object({
  action: z.literal('copy'),
  provider: ProviderSchema.optional(),
  client: BriefSchema,
  post: z.object({
    date: z.string(),
    platform: z.string(),
    format: z.string(),
    title: z.string().default(''),
    copy: z.string().default(''),
    visual: z.string().default(''),
  }),
  instructions: z.string().default(''),
})

const ValidateRequest = z.object({ action: z.literal('validate'), provider: ProviderSchema })

const RequestSchema = z.discriminatedUnion('action', [WeekRequest, CopyRequest, ValidateRequest])

const WeekOutput = z.object({
  posts: z.array(
    z.object({
      date: z.string(),
      time: z.string(),
      platform: z.enum(PLATFORMS),
      format: z.enum(FORMATS),
      title: z.string(),
      copy: z.string(),
      visual: z.string(),
    }),
  ),
})

const CopyOutput = z.object({ copy: z.string() })

const weekJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['posts'],
  properties: {
    posts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'time', 'platform', 'format', 'title', 'copy', 'visual'],
        properties: {
          date: { type: 'string', description: 'Data di pubblicazione, formato yyyy-MM-dd' },
          time: { type: 'string', description: 'Orario HH:mm' },
          platform: { type: 'string', enum: [...PLATFORMS] },
          format: { type: 'string', enum: [...FORMATS] },
          title: { type: 'string', description: 'Idea del contenuto in una riga (uso interno)' },
          copy: { type: 'string', description: 'Caption pronta da pubblicare, con emoji e hashtag se coerenti col brand' },
          visual: { type: 'string', description: 'Brief per grafico/fotografo: cosa mostrare, testo in grafica, riferimenti' },
        },
      },
    },
  },
}

const copyJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['copy'],
  properties: { copy: { type: 'string' } },
}

const SYSTEM = `Sei il copywriter senior di un'agenzia social italiana. Lavori per una social media manager che segue molti clienti diversi: il tuo lavoro è consegnarle bozze così vicine al tono del cliente che debba solo rifinirle.

Regole:
- Scrivi sempre in italiano, rispettando rigorosamente tono di voce, cose da fare e da evitare del cliente. Se ci sono esempi di copy, imitane ritmo, lunghezza, uso di emoji e call to action.
- Adatta il copy alla piattaforma e al formato (una story ha testo brevissimo, LinkedIn è più professionale, un reel ha un gancio nei primi 2 secondi descritto nel brief visivo).
- Non inventare prezzi, promozioni, date o fatti che non ti sono stati dati. Se un contenuto richiede un dato che non hai (es. offerte del volantino), scrivi un segnaposto tra parentesi quadre, es. [PREZZO OFFERTA].
- Evita frasi fatte da AI e l'abuso di punti esclamativi.`

type Brief = z.infer<typeof BriefSchema>

function briefText(c: Brief) {
  const rows: [string, string][] = [
    ['Cliente', c.name],
    ['Settore', c.sector],
    ['Pubblico', c.audience],
    ['Tono di voce', c.tone],
    ['Da fare', c.doList],
    ['Da evitare', c.dontList],
    ['Hashtag ricorrenti', c.hashtags],
    ['Esempi di copy approvati', c.copyExamples],
    ['Note', c.notes],
  ]
  return rows
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `## ${k}\n${v.trim()}`)
    .join('\n\n')
}

function buildWeekPrompt(r: z.infer<typeof WeekRequest>) {
  const slots = r.slots.length
    ? r.slots.map((s) => `- ${s.weekday} ${s.date} alle ${s.time}: ${s.format} su ${s.platform}`).join('\n')
    : '- Nessuno slot fisso: proponi tu 3-4 uscite distribuite nella settimana.'
  const events = r.events.length
    ? r.events
        .map((e) => `- ${e.date}: ${e.name}${e.location ? ` (${e.location})` : ''}${e.notes ? ` — ${e.notes}` : ''}`)
        .join('\n')
    : '- Nessun evento'
  const existing = r.existing.length
    ? r.existing.map((p) => `- ${p.date} ${p.format}: ${p.title}`).join('\n')
    : '- Nessuno'
  const extra = r.instructions.trim()
    ? `Indicazioni della social media manager per questa settimana:\n${r.instructions.trim()}\n\n`
    : ''
  return `<brief_cliente>
${briefText(r.client)}
</brief_cliente>

Prepara la bozza del piano editoriale per la settimana ${r.weekLabel}.

Slot di pubblicazione da coprire (uno per slot, stessa data/ora/piattaforma/formato):
${slots}

Eventi della settimana (prevedi contenuti di lancio/racconto coerenti):
${events}

Contenuti già pianificati questa settimana (non duplicarli e non coprire di nuovo i loro slot):
${existing}

${extra}Varia i temi nella settimana e fai in modo che ogni contenuto abbia uno scopo chiaro.`
}

function buildCopyPrompt(r: z.infer<typeof CopyRequest>) {
  const p = r.post
  const ask = r.instructions.trim()
    ? `Richiesta: ${r.instructions.trim()}`
    : p.copy
      ? 'Migliora il copy attuale mantenendone il senso.'
      : 'Scrivi il copy.'
  return `<brief_cliente>
${briefText(r.client)}
</brief_cliente>

Contenuto: ${p.format} su ${p.platform}, in uscita il ${p.date}.
Idea: ${p.title || '(non specificata)'}
Brief visivo: ${p.visual || '(non specificato)'}
${p.copy ? `Copy attuale:\n"""\n${p.copy}\n"""\n` : ''}
${ask}

Restituisci solo la caption finale nel campo "copy".`
}

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/* ------------------------------------------------------------ Anthropic ---- */

async function callAnthropic(p: ProviderConfig, prompt: string, schema: Record<string, unknown>, maxTokens: number) {
  const client = new Anthropic({ apiKey: p.apiKey })
  const response = await client.beta.messages.create({
    model: p.model || ANTHROPIC_DEFAULT_MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: prompt }],
  })
  if (response.stop_reason === 'refusal') {
    throw new HttpError(422, 'Il modello ha rifiutato la richiesta. Prova a riformulare le indicazioni.')
  }
  if (response.stop_reason === 'max_tokens') {
    throw new HttpError(502, 'Risposta troppo lunga e interrotta. Riprova con meno slot o indicazioni più brevi.')
  }
  const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
  return JSON.parse(text) as unknown
}

function anthropicError(err: unknown): HttpError | null {
  if (err instanceof Anthropic.AuthenticationError) return new HttpError(401, 'Chiave non valida.')
  if (err instanceof Anthropic.RateLimitError) return new HttpError(429, 'Troppe richieste in poco tempo: riprova tra un minuto.')
  if (err instanceof Anthropic.NotFoundError) return new HttpError(400, 'Modello non disponibile per questa chiave.')
  if (err instanceof Anthropic.APIError) return new HttpError(502, `Errore del servizio AI (${err.status ?? 'rete'}). Riprova.`)
  return null
}

/* ------------------------------------------------- Compatibili con OpenAI ---- */

interface ChatResponse {
  choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string | null }[]
}

function errorMessage(data: unknown): string {
  if (Array.isArray(data)) return data[0] ? errorMessage(data[0]) : ''
  if (!data || typeof data !== 'object') return ''
  const d = data as Record<string, unknown>
  if (typeof d.error === 'string') return d.error
  if (d.error && typeof d.error === 'object') return String((d.error as Record<string, unknown>).message ?? '')
  return String(d.message ?? d.detail ?? '')
}

function httpErrorFor(status: number, detail: string) {
  if (status === 401 || status === 403) return new HttpError(401, 'Chiave non valida o senza permessi.')
  if (status === 402) return new HttpError(402, 'Credito esaurito su questo provider.')
  if (status === 429) return new HttpError(429, 'Limite gratuito raggiunto per ora: riprova tra poco o passa a un altro provider.')
  if (status === 404) return new HttpError(400, `Modello non trovato${detail ? `: ${detail.slice(0, 160)}` : ''}.`)
  return new HttpError(502, `Errore del provider (${status})${detail ? `: ${detail.slice(0, 200)}` : ''}`)
}

async function postJson(url: string, apiKey: string, body: unknown) {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Regia Social Planner',
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new HttpError(502, 'Impossibile raggiungere il provider. Riprova.')
  }
  const data: unknown = await res.json().catch(() => ({}))
  return { res, data }
}

/** Estrae l'oggetto JSON anche se il modello aggiunge testo o blocchi ```json */
function extractJson(text: string): unknown {
  const clean = text.replace(/```(?:json)?/gi, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    const a = clean.indexOf('{')
    const b = clean.lastIndexOf('}')
    if (a >= 0 && b > a) return JSON.parse(clean.slice(a, b + 1))
    throw new Error('Nessun JSON nella risposta')
  }
}

async function callOpenAiCompatible(def: ProviderDef, p: ProviderConfig, prompt: string, schema: Record<string, unknown>, maxTokens: number) {
  if (!p.model) throw new HttpError(400, 'Scegli un modello per questo provider in Provider AI.')
  // Lo schema va anche nel prompt: non tutti i modelli gratuiti supportano l'output strutturato
  const system = `${SYSTEM}\n\nRispondi SOLO con un oggetto JSON valido, senza testo prima o dopo, conforme a questo JSON Schema:\n${JSON.stringify(schema)}`
  const base = {
    model: p.model,
    max_tokens: Math.min(maxTokens, def.maxOutput),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
  }
  // Tentativi dal formato più rigoroso al più permissivo
  const formats: (Record<string, unknown> | null)[] = [
    { type: 'json_schema', json_schema: { name: 'risposta', strict: true, schema } },
    { type: 'json_object' },
    null,
  ]
  let last: HttpError | null = null
  for (const format of formats) {
    const { res, data } = await postJson(`${def.baseUrl}/chat/completions`, p.apiKey, format ? { ...base, response_format: format } : base)
    if (!res.ok) {
      last = httpErrorFor(res.status, errorMessage(data))
      // Solo un errore di richiesta (formato non supportato) giustifica un nuovo tentativo
      if (res.status === 400 || res.status === 422) continue
      throw last
    }
    const choice = (data as ChatResponse).choices?.[0]
    if (choice?.message?.refusal) {
      throw new HttpError(422, 'Il modello ha rifiutato la richiesta. Prova a riformulare le indicazioni.')
    }
    if (choice?.finish_reason === 'length') {
      throw new HttpError(502, 'Risposta interrotta: questo modello ha un limite di lunghezza basso. Prova con meno uscite o un altro modello.')
    }
    try {
      return extractJson(choice?.message?.content ?? '')
    } catch {
      last = new HttpError(502, 'Il modello ha restituito una risposta non leggibile. Riprova o scegli un modello più capace.')
    }
  }
  throw last ?? new HttpError(502, 'Il provider non ha risposto correttamente.')
}

async function callModel(p: ProviderConfig, prompt: string, schema: Record<string, unknown>, maxTokens: number) {
  const def = PROVIDERS[p.id]
  if (!def) throw new HttpError(400, 'Provider sconosciuto.')
  if (def.kind === 'anthropic') {
    try {
      return await callAnthropic(p, prompt, schema, maxTokens)
    } catch (err) {
      throw anthropicError(err) ?? err
    }
  }
  return callOpenAiCompatible(def, p, prompt, schema, maxTokens)
}

/* ------------------------------------------------------------ Verifica ---- */

interface ModelInfo {
  id: string
  free?: boolean
}

async function listModels(p: ProviderConfig): Promise<ModelInfo[]> {
  const def = PROVIDERS[p.id]
  if (!def) throw new HttpError(400, 'Provider sconosciuto.')
  if (def.kind === 'anthropic') {
    try {
      const client = new Anthropic({ apiKey: p.apiKey })
      const models: ModelInfo[] = []
      for await (const m of client.models.list()) models.push({ id: m.id })
      return models
    } catch (err) {
      throw anthropicError(err) ?? err
    }
  }
  let res: Response
  try {
    res = await fetch(def.modelsUrl ?? `${def.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${p.apiKey}`, Accept: 'application/json' },
    })
  } catch {
    throw new HttpError(502, 'Impossibile raggiungere il provider.')
  }
  const data: unknown = await res.json().catch(() => ({}))
  // L'elenco modelli non ha parametri: un 400 qui (es. Gemini) significa chiave non valida
  if (res.status === 400) throw new HttpError(401, 'Chiave non valida.')
  if (!res.ok) throw httpErrorFor(res.status, errorMessage(data))
  const d = (data ?? {}) as Record<string, unknown>
  const list = Array.isArray(data) ? data : Array.isArray(d.data) ? d.data : Array.isArray(d.models) ? d.models : null
  if (!list) throw new HttpError(502, 'Risposta inattesa dal provider (forse bloccato dalla rete). Riprova più tardi.')
  const raw = list as Record<string, unknown>[]
  const seen = new Set<string>()
  return raw
    .map((m) => ({
      id: String(m.id ?? m.name ?? '').replace(/^models\//, ''),
      free: def.freeFilter ? def.freeFilter(m) : undefined,
    }))
    .filter((m) => m.id && !NON_CHAT.test(m.id) && !seen.has(m.id) && Boolean(seen.add(m.id)))
    .sort((a, b) => Number(Boolean(b.free)) - Number(Boolean(a.free)) || a.id.localeCompare(b.id))
}

/**
 * Chiamata minima per provare la chiave quando l'elenco modelli è pubblico.
 * Conta solo l'autenticazione: altri errori (modello non adatto, limiti) non invalidano la chiave.
 */
async function ping(def: ProviderDef, p: ProviderConfig) {
  const { res, data } = await postJson(`${def.baseUrl}/chat/completions`, p.apiKey, {
    model: p.model,
    max_tokens: 5,
    messages: [{ role: 'user', content: 'Rispondi solo: ok' }],
  })
  if (res.status === 401 || res.status === 403) throw new HttpError(401, 'Chiave non valida o senza permessi.')
  if (res.ok && !Array.isArray((data as ChatResponse).choices)) {
    throw new HttpError(502, 'Risposta inattesa dal provider: impossibile verificare la chiave.')
  }
}

async function validate(p: ProviderConfig) {
  const def = PROVIDERS[p.id]
  if (!def) throw new HttpError(400, 'Provider sconosciuto.')
  if (def.keyCheckUrl) {
    const res = await fetch(def.keyCheckUrl, { headers: { Authorization: `Bearer ${p.apiKey}` } }).catch(() => null)
    if (!res) throw new HttpError(502, 'Impossibile raggiungere il provider.')
    if (res.status === 401 || res.status === 403) throw new HttpError(401, 'Chiave non valida.')
  }
  const models = await listModels(p)
  if (models.length === 0) throw new HttpError(400, 'La chiave funziona ma non risultano modelli di testo disponibili.')
  if (def.publicModels) await ping(def, { ...p, model: p.model || models[0].id })
  return { ok: true, models }
}

/* -------------------------------------------------------------- Handler ---- */

export async function handleAiRequest(method: string, body: unknown): Promise<{ status: number; json: unknown }> {
  if (method === 'GET') {
    const p = resolveProvider(undefined)
    return { status: 200, json: { enabled: p !== null, provider: p?.id ?? null, model: p?.model ?? null } }
  }
  if (method !== 'POST') return { status: 405, json: { error: 'Metodo non consentito' } }
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) return { status: 400, json: { error: 'Richiesta non valida' } }
  const req = parsed.data
  try {
    if (req.action === 'validate') {
      return { status: 200, json: await validate(req.provider) }
    }
    const p = resolveProvider(req.provider)
    if (!p) {
      return { status: 503, json: { error: 'Nessun provider AI collegato. Aggiungine uno in Impostazioni → Provider AI.' } }
    }
    if (req.action === 'week') {
      const out = WeekOutput.parse(await callModel(p, buildWeekPrompt(req), weekJsonSchema, 16000))
      return { status: 200, json: out }
    }
    const out = CopyOutput.parse(await callModel(p, buildCopyPrompt(req), copyJsonSchema, 4000))
    return { status: 200, json: out }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { status: 502, json: { error: 'Il modello ha restituito dati incompleti. Riprova o scegli un modello più capace.' } }
    }
    if (err instanceof HttpError) return { status: err.status, json: { error: err.message } }
    console.error(err)
    return { status: 500, json: { error: 'Errore inatteso durante la generazione.' } }
  }
}

// Vercel Function (handler Web standard)
export async function GET() {
  const { status, json } = await handleAiRequest('GET', null)
  return Response.json(json, { status })
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  const { status, json } = await handleAiRequest('POST', body)
  return Response.json(json, { status })
}
