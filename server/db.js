const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'avventura.db'));

// Performance pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'lobby',
    current_stage TEXT DEFAULT 'intro',
    current_question INTEGER DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    joined_at TEXT DEFAULT (datetime('now')),
    UNIQUE(session_id, name)
  );

  CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    game TEXT NOT NULL,
    question_index INTEGER NOT NULL,
    answer TEXT NOT NULL,
    correct INTEGER NOT NULL,
    points INTEGER NOT NULL,
    response_time_ms INTEGER DEFAULT 0,
    responded_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migration: add response_time_ms column if missing
try {
  db.exec(`ALTER TABLE responses ADD COLUMN response_time_ms INTEGER DEFAULT 0`);
} catch (e) {
  // Column already exists — ignore
}

// Prepared statements
const stmts = {
  // Admins
  upsertAdmin: db.prepare(`
    INSERT INTO admins (username, password_hash) VALUES (?, ?)
    ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash
  `),
  getAdmin: db.prepare('SELECT * FROM admins WHERE username = ?'),

  // Sessions
  createSession: db.prepare('INSERT INTO sessions (id, code, name, created_by) VALUES (?, ?, ?, ?)'),
  getSession: db.prepare('SELECT * FROM sessions WHERE id = ?'),
  getSessionByCode: db.prepare('SELECT * FROM sessions WHERE code = ?'),
  listSessions: db.prepare(`
    SELECT s.*, COUNT(t.id) as team_count
    FROM sessions s LEFT JOIN teams t ON t.session_id = s.id
    GROUP BY s.id ORDER BY s.created_at DESC
  `),
  updateSessionStatus: db.prepare('UPDATE sessions SET status = ? WHERE id = ?'),
  updateSessionStage: db.prepare('UPDATE sessions SET current_stage = ?, current_question = ? WHERE id = ?'),
  completeSession: db.prepare("UPDATE sessions SET status = 'completed', completed_at = datetime('now') WHERE id = ?"),
  deleteSession: db.prepare('DELETE FROM sessions WHERE id = ?'),
  codeExists: db.prepare('SELECT 1 FROM sessions WHERE code = ?'),

  // Teams
  createTeam: db.prepare('INSERT INTO teams (id, session_id, name) VALUES (?, ?, ?)'),
  getTeam: db.prepare('SELECT * FROM teams WHERE id = ?'),
  getTeamBySessionAndName: db.prepare('SELECT * FROM teams WHERE session_id = ? AND name = ?'),
  listTeams: db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY joined_at'),
  countTeams: db.prepare('SELECT COUNT(*) as count FROM teams WHERE session_id = ?'),

  // Responses
  createResponse: db.prepare('INSERT INTO responses (id, session_id, team_id, game, question_index, answer, correct, points, response_time_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  getResponse: db.prepare('SELECT * FROM responses WHERE session_id = ? AND team_id = ? AND game = ? AND question_index = ?'),
  getTeamScores: db.prepare(`
    SELECT t.id, t.name, COALESCE(SUM(r.points), 0) as total_points, COUNT(r.id) as total_responses, SUM(r.correct) as correct_responses
    FROM teams t LEFT JOIN responses r ON r.team_id = t.id
    WHERE t.session_id = ?
    GROUP BY t.id ORDER BY total_points DESC
  `),
  getSessionResponses: db.prepare(`
    SELECT r.*, t.name as team_name
    FROM responses r JOIN teams t ON t.id = r.team_id
    WHERE r.session_id = ?
    ORDER BY r.game, r.question_index, t.name
  `),
  getResponseCountForQuestion: db.prepare('SELECT COUNT(*) as count FROM responses WHERE session_id = ? AND game = ? AND question_index = ?'),
  getGameStats: db.prepare(`
    SELECT game, COUNT(*) as total, SUM(correct) as correct_count
    FROM responses WHERE session_id = ?
    GROUP BY game
  `),
};

module.exports = { db, stmts };
