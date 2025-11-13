const fs = require('fs');
const path = require('path');

// Exports each lesson-week as a separate JSON file and creates a printable HTML summary
// Usage: node tools/export_weeks.js

const ROOT = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'lessons.json');
const EXPORT_DIR = path.join(ROOT, 'data', 'exports');

function safeFileName(s){
  return String(s).replace(/[^a-z0-9._-]/gi, '_');
}

if (!fs.existsSync(DATA_FILE)){
  console.error('lessons.json not found at', DATA_FILE);
  process.exit(1);
}

const raw = fs.readFileSync(DATA_FILE, 'utf8');
const json = JSON.parse(raw);
if (!json.lessons || !Array.isArray(json.lessons)){
  console.error('lessons file malformed'); process.exit(1);
}

if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

const htmlParts = [];
htmlParts.push('<!doctype html>');
htmlParts.push('<html><head><meta charset="utf-8"><title>Puente - Phrase Sheets (export)</title>');
htmlParts.push('<style>');
htmlParts.push('body{font-family:Arial,Helvetica,sans-serif;margin:16px;color:#111;background:#fff}');
htmlParts.push('.header{display:flex;align-items:center;gap:12px;margin-bottom:18px}');
htmlParts.push('.logo{width:72px;height:72px;background:#eee;display:inline-block;border-radius:8px;flex:0 0 72px;object-fit:contain}');
htmlParts.push('h1{font-size:20px;margin:0}');
htmlParts.push('.meta{color:#555;font-size:13px}');
htmlParts.push('.week{page-break-after:always;border-top:2px solid #0b5; padding-top:12px;margin-top:12px;padding-bottom:12px}');
htmlParts.push('h2{font-size:18px;margin:6px 0;color:#0a4}');
htmlParts.push('.row{display:flex;gap:18px;margin-top:8px}');
htmlParts.push('.col{flex:1;min-width:200px}');
htmlParts.push('.col h3{margin:0 0 6px 0;font-size:14px;color:#333}');
htmlParts.push('ul{margin:4px 0 12px 18px}');
htmlParts.push('.exercises{background:#f9f9f9;padding:8px;border-radius:6px;border:1px solid #eee}');
htmlParts.push('@media print{ .pagebreak{page-break-after:always} .logo{width:56px;height:56px} h1{font-size:18px} h2{font-size:16px} }');
htmlParts.push('</style>');
htmlParts.push('</head><body>');
htmlParts.push('<div class="header"><div class="logo"></div><div><h1>Puente — Phrase sheets export</h1><div class="meta">Printable phrase sheets — weeks and exercises (English / French)</div></div></div>');

json.lessons.forEach(lesson => {
  const lid = lesson.id || safeFileName(lesson.title || 'lesson');
  (lesson.weeks || []).forEach(week => {
    try {
      const outName = `${lid}_week${String(week.week).padStart(2,'0')}.json`;
      const outPath = path.join(EXPORT_DIR, outName);
      fs.writeFileSync(outPath, JSON.stringify({ lessonId: lid, lessonTitle: lesson.title || null, week: week }, null, 2), 'utf8');

      // append to HTML
      htmlParts.push(`<div class="week"><h2>${lesson.title || lid} — Week ${week.week}: ${week.title || ''}</h2>`);
      if (week.videoUrl) htmlParts.push(`<div><strong>Video:</strong> ${week.videoUrl}</div>`);
      if (week.audioUrl) htmlParts.push(`<div><strong>Audio:</strong> ${week.audioUrl}</div>`);
      htmlParts.push('<div class="phrases">');
      const phrases = week.phrases || week.phrases || {};
      // support both grouped (vendor/moto) and flat array styles
      if (Array.isArray(phrases)){
        htmlParts.push('<div class="col"><ul>');
        phrases.forEach(p=> htmlParts.push(`<li><strong>${p.phrase}</strong> — ${p.translation||''} <em>${p.phonetic||''}</em></li>`));
        htmlParts.push('</ul></div>');
      } else {
        Object.keys(phrases).forEach(aud => {
          htmlParts.push(`<div class="col"><h3>${aud}</h3><ul>`);
          (phrases[aud]||[]).forEach(p=> htmlParts.push(`<li><strong>${p.phrase}</strong> — ${p.translation||''} <em>${p.phonetic||''}</em></li>`));
          htmlParts.push('</ul></div>');
        });
      }
      htmlParts.push('</div>');

      // exercises
      if (week.exercises && week.exercises.length){
        htmlParts.push('<div><strong>Exercises</strong><ol>');
        week.exercises.forEach(ex => {
          if (ex.type === 'mcq'){
            htmlParts.push(`<li>${ex.question}<br/>Options: ${Array.isArray(ex.options)?ex.options.join(' | '):''}</li>`);
          } else if (ex.type === 'roleplay' || ex.type === 'drill' || ex.type === 'map'){
            htmlParts.push(`<li>${ex.type.toUpperCase()}: ${ex.prompt || ex.question || ''}</li>`);
          } else {
            htmlParts.push(`<li>${ex.id || ''} — ${JSON.stringify(ex)}</li>`);
          }
        });
        htmlParts.push('</ol></div>');
      }

      htmlParts.push('</div>');
    } catch (err) {
      console.warn('Failed to export week', lesson.id, week.week, err);
    }
  });
});

htmlParts.push('</body></html>');
const htmlOut = path.join(EXPORT_DIR, 'phrase-sheets-export.html');
fs.writeFileSync(htmlOut, htmlParts.join('\n'), 'utf8');

console.log('Export complete. Files written to', EXPORT_DIR);
console.log('Open the printable HTML at', htmlOut);
