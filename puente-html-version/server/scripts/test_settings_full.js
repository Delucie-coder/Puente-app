// test_settings_full.js
// Tests:
// 1) Admin can POST /api/settings to set lesson-level passThreshold and settings.json updates
// 2) Unauthenticated POST /api/settings is rejected (401/403)
// Usage: node puente-html-version\server\scripts\test_settings_full.js

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const USERS_FILE = path.join(ROOT, 'data', 'users.json');
const SETTINGS_FILE = path.join(ROOT, 'data', 'settings.json');
// Force IPv4 loopback to avoid potential IPv6 (::1) resolution issues in some environments
const HOST = '127.0.0.1';
const PORT = process.env.PORT || 3001;

function readJson(file){ try { return JSON.parse(fs.readFileSync(file,'utf8') || '{}'); } catch(e){ return null; } }
function writeJson(file, obj){ fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8'); }

async function postSettings(token, lessonId, passThreshold){
  const payload = JSON.stringify({ passThreshold, lessonId });
  const opts = { hostname: HOST, port: PORT, path: '/api/settings', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  return new Promise((resolve, reject)=>{
    const req = http.request(opts, (res)=>{
      let data=''; res.on('data', c=> data+=c); res.on('end', ()=> resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', err=> reject(err));
    req.write(payload); req.end();
  });
}

function waitForServer(retries = 12, delay = 500){
  const http = require('http');
  return new Promise((resolve, reject)=>{
    let attempt = 0;
    const tryOnce = ()=>{
      attempt++;
      const opts = { hostname: HOST, port: PORT, path: '/api/lessons', method: 'GET', timeout: 2000 };
      const req = http.request(opts, (res)=>{
        res.resume();
        resolve(true);
      });
      req.on('timeout', ()=>{ req.destroy(); });
      req.on('error', (err)=>{
        if (attempt >= retries) return reject(err);
        setTimeout(tryOnce, delay);
      });
      req.end();
    };
    tryOnce();
  });
}

(async ()=>{
  console.log('Running settings persistence + permissions tests');
  console.log(`Waiting for server at http://${HOST}:${PORT} ...`);
  try {
    await waitForServer(20, 500);
    console.log('Server reachable — continuing tests');
  } catch (err){
    console.error('Server did not become reachable:', err); process.exit(10);
  }
  const users = readJson(USERS_FILE) || {};
  const adminKey = 'admin@example.com';
  if (!users[adminKey]){
    console.error('No admin user found in', USERS_FILE);
    process.exit(2);
  }
  if (!users[adminKey].token){
    users[adminKey].token = 'tkn_test_' + Math.random().toString(36).slice(2,12);
    writeJson(USERS_FILE, users);
    console.log('Added temporary token to admin user and saved to users.json');
  }
  const token = users[adminKey].token;

  const lessonId = 'vendor_bilingual';
  const desired = 60 + Math.floor(Math.random()*20);

  console.log('1) Admin POST (should succeed) -> passThreshold=', desired);
  try {
    const r = await postSettings(token, lessonId, desired);
    console.log('Admin POST response:', r.status, r.body);
    if (r.status < 200 || r.status >= 300){ console.error('Admin POST failed with status', r.status); process.exit(3); }
    // small delay then read settings file
    await new Promise(r=>setTimeout(r, 300));
    const after = readJson(SETTINGS_FILE) || {};
    const val = after.lessons && after.lessons[lessonId] && typeof after.lessons[lessonId].passThreshold !== 'undefined' ? after.lessons[lessonId].passThreshold : null;
    if (val === desired) console.log('PASS: settings.json contains expected lesson value ->', val);
    else { console.error('FAIL: settings.json value mismatch. Found:', val); process.exit(4); }
  } catch (err){ console.error('Admin POST request failed', err); process.exit(5); }

  console.log('2) Unauthenticated POST (should be rejected)');
  try {
    const r2 = await postSettings(null, lessonId, desired+1);
    console.log('Unauth POST response status', r2.status);
    if (r2.status === 401 || r2.status === 403){ console.log('PASS: Unauthenticated request rejected as expected'); process.exit(0); }
    else { console.error('FAIL: Unauthenticated request was not rejected. Status:', r2.status); process.exit(6); }
  } catch (err){ console.error('Unauth POST request failed', err); process.exit(7); }
})();
