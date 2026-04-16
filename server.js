const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'secret123';

const SALT_ROUNDS = 10;
let hashedPassword = null;

const dataPath = path.join(__dirname, 'data', 'qna.json');

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function initHash() {
  hashedPassword = await hashPassword(ADMIN_PASSWORD);
}

const failedAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000;

function getClientId(req) {
  return req.ip || req.connection.remoteAddress || 'unknown';
}

function checkBruteForce(req, res, next) {
  const clientId = getClientId(req);
  const attempts = failedAttempts.get(clientId) || { count: 0, lockedUntil: 0 };

  if (attempts.lockedUntil > Date.now()) {
    const remaining = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
    return res.status(429).json({
      error: 'Too many failed attempts',
      retryAfter: remaining
    });
  }

  req.clientId = clientId;
  next();
}

function recordFailedAttempt(req) {
  const clientId = req.clientId;
  const attempts = failedAttempts.get(clientId) || { count: 0, lockedUntil: 0 };

  attempts.count++;

  if (attempts.count >= MAX_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + LOCKOUT_TIME;
  }

  failedAttempts.set(clientId, attempts);
}

function resetFailedAttempts(req) {
  failedAttempts.set(req.clientId, { count: 0, lockedUntil: 0 });
}

const authLimiter = rateLimit({
  windowMs: LOCKOUT_TIME,
  max: MAX_ATTEMPTS,
  handler: (req, res) => {
    const retryAfter = Math.ceil(LOCKOUT_TIME / 1000 / 60);
    return res.status(429).json({
      error: 'Too many authentication attempts',
      retryAfter
    });
  }
});

initHash();

if (!fs.existsSync(path.dirname(dataPath))) {
  fs.mkdirSync(path.dirname(dataPath));
}
if (!fs.existsSync(dataPath)) {
  fs.writeFileSync(dataPath, '{}');
}

app.use(express.static('public'));
app.use(express.json());

async function checkAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);

  try {
    const isValid = await bcrypt.compare(token, hashedPassword);

    if (!isValid) {
      recordFailedAttempt(req);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    resetFailedAttempts(req);
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function authenticate(req, res, next) {
  checkBruteForce(req, res, (err) => {
    if (err) return next(err);
    checkAuth(req, res, next);
  });
}

function getQnA() {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const today = new Date().toISOString().split('T')[0];
  return data[today] || null;
}

app.get('/api/qna', (req, res) => {
  const qna = getQnA();
  if (!qna) {
    return res.status(404).json({ error: 'No QnA found for today' });
  }
  res.json(qna);
});

app.get('/api/questions', authenticate, (req, res) => {
  let data = {};
  if (fs.existsSync(dataPath)) {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }
  res.json(data);
});

app.post('/api/questions', authenticate, (req, res) => {
  const { date, q, a } = req.body;
  if (!date || !q || !a) {
    return res.status(400).json({ error: 'Missing date, q, or a' });
  }

  let data = {};
  if (fs.existsSync(dataPath)) {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }

  data[date] = { q, a };
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  res.json({ success: true, date, q, a });
});

app.delete('/api/questions/:date', authenticate, (req, res) => {
  const { date } = req.params;

  let data = {};
  if (fs.existsSync(dataPath)) {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }

  if (!data[date]) {
    return res.status(404).json({ error: 'Question not found' });
  }

  delete data[date];
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});