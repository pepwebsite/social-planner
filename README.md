# Social Planner · Social planner

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

## Login e database (Supabase)

Con Supabase configurato l'app chiede **registrazione e accesso** (email e password, con recupero password), e i dati di ogni utente (clienti, contenuti, eventi, attività, provider AI) sono salvati nel database e sincronizzati tra i suoi dispositivi. Ogni utente vede solo i propri dati: lo garantiscono le regole di sicurezza (Row Level Security) del database.

1. Crea un progetto gratuito su [supabase.com](https://supabase.com) (regione consigliata: Europe).
2. **SQL Editor → New query**: incolla il contenuto di [`supabase/schema.sql`](supabase/schema.sql) e premi **Run**.
3. **Authentication → URL Configuration**:
   - *Site URL*: l'indirizzo del sito, es. `https://social-planner-two.vercel.app`
   - *Redirect URLs*: aggiungi lo stesso indirizzo e `http://localhost:5173`
4. **Project Settings → API**: copia *Project URL* e la chiave *anon/publishable* nelle variabili `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (in `.env.local` in locale, e su Vercel in Settings → Environment Variables), poi rifai il deploy.

Senza queste variabili l'app funziona in modalità locale, senza login.

> Il servizio email incluso in Supabase invia pochi messaggi l'ora (conferme e reset password). Per un uso con molti utenti collega un SMTP in *Authentication → Emails*, oppure disattiva la conferma email in *Authentication → Sign In / Providers → Email*.

## Dove stanno i dati

- **Con Supabase** (consigliato online): nel database, per utente, con una copia locale nel browser per lavorare anche offline; le modifiche fatte offline vengono salvate al ritorno della connessione. All'uscita la copia locale viene cancellata.
- **Senza Supabase**: solo nel browser (localStorage).

In entrambi i casi **Impostazioni → Scarica backup** esporta tutto in JSON.

## Struttura

```
api/ai.ts              endpoint AI (Claude), usato anche dal dev server
src/store.ts           dati e azioni (zustand + persistenza) e dati di esempio
src/lib/sync.ts        sincronizzazione con il database Supabase
src/auth.ts            sessione utente; schermate in src/pages/AuthScreen.tsx
supabase/schema.sql    tabelle e regole di sicurezza del database
src/lib/insights.ts    logica "prossima azione", uscite scoperte, solleciti
src/pages/             Oggi, Calendario, Approvazioni, Attività, Clienti, Impostazioni
src/components/        editor contenuto, modali AI/approvazione, layout, UI di base
```
