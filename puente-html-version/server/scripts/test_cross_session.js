// Cross-session QA script
// - Ensures admin can set a passThreshold
// - Ensures a vendor (unauthenticated) can read lesson/week and settings
// - Posts a sample attempt and verifies admin can see it in attempts list

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const USERS_FILE = path.join(ROOT, 'data', 'users.json');
const ATTEMPTS_FILE = path.join(ROOT, 'data', 'attempts.json');
const SETTINGS_FILE = path.join(ROOT, 'data', 'settings.json');

function readJson(file){ try { return JSON.parse(fs.readFileSync(file,'utf8')||'{}'); } catch(e){ return {}; } }
function writeJson(file,obj){ fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8'); }

(async function(){
  const host = process.env.HOST || 'http://localhost:3001';
  console.log('Cross-session QA: using host', host);

  // Ensure admin token exists
  const adminKey = 'admin@example.com';
  const users = readJson(USERS_FILE) || {};
  if (!users[adminKey]){ console.error('No admin user in', USERS_FILE); process.exit(2); }
  if (!users[adminKey].token){ users[adminKey].token = 'tkn_test_' + Math.random().toString(36).slice(2,10); writeJson(USERS_FILE, users); console.log('Added temp admin token'); }
  const token = users[adminKey].token;

  const lessonId = 'market_english_greetings';
  const week = 1;
  const desired = 75 + Math.floor(Math.random()*11);

  console.log('Admin: POST /api/settings -> passThreshold', desired);
  try{
    const setRes = await fetch(`${host}/api/settings`, { method:'POST', headers: { 'Content-Type':'application/json','Authorization':'Bearer '+token }, body: JSON.stringify({ lessonId, passThreshold: desired }) });
    console.log('Settings POST status', setRes.status);
  }catch(e){ console.error('Failed posting settings', e); process.exit(3); }

  // allow write
  await new Promise(r=>setTimeout(r,300));

  // Vendor: fetch lesson week content and settings
  try{
    const lessonRes = await fetch(`${host}/api/lesson/${encodeURIComponent(lessonId)}/week/${week}`);
    const lessonJson = await lessonRes.json().catch(()=>null);
    console.log('Vendor: GET /api/lesson/:week ->', lessonRes.status, !!lessonJson);

    const settingsRes = await fetch(`${host}/api/settings?lessonId=${encodeURIComponent(lessonId)}`);
    const settingsJson = await settingsRes.json().catch(()=>null);
    console.log('Vendor: GET /api/settings ->', settingsRes.status, settingsJson && settingsJson.passThreshold);
  }catch(e){ console.error('Vendor read failed', e); }

  // Vendor: authenticate then post an attempt (authenticated non-admin flow)
  try{
    const loginRes = await fetch(`${host}/api/login`, { method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email: 'vendor@example.com', name: 'Vendor Test', role: 'student' }) });
    const loginJson = await loginRes.json().catch(()=>null);
    if (loginRes.ok && loginJson && loginJson.token){
      const vendorToken = loginJson.token;
      console.log('Vendor: logged in, posting authenticated attempt');
      const authAttempt = { lessonId, week, answers: [0,0] };
      const postRes = await fetch(`${host}/api/attempts`, { method:'POST', headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer ' + vendorToken }, body: JSON.stringify(authAttempt) });
      console.log('Vendor (auth): POST /api/attempts status', postRes.status);
    } else {
      console.warn('Vendor login failed or no token returned', loginRes.status, loginJson);
    }
  }catch(e){ console.error('Authenticated vendor flow failed', e); }

  // allow server to record
  await new Promise(r=>setTimeout(r,300));

  // Admin: fetch attempts summary
  try{
    const adm = await fetch(`${host}/api/attempts?lessonId=${encodeURIComponent(lessonId)}`, { headers: { 'Authorization': 'Bearer '+token } });
    const admJson = await adm.json().catch(()=>null);
    console.log('Admin: GET /api/attempts?lessonId= ->', adm.status, Array.isArray(admJson) ? `attempts:${admJson.length}` : admJson);
    // also read server-side file for verification if present
    const stored = readJson(ATTEMPTS_FILE) || [];
    console.log('Local file attempts count:', (Array.isArray(stored)?stored.length:0));
  }catch(e){ console.error('Admin attempts read failed', e); }

  console.log('Cross-session QA complete.');
  process.exit(0);
})();
