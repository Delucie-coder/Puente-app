const http = require('http');
const fs = require('fs');
const path = require('path');
const outDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

function fetch(pathname, outFile) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 3010, path: pathname, method: 'GET' };
    const req = http.request(opts, res => {
      if (res.statusCode && res.statusCode >= 400) return reject(new Error('Status ' + res.statusCode));
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        fs.writeFileSync(outFile, data, 'utf8');
        resolve();
      });
    });
    req.on('error', reject);
    req.end();
  });
}

(async ()=>{
  try{
    await fetch('/api/lessons', path.join(outDir, 'lessons.json'));
    await fetch('/api/lesson/market_english_greetings', path.join(outDir, 'market_english_greetings.json'));
    console.log('OK: saved files to tmp/');
  }catch(e){
    console.error('Fetch failed:', e && e.message ? e.message : e);
    process.exit(2);
  }
})();
