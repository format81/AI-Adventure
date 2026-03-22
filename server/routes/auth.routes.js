const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { stmts } = require('../db');
const { signToken } = require('../auth');
const { msg } = require('../i18n');

const router = Router();

// POST /api/auth/admin-login
router.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: msg(req, 'missingCredentials') });
  }
  const admin = stmts.getAdmin.get(username);
  if (!admin) {
    return res.status(401).json({ error: msg(req, 'invalidCredentials') });
  }
  const valid = bcrypt.compareSync(password, admin.password_hash);
  if (!valid) {
    return res.status(401).json({ error: msg(req, 'invalidCredentials') });
  }
  const token = signToken({ username, role: 'admin' }, '4h');
  res.json({ token, username, role: 'admin' });
});

// POST /api/auth/demo-login
router.post('/demo-login', (req, res) => {
  const { password } = req.body;
  const demoPassword = process.env.DEMO_PASSWORD;
  if (!demoPassword) {
    return res.status(503).json({ error: msg(req, 'demoNotConfigured') });
  }
  if (!password) {
    return res.status(400).json({ error: msg(req, 'passwordRequired') });
  }
  if (password !== demoPassword) {
    return res.status(401).json({ error: msg(req, 'invalidDemoPassword') });
  }
  const token = signToken({ role: 'demo' }, '24h');
  res.json({ token, role: 'demo' });
});

module.exports = router;
