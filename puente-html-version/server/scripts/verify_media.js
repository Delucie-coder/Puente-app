// verify_media.js
// Verifies that all media files referenced by lessons.json exist under server/data/uploads
const fs = require('fs');
const path = require('path');

const lessonsPath = path.join(__dirname, '..', 'data', 'lessons.json');
const uploadsDir = path.join(__dirname, '..', 'data', 'uploads');

function readJSON(p){ try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch(e){ console.error('Failed to read', p, e); process.exit(2); } }
const lessons = readJSON(lessonsPath);
const missing = [];
(function check(){
  const all = lessons.lessons || [];
  all.forEach(lesson => {
    if (!lesson.weeks) return;
    lesson.weeks.forEach(w => {
      ['videoUrl','audioUrl'].forEach(key => {
        if (!w[key]) return;
        const v = w[key];
        // only check local uploads (paths starting with /uploads)
        if (v.startsWith('/uploads/')){
          const fname = v.replace('/uploads/','');
          const p = path.join(uploadsDir, fname);
          if (!fs.existsSync(p)) missing.push(p);
        }
      });
    });
  });
})();

if (!missing.length){ console.log('All referenced upload files are present.'); process.exit(0); }
console.error('Missing files:'); missing.forEach(m=> console.error('  -', m));
process.exit(1);
