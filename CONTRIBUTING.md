# Contributing to AI Adventure

Thank you for your interest in contributing! This project aims to teach children about AI literacy in an engaging way, and we welcome contributions from educators, developers, and translators.

## How to Contribute

### Translate to a New Language

One of the easiest and most impactful ways to contribute is adding a new language.

**UI translations** (buttons, labels, messages):

1. Copy `client/src/i18n/en.json` to `client/src/i18n/{lang-code}.json`
2. Translate all string values (keep JSON keys unchanged)
3. Import your file in `client/src/i18n/I18nContext.jsx`
4. Add the language label in `client/src/components/LanguageSelector.jsx`
5. Submit a pull request

**Game content translations**:

1. Copy the English examples from `content/examples/` to `content/examples/game*.{lang}.json`
2. Translate questions, explanations, scenarios, and options
3. Keep the `answer` and `type` field values unchanged (`umano`, `ai`, `verde`, `giallo`, `rosso`, `potere`, `pericolo`) — these are internal identifiers
4. Submit a pull request

**Server-side messages**:

1. Add a new language block in `server/i18n.js` following the existing pattern
2. Submit a pull request

### Add or Improve Game Content

- Edit the JSON files in `content/` to improve questions, fix errors, or add new ones
- Each game has a specific structure — refer to existing files as templates
- Test your changes locally with `docker compose up --build`

### Report Bugs or Suggest Features

- Open an issue on GitHub describing the bug or feature request
- Include steps to reproduce for bugs
- For features, explain the educational context

### Submit Code Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-improvement`
3. Make your changes
4. Test locally: `docker compose up --build`
5. Commit with clear messages
6. Open a pull request with a description of what you changed and why

## Development Setup

```bash
# Clone the repository
git clone https://github.com/format81/AI-Adventure.git
cd AI-Adventure

# Create environment file
cp .env.example .env

# Run with Docker
docker compose up --build

# Or run without Docker (requires Node.js 20+)
npm install
npm run dev:server &
npm run dev:client
```

## Code Style

- **Code and comments**: English
- **Game content**: Italian by default (the app ships configured for Italian schools), with English examples in `content/examples/`
- **UI strings**: Never hardcode — always use the i18n system (`useI18n` hook / `t()` function)
- **CSS**: Inline styles (CSS-in-JS) per component — no external CSS frameworks

## Architecture Notes

- **Frontend**: React with Vite, no external state management (Context API + hooks)
- **Backend**: Express with synchronous SQLite (better-sqlite3) — designed for classroom-scale use
- **Real-time**: Server-Sent Events (SSE), not WebSocket — simpler and sufficient for one-way broadcast
- **Deployment**: Single Docker container, stateless except for SQLite volume

## Questions?

Open an issue or start a discussion on GitHub. We're happy to help!
