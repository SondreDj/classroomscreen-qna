const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const dataPath = path.join(__dirname, 'data', 'qna.json');

app.use(express.static('public'));

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});