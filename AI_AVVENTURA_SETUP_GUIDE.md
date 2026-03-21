# AI Avventura — Guida Setup Passo Passo

## Prerequisiti da verificare

Apri il terminale integrato di VS Code (`Ctrl+ù` su layout italiano, oppure `Ctrl+backtick`) e verifica:

```bash
node -v          # deve essere v20.x o superiore
npm -v           # deve essere v10.x o superiore
git --version    # qualsiasi versione recente
docker --version # Docker Desktop deve essere installato e AVVIATO
```

Se manca Node.js 20: scaricalo da https://nodejs.org/en (LTS).
Se manca Docker Desktop: scaricalo da https://www.docker.com/products/docker-desktop/
Dopo l'installazione di Docker, assicurati che l'icona Docker nella system tray sia verde (engine running).

---

## Passo 1 — Crea il repo su GitHub

Dal terminale di VS Code:

```bash
cd ~/repos
```

(o la cartella dove tieni i tuoi progetti — se non esiste creala con `mkdir ~/repos`)

Opzione A — con GitHub CLI (se hai `gh` installato):
```bash
gh repo create ai-avventura --public --clone --description "Educational AI game for kids - GenAI risks and opportunities"
cd ai-avventura
```

Opzione B — senza GitHub CLI:
1. Vai su https://github.com/new
2. Repository name: `ai-avventura`
3. Description: `Educational AI game for kids - GenAI risks and opportunities`
4. Public
5. NON aggiungere README, .gitignore o license (li creiamo noi)
6. Clicca "Create repository"
7. Poi dal terminale:
```bash
git clone https://github.com/TUO-USERNAME/ai-avventura.git
cd ai-avventura
```

---

## Passo 2 — Apri la cartella in VS Code

```bash
code .
```

Questo riapre VS Code con la root del progetto. Da qui in poi tutti i comandi sono dal terminale integrato di VS Code.

---

## Passo 3 — Crea la struttura di cartelle

```bash
mkdir -p server/routes
mkdir -p client/src/pages
mkdir -p client/src/components/games
mkdir -p client/src/hooks
mkdir -p client/src/context
mkdir -p client/src/lib
mkdir -p content
mkdir -p data
```

---

## Passo 4 — Crea il .gitignore

```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Build output
dist/
client/dist/

# Database
data/*.db
data/*.db-journal

# Environment
.env

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/settings.json

# Docker
*.log
EOF
```

---

## Passo 5 — Crea il file .env.example

```bash
cat > .env.example << 'EOF'
# Admin credentials (formato: user1:password1,user2:password2)
ADMIN_USERS=antonio:cambiami,maria:cambiami

# Password per l'accesso demo (da dare alla direttrice)
DEMO_PASSWORD=demo2026

# Secret per firmare i JWT (genera una stringa random lunga)
SESSION_SECRET=cambia-con-stringa-random-di-almeno-32-caratteri

# Porta del server
PORT=8080
EOF
```

---

## Passo 6 — Crea il tuo .env personale

```bash
cp .env.example .env
```

Ora apri `.env` in VS Code e personalizza le password. Per generare un SESSION_SECRET random:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia l'output e incollalo come valore di `SESSION_SECRET` nel `.env`.

---

## Passo 7 — Crea il docker-compose.yml

```bash
cat > docker-compose.yml << 'EOF'
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
      - ./content:/app/content
    restart: unless-stopped
EOF
```

---

## Passo 8 — Crea un README.md base

```bash
cat > README.md << 'EOF'
# AI Avventura 🤖🎮

Applicazione educativa gamificata per insegnare i fondamenti dell'AI generativa (rischi e opportunità) a bambini di 9 anni.

## Quick Start

```bash
cp .env.example .env
# Edita .env con le tue credenziali
docker compose up --build
```

Apri http://localhost:8080

## Accessi

- **Bambini:** inserisci il codice sessione + nome squadra
- **Admin:** http://localhost:8080/admin (user e password da .env)
- **Demo:** http://localhost:8080/demo (password da .env)

## Personalizzare le domande

Modifica i file JSON nella cartella `content/` e riavvia il container.
EOF
```

---

## Passo 9 — Copia il prompt di Claude Code nel repo

Il file `CLAUDE_CODE_PROMPT.md` che hai scaricato dalla chat precedente va copiato nella root del progetto:

- Se lo hai nella cartella Downloads:
```bash
cp ~/Downloads/CLAUDE_CODE_PROMPT.md .
```

- Oppure in VS Code: trascina il file nella root del progetto nell'explorer a sinistra.

Verifica che sia al posto giusto:
```bash
ls CLAUDE_CODE_PROMPT.md
```

---

## Passo 10 — Commit iniziale e push

```bash
git add .
git status
```

Dovresti vedere:
```
new file:   .env.example
new file:   .gitignore
new file:   CLAUDE_CODE_PROMPT.md
new file:   README.md
new file:   docker-compose.yml
```

(NON devi vedere `.env` — è nel .gitignore)

```bash
git commit -m "chore: initial project scaffold"
git branch -M main
git push -u origin main
```

---

## Passo 11 — Verifica la struttura finale

```bash
find . -not -path './node_modules/*' -not -path './.git/*' -not -name '.env' | head -30
```

Dovresti vedere:
```
.
./CLAUDE_CODE_PROMPT.md
./README.md
./.env.example
./.gitignore
./docker-compose.yml
./server
./server/routes
./client
./client/src
./client/src/pages
./client/src/components
./client/src/components/games
./client/src/hooks
./client/src/context
./client/src/lib
./content
./data
```

---

## Passo 12 — Avvia Claude Code

Apri Claude Code nella versione web (claude.ai/code o il link che usi).

Nella prima richiesta scrivi:

```
Leggi il file CLAUDE_CODE_PROMPT.md nella root del progetto e sviluppa l'applicazione seguendo tutte le istruzioni. Parti dal backend: prima server/db.js, poi server/auth.js, poi le routes, poi SSE, poi index.js. Crea anche i 4 file JSON nella cartella content/. Dopo il backend funzionante, passa al frontend React con Vite.
```

---

## Note importanti

- **Docker Desktop deve essere avviato** prima di fare `docker compose up --build`
- Le cartelle vuote (`server/routes`, `client/src/pages`, ecc.) servono come guida a Claude Code — le popolerà lui
- Il file `.env` con le password reali NON va mai committato (è nel .gitignore)
- La cartella `data/` conterrà il database SQLite — anche questa è gitignored
- Quando Claude Code avrà finito, potrai testare con `docker compose up --build` e aprire http://localhost:8080
