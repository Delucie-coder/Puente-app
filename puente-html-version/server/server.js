const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');

const app = express();
app.use(cors());
// allow larger JSON bodies for image uploads (base64 data URLs)
app.use(bodyParser.json({ limit: '8mb' }));
app.use(bodyParser.urlencoded({ limit: '8mb', extended: true }));
app.use(express.static('../public'));

// Serve environment variables to the frontend (for Firebase/Gemini config)
app.get('/env.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  const env = {
    __firebase_config: process.env.__firebase_config || '{}',
    __initial_auth_token: process.env.__initial_auth_token || '',
    __app_id: process.env.__app_id || '',
    API_KEY: process.env.API_KEY || ''
  };
  res.send(`
    window.__firebase_config = ${JSON.stringify(env.__firebase_config)};
    window.__initial_auth_token = ${JSON.stringify(env.__initial_auth_token)};
    window.__app_id = ${JSON.stringify(env.__app_id)};
    window.API_KEY = ${JSON.stringify(env.API_KEY)};
  `);
});

// Serve static front-end files from the parent directory (puente-html-version)
const STATIC_ROOT = path.join(__dirname, '..');
app.use('/', express.static(STATIC_ROOT));

// Serve uploaded files (profile pictures)
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const id = 'r_' + Math.random().toString(36).slice(2,9);
    const safe = (file.originalname || 'file').replace(/[^a-z0-9.\-\_\.]/gi, '_');
    cb(null, `${id}-${Date.now()}-${safe}`);
  }
});
const upload = multer({ storage });

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
  // Ensure we don't overwrite existing week objects. If weeks are missing, append placeholder weeks up to 16.
  if (!lesson.weeks) lesson.weeks = [];
  const existing = {};
  lesson.weeks.forEach(w => { if (w && w.week) existing[w.week] = w; });
  for (let i = 1; i <= 16; i++) {
    if (!existing[i]) {
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
  // keep weeks sorted by week number
  lesson.weeks.sort((a, b) => (a.week || 0) - (b.week || 0));
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

// -----------------------
// Simple users store
// -----------------------
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
let users = {};
try {
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) || {};
  }
} catch (err) {
  console.warn('Could not load users.json', err);
  users = {};
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to save users', err);
  }
}

// Simple password hashing utilities (demo only)
function hashPassword(password, salt){
  salt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash: derived };
}

// Ensure a default admin exists for demo convenience
if (!users['admin@example.com']){
  const pwd = 'adminpass';
  const ph = hashPassword(pwd);
  users['admin@example.com'] = { email: 'admin@example.com', name: 'Administrator', photoUrl: null, created: Date.now(), role: 'admin', passwordHash: ph.hash, passwordSalt: ph.salt };
  saveUsers();
  console.log('Created demo admin user: admin@example.com (password: adminpass)');
}

// POST /api/login — demo accepts any credentials and returns token + user
app.post('/api/login', (req, res) => {
  const { email, name, role, password } = req.body || {};
  if (!email) return res.status(400).json({ error: 'missing email' });
  const token = 'demo-token-' + Math.random().toString(36).slice(2, 9);

  const key = String(email).toLowerCase();
  const existing = users[key];
  // If user exists and has a passwordHash, require password to authenticate
  if (existing && existing.passwordHash) {
    if (!password) return res.status(401).json({ error: 'password required' });
    const candidate = hashPassword(password, existing.passwordSalt);
    if (candidate.hash !== existing.passwordHash) return res.status(401).json({ error: 'invalid credentials' });
    // authenticated
    // persist a session token on the user record so Bearer auth works for subsequent requests
    const tokenValue = 'tkn_' + Math.random().toString(36).slice(2,22);
    existing.token = tokenValue;
    saveUsers();
    const user = Object.assign({}, existing);
    return res.json({ token: tokenValue, user });
  }

  // legacy / first-login flow: create or update simple user record without password
  users[key] = users[key] || { email: key, name: name || null, photoUrl: null, created: Date.now() };
  // accept role from client but persist it on server-side
  if (role) users[key].role = role;
  if (!users[key].role) users[key].role = 'student';
  // create a token for the session and persist it on the user record
  const tokenValue = 'tkn_' + Math.random().toString(36).slice(2,22);
  users[key].token = tokenValue;
  saveUsers();
  const user = Object.assign({}, users[key]);
  res.json({ token: tokenValue, user });
});

// POST /api/register - create a user with password (demo)
app.post('/api/register', (req, res) => {
  const { email, name, password, role } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing email or password' });
  const key = String(email).toLowerCase();
  if (users[key] && users[key].passwordHash) return res.status(409).json({ error: 'user exists' });
  const ph = hashPassword(password);
  users[key] = users[key] || { email: key, name: name || null, photoUrl: null, created: Date.now() };
  users[key].passwordHash = ph.hash;
  users[key].passwordSalt = ph.salt;
  users[key].role = role || users[key].role || 'student';
  // create token and persist
  const tokenValue = 'tkn_' + Math.random().toString(36).slice(2,22);
  users[key].token = tokenValue;
  saveUsers();
  const user = Object.assign({}, users[key]);
  res.json({ ok:true, token: tokenValue, user });
});

// Helper: get user from Authorization header (Bearer token)
function getUserFromAuth(req){
  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1];
  // find user with matching token
  for (const k of Object.keys(users)){
    const u = users[k];
    if (u && u.token === token) return u;
  }
  return null;
}

// GET user record
app.get('/api/user', (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'missing email' });
  const key = String(email).toLowerCase();
  const u = users[key] || null;
  res.json({ user: u });
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
  // Return the full lesson object (including full week objects) so the client
  // can render week content when a user opens a lesson/week without needing
  // separate per-week fetches.
  // Keep a lightweight representation for listing (/api/lessons) but here we
  // return the full lesson payload to support the dashboard UI.
  const safeLesson = Object.assign({}, lesson);
  // Ensure weeks are included (they are loaded/ensured at server start)
  safeLesson.weeks = lesson.weeks || [];
  return res.json(safeLesson);
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
app.post('/api/profile/photo', (req, res) => {
  const { dataUrl } = req.body || {};
  if (!dataUrl) return res.status(400).json({ error: 'missing params' });
  try {
    // Require authenticated user
    const authUser = getUserFromAuth(req);
    if (!authUser) return res.status(401).json({ error: 'unauthenticated' });
    const safeEmail = String(authUser.email).toLowerCase();
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: 'invalid dataUrl' });
    const mime = matches[1];
    const b64 = matches[2];
    const ext = mime.split('/')[1] || 'png';
    const filename = `${safeEmail.replace(/[^a-z0-9.\-@_]/gi, '_')}-${Date.now()}.${ext}`;
    const outPath = path.join(UPLOADS_DIR, filename);
    const buffer = Buffer.from(b64, 'base64');

    // If the user has an existing photo, attempt to remove it to avoid orphan files
    try {
      users[safeEmail] = users[safeEmail] || { email: safeEmail, name: null, photoUrl: null, created: Date.now() };
      const prevUrl = users[safeEmail].photoUrl;
      if (prevUrl) {
        const prevName = path.basename(prevUrl);
        const prevPath = path.join(UPLOADS_DIR, prevName);
        if (fs.existsSync(prevPath)) {
          try { fs.unlinkSync(prevPath); } catch (e) { console.warn('Could not delete previous photo', prevPath, e); }
        }
      }
    } catch (e) {
      console.warn('Error while cleaning previous photo', e);
    }

    fs.writeFileSync(outPath, buffer);
    // return path relative to server root
    const url = `/uploads/${filename}`;

    // associate the uploaded photo with the server-side user record
    const key = safeEmail;
    users[key] = users[key] || { email: key, name: null, photoUrl: null, created: Date.now() };
    users[key].photoUrl = url;
    saveUsers();

    // Return updated user object so the client can persist state immediately
    return res.json({ ok: true, url, user: users[key] });
  } catch (err) {
    console.error('Failed to save uploaded file', err);
    return res.status(500).json({ error: 'failed to save' });
  }
});

// POST /api/progress - accept progress updates (demo: allows unauthenticated with userId)
app.post('/api/progress', (req, res) => {
  const actor = getUserFromAuth(req);
  const { lessonId, week, progress, userId } = req.body || {};
  // allow unauthenticated clients if they provide userId (demo convenience)
  if (!actor && !userId) return res.status(401).json({ error: 'unauthenticated' });
  if (!lessonId || !week || !progress) return res.status(400).json({ error: 'missing params' });
  const userEmail = actor ? String(actor.email).toLowerCase() : String(userId).toLowerCase();
  const key = `${userEmail}:${lessonId}`;
  progressStore[key] = progressStore[key] || { byWeek: {}, updated: Date.now(), email: userEmail, lessonId };
  progressStore[key].byWeek = progressStore[key].byWeek || {};
  // store provided progress object for the specified week
  progressStore[key].byWeek[String(week)] = Object.assign({}, progress, { updated: Date.now() });
  // determine pass threshold (lesson-specific or default)
  let pass = (settingsStore && settingsStore.defaults && typeof settingsStore.defaults.passThreshold === 'number') ? settingsStore.defaults.passThreshold : 70;
  if (settingsStore && settingsStore.lessons && settingsStore.lessons[lessonId] && typeof settingsStore.lessons[lessonId].passThreshold === 'number'){
    pass = settingsStore.lessons[lessonId].passThreshold;
  }
  const bestScore = (progress && typeof progress.bestScore === 'number') ? progress.bestScore : null;
  progressStore[key].byWeek[String(week)].completed = bestScore !== null ? (bestScore >= pass) : false;
  progressStore[key].updated = Date.now();
  saveProgress();
  return res.json({ ok: true, key, progress: progressStore[key] });
});

// POST /api/profile/photo/delete - remove user's photo (demo)
app.post('/api/profile/photo/delete', (req, res) => {
  const authUser = getUserFromAuth(req);
  if (!authUser) return res.status(401).json({ error: 'unauthenticated' });
  const key = String(authUser.email).toLowerCase();
  if (!users[key] || !users[key].photoUrl) return res.json({ ok: true, removed: false });
  try {
    const url = users[key].photoUrl;
    // url is like /uploads/filename
    const filename = path.basename(url);
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) { console.warn('Could not delete file', filePath, e); }
    }
    users[key].photoUrl = null;
    saveUsers();
    return res.json({ ok: true, removed: true, user: users[key] });
  } catch (err) {
    console.error('Failed to remove user photo', err);
    return res.status(500).json({ error: 'failed to remove' });
  }
});

// -----------------------
// Settings persistence (pass thresholds, etc.)
// -----------------------
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');
let settingsStore = { defaults: { passThreshold: 70 }, lessons: {} };
try {
  if (fs.existsSync(SETTINGS_FILE)) settingsStore = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) || settingsStore;
} catch (err) { console.warn('Could not load settings.json', err); settingsStore = settingsStore; }

function saveSettings(){ try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsStore, null, 2), 'utf8'); } catch(e){ console.warn('Failed to save settings', e); } }

// GET /api/settings?lessonId=<id>
// returns { passThreshold: number, source: 'lesson'|'default' }
app.get('/api/settings', (req, res) => {
  const lessonId = req.query.lessonId;
  let pass = (settingsStore && settingsStore.defaults && typeof settingsStore.defaults.passThreshold === 'number') ? settingsStore.defaults.passThreshold : 70;
  let source = 'default';
  if (lessonId && settingsStore && settingsStore.lessons && settingsStore.lessons[lessonId] && typeof settingsStore.lessons[lessonId].passThreshold === 'number'){
    pass = settingsStore.lessons[lessonId].passThreshold;
    source = 'lesson';
  }
  res.json({ passThreshold: Number(pass), source });
});

// POST /api/settings - admin only. Body: { passThreshold: number, lessonId?: string }
app.post('/api/settings', (req, res) => {
  const actor = getUserFromAuth(req);
  if (!actor) return res.status(401).json({ error: 'unauthenticated' });
  if (actor.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const { passThreshold, lessonId } = req.body || {};
  if (passThreshold === undefined || passThreshold === null) return res.status(400).json({ error: 'missing passThreshold' });
  const num = Number(passThreshold);
  if (isNaN(num) || num < 0 || num > 100) return res.status(400).json({ error: 'passThreshold must be a number 0-100' });

  if (lessonId) {
    settingsStore.lessons = settingsStore.lessons || {};
    settingsStore.lessons[lessonId] = Object.assign(settingsStore.lessons[lessonId] || {}, { passThreshold: Math.round(num) });
  } else {
    settingsStore.defaults = settingsStore.defaults || {};
    settingsStore.defaults.passThreshold = Math.round(num);
  }
  saveSettings();
  return res.json({ ok: true, passThreshold: Math.round(num), lessonId: lessonId || null });
});

// -----------------------
// Resources persistence
// -----------------------
const RESOURCES_FILE = path.join(__dirname, 'data', 'resources.json');
let resourcesStore = [];
try {
  if (fs.existsSync(RESOURCES_FILE)) {
    resourcesStore = JSON.parse(fs.readFileSync(RESOURCES_FILE, 'utf8')) || [];
  }
} catch (err) {
  console.warn('Could not load resources.json', err);
  resourcesStore = [];
}

function saveResources() {
  try {
    fs.writeFileSync(RESOURCES_FILE, JSON.stringify(resourcesStore, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to save resources', err);
  }
}

// -----------------------
// Module video overrides (persisted server-side)
// -----------------------
const MODULE_VIDEOS_FILE = path.join(__dirname, 'data', 'module_videos.json');
let moduleVideos = {}; // structure: { [lessonId]: { [week]: url } }
try {
  if (fs.existsSync(MODULE_VIDEOS_FILE)) moduleVideos = JSON.parse(fs.readFileSync(MODULE_VIDEOS_FILE, 'utf8')) || {};
} catch (err) { console.warn('Could not load module_videos.json', err); moduleVideos = {}; }

function saveModuleVideos(){ try { fs.writeFileSync(MODULE_VIDEOS_FILE, JSON.stringify(moduleVideos, null, 2), 'utf8'); } catch(e){ console.warn('Failed to save module_videos', e); } }

// GET /api/module-video?lessonId=&week=
app.get('/api/module-video', (req, res) => {
  const { lessonId, week } = req.query;
  if (!lessonId || !week) return res.status(400).json({ error: 'missing params' });
  const lessonMap = moduleVideos[lessonId] || {};
  const url = lessonMap[String(week)] || null;
  return res.json({ lessonId, week: String(week), url });
});

// POST /api/module-video - admin required to set a canonical module video url
// body: { lessonId, week, url }
app.post('/api/module-video', (req, res) => {
  const actor = getUserFromAuth(req);
  if (!actor) return res.status(401).json({ error: 'unauthenticated' });
  if (actor.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const { lessonId, week, url } = req.body || {};
  // allow lessonId to be omitted for convenience: fall back to the first lesson in data.lessons
  const effectiveLessonId = lessonId || (data.lessons && data.lessons[0] && data.lessons[0].id);
  if (!effectiveLessonId || !week || !url) return res.status(400).json({ error: 'missing params' });
  moduleVideos[effectiveLessonId] = moduleVideos[effectiveLessonId] || {};
  moduleVideos[effectiveLessonId][String(week)] = String(url);
  saveModuleVideos();
  return res.json({ ok: true, lessonId: effectiveLessonId, week: String(week), url });
});

// -----------------------
// Module form links (persisted server-side)
// -----------------------
const MODULE_FORMS_FILE = path.join(__dirname, 'data', 'module_forms.json');
let moduleForms = {}; // structure: { [lessonId]: { [week]: formUrl } }
try {
  if (fs.existsSync(MODULE_FORMS_FILE)) moduleForms = JSON.parse(fs.readFileSync(MODULE_FORMS_FILE, 'utf8')) || {};
} catch (err) { console.warn('Could not load module_forms.json', err); moduleForms = {}; }

function saveModuleForms(){ try { fs.writeFileSync(MODULE_FORMS_FILE, JSON.stringify(moduleForms, null, 2), 'utf8'); } catch(e){ console.warn('Failed to save module_forms', e); } }

// GET /api/module-form?lessonId=&week=
app.get('/api/module-form', (req, res) => {
  const { lessonId, week } = req.query;
  if (!lessonId || !week) return res.status(400).json({ error: 'missing params' });
  const lessonMap = moduleForms[lessonId] || {};
  const url = lessonMap[String(week)] || null;
  return res.json({ lessonId, week: String(week), url });
});

// POST /api/module-form - admin required to set a canonical form url
// body: { lessonId, week, url }
app.post('/api/module-form', (req, res) => {
  const actor = getUserFromAuth(req);
  if (!actor) return res.status(401).json({ error: 'unauthenticated' });
  if (actor.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const { lessonId, week, url } = req.body || {};
  const effectiveLessonId = lessonId || (data.lessons && data.lessons[0] && data.lessons[0].id);
  if (!effectiveLessonId || !week || !url) return res.status(400).json({ error: 'missing params' });
  moduleForms[effectiveLessonId] = moduleForms[effectiveLessonId] || {};
  moduleForms[effectiveLessonId][String(week)] = String(url);
  saveModuleForms();
  return res.json({ ok: true, lessonId: effectiveLessonId, week: String(week), url });
});

// -----------------------
// Activities persistence
// -----------------------
const ACTIVITIES_FILE = path.join(__dirname, 'data', 'activities.json');
let activitiesStore = {}; // { [lessonId]: { [week]: [activityStrings] } }
try {
  if (fs.existsSync(ACTIVITIES_FILE)) activitiesStore = JSON.parse(fs.readFileSync(ACTIVITIES_FILE, 'utf8')) || {};
} catch (err) { console.warn('Could not load activities.json', err); activitiesStore = {}; }

function saveActivities(){ try { fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify(activitiesStore, null, 2), 'utf8'); } catch(e){ console.warn('Failed to save activities', e); } }

// GET /api/activities?lessonId=&week=
app.get('/api/activities', (req, res) => {
  const { lessonId, week } = req.query;
  if (!lessonId || !week) return res.status(400).json({ error: 'missing params' });
  const lessonMap = activitiesStore[lessonId] || {};
  const list = lessonMap[String(week)] || [];
  return res.json({ lessonId, week: String(week), activities: list });
});

// POST /api/activities - admin required. body: { lessonId, week, activities: [string] }
app.post('/api/activities', (req, res) => {
  const actor = getUserFromAuth(req);
  if (!actor) return res.status(401).json({ error: 'unauthenticated' });
  if (actor.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const { lessonId, week, activities } = req.body || {};
  const effectiveLessonId = lessonId || (data.lessons && data.lessons[0] && data.lessons[0].id);
  if (!effectiveLessonId || !week || !Array.isArray(activities)) return res.status(400).json({ error: 'missing params' });
  activitiesStore[effectiveLessonId] = activitiesStore[effectiveLessonId] || {};
  activitiesStore[effectiveLessonId][String(week)] = activities.slice();
  saveActivities();
  return res.json({ ok: true, lessonId: effectiveLessonId, week: String(week), activities: activitiesStore[effectiveLessonId][String(week)] });
});

// -----------------------
// Aggregated progress
// -----------------------
// GET /api/progress/aggregated?lessonId=
app.get('/api/progress/aggregated', (req, res) => {
  const { lessonId } = req.query;
  if (!lessonId) return res.status(400).json({ error: 'missing lessonId' });
  // aggregate attemptsStore and progressStore by week
  const weeks = {};
  attemptsStore.forEach(a => {
    if (a.lessonId !== lessonId) return;
    const w = String(a.week || '0');
    weeks[w] = weeks[w] || { attempts: 0, totalScore: 0, bestScores: [] };
    if (typeof a.score === 'number') { weeks[w].attempts++; weeks[w].totalScore += a.score; weeks[w].bestScores.push(a.score); }
  });
  // include progressStore completed counts
  Object.keys(progressStore).forEach(k => {
    const p = progressStore[k];
    if (!p || p.lessonId !== lessonId) return;
    Object.keys(p.byWeek || {}).forEach(w => {
      weeks[w] = weeks[w] || { attempts: 0, totalScore: 0, bestScores: [] };
      const rec = p.byWeek[w];
      if (rec && typeof rec.bestScore === 'number') {
        weeks[w].bestScores.push(rec.bestScore);
      }
    });
  });
  // materialize summary
  const summary = Object.keys(weeks).sort((a,b)=>Number(a)-Number(b)).map(w => {
    const obj = weeks[w];
    const count = obj.attempts || obj.bestScores.length || 0;
    const avg = (count && obj.totalScore) ? Math.round(obj.totalScore / (obj.attempts || 1)) : null;
    const passCount = (obj.bestScores || []).filter(s => typeof s === 'number' && s >= 70).length;
    const passRate = count ? Math.round((passCount / count) * 100) : null;
    return { week: w, attempts: obj.attempts || 0, avgScore: avg, passRate };
  });
  res.json({ lessonId, summary });
});

// GET /api/resources
app.get('/api/resources', (req, res) => {
  res.json({ resources: resourcesStore });
});

// POST /api/resource - accept title, dataUrl(optional), filename, audience OR multipart file upload
app.post('/api/resource', upload.single('file'), (req, res) => {
  // If multipart, multer will populate req.file; otherwise fall back to JSON body
  const body = req.body || {};
  const { title, dataUrl, filename, audience } = body;
  if (!title && !body.title) return res.status(400).json({ error: 'missing title' });
  // require authenticated uploader
  const authUser = getUserFromAuth(req);
  if (!authUser) return res.status(401).json({ error: 'unauthenticated' });
  const id = 'r_' + Math.random().toString(36).slice(2,9);
  let url = null;
  let outFilename = filename || null;

  // If multer saved a file, prefer that
  if (req.file) {
    outFilename = req.file.originalname || req.file.filename;
    url = `/uploads/${req.file.filename}`;
  } else if (dataUrl) {
    const matches = String(dataUrl).match(/^data:(.+);base64,(.+)$/);
    if (matches) {
      const mime = matches[1];
      const b64 = matches[2];
      const ext = mime.split('/')[1] || 'bin';
      const safeName = (filename || id).replace(/[^a-z0-9.\-_]/gi, '_');
      const outName = `${id}-${safeName}`;
      const outPath = path.join(UPLOADS_DIR, outName);
      try {
        fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
        url = `/uploads/${outName}`;
        outFilename = safeName;
      } catch (err) {
        console.error('Failed to save resource file', err);
      }
    }
  } else if (body.url) {
    // Client provided a hosted URL instead of uploading
    url = body.url;
  }

  const rec = { id, title: title || body.title || 'Untitled', filename: outFilename || null, url, audience: audience || 'all', uploader: authUser.email || null, created: Date.now() };
  resourcesStore.unshift(rec);
  saveResources();
  res.json({ ok: true, resource: rec });
});

// GET /api/progress?email=&lessonId=
app.get('/api/progress', (req, res) => {
  const { email, lessonId } = req.query;
  if (!email || !lessonId) return res.json({ progress: null });
  const key = `${email}:${lessonId}`;
  res.json({ progress: progressStore[key] || null });
});

// GET /api/assignments?email=
// Assignments persistence
const ASSIGNMENTS_FILE = path.join(__dirname, 'data', 'assignments.json');
let assignmentsStore = [];
try {
  if (fs.existsSync(ASSIGNMENTS_FILE)) assignmentsStore = JSON.parse(fs.readFileSync(ASSIGNMENTS_FILE, 'utf8')) || [];
} catch (err) { console.warn('Could not load assignments.json', err); assignmentsStore = []; }

function saveAssignments(){ try { fs.writeFileSync(ASSIGNMENTS_FILE, JSON.stringify(assignmentsStore, null, 2), 'utf8'); } catch (e){ console.warn('Failed to save assignments', e); } }

// GET assignments - returns persisted assignments (optionally filtered by email)
app.get('/api/assignments', (req, res) => {
  const { email } = req.query;
  // for demo, we ignore email and return all assignments; in a multi-tenant app you'd filter
  return res.json({ assignments: assignmentsStore });
});

// -----------------------
// Quiz attempts persistence
// -----------------------
const ATTEMPTS_FILE = path.join(__dirname, 'data', 'attempts.json');
let attemptsStore = [];
try {
  if (fs.existsSync(ATTEMPTS_FILE)) attemptsStore = JSON.parse(fs.readFileSync(ATTEMPTS_FILE, 'utf8')) || [];
} catch (e) { console.warn('Could not load attempts.json', e); attemptsStore = []; }

function saveAttempts(){ try { fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify(attemptsStore, null, 2), 'utf8'); } catch (e){ console.warn('Failed to save attempts', e); } }

// POST /api/attempts - record a quiz attempt
// Accepts either an authenticated request (Bearer token) or an unauthenticated
// submission that includes a `userId` in the request body (demo convenience).
app.post('/api/attempts', (req, res) => {
  const actor = getUserFromAuth(req);
  const { lessonId, week, answers, userId } = req.body || {};
  // Allow unauthenticated clients only when they provide a userId
  if (!actor && !userId) return res.status(401).json({ error: 'unauthenticated' });
  if (!lessonId || !week || !Array.isArray(answers)) return res.status(400).json({ error: 'missing params' });

  // If unauthenticated but provided userId, ensure a lightweight user record exists
  let createdBy = null;
  if (actor) createdBy = actor.email;
  else if (userId) {
    createdBy = String(userId);
    const key = String(createdBy).toLowerCase();
    if (!users[key]) {
      users[key] = { email: key, name: null, photoUrl: null, created: Date.now(), role: 'student' };
      // Do not create a password; this is a demo convenience record only
      saveUsers();
    }
  }

  // find canonical lesson/week to grade against
  const lesson = data.lessons.find(l => l.id === lessonId);
  if (!lesson) return res.status(400).json({ error: 'invalid lessonId' });
  const wk = lesson.weeks.find(w => String(w.week) === String(week));
  if (!wk) return res.status(400).json({ error: 'invalid week' });

  // compute score: compare mcq answers
  let total = 0, correct = 0;
  (wk.exercises || []).forEach((ex, idx) => {
    if (ex.type === 'mcq'){
      total++;
      const given = answers[idx];
      if (given === null || given === undefined) return;
      let canonicalCorrect = null;
      if (ex.hasOwnProperty('answerId')) {
        canonicalCorrect = String(ex.answerId);
      } else if (ex.hasOwnProperty('answer')) {
        if (typeof ex.answer === 'number') {
          const opt = Array.isArray(ex.options) ? ex.options[ex.answer] : undefined;
          if (opt && typeof opt === 'object' && opt.id) canonicalCorrect = String(opt.id);
          else canonicalCorrect = String(ex.answer);
        } else {
          canonicalCorrect = String(ex.answer);
        }
      }
      let canonicalGiven = String(given);
      if (!isNaN(Number(canonicalGiven)) && Array.isArray(ex.options)){
        const idxGiven = Number(canonicalGiven);
        const optGiven = ex.options[idxGiven];
        if (optGiven && typeof optGiven === 'object' && optGiven.id) canonicalGiven = String(optGiven.id);
      }
      const bothNumeric = !isNaN(Number(canonicalGiven)) && !isNaN(Number(canonicalCorrect));
      const isCorrect = bothNumeric ? (Number(canonicalGiven) === Number(canonicalCorrect)) : (canonicalGiven === canonicalCorrect);
      if (isCorrect) correct++;
    }
  });
  const score = total ? Math.round((correct / total) * 100) : null;
  const id = 'at_' + Math.random().toString(36).slice(2,9);
  const rec = { id, lessonId, week: String(week), answers, score, createdBy: createdBy || 'anonymous', created: Date.now() };
  attemptsStore.unshift(rec);
  saveAttempts();
  res.json({ ok:true, attempt: rec });
});

// POST /api/chart-image - accept base64 PNG and save under uploads/charts (admin only)
app.post('/api/chart-image', (req, res) => {
  const actor = getUserFromAuth(req);
  if (!actor) return res.status(401).json({ error: 'unauthenticated' });
  if (actor.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const { lessonId, imageBase64, filename } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'missing imageBase64' });
  try{
    const CHARTS_DIR = path.join(UPLOADS_DIR, 'charts');
    if (!fs.existsSync(CHARTS_DIR)) fs.mkdirSync(CHARTS_DIR, { recursive: true });
    const safeName = (filename || `chart_${lessonId||'all'}_${Date.now()}`).replace(/[^a-z0-9.\-\_]/gi, '_') + '.png';
    const outPath = path.join(CHARTS_DIR, safeName);
    fs.writeFileSync(outPath, Buffer.from(String(imageBase64), 'base64'));
    const url = `/uploads/charts/${safeName}`;
    return res.json({ ok: true, url, filename: safeName });
  }catch(e){ console.error('Failed to save chart image', e); return res.status(500).json({ error: 'failed' }); }
});

// GET /api/progress/summary?lessonId=&week= - summary of attempts (best score, count, lastAttempt)
app.get('/api/progress/summary', (req, res) => {
  const actor = getUserFromAuth(req);
  const { lessonId, week, userId, email } = req.query;
  // allow unauthenticated summary requests only when userId/email is provided (demo)
  if (!actor && !userId && !email) return res.status(401).json({ error: 'unauthenticated' });
  let targetUser = null;
  if (actor) {
    // admin can request summaries for other users
    if (actor.role === 'admin') targetUser = (userId || email) ? String(userId || email).toLowerCase() : null;
    else targetUser = String(actor.email).toLowerCase();
  } else {
    targetUser = String(userId || email).toLowerCase();
  }

  let list = attemptsStore.slice();
  if (lessonId) list = list.filter(a => a.lessonId === lessonId);
  if (week) list = list.filter(a => String(a.week) === String(week));
  if (targetUser) list = list.filter(a => String(a.createdBy).toLowerCase() === String(targetUser).toLowerCase());
  const attemptsCount = list.length;
  const bestScore = attemptsCount ? Math.max(...list.map(a => (a.score===null||a.score===undefined)? -1 : a.score)) : null;
  const lastAttempt = attemptsCount ? list[0].created : null;
  // also include progressStore if available for the same user/lesson/week
  let progressRec = null;
  try{
    if (targetUser && lessonId){
      const pkey = `${String(targetUser).toLowerCase()}:${lessonId}`;
      const p = progressStore[pkey];
      if (p && p.byWeek && week && p.byWeek[String(week)]) progressRec = p.byWeek[String(week)];
    }
  }catch(e){}
  res.json({ lessonId: lessonId || null, week: week || null, attemptsCount, bestScore: bestScore >= 0 ? bestScore : null, lastAttempt, progress: progressRec });
});

// GET /api/attempts?lessonId=&week= - returns attempts for the authenticated user (or all if admin)
app.get('/api/attempts', (req, res) => {
  const actor = getUserFromAuth(req);
  if (!actor) return res.status(401).json({ error: 'unauthenticated' });
  const { lessonId, week } = req.query;
  let list = attemptsStore.slice();
  if (lessonId) list = list.filter(a => a.lessonId === lessonId);
  if (week) list = list.filter(a => String(a.week) === String(week));
  // if not admin, only return attempts created by the authenticated user
  if (actor.role !== 'admin') list = list.filter(a => String(a.createdBy).toLowerCase() === String(actor.email).toLowerCase());
  res.json({ attempts: list });
});

// POST /api/assignments - create a new assignment (admin only)
app.post('/api/assignments', (req, res) => {
  const { title, due, lessonId } = req.body || {};
  const actor = getUserFromAuth(req);
  if (!actor) return res.status(401).json({ error: 'unauthenticated' });
  if (actor.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  if (!title || !due) return res.status(400).json({ error: 'missing title or due date' });
  const id = 'a_' + Math.random().toString(36).slice(2,9);
  const rec = { id, title, due, lessonId: lessonId || null, createdBy: actor.email || null, created: Date.now() };
  assignmentsStore.push(rec);
  saveAssignments();
  res.json({ ok:true, assignment: rec });
});

// PUT /api/assignments/:id - update assignment (admin only)
app.put('/api/assignments/:id', (req, res) => {
  const { id } = req.params;
  const { title, due, lessonId } = req.body || {};
  const actor = getUserFromAuth(req);
  if (!actor) return res.status(401).json({ error: 'unauthenticated' });
  if (actor.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const idx = assignmentsStore.findIndex(a=>a.id===id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  if (title) assignmentsStore[idx].title = title;
  if (due) assignmentsStore[idx].due = due;
  if (lessonId !== undefined) assignmentsStore[idx].lessonId = lessonId || null;
  assignmentsStore[idx].updated = Date.now();
  saveAssignments();
  res.json({ ok:true, assignment: assignmentsStore[idx] });
});

// DELETE /api/assignments/:id - admin only
app.delete('/api/assignments/:id', (req, res) => {
  const { id } = req.params;
  const actor = getUserFromAuth(req);
  if (!actor) return res.status(401).json({ error: 'unauthenticated' });
  if (actor.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const idx = assignmentsStore.findIndex(a=>a.id===id);
  if (idx === -1) return res.json({ ok:true, removed:false });
  const removed = assignmentsStore.splice(idx,1)[0];
  saveAssignments();
  res.json({ ok:true, removed:true, assignment: removed });
});

// -----------------------
// Announcements (admin -> learners)
// -----------------------
const ANNOUNCEMENTS_FILE = path.join(__dirname, 'data', 'announcements.json');
let announcementsStore = [];
try {
  if (fs.existsSync(ANNOUNCEMENTS_FILE)) announcementsStore = JSON.parse(fs.readFileSync(ANNOUNCEMENTS_FILE, 'utf8')) || [];
} catch (err) { console.warn('Could not load announcements.json', err); announcementsStore = []; }

function saveAnnouncements(){ try { fs.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify(announcementsStore, null, 2), 'utf8'); } catch(e){ console.warn('Failed to save announcements', e); } }

// GET /api/announcements?since=<timestamp>&audience=all|students
app.get('/api/announcements', (req, res) => {
  const since = Number(req.query.since) || 0;
  const audience = req.query.audience || 'all';
  // return announcements newer than `since` (ms) and matching audience
  const list = announcementsStore.filter(a => {
    if (a.created && Number(a.created) <= since) return false;
    if (!a.audience || a.audience === 'all') return true;
    return a.audience === audience;
  });
  res.json({ announcements: list });
});

// POST /api/announcements - admin only. body: { title, body, audience }
app.post('/api/announcements', (req, res) => {
  const actor = getUserFromAuth(req);
  if (!actor) return res.status(401).json({ error: 'unauthenticated' });
  if (actor.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const { title, body: msgBody, audience } = req.body || {};
  if (!title || !msgBody) return res.status(400).json({ error: 'missing title or body' });
  const id = 'ann_' + Math.random().toString(36).slice(2,9);
  const rec = { id, title: String(title), body: String(msgBody), audience: audience || 'all', created: Date.now(), createdBy: actor.email || null };
  announcementsStore.unshift(rec);
  saveAnnouncements();
  return res.json({ ok:true, announcement: rec });
});

// Start server (default port changed to 3001 to avoid conflicts on developer machines)
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => console.log(`Puente mock server running on http://localhost:${PORT}`));

// Better error messaging for common startup problems (EADDRINUSE etc.)
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the process using that port or set a different PORT environment variable.`);
    process.exit(1);
  }
  console.error('Server error', err);
  process.exit(1);
});
