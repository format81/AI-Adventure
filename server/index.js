const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initAdmins } = require('./auth');
const { addConnection } = require('./sse');

// --- Load and validate game content ---
const CONTENT_DIR = path.join(__dirname, '..', 'content');

function loadGameContent() {
  const files = {
    game1: 'game1-who-wrote-it.json',
    game2: 'game2-traffic-light.json',
    game3: 'game3-fake-detective.json',
    game4: 'game4-superpower.json',
  };

  const content = {};
  for (const [key, filename] of Object.entries(files)) {
    const filepath = path.join(CONTENT_DIR, filename);
    if (!fs.existsSync(filepath)) {
      console.error(`ERRORE: File contenuto mancante: ${filepath}`);
      process.exit(1);
    }
    try {
      const raw = fs.readFileSync(filepath, 'utf-8');
      const data = JSON.parse(raw);
      validateGameContent(key, data, filename);
      content[key] = data;
      console.log(`Contenuto caricato: ${filename} (${data.questions.length} domande)`);
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.error(`ERRORE: JSON non valido in ${filename}: ${err.message}`);
      } else {
        console.error(`ERRORE in ${filename}: ${err.message}`);
      }
      process.exit(1);
    }
  }
  return content;
}

function validateGameContent(key, data, filename) {
  const required = ['title', 'emoji', 'description', 'rules', 'pointsPerCorrect', 'questions'];
  for (const field of required) {
    if (data[field] === undefined) {
      throw new Error(`Campo obbligatorio mancante: "${field}" in ${filename}`);
    }
  }
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error(`"questions" deve essere un array non vuoto in ${filename}`);
  }

  // Game-specific validation
  if (key === 'game1') {
    data.questions.forEach((q, i) => {
      if (!q.text || !q.answer || !q.explanation) throw new Error(`game1 domanda ${i}: campi mancanti (text, answer, explanation) in ${filename}`);
    });
  } else if (key === 'game2') {
    data.questions.forEach((q, i) => {
      if (!q.scenario || !q.answer || !q.explanation) throw new Error(`game2 domanda ${i}: campi mancanti (scenario, answer, explanation) in ${filename}`);
    });
  } else if (key === 'game3') {
    data.questions.forEach((q, i) => {
      if (!q.claim || !q.options || !q.explanation) throw new Error(`game3 domanda ${i}: campi mancanti (claim, options, explanation) in ${filename}`);
    });
  } else if (key === 'game4') {
    data.questions.forEach((q, i) => {
      if (!q.text || !q.type || !q.emoji) throw new Error(`game4 domanda ${i}: campi mancanti (text, type, emoji) in ${filename}`);
    });
  }
}

const gameContent = loadGameContent();

// --- Initialize Express ---
const app = express();
const PORT = process.env.PORT || 8080;
const isProd = process.env.NODE_ENV === 'production';

// Security
app.use(helmet({
  contentSecurityPolicy: false, // Let the SPA handle its own CSP
}));

// CORS
if (isProd) {
  app.use(cors({ origin: false })); // Same-origin in prod
} else {
  app.use(cors()); // Permissive in dev
}

// Body parsing
app.use(express.json());

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Troppi tentativi. Riprova tra un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Troppe richieste. Riprova tra poco.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize admin users
initAdmins();

// Set game content on game routes
const gameRoutes = require('./routes/game.routes');
gameRoutes.setGameContent(gameContent);

// --- Routes ---
app.use('/api/auth', loginLimiter, require('./routes/auth.routes'));
app.use('/api/sessions', require('./routes/session.routes'));
app.use('/api/game', gameLimiter, gameRoutes);
app.use('/api/results', require('./routes/results.routes'));

// --- SSE Endpoint ---
app.get('/api/sse/:sessionId', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });
  res.write(': connected\n\n');
  addConnection(req.params.sessionId, res);
});

// --- Static files (production) ---
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // SPA fallback: all non-API routes return index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(publicDir, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`AI Avventura server running on port ${PORT}`);
  console.log(`Environment: ${isProd ? 'production' : 'development'}`);
});
