const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { stmts } = require('../db');
const { requireAdmin } = require('../auth');
const { broadcast } = require('../sse');

const router = Router();

// Characters for session codes (no ambiguous: 0/O, 1/I/L)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
  } while (stmts.codeExists.get(code));
  return code;
}

// GET /api/sessions — list all sessions
router.get('/', requireAdmin, (req, res) => {
  const sessions = stmts.listSessions.all();
  res.json(sessions);
});

// POST /api/sessions — create session
router.post('/', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Il nome della sessione è obbligatorio' });
  }
  const id = uuidv4();
  const code = generateCode();
  stmts.createSession.run(id, code, name.trim(), req.user.username);
  const session = stmts.getSession.get(id);
  res.status(201).json(session);
});

// GET /api/sessions/:id — session detail
router.get('/:id', requireAdmin, (req, res) => {
  const session = stmts.getSession.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessione non trovata' });
  const teams = stmts.listTeams.all(session.id);
  const scores = stmts.getTeamScores.all(session.id);
  const gameStats = stmts.getGameStats.all(session.id);
  res.json({ ...session, teams, scores, gameStats });
});

// POST /api/sessions/:id/start
router.post('/:id/start', requireAdmin, (req, res) => {
  const session = stmts.getSession.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessione non trovata' });
  if (session.status !== 'lobby' && session.status !== 'paused') {
    return res.status(400).json({ error: 'La sessione non può essere avviata dallo stato attuale' });
  }
  stmts.updateSessionStatus.run('active', session.id);
  broadcast(session.id, 'session:start', { status: 'active' });
  res.json({ status: 'active' });
});

// POST /api/sessions/:id/advance
router.post('/:id/advance', requireAdmin, (req, res) => {
  const session = stmts.getSession.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessione non trovata' });
  if (session.status !== 'active') {
    return res.status(400).json({ error: 'La sessione non è attiva' });
  }

  const { stage, questionIndex } = req.body;
  if (stage !== undefined) {
    stmts.updateSessionStage.run(stage, questionIndex ?? 0, session.id);
  } else {
    // Just advance question index
    stmts.updateSessionStage.run(session.current_stage, (session.current_question + 1), session.id);
  }

  const updated = stmts.getSession.get(session.id);
  broadcast(session.id, 'stage:change', { stage: updated.current_stage, questionIndex: updated.current_question });
  res.json({ stage: updated.current_stage, questionIndex: updated.current_question });
});

// POST /api/sessions/:id/pause
router.post('/:id/pause', requireAdmin, (req, res) => {
  const session = stmts.getSession.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessione non trovata' });
  stmts.updateSessionStatus.run('paused', session.id);
  broadcast(session.id, 'session:pause', { status: 'paused' });
  res.json({ status: 'paused' });
});

// POST /api/sessions/:id/complete
router.post('/:id/complete', requireAdmin, (req, res) => {
  const session = stmts.getSession.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessione non trovata' });
  stmts.completeSession.run(session.id);
  broadcast(session.id, 'session:complete', { status: 'completed' });
  res.json({ status: 'completed' });
});

// DELETE /api/sessions/:id
router.delete('/:id', requireAdmin, (req, res) => {
  const session = stmts.getSession.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessione non trovata' });
  stmts.deleteSession.run(session.id);
  res.json({ deleted: true });
});

module.exports = router;
