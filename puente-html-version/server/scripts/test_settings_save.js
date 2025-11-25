// Test script: POST to /api/settings as admin and verify persistence in settings.json
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const USERS_FILE = path.join(ROOT, 'data', 'users.json');
const SETTINGS_FILE = path.join(ROOT, 'data', 'settings.json');

function readJson(file){ try { return JSON.parse(fs.readFileSync(file,'utf8') || '{}'); } catch(e){ return {}; } }
function writeJson(file, obj){ fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8'); }

(async function(){
  const host = process.env.HOST || 'http://localhost:3001';
  const adminKey = 'admin@example.com';
  const users = readJson(USERS_FILE) || {};
  if (!users[adminKey]){ console.error('No admin user found in', USERS_FILE); process.exit(2); }
  if (!users[adminKey].token){ users[adminKey].token = 'tkn_test_' + Math.random().toString(36).slice(2,12); writeJson(USERS_FILE, users); console.log('Added temporary token for admin'); }
  const token = users[adminKey].token;

  const lessonId = 'vendor_bilingual';
  const desired = 70 + Math.floor(Math.random()*21); // 70..90
  console.log('Posting new passThreshold', desired, 'for', lessonId, 'to', host);

  try{
    const res = await fetch(`${host}/api/settings`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ passThreshold: desired, lessonId }) });
    const j = await res.json().catch(()=>null);
    console.log('Server responded with', res.status, JSON.stringify(j));
    // allow slight delay for file write
    await new Promise(r=>setTimeout(r, 300));
    const after = readJson(SETTINGS_FILE) || {};
    const val = after.lessons && after.lessons[lessonId] && typeof after.lessons[lessonId].passThreshold !== 'undefined' ? after.lessons[lessonId].passThreshold : null;
    if (val === desired){ console.log('SUCCESS: settings.json updated ->', val); process.exit(0); }
    console.error('FAIL: settings.json mismatch. Found:', val);
    process.exit(3);
  }catch(e){ console.error('Test error', e); process.exit(1); }
})();


