const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static front-end files from the parent directory (puente-html-version)
const STATIC_ROOT = path.join(__dirname, '..');
app.use('/', express.static(STATIC_ROOT));

// Serve uploaded files (profile pictures)
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

// Load lessons data
const DATA_FILE = path.join(__dirname, 'data', 'lessons.json');
let data = { lessons: [] };
try {
  data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (err) {
  console.error('Could not load lessons.json', err);
}

// Helper to ensure each lesson has 16 weeks of demo content
function ensureWeeks(lesson) {
  if (!lesson.weeks || lesson.weeks.length < 16) {
    lesson.weeks = [];
    for (let i = 1; i <= 16; i++) {
      lesson.weeks.push({
        week: i,
        title: `Week ${i}`,
        videoUrl: `https://archive.org/download/Elefant/audiobook-${lesson.id}-${i}.mp3`,
        audioUrl: `https://archive.org/download/Elefant/audiobook-${lesson.id}-${i}.mp3`,
        phrases: [
          { phrase: lesson.language === 'French' ? 'Bonjour' : 'Hello', translation: 'Hello', phonetic: lesson.language === 'French' ? 'bohn-zhoor' : 'heh-lo' },
          { phrase: lesson.language === 'French' ? 'Où est la route ?' : 'Where is the road?', translation: 'Where is the road?', phonetic: lesson.language === 'French' ? 'oo eh la root' : 'wair iz the rohd' }
        ],
        exercises: [
          {
            id: `q-${lesson.id}-${i}-1`,
            type: 'mcq',
            question: 'Choose the correct greeting',
            options: ['Hello', 'Goodbye', 'Thanks'],
            answer: 0
          },
          {
            id: `q-${lesson.id}-${i}-2`,
            type: 'mcq',
            question: 'How do you ask "Where is the market?"',
            options: lesson.language === 'French' ? ['Où est le marché?', 'Merci', 'Au revoir'] : ['Where is the market?', 'Thank you', 'See you'],
            answer: 0
          }
        ]
      });
    }
  }
}

data.lessons.forEach(ensureWeeks);

// Persistent progress store (saved to JSON file)
const PROGRESS_FILE = path.join(__dirname, 'data', 'progress.json');
let progressStore = {};
try {
  if (fs.existsSync(PROGRESS_FILE)) {
    progressStore = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')) || {};
  }
} catch (err) {
  console.warn('Could not load progress.json', err);
  progressStore = {};
}

function saveProgress() {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progressStore, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to save progress', err);
  }
}

// POST /api/login — demo accepts any credentials and returns token + user
app.post('/api/login', (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'missing email' });
  const token = 'demo-token-' + Math.random().toString(36).slice(2, 9);
  const user = { email };
  res.json({ token, user });
});

// GET /api/lessons — list of lessons
app.get('/api/lessons', (req, res) => {
  const list = data.lessons.map(l => ({ id: l.id, title: l.title, language: l.language, summary: l.summary, audience: l.audience || 'all' }));
  res.json({ lessons: list });
});

// GET /api/lesson/:id — lesson metadata
app.get('/api/lesson/:id', (req, res) => {
  const id = req.params.id;
  const lesson = data.lessons.find(l => l.id === id);
  if (!lesson) return res.status(404).json({ error: 'not found' });
  res.json({ id: lesson.id, title: lesson.title, language: lesson.language, audience: lesson.audience || 'all', summary: lesson.summary, weeks: lesson.weeks.map(w => ({ week: w.week, title: w.title })) });
});

// GET /api/lesson/:id/week/:week — week content
app.get('/api/lesson/:id/week/:week', (req, res) => {
  const id = req.params.id;
  const weekN = parseInt(req.params.week, 10);
  const lesson = data.lessons.find(l => l.id === id);
  if (!lesson) return res.status(404).json({ error: 'not found' });
  const week = lesson.weeks.find(w => w.week === weekN);
  if (!week) return res.status(404).json({ error: 'week not found' });
  res.json(week);
});

// POST /api/progress — store progress in-memory
app.post('/api/progress', (req, res) => {
  const { email, lessonId, week, result } = req.body || {};
  if (!email || !lessonId) return res.status(400).json({ error: 'missing fields' });
  const key = `${email}:${lessonId}`;
  progressStore[key] = progressStore[key] || { completed: [] };
  if (week && !progressStore[key].completed.includes(week)) progressStore[key].completed.push(week);
  if (result) progressStore[key].lastResult = result;
  // Persist to disk
  saveProgress();
  res.json({ ok: true, progress: progressStore[key] });
});

// POST /api/profile/photo - accept base64 dataUrl and save to server
app.post('/api/profile/photo', (req, res) => {
  const { email, dataUrl } = req.body || {};
  if (!email || !dataUrl) return res.status(400).json({ error: 'missing email or dataUrl' });
  // dataUrl expected like: data:image/png;base64,....
  const matches = dataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/);
  if (!matches) return res.status(400).json({ error: 'invalid dataUrl' });
  const mime = matches[1];
  const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
  const b64 = matches[3];
  const buffer = Buffer.from(b64, 'base64');
  const safeEmail = email.replace(/[^a-z0-9@._-]/gi, '_');
  const filename = `${safeEmail}-${Date.now()}.${ext}`;
  const outPath = path.join(UPLOADS_DIR, filename);
  try {
    fs.writeFileSync(outPath, buffer);
    // return path relative to server root
    const url = `/uploads/${filename}`;
    return res.json({ ok: true, url });
  } catch (err) {
    console.error('Failed to save uploaded file', err);
    return res.status(500).json({ error: 'failed to save file' });
  }
});

// GET /api/progress?email=&lessonId=
app.get('/api/progress', (req, res) => {
  const { email, lessonId } = req.query;
  if (!email || !lessonId) return res.json({ progress: null });
  const key = `${email}:${lessonId}`;
  res.json({ progress: progressStore[key] || null });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Puente mock server running on http://localhost:${PORT}`));
