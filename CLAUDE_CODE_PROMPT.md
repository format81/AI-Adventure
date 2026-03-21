# CLAUDE_CODE_PROMPT.md — AI Avventura

## Contesto del progetto

Stai sviluppando **AI Avventura**: un'applicazione web educativa gamificata per insegnare i fondamenti dell'AI generativa (rischi e opportunità) a bambini di 9 anni. L'app è pensata per essere usata in aula da un insegnante che controlla il ritmo della lezione dal proprio device, mentre i bambini giocano sui loro tablet/PC.

L'intero progetto vive in **un singolo container Docker** distribuibile: niente servizi cloud esterni, niente database managed, niente auth provider. Tutto self-contained. Il container verrà deployato su Azure Container Apps con ingress HTTPS pubblico, ma deve funzionare identicamente con `docker compose up` sul laptop di chiunque.

---

## Architettura

```
ai-avventura/
├── Dockerfile                 # Multi-stage: build React → serve con Node
├── docker-compose.yml         # Per sviluppo locale e distribuzione colleghi
├── .env.example               # Template variabili d'ambiente
├── package.json               # Root: workspace che include server e client
├── content/                   # ⬅ FILE JSON EDITABILI CON LE DOMANDE DEI GIOCHI
│   ├── game1-who-wrote-it.json
│   ├── game2-traffic-light.json
│   ├── game3-fake-detective.json
│   └── game4-superpower.json
├── server/
│   ├── package.json
│   ├── index.js               # Entry point Express
│   ├── db.js                  # SQLite setup con better-sqlite3 (sincrono)
│   ├── auth.js                # Middleware auth: JWT, demo password
│   ├── routes/
│   │   ├── auth.routes.js     # POST /api/auth/admin-login, POST /api/auth/demo-login
│   │   ├── session.routes.js  # CRUD sessioni (admin only)
│   │   ├── game.routes.js     # Submit risposte, get stato gioco (students)
│   │   └── results.routes.js  # GET risultati, export CSV (admin only)
│   └── sse.js                 # Server-Sent Events manager
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            # Router principale
│       ├── pages/
│       │   ├── Landing.jsx        # Pagina iniziale: scelta ruolo o inserimento codice sessione
│       │   ├── AdminLogin.jsx     # Form login admin (user + password)
│       │   ├── AdminConsole.jsx   # Dashboard admin: crea sessioni, controlla gioco, vedi risultati
│       │   ├── DemoGate.jsx       # Form password demo
│       │   ├── DemoMode.jsx       # Esperienza demo standalone
│       │   ├── StudentJoin.jsx    # Inserimento codice sessione + nome squadra
│       │   ├── StudentLobby.jsx   # Sala d'attesa ("La maestra sta per iniziare...")
│       │   └── StudentPlay.jsx    # Esperienza gioco controllata dall'admin via SSE
│       ├── components/
│       │   ├── games/
│       │   │   ├── Game1WhoWroteIt.jsx    # Chi l'ha scritto? (AI vs Umano)
│       │   │   ├── Game2TrafficLight.jsx  # Semaforo AI (verde/giallo/rosso)
│       │   │   ├── Game3FakeDetective.jsx # Detective delle Fake News
│       │   │   └── Game4SuperPower.jsx    # Superpotere o Superpericolo?
│       │   ├── ProgressBar.jsx
│       │   ├── Confetti.jsx
│       │   ├── Stars.jsx
│       │   └── Finale.jsx
│       ├── hooks/
│       │   └── useSSE.js       # Custom hook per Server-Sent Events
│       ├── context/
│       │   └── AuthContext.jsx  # Context per stato auth admin/demo
│       └── lib/
│           └── api.js          # Fetch wrapper per le API
└── data/                       # Volume mount: contiene avventura.db (gitignored)
```

---

## Specifiche tecniche dettagliate

### Backend — Node.js + Express

**Runtime:** Node.js 20 LTS, Express 4.x.

**Database:** SQLite via `better-sqlite3` (sincrono, no async overhead, perfetto per single-process). Il file `avventura.db` vive in `/app/data/` (mount volume).

**Schema SQLite:**

```sql
CREATE TABLE admins (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,        -- bcrypt hash
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                 -- UUID v4
  code TEXT UNIQUE NOT NULL,           -- 6 char alfanumerico uppercase (es. ROBOT3)
  name TEXT NOT NULL,                  -- "Classe 4B - Scuola Verdi"
  status TEXT DEFAULT 'lobby',         -- lobby | active | paused | completed
  current_stage TEXT DEFAULT 'intro',  -- intro | game1 | game2 | game3 | game4 | finale
  current_question INTEGER DEFAULT 0, -- indice domanda corrente nel gioco attivo
  created_by TEXT NOT NULL,            -- username admin
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE teams (
  id TEXT PRIMARY KEY,                 -- UUID v4
  session_id TEXT NOT NULL REFERENCES sessions(id),
  name TEXT NOT NULL,                  -- Nome squadra scelto dai bambini
  joined_at TEXT DEFAULT (datetime('now')),
  UNIQUE(session_id, name)
);

CREATE TABLE responses (
  id TEXT PRIMARY KEY,                 -- UUID v4
  session_id TEXT NOT NULL REFERENCES sessions(id),
  team_id TEXT NOT NULL REFERENCES teams(id),
  game TEXT NOT NULL,                  -- game1 | game2 | game3 | game4
  question_index INTEGER NOT NULL,
  answer TEXT NOT NULL,                -- la risposta data
  correct INTEGER NOT NULL,            -- 1 o 0
  points INTEGER NOT NULL,             -- punti assegnati
  responded_at TEXT DEFAULT (datetime('now'))
);
```

**Inizializzazione admin al primo avvio:**
All'avvio il server legge `ADMIN_USERS` dall'env (formato `user1:pwd1,user2:pwd2`), hasha le password con bcrypt e fa UPSERT nella tabella `admins`. Se un admin esiste già e la password nell'env è cambiata, aggiorna l'hash.

### API Endpoints

**Auth:**
- `POST /api/auth/admin-login` — body: `{ username, password }`. Verifica username e password (bcrypt compare), se validi rilascia JWT con ruolo `admin` (scadenza 4h).
- `POST /api/auth/demo-login` — body: `{ password }`. Confronta con `DEMO_PASSWORD` env. Se OK, rilascia un JWT con ruolo `demo` (scadenza 24h).

**Sessioni (admin only — JWT middleware):**
- `GET /api/sessions` — lista sessioni con conteggio team e status.
- `POST /api/sessions` — body: `{ name }`. Genera codice 6 char univoco. Ritorna la sessione creata.
- `GET /api/sessions/:id` — dettaglio sessione con team e statistiche.
- `POST /api/sessions/:id/start` — cambia status da `lobby` a `active`. Triggera SSE event `session:start`.
- `POST /api/sessions/:id/advance` — avanza `current_stage` e/o `current_question`. Triggera SSE event `stage:change` con il nuovo stato.
- `POST /api/sessions/:id/pause` — mette in pausa. Triggera SSE.
- `POST /api/sessions/:id/complete` — chiude la sessione. Triggera SSE event `session:complete`.
- `DELETE /api/sessions/:id` — cancella sessione e dati associati.

**Gioco (studenti — no auth, solo validazione session code):**
- `POST /api/game/join` — body: `{ sessionCode, teamName }`. Crea il team se non esiste, ritorna `{ teamId, sessionId }`. Fallisce se la sessione non esiste o è completata.
- `GET /api/game/:sessionId/state` — ritorna lo stato corrente della sessione (stage, question index, status). Usato come fallback se SSE si disconnette.
- `POST /api/game/respond` — body: `{ sessionId, teamId, game, questionIndex, answer }`. Il server valida la risposta, calcola se è corretta e i punti, salva in DB, ritorna `{ correct, points, explanation }`.
- `GET /api/game/:sessionId/scores` — classifica live dei team nella sessione.

**Risultati (admin only):**
- `GET /api/results/:sessionId` — JSON con statistiche complete: punti per team, percentuale corrette per gioco, tempo medio di risposta.
- `GET /api/results/:sessionId/csv` — export CSV scaricabile con tutte le risposte.

### Server-Sent Events (SSE)

**Endpoint:** `GET /api/sse/:sessionId`

Nessuna autenticazione richiesta (i bambini si connettono). Il server mantiene un Map in memoria `sessionId → Set<Response>`. Quando l'admin chiama advance/start/pause/complete, il server itera sulle connessioni della sessione e scrive l'evento.

**Eventi:**
- `session:start` — data: `{ status: 'active' }`
- `stage:change` — data: `{ stage, questionIndex }`
- `session:pause` — data: `{ status: 'paused' }`
- `session:complete` — data: `{ status: 'completed' }`
- `team:joined` — data: `{ teamName, teamCount }` (notifica all'admin e agli altri team)

**Heartbeat:** Il server manda un commento SSE (`: ping`) ogni 30 secondi per tenere viva la connessione.

**Cleanup:** Quando la response si chiude (client disconnect), rimuovi dal Set.

### Frontend — React + Vite

**Framework:** React 18 con Vite come bundler. **Niente Tailwind** — usa CSS modules o CSS-in-JS inline (stile consistente con il prototipo che hai già visto nell'artifact).

**Routing:** `react-router-dom` v6.
- `/` → Landing (campo codice sessione + link "Sono un insegnante" + link "Demo")
- `/admin` → AdminLogin → AdminConsole (protected)
- `/demo` → DemoGate → DemoMode
- `/play/:sessionCode` → StudentJoin → StudentLobby → StudentPlay

**Design system — pensato per bambini di 9 anni:**
- **Mobile-first ma anche PC:** L'app è progettata prima per tablet/mobile (il caso d'uso primario in aula), ma deve funzionare benissimo anche su PC con monitor grande. Su desktop le card dei giochi hanno un max-width (720px) centrato, i bottoni restano grandi e cliccabili, il layout non si "perde" su schermi larghi. Su mobile/tablet nessuno scroll orizzontale, tutto stacked verticalmente.
- **Kid-friendly layout:** 
  - Font size base **grande**: minimo 18px per il body text, 22-24px per le domande dei giochi, 32px+ per i titoli. I bambini leggono da lontano su schermi condivisi.
  - Bottoni **enormi e ben distanziati**: minimo 56px di altezza, 16px di gap tra bottoni adiacenti. I bambini a coppie toccano lo schermo in modo impreciso — mai due bottoni troppo vicini.
  - **Emoji abbondanti** come guida visiva — ogni gioco, ogni opzione, ogni feedback ha un'emoji associata. I bambini si orientano prima con le immagini e poi con il testo.
  - **Feedback visivo esagerato:** risposte corrette → confetti + card verde + emoji grande ✅. Risposte sbagliate → shake animation + card rossa + emoji ❌. I bambini devono capire IMMEDIATAMENTE se hanno azzeccato o no.
  - **Colori ad alto contrasto** su sfondo scuro. I testi sulle card devono avere contrasto ratio minimo 4.5:1 (WCAG AA).
  - **Zero hover-only interactions.** Tutto deve funzionare con touch. Nessun tooltip, nessun menu che appare on hover.
  - **Nessuna interazione complessa:** no drag-and-drop, no swipe, no long press. Solo tap/click su bottoni grandi e chiari.
  - **Sala d'attesa coinvolgente:** la StudentLobby deve avere un'animazione divertente (es. il robot 🤖 che "pensa" con i puntini che si muovono) e mostrare i nomi delle squadre che si collegano in tempo reale, così i bambini si sentono parte di qualcosa.
- Background: gradient scuro `linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)`
- Font: Nunito (importata da Google Fonts) — arrotondata e amichevole, perfetta per bambini
- Cards: glassmorphism leggero `rgba(255,255,255,0.06)` con `backdrop-filter: blur(10px)` e bordi `rgba(255,255,255,0.1)`
- Accent primario: gradient `#F97316 → #FFE66D` (arancione-giallo)
- Successo: `#4ECDC4`, Errore: `#FF6B6B`, Info: `#A78BFA`
- Bottoni primari: gradient arancione-giallo con ombra, border-radius 16px, font-weight 800
- Animazioni: transizioni CSS per fade-in delle card, confetti component per le risposte corrette, shake per quelle sbagliate

### Contenuto dei 4 giochi — File JSON esterni

**IMPORTANTE:** Le domande e gli scenari di ogni gioco vivono in file JSON separati nella cartella `content/`. Questo permette a chiunque (insegnanti, colleghi) di modificare, aggiungere o tradurre le domande senza toccare il codice. Il server carica questi file all'avvio e li espone via API `GET /api/game/content` così il frontend li legge dinamicamente. Se un file JSON viene modificato, basta riavviare il container (o, in dev, il server).

**Il server deve validare i JSON al boot:** se il formato è invalido, logga un errore chiaro con il nome del file e il campo mancante, e non avvia finché i file non sono corretti. Questo protegge da errori di editing.

**In produzione Docker**, i file `content/` sono copiati nell'immagine MA possono essere sovrascritti montando un volume: `./my-custom-content:/app/content`. Così un collega può personalizzare le domande senza rifare il build.

Nel docker-compose.yml aggiungi il volume opzionale:
```yaml
volumes:
  - ./data:/app/data
  - ./content:/app/content    # opzionale: per personalizzare le domande
```

**Struttura dei file:**

`content/game1-who-wrote-it.json` — Chi l'ha scritto? (AI vs Umano). 10 punti per risposta corretta.
```json
{
  "title": "Chi l'ha scritto?",
  "emoji": "🕵️",
  "description": "L'AI può scrivere testi che sembrano scritti da un umano. Ma a volte inventa cose!",
  "rules": "Leggete ogni frase e decidete: è un FATTO VERO scritto da un umano, o è qualcosa INVENTATO dall'AI?",
  "pointsPerCorrect": 10,
  "questions": [
    { "text": "La pizza margherita è stata inventata a Napoli nel 1889 dal pizzaiolo Raffaele Esposito in onore della Regina Margherita.", "answer": "umano", "explanation": "Questo è un fatto storico vero! Lo trovi sui libri di storia. 📚" },
    { "text": "I delfini possono volare per brevi distanze quando sono molto felici, raggiungendo anche i 3 metri di altezza sopra l'acqua.", "answer": "ai", "explanation": "FALSO! L'AI ha inventato questa informazione. I delfini saltano ma non volano! Questo si chiama 'allucinazione' dell'AI. 🐬" },
    { "text": "Il sole è una stella e la stella più vicina alla Terra. La sua luce impiega circa 8 minuti per raggiungerci.", "answer": "umano", "explanation": "Corretto! Questo è un fatto scientifico verificabile. ☀️" },
    { "text": "Leonardo da Vinci ha dipinto la Gioconda usando una tecnica segreta che includeva polvere di diamante mescolata ai colori.", "answer": "ai", "explanation": "INVENTATO dall'AI! Leonardo usava la tecnica dello 'sfumato', non la polvere di diamante. L'AI mescola fatti veri con invenzioni! 🎨" },
    { "text": "L'acqua bolle a 100 gradi Celsius al livello del mare.", "answer": "umano", "explanation": "Fatto scientifico corretto e verificabile! 🌡️" }
  ]
}
```

`content/game2-traffic-light.json` — Semaforo AI. 10 punti per risposta corretta.
```json
{
  "title": "Semaforo AI",
  "emoji": "🚦",
  "description": "Non tutti gli usi dell'AI sono uguali. Alcuni sono fantastici, altri pericolosi!",
  "rules": "Per ogni situazione, scegliete il colore del semaforo: 🟢 VERDE = Ottimo uso! 🟡 GIALLO = Attenzione! 🔴 ROSSO = Pericolo!",
  "pointsPerCorrect": 10,
  "questions": [
    { "scenario": "Usi l'AI per farti spiegare un argomento di scienze che non hai capito bene.", "answer": "verde", "explanation": "L'AI è un ottimo tutor! Ti può spiegare le cose in modi diversi finché non capisci. 💡" },
    { "scenario": "Copi e incolli un tema scritto dall'AI e lo consegni alla maestra come se fosse tuo.", "answer": "rosso", "explanation": "Questo è BARARE! Il compito deve essere il TUO lavoro. L'AI può aiutarti a capire, ma non deve fare il lavoro al posto tuo. 🚫" },
    { "scenario": "Chiedi all'AI di darti idee per una storia che poi scrivi tu con le tue parole.", "answer": "verde", "explanation": "Perfetto! Usare l'AI per ispirarsi e poi creare qualcosa di proprio è un uso intelligente! ✨" },
    { "scenario": "Un amico ti manda una foto di un compagno di classe modificata con l'AI per prenderlo in giro.", "answer": "rosso", "explanation": "Questo è CYBERBULLISMO! Modificare foto di altre persone con l'AI per offenderle è molto grave e fa male. 💔" },
    { "scenario": "Usi l'AI per tradurre una frase in inglese, ma poi controlli sul dizionario se è giusta.", "answer": "giallo", "explanation": "Buona idea controllare! L'AI a volte sbaglia le traduzioni. Verificare è sempre importante! 🔍" },
    { "scenario": "Credi a tutto quello che l'AI ti dice senza mai verificare.", "answer": "rosso", "explanation": "L'AI può INVENTARE cose che sembrano vere! Bisogna sempre verificare le informazioni importanti. 🧐" }
  ]
}
```

`content/game3-fake-detective.json` — Detective delle Fake. 15 punti per caso risolto.
```json
{
  "title": "Detective delle Fake",
  "emoji": "🔎",
  "description": "L'AI può creare notizie false molto convincenti. Un buon detective digitale sa riconoscere gli indizi!",
  "rules": "Leggete la notizia e trovate i 2 INDIZI SOSPETTI che rivelano che è una fake news.",
  "pointsPerCorrect": 15,
  "questions": [
    {
      "claim": "ULTIM'ORA: Domani scuole chiuse in tutta Italia per l'arrivo di un meteorite! Lo dice il Presidente!",
      "options": [
        { "id": 0, "text": "📅 'Domani' — la data è troppo vicina", "isFake": false },
        { "id": 1, "text": "☄️ 'Arrivo di un meteorite' — troppo sensazionale", "isFake": true },
        { "id": 2, "text": "🏫 'Scuole chiuse' — potrebbe essere vero", "isFake": false },
        { "id": 3, "text": "🗣️ 'Lo dice il Presidente' — non cita la fonte vera", "isFake": true }
      ],
      "explanation": "Le notizie false usano toni SENSAZIONALI e citano fonti vaghe. Chiedi sempre: dove posso verificare? 🔎"
    },
    {
      "claim": "Un nuovo studio scientifico dimostra che mangiare cioccolato ogni giorno fa diventare più intelligenti del 200%!",
      "options": [
        { "id": 0, "text": "🔬 'Un nuovo studio' — non dice quale studio", "isFake": true },
        { "id": 1, "text": "🍫 'Cioccolato' — il cioccolato esiste davvero", "isFake": false },
        { "id": 2, "text": "📊 '200%' — numero esagerato e impossibile", "isFake": true },
        { "id": 3, "text": "🧠 'Intelligenti' — l'intelligenza è reale", "isFake": false }
      ],
      "explanation": "Numeri esagerati e fonti vaghe ('un nuovo studio...') sono segnali di fake news! 🚩"
    }
  ]
}
```

`content/game4-superpower.json` — Superpotere o Superpericolo? 10 punti per risposta corretta.
```json
{
  "title": "Superpotere o Superpericolo?",
  "emoji": "⚡",
  "description": "L'AI ha capacità incredibili, ma ogni potere può essere usato per il bene o per il male!",
  "rules": "Per ogni frase, decidete se è un SUPERPOTERE (uso positivo) o un SUPERPERICOLO (uso negativo) dell'AI.",
  "pointsPerCorrect": 10,
  "questions": [
    { "text": "L'AI può aiutare i medici a trovare malattie prima", "type": "potere", "emoji": "🏥" },
    { "text": "L'AI può creare video falsi di persone vere", "type": "pericolo", "emoji": "🎭" },
    { "text": "L'AI può tradurre lingue in tempo reale", "type": "potere", "emoji": "🌍" },
    { "text": "L'AI può essere usata per imbrogliare a scuola", "type": "pericolo", "emoji": "📝" },
    { "text": "L'AI può aiutare persone con disabilità", "type": "potere", "emoji": "♿" },
    { "text": "L'AI può diffondere notizie false velocemente", "type": "pericolo", "emoji": "📰" },
    { "text": "L'AI può creare musica e arte nuova", "type": "potere", "emoji": "🎵" },
    { "text": "L'AI raccoglie dati personali senza che lo sai", "type": "pericolo", "emoji": "🔐" }
  ]
}
```

### Admin Console — Funzionalità

L'admin console (`/admin`) dopo il login mostra:

1. **Dashboard sessioni** — Lista sessioni con status badge (lobby/active/completed), nome, codice, data creazione, numero team connessi. Bottone "Nuova sessione".

2. **Creazione sessione** — Modal/form con campo "Nome" (es. "Classe 4B - Scuola Verdi"). Il codice a 6 caratteri viene generato automaticamente dal server (uppercase alfanumerico, senza caratteri ambigui come 0/O, 1/I/L). Il codice viene mostrato in grande, copiabile, pronto da dettare alla classe.

3. **Controllo sessione live** — Quando l'admin entra in una sessione attiva:
   - **Lobby view:** Mostra i team collegati in tempo reale (aggiornati via SSE `team:joined`). Bottone grande "AVVIA SESSIONE".
   - **Game control:** Mostra lo stage corrente, la domanda corrente, il testo della domanda. Bottoni: "Prossima domanda" → "Prossimo gioco" → fino al finale. Mostra in tempo reale quanti team hanno risposto alla domanda corrente.
   - **Scoreboard live:** Classifica aggiornata in tempo reale a fianco del game control.
   - **Bottone pausa** sempre visibile.

4. **Risultati sessione** — Dopo il completamento (o anche durante):
   - Punteggio totale per team con ranking
   - Percentuale risposte corrette per gioco (grafico a barre semplice)
   - Dettaglio per domanda: quanti hanno risposto correttamente
   - Bottone "Esporta CSV"

### Demo Mode — Funzionalità

La demo (`/demo`) dopo aver inserito la password è un'esperienza **completamente client-side**:
- Nessuna connessione SSE, nessuna chiamata API dopo il login
- I 4 giochi si susseguono controllati dall'utente (bottone "Avanti" gestito localmente)
- Il punteggio è calcolato client-side
- I dati NON vengono salvati nel database
- Essenzialmente è il prototipo React originale con l'aggiunta del gate password iniziale

### Dockerfile

Multi-stage build:
1. **Stage `client-build`**: Node 20 Alpine, copia `client/`, `npm install`, `npm run build` → produce `client/dist/`
2. **Stage `production`**: Node 20 Alpine, copia `server/`, `npm install --production`, copia `client/dist/` in `server/public/`, expose 8080, CMD `node server/index.js`

Express serve i file statici da `server/public/` e gestisce il fallback SPA (tutte le rotte non-API ritornano `index.html`).

### docker-compose.yml

```yaml
services:
  ai-avventura:
    build: .
    ports:
      - "${PORT:-8080}:8080"
    environment:
      - ADMIN_USERS=${ADMIN_USERS}
      - DEMO_PASSWORD=${DEMO_PASSWORD}
      - SESSION_SECRET=${SESSION_SECRET}
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
      - ./content:/app/content   # opzionale: personalizzare domande senza rebuild
    restart: unless-stopped
```

---

## Istruzioni di sviluppo per Claude Code

1. **Inizia dal backend.** Implementa `server/db.js` (creazione tabelle, funzioni CRUD), poi `server/auth.js` (bcrypt, JWT semplice user+password per admin, password singola per demo), poi le routes nell'ordine: auth → sessions → game → results. Infine `server/sse.js` e `server/index.js` che monta tutto. **Implementa anche il loader dei file JSON da `content/`** con validazione dello schema al boot.

2. **Testa il backend.** Scrivi un file `server/test.sh` con curl commands per testare tutti gli endpoint. Assicurati che il server parta con `node server/index.js` e risponda correttamente.

3. **Poi il frontend.** Parti dalla struttura Vite + React. Implementa il routing, poi le pagine nell'ordine: Landing → AdminLogin → AdminConsole → DemoGate → DemoMode → StudentJoin → StudentLobby → StudentPlay. I componenti gioco (Game1-4) sono condivisi tra DemoMode e StudentPlay.

4. **I componenti gioco devono essere riusabili.** Accettano props come `{ question, onAnswer, showResult, result }` così funzionano sia in demo mode (controllati localmente) che in student mode (controllati via SSE dall'admin).

5. **Il Dockerfile** deve produrre un'immagine funzionante. Testa con `docker compose up --build` e verifica che tutto funzioni: login admin con user+password, crea sessione, join come studente, gioca, vedi risultati.

6. **Gestione errori.** Il frontend deve gestire: SSE disconnection (riconnessione automatica con backoff), sessione non trovata, sessione già completata, nome team duplicato. Mostra messaggi user-friendly in italiano.

7. **Non installare Tailwind.** Usa CSS inline o CSS modules. Il design system è definito sopra: gradient scuro, glassmorphism cards, Nunito font, accent arancione-giallo. Mobile-first ma responsivo fino a desktop. Touch-friendly per tablet (min 56px touch targets) e usabile con mouse su PC. Leggi attentamente la sezione "Design system — pensato per bambini di 9 anni" e segui TUTTE le indicazioni.

8. **Internazionalizzazione:** Tutta l'interfaccia è in italiano. I messaggi di errore, i placeholder, i bottoni: tutto in italiano.

9. **Security basics:**
   - Rate limiting sugli endpoint di login: **max 30 tentativi/minuto per IP** (NON 5 — in aula i bambini sono a coppie su PC che condividono lo stesso IP pubblico della scuola, quindi tutte le richieste arrivano dallo stesso indirizzo. Un rate limit troppo basso blocca l'intera classe). Per gli endpoint di gioco (submit response, get state, join) il rate limit deve essere ancora più generoso: **100 richieste/minuto per IP**.
   - I JWT hanno scadenza (4h admin, 24h demo)
   - Le password admin sono hashate con bcrypt (cost factor 12)
   - I codici sessione non sono sequenziali né prevedibili
   - Nessun dato personale dei bambini viene raccolto (solo nome squadra, niente email/nome reale)
   - CORS permissivo solo in dev, restrittivo in production

10. **Package da usare (server):** express, better-sqlite3, bcryptjs, jsonwebtoken, uuid, express-rate-limit, helmet, cors. **Non installare otplib e qrcode** — il TOTP/MFA verrà aggiunto in una fase successiva.

11. **Package da usare (client):** react, react-dom, react-router-dom. Nient'altro. Niente UI library, niente state management library, niente chart library — tutto vanilla React con hooks.

---

## Definizione di "fatto" (Definition of Done)

Il progetto è completo quando:

- [ ] `docker compose up --build` avvia l'app sulla porta 8080
- [ ] Un admin può fare login con user+password (senza MFA per ora) e accedere alla console
- [ ] Un admin può creare una sessione e ottenere un codice a 6 caratteri
- [ ] Un bambino può inserire il codice e un nome squadra e finire in lobby
- [ ] L'admin vede i team in lobby in tempo reale
- [ ] L'admin avvia la sessione e i client dei bambini passano automaticamente al primo gioco
- [ ] L'admin avanza le domande/giochi e i client seguono in tempo reale
- [ ] Le risposte dei team vengono salvate e il punteggio si aggiorna live
- [ ] A fine sessione l'admin vede i risultati e può esportare CSV
- [ ] La demo funziona inserendo solo la password, senza sessione server
- [ ] Il Dockerfile produce un'immagine funzionante sotto i 200MB
- [ ] I file JSON in `content/` possono essere modificati e il server li ricarica al restart, validandoli al boot
- [ ] Il volume mount `./content:/app/content` nel docker-compose permette di personalizzare le domande senza rebuild
- [ ] L'app è usabile su tablet (touch-friendly, bottoni 56px+, font grandi) E su PC desktop (layout centrato, non si rompe su schermi larghi)
- [ ] Il rate limit non blocca una classe di 15 coppie che giocano dallo stesso IP pubblico della scuola
