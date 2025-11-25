// Test script: unauthenticated attempt submission using userId
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const USERS_FILE = path.join(ROOT, 'data', 'users.json');
const ATTEMPTS_FILE = path.join(ROOT, 'data', 'attempts.json');

function readJson(file){ try { return JSON.parse(fs.readFileSync(file,'utf8')||'{}'); } catch(e){ return {}; } }
function writeJson(file,obj){ fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8'); }

(async function(){
  const host = process.env.HOST || 'http://localhost:3001';
  console.log('Unauthenticated attempt test: host', host);

  // Ensure admin token exists so we can query attempts after posting
  const adminKey = 'admin@example.com';
  const users = readJson(USERS_FILE) || {};
  if (!users[adminKey]){ console.error('No admin user found in', USERS_FILE); process.exit(2); }
  if (!users[adminKey].token){ users[adminKey].token = 'tkn_test_' + Math.random().toString(36).slice(2,12); writeJson(USERS_FILE, users); console.log('Added temporary token for admin'); }
  const adminToken = users[adminKey].token;

  const lessonId = 'market_english_greetings';
  const week = 1;
  const userId = 'ci_vendor_demo@example.com';
  const payload = { lessonId, week, answers: [0,0], userId };

  try{
    console.log('Posting unauthenticated attempt with userId', userId);
    const res = await fetch(host + '/api/attempts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await res.json().catch(()=>null);
    console.log('POST /api/attempts ->', res.status, JSON.stringify(j));
    if (!res.ok || !j || !j.attempt) { console.error('Attempt POST failed or did not return attempt'); process.exit(3); }
    if (String(j.attempt.createdBy).toLowerCase() !== String(userId).toLowerCase()) {
      console.warn('Warning: createdBy mismatch (server may have normalized). continuing check via admin listing.');
    }

    // allow server a moment to persist
    await new Promise(r=>setTimeout(r, 300));

    // Admin: fetch attempts for lesson and ensure our userId appears
    const adm = await fetch(`${host}/api/attempts?lessonId=${encodeURIComponent(lessonId)}`, { headers: { 'Authorization': 'Bearer ' + adminToken } });
    const admJson = await adm.json().catch(()=>null);
    console.log('Admin GET /api/attempts status', adm.status);
    if (!adm.ok || !admJson || !Array.isArray(admJson.attempts)) { console.error('Admin attempts fetch failed'); process.exit(4); }
    const found = admJson.attempts.find(a => String(a.createdBy).toLowerCase() === String(userId).toLowerCase() || (a.id && a.id === j.attempt.id));
    if (found) { console.log('SUCCESS: Unauthenticated attempt persisted and visible to admin. Attempt id:', found.id); process.exit(0); }
    // fallback: check attempts file directly
    const stored = readJson(ATTEMPTS_FILE) || [];
    const fromFile = (Array.isArray(stored)?stored:[]).find(a => String(a.createdBy).toLowerCase() === String(userId).toLowerCase() || (a.id && a.id === j.attempt.id));
    if (fromFile) { console.log('SUCCESS (file): attempt found in attempts.json id:', fromFile.id); process.exit(0); }

    console.error('FAIL: Attempt not found in admin listing or attempts.json');
    process.exit(5);
  }catch(e){ console.error('Test error', e && e.stack || e); process.exit(1); }

})();
