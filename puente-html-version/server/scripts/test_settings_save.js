// test_settings_save.js
// Simple dev utility to test POST /api/settings with an admin token.
// Usage: node puente-html-version\server\scripts\test_settings_save.js

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const USERS_FILE = path.join(ROOT, 'data', 'users.json');
const SETTINGS_FILE = path.join(ROOT, 'data', 'settings.json');
const HOST = 'localhost';
const PORT = process.env.PORT || 3001;

function readJson(file){ try { return JSON.parse(fs.readFileSync(file,'utf8') || '{}'); } catch(e){ return null; } }
function writeJson(file, obj){ fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8'); }

(async function main(){
  console.log('Test script: verify POST /api/settings persists into settings.json');
  const users = readJson(USERS_FILE) || {};
  const adminKey = 'admin@example.com';
  if (!users[adminKey]){
    console.error('No admin user found in', USERS_FILE);
    process.exit(2);
  }
  // ensure admin has a token stored so server will accept Authorization: Bearer <token>
  if (!users[adminKey].token){
    users[adminKey].token = 'tkn_test_' + Math.random().toString(36).slice(2,12);
    writeJson(USERS_FILE, users);
    console.log('Added temporary token to admin user and saved to users.json');
  }
  const token = users[adminKey].token;

  // read current settings
  const before = readJson(SETTINGS_FILE) || { defaults: { passThreshold: 70 }, lessons: {} };
  const lessonId = 'vendor_bilingual';
  const desired = 73 + Math.floor(Math.random()*10); // arbitrary new threshold

  console.log('Posting new passThreshold', desired, 'for lesson', lessonId);

  const payload = JSON.stringify({ passThreshold: desired, lessonId });
  const opts = {
    hostname: HOST,
    port: PORT,
    path: '/api/settings',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'Authorization': 'Bearer ' + token
    }
  };

  const req = http.request(opts, (res) => {
    let data = '';
    res.on('data', (c)=> data += c);
    res.on('end', () => {
      console.log('Server responded with', res.statusCode, data);
      // small delay to allow server to flush file
      setTimeout(()=>{
        const after = readJson(SETTINGS_FILE) || {};
        const val = after.lessons && after.lessons[lessonId] && typeof after.lessons[lessonId].passThreshold !== 'undefined' ? after.lessons[lessonId].passThreshold : null;
        if (val === desired){
          console.log('SUCCESS: settings.json updated and contains the expected value ->', val);
          process.exit(0);
        } else {
          console.error('FAIL: settings.json does not contain expected value. Found:', val);
          process.exit(3);
        }
      }, 300);
    });
  });

  req.on('error', (err)=>{
    console.error('Request failed', err);
    process.exit(4);
  });
  req.write(payload); req.end();
})();

// Note: the script previously only tested authenticated admin write. We will now also test that
// unauthenticated writes are rejected (server should return 401/403).


