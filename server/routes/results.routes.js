const { Router } = require('express');
const { stmts } = require('../db');
const { requireAdmin } = require('../auth');
const { msg, getLang, messages } = require('../i18n');

const router = Router();

// GET /api/results/:sessionId — full results JSON
router.get('/:sessionId', requireAdmin, (req, res) => {
  const session = stmts.getSession.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: msg(req, 'sessionNotFound') });

  const scores = stmts.getTeamScores.all(session.id);
  const gameStats = stmts.getGameStats.all(session.id);
  const responses = stmts.getSessionResponses.all(session.id);

  res.json({
    session: { id: session.id, name: session.name, code: session.code, status: session.status },
    scores,
    gameStats,
    responses,
  });
});

// GET /api/results/:sessionId/csv — export CSV
router.get('/:sessionId/csv', requireAdmin, (req, res) => {
  const session = stmts.getSession.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: msg(req, 'sessionNotFound') });

  const lang = getLang(req);
  const m = messages[lang] || messages.it;
  const responses = stmts.getSessionResponses.all(session.id);

  const header = `${m.csvTeam},${m.csvGame},${m.csvQuestion},${m.csvAnswer},${m.csvCorrect},${m.csvPoints},${m.csvDate}\n`;
  const rows = responses.map(r =>
    `"${r.team_name}","${r.game}",${r.question_index},"${r.answer}",${r.correct ? m.csvYes : m.csvNo},${r.points},"${r.responded_at}"`
  ).join('\n');

  const filename = `${m.csvFilename}-${session.code}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + header + rows); // BOM for Excel UTF-8
});

module.exports = router;
