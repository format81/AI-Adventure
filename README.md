# AI Adventure

An educational gamified web application that teaches children (ages 9+) about Generative AI fundamentals, risks, and opportunities through 4 interactive games.

Built for classroom use with real-time multiplayer via Server-Sent Events, teacher-controlled game flow, and a demo mode for standalone testing.

## Features

- **4 Interactive Games**: Who Wrote It?, AI Traffic Light, Fake Detective, Superpower or Superdanger?
- **Real-time Multiplayer**: Students join with a session code, teacher controls the flow
- **Multi-language UI**: Italian and English included, easily extensible to other languages
- **Editable Content**: Game questions are JSON files — swap them without touching code
- **Demo Mode**: Try all games standalone without a classroom session
- **CSV Export**: Download session results for analysis
- **Mobile-friendly**: Designed for tablets and phones with kid-friendly touch targets
- **Single Docker image**: Easy to deploy anywhere

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

Open http://localhost:8080

## Access

| Role | URL | Credentials |
|------|-----|-------------|
| Students | `/` | Session code + team name |
| Teacher | `/admin` | Username & password from `ADMIN_USERS` env var |
| Demo | `/demo` | Password from `DEMO_PASSWORD` env var |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_USERS` | Admin accounts in `user1:pwd1,user2:pwd2` format | _(none)_ |
| `DEMO_PASSWORD` | Password for demo mode | _(none)_ |
| `SESSION_SECRET` | JWT signing secret (min 32 chars) | `dev-secret-change-me` |
| `PORT` | Server port | `8080` |

## Customizing Game Content

Game questions are stored as JSON files in the `content/` directory:

| File | Game |
|------|------|
| `game1-who-wrote-it.json` | Human vs AI text detection |
| `game2-traffic-light.json` | AI ethics traffic light |
| `game3-fake-detective.json` | Fake news clue detection |
| `game4-superpower.json` | Positive vs negative AI uses |

Edit these files and restart the container. See `content/examples/` for English versions you can use as templates.

## Internationalization (i18n)

### UI Language

The web interface supports language selection (IT/EN) via a selector in the top-right corner. The selected language is persisted in `localStorage`.

To add a new language:

1. Create a new file `client/src/i18n/{lang-code}.json` (copy `en.json` as template)
2. Translate all values (keep the keys unchanged)
3. Import it in `client/src/i18n/I18nContext.jsx`:
   ```js
   import fr from './fr.json';
   const LANGUAGES = { it, en, fr };
   ```
4. Add the label in `client/src/components/LanguageSelector.jsx`:
   ```js
   const LANG_LABELS = { it: 'IT', en: 'EN', fr: 'FR' };
   ```
5. Rebuild: `docker compose up --build`

### Game Content Language

Game content (questions, explanations) is separate from the UI and loaded from JSON files in `content/`. The default content is in Italian. English examples are provided in `content/examples/`.

To switch content language, replace the files in `content/` with your translated versions.

### Backend Messages

Server-side error messages and CSV export headers are automatically localized based on the browser's `Accept-Language` header. To add a new language, edit `server/i18n.js`.

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Real-time**: Server-Sent Events (SSE)
- **Container**: Docker multi-stage build

## Deploy to Azure Container Apps

### Prerequisites

- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed and logged in (`az login`)
- A valid Azure subscription

### Deployment Steps

1. **Configure environment variables** (optional — edit `deploy-azure.sh` or export them):
   ```bash
   export ADMIN_USERS="teacher1:securepassword"
   export DEMO_PASSWORD="demo2026"
   export SESSION_SECRET="$(openssl rand -hex 32)"
   ```

2. **Run the deployment script**:
   ```bash
   chmod +x deploy-azure.sh
   ./deploy-azure.sh
   ```

   This will:
   - Create a Resource Group (`rg-ai-avventura`)
   - Create an Azure Container Registry
   - Build and push the Docker image
   - Create a Container Apps environment
   - Deploy the app with HTTPS public URL

3. **Access the app** at the URL printed at the end of the script.

### Update an Existing Deployment

```bash
# Rebuild and push image
az acr build --registry <ACR_NAME> --image ai-avventura:latest .

# Update the container app
az containerapp update \
  --name ai-avventura \
  --resource-group rg-ai-avventura \
  --image <ACR_LOGIN_SERVER>/ai-avventura:latest
```

### Tear Down

```bash
az group delete --name rg-ai-avventura --yes
```

## Project Structure

```
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── i18n/            # Language files (it.json, en.json)
│       ├── pages/           # Page components
│       ├── components/      # UI components & games
│       ├── context/         # Auth context
│       └── hooks/           # SSE hook
├── server/                  # Node.js/Express backend
│   ├── routes/              # API routes
│   ├── i18n.js              # Server-side translations
│   ├── db.js                # SQLite setup
│   ├── auth.js              # JWT authentication
│   └── sse.js               # SSE connection manager
├── content/                 # Game content (JSON, editable)
│   └── examples/            # English content templates
├── Dockerfile               # Multi-stage build
├── docker-compose.yml       # Local development setup
└── deploy-azure.sh          # Azure deployment script
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.

## License

This project is open source. Contributions are welcome!
