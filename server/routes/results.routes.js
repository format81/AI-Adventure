const { Router } = require('express');
const { stmts } = require('../db');
const { requireAdmin } = require('../auth');

const router = Router();

// GET /api/results/:sessionId — full results JSON
router.get('/:sessionId', requireAdmin, (req, res) => {
  const session = stmts.getSession.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Sessione non trovata' });

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
  if (!session) return res.status(404).json({ error: 'Sessione non trovata' });

  const responses = stmts.getSessionResponses.all(session.id);

  const header = 'Squadra,Gioco,Domanda,Risposta,Corretto,Punti,Data\n';
  const rows = responses.map(r =>
    `"${r.team_name}","${r.game}",${r.question_index},"${r.answer}",${r.correct ? 'Sì' : 'No'},${r.points},"${r.responded_at}"`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="risultati-${session.code}.csv"`);
  res.send('\uFEFF' + header + rows); // BOM for Excel UTF-8
});

module.exports = router;
