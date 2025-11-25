// Simple helper to fetch settings for a lesson
(async function(){
  const lesson = process.argv[2] || 'vendor_bilingual';
  const host = process.env.HOST || 'http://localhost:3001';
  try{
    const res = await fetch(`${host}/api/settings?lessonId=${encodeURIComponent(lesson)}`);
    const j = await res.json();
    console.log(JSON.stringify(j, null, 2));
  }catch(e){ console.error('error', e); process.exit(1); }
})();
