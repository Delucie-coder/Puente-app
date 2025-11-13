const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch');
(async function(){
  const imgPath = path.join(__dirname, '..', 'Images', 'puentelogo.png');
  if (!fs.existsSync(imgPath)) {
    console.error('Sample image not found at', imgPath);
    process.exit(1);
  }
  const b = fs.readFileSync(imgPath);
  const b64 = b.toString('base64');
  const dataUrl = 'data:image/png;base64,' + b64;
  const email = 'testuser@example.com';
  try {
    const res = await fetch('http://localhost:3001/api/profile/photo', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, dataUrl })
    });
    const txt = await res.text();
    console.log('Raw upload response body (first 500 chars):', txt.slice(0,500));
    let j;
    try { j = JSON.parse(txt); } catch(e){ console.warn('Response not JSON'); }
    console.log('Parsed response (if JSON):', j);
    // fetch user record
    const userRes = await fetch('http://localhost:3001/api/user?email=' + encodeURIComponent(email));
    const uj = await userRes.json();
    console.log('User record after upload:', uj);
  } catch (err){
    console.error('Upload failed', err);
    process.exit(1);
  }
})();
