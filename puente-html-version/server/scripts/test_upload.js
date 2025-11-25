// Test script: login as admin, read sample file, send as base64 dataUrl to /api/resource
const fs = require('fs');
(async function(){
  const host = process.env.HOST || 'http://localhost:3001';
  const email = 'admin@example.com';
  const password = 'adminpass';
  try{
    const loginRes = await fetch(host + '/api/login', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email, password }) });
    const loginJson = await loginRes.json();
    if (!loginRes.ok) { console.error('Login failed', loginJson); process.exit(2); }
    const token = loginJson.token;

    const samplePath = path = require('path').join(__dirname, '..', 'test_assets', 'sample.txt');
    const buf = fs.readFileSync(samplePath);
    const b64 = buf.toString('base64');
    const dataUrl = 'data:text/plain;base64,' + b64;

    const res = await fetch(host + '/api/resource', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ title: 'test-sample', dataUrl, filename: 'sample.txt', audience: 'all' })
    });
    const j = await res.json();
    console.log('POST /api/resource ->', j);
    if (!res.ok) { console.error('Upload failed'); process.exit(3); }

    // verify resource present
    const listRes = await fetch(host + '/api/resources');
    const listJson = await listRes.json();
    const found = (listJson.resources || []).find(r=>r.title === 'test-sample');
    if (found) { console.log('Resource found:', found); process.exit(0); }
    console.error('Resource not found in list'); process.exit(4);
  }catch(e){ console.error('Test upload error', e); process.exit(1); }
})();
