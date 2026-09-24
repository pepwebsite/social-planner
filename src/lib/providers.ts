/** Catalogo dei provider AI mostrato all'utente. Gli indirizzi delle API stanno solo sul server (api/ai.ts). */

export type ProviderTier = 'free' | 'credits' | 'paid'

export interface ProviderInfo {
  id: string
  name: string
  tier: ProviderTier
  color: string
  /** Cosa offre il piano gratuito, in breve */
  note: string
  /** Dove fare login e creare la chiave */
  keyUrl: string
  keyHint: string
  /** Frammenti di id modello da preferire come scelta predefinita, in ordine */
  prefer: string[]
}

export const TIER_META: Record<ProviderTier, { label: string; cls: string }> = {
  free: { label: 'Gratis', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  credits: { label: 'Crediti gratuiti', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  paid: { label: 'A pagamento', cls: 'bg-stone-100 text-stone-600 ring-stone-200' },
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    tier: 'free',
    color: '#4285f4',
    note: 'Piano gratuito generoso con un account Google (AI Studio). Ottimo in italiano: il consigliato per iniziare.',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyHint: 'AIza…',
    prefer: ['gemini-2.5-flash', 'gemini-flash-latest', 'flash'],
  },
  {
    id: 'groq',
    name: 'Groq',
    tier: 'free',
    color: '#f55036',
    note: 'Gratis con limiti al minuto e al giorno. Velocissimo, modelli open (Llama, GPT-OSS, Qwen).',
    keyUrl: 'https://console.groq.com/keys',
    keyHint: 'gsk_…',
    prefer: ['llama-3.3-70b-versatile', 'gpt-oss-120b', '70b'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    tier: 'free',
    color: '#6366f1',
    note: 'Modelli gratuiti (quelli marcati "gratis") con limiti giornalieri. Con credito accedi anche a Claude, GPT e Gemini.',
    keyUrl: 'https://openrouter.ai/keys',
    keyHint: 'sk-or-…',
    prefer: [':free'],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    tier: 'free',
    color: '#fa520f',
    note: 'Piano "Experiment" gratuito (serve verificare il numero di telefono). Azienda europea.',
    keyUrl: 'https://console.mistral.ai/api-keys',
    keyHint: 'chiave di 32 caratteri',
    prefer: ['mistral-medium-latest', 'mistral-small-latest', 'mistral-large-latest'],
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    tier: 'free',
    color: '#f97316',
    note: 'Gratis con limite giornaliero di token. Risposte quasi istantanee.',
    keyUrl: 'https://cloud.cerebras.ai/platform',
    keyHint: 'csk-…',
    prefer: ['llama-3.3-70b', 'gpt-oss-120b', 'qwen'],
  },
  {
    id: 'github',
    name: 'GitHub Models',
    tier: 'free',
    color: '#24292f',
    note: 'Gratis con un account GitHub: crea un token con il permesso "Models" (sola lettura). Limiti giornalieri bassi.',
    keyUrl: 'https://github.com/settings/personal-access-tokens/new',
    keyHint: 'github_pat_…',
    prefer: ['openai/gpt-4.1-mini', 'openai/gpt-4o-mini', 'gpt-4.1', 'gpt'],
  },
  {
    id: 'sambanova',
    name: 'SambaNova',
    tier: 'free',
    color: '#ee7624',
    note: 'Piano gratuito con limiti al minuto su modelli open (Llama, DeepSeek).',
    keyUrl: 'https://cloud.sambanova.ai/apis',
    keyHint: 'chiave UUID',
    prefer: ['Meta-Llama-3.3-70B-Instruct', 'DeepSeek-V3', 'Llama'],
  },
  {
    id: 'cohere',
    name: 'Cohere',
    tier: 'free',
    color: '#39594d',
    note: 'Chiave "Trial" gratuita, pensata per prove e uso non commerciale.',
    keyUrl: 'https://dashboard.cohere.com/api-keys',
    keyHint: 'chiave di 40 caratteri',
    prefer: ['command-a', 'command-r-plus', 'command'],
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    tier: 'credits',
    color: '#76b900',
    note: 'Crediti gratuiti per sviluppatori alla registrazione, su molti modelli open.',
    keyUrl: 'https://build.nvidia.com/settings/api-keys',
    keyHint: 'nvapi-…',
    prefer: ['meta/llama-3.3-70b-instruct', 'llama-3.3-70b', 'llama'],
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    tier: 'credits',
    color: '#ffb000',
    note: 'Piccolo credito mensile gratuito; crea un token con permesso "Inference Providers".',
    keyUrl: 'https://huggingface.co/settings/tokens',
    keyHint: 'hf_…',
    prefer: ['meta-llama/Llama-3.3-70B-Instruct', 'Qwen', 'llama'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    tier: 'paid',
    color: '#d97757',
    note: 'A consumo: la qualità di scrittura più alta, pochi centesimi a settimana per cliente.',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyHint: 'sk-ant-…',
    prefer: ['claude-opus-5', 'claude-sonnet-5', 'claude'],
  },
]

export const providerById = (id: string | null | undefined) => PROVIDERS.find((p) => p.id === id)

/** Sceglie il modello predefinito tra quelli disponibili */
export function pickDefaultModel(info: ProviderInfo, models: { id: string; free?: boolean }[]) {
  const pool = info.id === 'openrouter' ? models.filter((m) => m.free) : models
  for (const frag of info.prefer) {
    const hit = pool.find((m) => m.id === frag) ?? pool.find((m) => m.id.toLowerCase().includes(frag.toLowerCase()))
    if (hit) return hit.id
  }
  return (pool[0] ?? models[0])?.id ?? ''
}
