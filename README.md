# Regia · Social planner

Web app per social media manager che seguono molti clienti: ti dice su chi lavorare adesso, tiene la scheda di ogni cliente sempre a portata di mano, prepara con l'AI le bozze della settimana e ricorda al posto tuo volantini, materiali degli influencer e approvazioni da sollecitare.

## Funzioni

- **Oggi**: clienti ordinati per urgenza con la prossima azione da fare, attività in scadenza, contenuti in uscita, eventi imminenti. Pulsante "Inizia 60′" per lavorare a blocchi di un'ora: allo scadere l'app suggerisce il prossimo cliente.
- **Scheda cliente**: tono di voce, cose da fare e da evitare, hashtag, esempi di copy, uscite fisse settimanali (giorno, ora, piattaforma, formato), contatti con chi approva.
- **Settimana del cliente**: le uscite ancora senza contenuto sono evidenziate in rosso, con barra di copertura. Promemoria del brief sempre visibile.
- **Bozza AI**: genera i contenuti della settimana (idea, copy, brief visivo) nel tono del cliente, tenendo conto di eventi e indicazioni. Nell'editor, "Riscrivi" e i comandi rapidi (più breve, più coinvolgente…).
- **Invia in approvazione**: messaggio già formattato con il piano, da mandare su WhatsApp o per email con un clic; i contenuti passano in "In approvazione" e dopo 2 giorni senza risposta compaiono tra quelli da sollecitare.
- **Approvazioni**: kanban Idea → Bozza → In approvazione → Approvato → Programmato → Pubblicato, con drag & drop.
- **Calendario**: tutti i clienti nella stessa settimana; trascina i contenuti per spostarli.
- **Eventi e influencer**: creando un evento con influencer, l'app genera da sola i promemoria (richiesta materiali 5 giorni prima, stories il giorno dell'evento).
- **Attività ricorrenti**: es. "Chiedere il volantino a Sigma" ogni lunedì; quando la segni come fatta, crea la successiva.
- **Provider AI** (Impostazioni → Provider AI): collega uno o più servizi AI incollando la chiave, con verifica e scelta del modello. Gratuiti: Google Gemini, Groq, OpenRouter (modelli :free), Mistral, Cerebras, GitHub Models, SambaNova, Cohere; con crediti gratuiti: NVIDIA NIM, Hugging Face; a pagamento: Anthropic.
- **Piano stampabile/PDF** per il cliente, **ricerca rapida** (Ctrl/⌘+K), **backup** JSON, installabile come app (PWA).

## Avvio in locale

```bash
npm install
cp .env.example .env   # poi inserisci la tua OPENROUTER_API_KEY
npm run dev
```

Apri http://localhost:5173. Il modo più semplice per attivare l'AI è dall'app: **Impostazioni → Provider AI**, scegli ad esempio Google Gemini (gratis), crea la chiave e premi Verifica. Il file `.env` serve solo se vuoi una chiave predefinita lato server, usata quando nel browser non è collegato nessun provider.

## Metterla online (Vercel, gratis)

1. Carica la cartella `social-planner` su un repository GitHub.
2. Su [vercel.com](https://vercel.com): **Add New → Project**, importa il repository (preset Vite rilevato da solo).
3. (Facoltativo) In **Settings → Environment Variables** aggiungi una chiave predefinita per tutti: `OPENROUTER_API_KEY` (da [openrouter.ai/keys](https://openrouter.ai/keys)). Facoltativo: `OPENROUTER_MODEL` per cambiare modello (default `anthropic/claude-opus-5`, più economico `anthropic/claude-sonnet-5`). In alternativa a OpenRouter puoi usare `ANTHROPIC_API_KEY` diretta.
4. Deploy. La funzione `api/ai.ts` diventa automaticamente l'endpoint `/api/ai`.

Dal telefono: apri il sito e scegli **Aggiungi a schermata Home** per usarla come app.

> ⚠️ Le chiavi inserite in Provider AI restano nel browser di chi le inserisce (non entrano nel backup) e passano dal server solo per inoltrare la richiesta al provider, senza essere salvate. Le chiavi del file `.env` stanno solo sul server. Ogni generazione AI ha un costo sul tuo account OpenRouter (o Anthropic): nel caso d'uso tipico sono pochi centesimi a settimana per cliente.

## Dove stanno i dati

Per ora i dati sono salvati **nel browser** (localStorage): restano sul dispositivo e non passano da nessun server. Da **Impostazioni → Scarica backup** esporti tutto in JSON, da reimportare su un altro dispositivo.
Il prossimo passo naturale è un database con login (es. Supabase), per sincronizzare PC e telefono e lavorare in più persone.

## Struttura

```
api/ai.ts              endpoint AI (Claude), usato anche dal dev server
src/store.ts           dati e azioni (zustand + persistenza) e dati di esempio
src/lib/insights.ts    logica "prossima azione", uscite scoperte, solleciti
src/pages/             Oggi, Calendario, Approvazioni, Attività, Clienti, Impostazioni
src/components/        editor contenuto, modali AI/approvazione, layout, UI di base
```
