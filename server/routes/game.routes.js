const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { stmts } = require('../db');
const { broadcast } = require('../sse');
const { msg } = require('../i18n');

const router = Router();

// Game content loaded at boot (set by index.js)
let gameContent = null;
function setGameContent(content) { gameContent = content; }

// GET /api/game/content — return game content for frontend
router.get('/content', (req, res) => {
  res.json(gameContent);
});

// POST /api/game/join — join a session
router.post('/join', (req, res) => {
  const { sessionCode, teamName } = req.body;
  if (!sessionCode || !teamName || !teamName.trim()) {
    return res.status(400).json({ error: msg(req, 'sessionCodeAndTeamRequired') });
  }

  const session = stmts.getSessionByCode.get(sessionCode.toUpperCase());
  if (!session) {
    return res.status(404).json({ error: msg(req, 'sessionNotFoundCheckCode') });
  }
  if (session.status === 'completed') {
    return res.status(400).json({ error: msg(req, 'sessionAlreadyEnded') });
  }

  // Check if team already exists
  const existing = stmts.getTeamBySessionAndName.get(session.id, teamName.trim());
  if (existing) {
    return res.json({ teamId: existing.id, sessionId: session.id });
  }

  const teamId = uuidv4();
  try {
    stmts.createTeam.run(teamId, session.id, teamName.trim());
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: msg(req, 'teamNameTaken') });
    }
    throw err;
  }

  const teamCount = stmts.countTeams.get(session.id).count;
  broadcast(session.id, 'team:joined', { teamName: teamName.trim(), teamCount });

  res.status(201).json({ teamId, sessionId: session.id });
});

// GET /api/game/:sessionId/state — get session state
router.get('/:sessionId/state', (req, res) => {
  const session = stmts.getSession.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: msg(req, 'sessionNotFound') });
  res.json({
    status: session.status,
    stage: session.current_stage,
    questionIndex: session.current_question,
  });
});

// POST /api/game/respond — submit answer
router.post('/respond', (req, res) => {
  const { sessionId, teamId, game, questionIndex, answer } = req.body;
  if (!sessionId || !teamId || !game || questionIndex === undefined || answer === undefined) {
    return res.status(400).json({ error: msg(req, 'incompleteData') });
  }

  const session = stmts.getSession.get(sessionId);
  if (!session) return res.status(404).json({ error: msg(req, 'sessionNotFound') });
  if (session.status !== 'active') {
    return res.status(400).json({ error: msg(req, 'sessionNotActive') });
  }

  const team = stmts.getTeam.get(teamId);
  if (!team || team.session_id !== sessionId) {
    return res.status(404).json({ error: msg(req, 'teamNotFound') });
  }

  // Check for duplicate response
  const existingResp = stmts.getResponse.get(sessionId, teamId, game, questionIndex);
  if (existingResp) {
    return res.status(409).json({ error: msg(req, 'alreadyAnswered') });
  }

  // Validate and score the answer
  const { correct, points, explanation } = validateAnswer(game, questionIndex, answer);

  const responseId = uuidv4();
  stmts.createResponse.run(responseId, sessionId, teamId, game, questionIndex, JSON.stringify(answer), correct ? 1 : 0, points);

  // Broadcast response count update
  const responseCount = stmts.getResponseCountForQuestion.get(sessionId, game, questionIndex).count;
  broadcast(sessionId, 'response:received', { game, questionIndex, responseCount });

  res.json({ correct, points, explanation });
});

// GET /api/game/:sessionId/scores — live scoreboard
router.get('/:sessionId/scores', (req, res) => {
  const session = stmts.getSession.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: msg(req, 'sessionNotFound') });
  const scores = stmts.getTeamScores.all(req.params.sessionId);
  res.json(scores);
});

function validateAnswer(game, questionIndex, answer) {
  if (!gameContent) return { correct: false, points: 0, explanation: '' };

  if (game === 'game1') {
    const q = gameContent.game1.questions[questionIndex];
    if (!q) return { correct: false, points: 0, explanation: '' };
    const correct = answer === q.answer;
    return { correct, points: correct ? gameContent.game1.pointsPerCorrect : 0, explanation: q.explanation };
  }

  if (game === 'game2') {
    const q = gameContent.game2.questions[questionIndex];
    if (!q) return { correct: false, points: 0, explanation: '' };
    const correct = answer === q.answer;
    return { correct, points: correct ? gameContent.game2.pointsPerCorrect : 0, explanation: q.explanation };
  }

  if (game === 'game3') {
    const q = gameContent.game3.questions[questionIndex];
    if (!q) return { correct: false, points: 0, explanation: '' };
    // Answer should be an array of option ids that the team thinks are fake
    const fakeIds = q.options.filter(o => o.isFake).map(o => o.id);
    const answerIds = Array.isArray(answer) ? answer.sort() : [];
    const correct = JSON.stringify(answerIds) === JSON.stringify(fakeIds.sort());
    return { correct, points: correct ? gameContent.game3.pointsPerCorrect : 0, explanation: q.explanation };
  }

  if (game === 'game4') {
    const q = gameContent.game4.questions[questionIndex];
    if (!q) return { correct: false, points: 0, explanation: '' };
    const correct = answer === q.type;
    return { correct, points: correct ? gameContent.game4.pointsPerCorrect : 0, explanation: `${q.emoji} ${q.text}` };
  }

  return { correct: false, points: 0, explanation: '' };
}

module.exports = router;
module.exports.setGameContent = setGameContent;
