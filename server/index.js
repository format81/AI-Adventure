const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initAdmins } = require('./auth');
const { addConnection } = require('./sse');
const { msg } = require('./i18n');

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
      console.error(`ERROR: Missing content file: ${filepath}`);
      process.exit(1);
    }
    try {
      const raw = fs.readFileSync(filepath, 'utf-8');
      const data = JSON.parse(raw);
      validateGameContent(key, data, filename);
      content[key] = data;
      console.log(`Content loaded: ${filename} (${data.questions.length} questions)`);
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.error(`ERROR: Invalid JSON in ${filename}: ${err.message}`);
      } else {
        console.error(`ERROR in ${filename}: ${err.message}`);
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
      throw new Error(`Missing required field: "${field}" in ${filename}`);
    }
  }
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error(`"questions" must be a non-empty array in ${filename}`);
  }

  // Game-specific validation
  if (key === 'game1') {
    data.questions.forEach((q, i) => {
      if (!q.text || !q.answer || !q.explanation) throw new Error(`game1 question ${i}: missing fields (text, answer, explanation) in ${filename}`);
    });
  } else if (key === 'game2') {
    data.questions.forEach((q, i) => {
      if (!q.scenario || !q.answer || !q.explanation) throw new Error(`game2 question ${i}: missing fields (scenario, answer, explanation) in ${filename}`);
    });
  } else if (key === 'game3') {
    data.questions.forEach((q, i) => {
      if (!q.claim || !q.options || !q.explanation) throw new Error(`game3 question ${i}: missing fields (claim, options, explanation) in ${filename}`);
    });
  } else if (key === 'game4') {
    data.questions.forEach((q, i) => {
      if (!q.text || !q.type || !q.emoji) throw new Error(`game4 question ${i}: missing fields (text, type, emoji) in ${filename}`);
    });
  }
}

const gameContent = loadGameContent();

// --- Initialize Express ---
const app = express();
const PORT = process.env.PORT || 8080;
const isProd = process.env.NODE_ENV === 'production';

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Let the SPA handle its own CSP
}));

// CORS configuration
if (isProd) {
  app.use(cors({ origin: false })); // Same-origin in production
} else {
  app.use(cors()); // Permissive in development
}

// Body parsing
app.use(express.json());

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  handler: (req, res) => {
    res.status(429).json({ error: msg(req, 'tooManyAttempts') });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  handler: (req, res) => {
    res.status(429).json({ error: msg(req, 'tooManyRequests') });
  },
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
  console.log(`AI Adventure server running on port ${PORT}`);
  console.log(`Environment: ${isProd ? 'production' : 'development'}`);
});
