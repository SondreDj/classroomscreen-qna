const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'secret123';

const dataPath = path.join(__dirname, 'data', 'qna.json');

if (!fs.existsSync(path.dirname(dataPath))) {
  fs.mkdirSync(path.dirname(dataPath));
}
if (!fs.existsSync(dataPath)) {
  fs.writeFileSync(dataPath, '{}');
}

app.use(express.static('public'));
app.use(express.json());

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
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