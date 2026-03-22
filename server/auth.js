const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { stmts } = require('./db');
const { msg } = require('./i18n');

const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const BCRYPT_ROUNDS = 12;

// Initialize admin users from ADMIN_USERS env var (format: user1:pwd1,user2:pwd2)
function initAdmins() {
  const adminStr = process.env.ADMIN_USERS || '';
  if (!adminStr) {
    console.warn('WARNING: ADMIN_USERS env var not set. No admin accounts available.');
    return;
  }
  const pairs = adminStr.split(',').filter(Boolean);
  for (const pair of pairs) {
    const [username, password] = pair.split(':');
    if (!username || !password) {
      console.warn(`WARNING: Invalid ADMIN_USERS entry: "${pair}". Expected format user:password`);
      continue;
    }
    const existing = stmts.getAdmin.get(username);
    if (existing) {
      const same = bcrypt.compareSync(password, existing.password_hash);
      if (!same) {
        const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
        stmts.upsertAdmin.run(username, hash);
        console.log(`Admin "${username}" password updated.`);
      }
    } else {
      const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
      stmts.upsertAdmin.run(username, hash);
      console.log(`Admin "${username}" created.`);
    }
  }
}

// Generate JWT
function signToken(payload, expiresIn) {
  return jwt.sign(payload, SECRET, { expiresIn });
}

// Verify JWT
function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

// Middleware: require admin JWT
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: msg(req, 'missingToken') });
  }
  try {
    const payload = verifyToken(auth.slice(7));
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: msg(req, 'adminOnly') });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: msg(req, 'invalidToken') });
  }
}

// Middleware: require demo or admin JWT
function requireDemo(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: msg(req, 'missingToken') });
  }
  try {
    const payload = verifyToken(auth.slice(7));
    if (payload.role !== 'demo' && payload.role !== 'admin') {
      return res.status(403).json({ error: msg(req, 'unauthorized') });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: msg(req, 'invalidToken') });
  }
}

module.exports = { initAdmins, signToken, verifyToken, requireAdmin, requireDemo, SECRET };
