// generate_gif_stubs.js
// Create small 1x1 GIF stubs (base64 data) for vendor_week1..12.gif
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// simple 1x1 transparent GIF (very small)
const gifBase64 = 'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const buf = Buffer.from(gifBase64, 'base64');

for (let i = 1; i <= 12; i++){
  const fname = `vendor_week${i}.gif`;
  const p = path.join(outDir, fname);
  fs.writeFileSync(p, buf);
  console.log('Wrote', p);
}
console.log('Done generating gif stubs');
