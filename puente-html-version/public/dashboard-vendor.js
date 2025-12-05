(function(){
  // When the page is opened via file:// during local testing, point API calls at the mock server.
  const API_BASE = (window.location.protocol === 'file:') ? 'http://localhost:3001' : ((window.location.port === '5500') ? 'http://localhost:3010' : '');
  document.addEventListener('DOMContentLoaded', ()=>{
    try{ sessionStorage.setItem('puente_role','vendor'); }catch(e){}
    // small toast helper (used for welcome)
    function showToast(message, timeout){
      timeout = typeof timeout === 'number' ? timeout : 3000;
      let container = document.getElementById('puente-toast-container');
      if (!container){ container = document.createElement('div'); container.id = 'puente-toast-container'; container.style.position = 'fixed'; container.style.right = '16px'; container.style.bottom = '16px'; container.style.zIndex = '9999'; document.body.appendChild(container); }
      const t = document.createElement('div'); t.className = 'puente-toast'; t.textContent = message; t.style.background = 'rgba(0,0,0,0.8)'; t.style.color = '#fff'; t.style.padding = '10px 14px'; t.style.marginTop = '8px'; t.style.borderRadius = '6px'; t.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)'; t.style.fontSize = '13px'; container.appendChild(t);
      setTimeout(()=>{ try{ t.style.transition = 'opacity 300ms'; t.style.opacity = '0'; setTimeout(()=> t.remove(), 320); }catch(e){} }, timeout);
    }

    // lightweight on-page debug logger (also logs to console)
    function debugLog(msg){
      try{
        console.log('PUENTE-DEBUG:', msg);
        const wrap = document.getElementById('puente-debug-log');
        if (wrap){ const el = document.createElement('div'); el.textContent = '['+ new Date().toLocaleTimeString() +'] '+ String(msg); wrap.appendChild(el); wrap.scrollTop = wrap.scrollHeight; }
      }catch(e){}
    }
    const lessonsWrap = document.getElementById('vendorLessons');
    const lessonSelect = document.getElementById('vs_lesson');
    const out = document.getElementById('vs_out');
    const userIdInput = document.getElementById('vs_userid');

    // populate avatar from session/local storage (greeting text and toast removed)
    try{
      const avatarEl = document.getElementById('vendorAvatar');
      const raw = sessionStorage.getItem('puente_user') || localStorage.getItem('puente:user') || null;
      let name = '';
      if (raw){ try{ const u = JSON.parse(raw); name = (u && (u.name || u.email)) ? (u.name || u.email) : ''; }catch(e){} }
      const display = name || '';
      if (avatarEl){ if (!display){ avatarEl.textContent = 'G'; avatarEl.style.background = '#b2bec3'; } else { const initials = computeInitials(display); avatarEl.textContent = initials; avatarEl.style.background = deterministicColor(display); } }
      // greeting text and welcome toast intentionally removed per request
    }catch(e){}

    function showOut(msg){ if (!out) return; out.textContent = msg; }

    // avatar helpers
    function computeInitials(name){ if (!name) return 'U'; const parts = String(name).trim().split(/\s+/).filter(Boolean); if (parts.length === 1) return parts[0].slice(0,2).toUpperCase(); return (parts[0][0] + parts[parts.length-1][0]).toUpperCase(); }
    function deterministicColor(str){ let h = 0; for (let i = 0; i < str.length; i++){ h = (h << 5) - h + str.charCodeAt(i); h |= 0; } const palette = ['#6c5ce7','#00b894','#0984e3','#fd79a8','#e17055','#00cec9','#ff7675','#74b9ff']; return palette[Math.abs(h) % palette.length]; }

    // Module video overrides stored in localStorage so you can provide video URLs per lesson/week
    function moduleVideoKey(lessonId, weekNum){ return `puente_module_video_${lessonId}_${weekNum}`; }
    function setModuleVideo(lessonId, weekNum, url){ try{ if (!lessonId || !weekNum) return; localStorage.setItem(moduleVideoKey(lessonId,weekNum), String(url||'')); }catch(e){} }
    function getModuleVideo(lessonId, weekNum){ try{ const v = localStorage.getItem(moduleVideoKey(lessonId,weekNum)); return v || null; }catch(e){ return null; } }
    // server-backed module video helpers
    async function fetchServerModuleVideo(lessonId, weekNum){ try{ const r = await fetch(`${API_BASE}/api/module-video?lessonId=${encodeURIComponent(lessonId)}&week=${encodeURIComponent(weekNum)}`); if (r.ok){ const j = await r.json().catch(()=>null); if (j && j.url) return j.url; } }catch(e){} return null; }
    async function postServerModuleVideo(lessonId, weekNum, url){ try{ const token = (function(){ try{ const raw = sessionStorage.getItem('puente_token') || localStorage.getItem('puente:token') || null; return raw; }catch(e){return null;} })(); const headers = {'Content-Type':'application/json'}; if (token) headers['Authorization'] = 'Bearer ' + token; const body = { lessonId, week: weekNum, url }; const r = await fetch(`${API_BASE}/api/module-video`, { method:'POST', headers, body: JSON.stringify(body) }); if (r.ok) return await r.json().catch(()=>null); return null; }catch(e){ return null; }

    async function fetchLessons(){
      try{
        const r = await fetch(`${API_BASE}/api/lessons`);
        if (r.ok){ const j = await r.json(); return j.lessons || j; }
      }catch(e){}
      return [];
    }

    function renderLessons(list){
      if (!lessonsWrap) return;
      lessonsWrap.innerHTML = '';
      const filtered = (list || []).filter(l=> !l.audience || l.audience === 'all' || l.audience === 'vendor');
      filtered.forEach(l=>{
        const d = document.createElement('div'); d.className = 'lesson-card';
        d.innerHTML = `<div style=\"font-weight:700\">${(l.title||l.id||'Untitled')}</div><div class=\"muted\" style=\"margin-top:6px\">${(l.summary||'')}</div><div style=\"margin-top:10px;display:flex;gap:8px\"><button class=\"btn\" data-id=\"${l.id}\">Open</button><button class=\"btn link-btn\" data-id=\"${l.id}\">Preview</button></div>`;
        d.querySelectorAll('button').forEach(b=> b.addEventListener('click', (e)=>{ const id = e.currentTarget.dataset.id; if (e.currentTarget.textContent.trim()==='Open') openLessonInline(id); else window.open(`lesson.html?id=${encodeURIComponent(id)}`,'_blank'); }));
        lessonsWrap.appendChild(d);
      });
      // populate select
      if (lessonSelect){ lessonSelect.innerHTML = ''; filtered.forEach(l=>{ const o = document.createElement('option'); o.value = l.id; o.textContent = l.title || l.id; lessonSelect.appendChild(o); }); }
    }

    // wire submit
    const submitBtn = document.getElementById('vs_submit');
    if (submitBtn){ submitBtn.addEventListener('click', async ()=>{
      const lessonId = (lessonSelect && lessonSelect.value) || '';
      const week = document.getElementById('vs_week').value || '1';
      const userId = (userIdInput && userIdInput.value) || (function(){ try{ const u = JSON.parse(sessionStorage.getItem('puente_user') || localStorage.getItem('puente:user') || 'null'); return u && (u.email || u.name) ? (u.email||u.name) : ''; }catch(e){ return ''; } })();
      if (!lessonId){ showOut('Please select a lesson.'); return; }
      try{
        const payload = { lessonId, week: String(week), answers: [], userId: userId || undefined };
        const res = await fetch(`${API_BASE}/api/attempts`, { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        const j = await res.json().catch(()=>null);
        showOut(`Status: ${res.status}\n${JSON.stringify(j,null,2)}`);
        if (res.ok){
          try{ computeVendorKPIs(lessonId); // refresh KPIs
            // if vendor viewer open for same lesson, refresh that week's marker
            const weekNum = String(week);
            const uid = getUserIdForApi();
            const qs = `lessonId=${encodeURIComponent(lessonId||'')}&week=${encodeURIComponent(weekNum)}` + (uid? `&userId=${encodeURIComponent(uid)}` : '');
            const pr = await fetch(`${API_BASE}/api/progress/summary?${qs}`);
            if (pr.ok){ const pj = await pr.json().catch(()=>null); if (pj && vWeekList){ const btn = vWeekList.querySelector(`[data-week="${weekNum}"]`); if (btn){ const chk = btn.querySelector('.week-check'); const best = typeof pj.bestScore === 'number' ? pj.bestScore : null; const pass = typeof pj.passThreshold === 'number' ? (best !== null && best >= pj.passThreshold) : (best !== null && best >= 70); if (chk) chk.innerHTML = pass? '✓' : (pj.attemptsCount? '•' : ''); } } }
          }catch(e){}
        }
      }catch(e){ showOut('Error: '+String(e)); }
    }); }

    // initial load
    // viewer helpers
    const viewer = document.getElementById('vendorLessonViewer');
    const vTitle = document.getElementById('vl_title');
    const vSub = document.getElementById('vl_sub');
    const vWeekList = document.getElementById('vendorWeekList');
    const vWeekDetail = document.getElementById('vendorWeekDetail');
    const vClose = document.getElementById('vl_close');

    function assemble12Weeks(lesson, allLessons){
      const existing = Array.isArray(lesson.weeks)? lesson.weeks.slice() : [];
      if (existing.length >= 12) return existing.slice(0,12);
      const out = [];
      for (let i=1;i<=12;i++){
        const found = existing.find(w=> (w.week||w.weekNumber) === i);
        if (found) out.push(found); else out.push({ week: i, title: `Week ${i}` });
      }
      return out;
    }

    function getUserIdForApi(){
      try{
        const raw = sessionStorage.getItem('puente_user') || localStorage.getItem('puente:user') || null;
        if (raw){ try{ const u = JSON.parse(raw); if (u && (u.email || u.name)) return u.email || u.name; }catch(e){} }
        if (userIdInput && userIdInput.value) return userIdInput.value;
      }catch(e){}
      return null;
    }

    async function fetchLesson(id){
      try{
        const r = await fetch(`${API_BASE}/api/lesson/${encodeURIComponent(id)}`);
        if (r.ok){ const j = await r.json(); return j.lesson || j; }
      }catch(e){}
      return null;
    }

    async function openLessonInline(id){
      if (!id) return;
      const lesson = await fetchLesson(id) || { id, title: id };
      const weeks = assemble12Weeks(lesson);
      if (vTitle) vTitle.textContent = lesson.title || lesson.id;
      if (vSub) vSub.textContent = lesson.summary || '';
      if (viewer) viewer.style.display = '';
      renderWeekSidebar(lesson, weeks);
      // if the scheduled program module clicked earlier set a pending open, handle it
      try{ const pending = sessionStorage.getItem('puente_pending_open'); if (pending){ try{ const p = JSON.parse(pending); if (p.lessonId === id && p.week){ // open that week after sidebar rendered
        setTimeout(()=>{ const wk = weeks.find(x=> (x.week||x.weekNumber) === Number(p.week)) || weeks[0]; showWeekInline(lesson, wk); sessionStorage.removeItem('puente_pending_open'); }, 140);
          } }catch(e){} sessionStorage.removeItem('puente_pending_open'); }catch(e){}
      // compute KPIs for this lesson
      try{ computeVendorKPIs(lesson.id); }catch(e){}
      // open first week
      const first = weeks[0] || { week:1 };
      setTimeout(()=> showWeekInline(lesson, first), 120);
      // scroll into view
      try{ viewer.scrollIntoView({behavior:'smooth'}); }catch(e){}
    }

    // Expose a global helper so the static "Open" buttons can trigger opening a lesson/week.
    // Usage: window.puente_openLessonWeek('market_english_greetings', 1)
    try{
      window.puente_openLessonWeek = function(lessonId, week){
        debugLog('global puente_openLessonWeek called: '+ lessonId + ' week='+ week);
        try{ sessionStorage.setItem('puente_pending_open', JSON.stringify({ lessonId, week: Number(week) })); }catch(e){}
        // try to click the scheduled list item if present
        try{
          const sel = document.querySelector('#vendorScheduledList li[data-week="'+ Number(week) +'"]');
          if (sel){ debugLog('clicking scheduled li for week '+ week); sel.click(); return; }
        }catch(e){ debugLog('error finding scheduled li: '+ String(e)); }
        // fallback: open the lesson inline (openLessonInline is in scope)
        try{ debugLog('falling back to openLessonInline for '+ lessonId); openLessonInline(String(lessonId)); }catch(e){ debugLog('openLessonInline error: '+ String(e)); }
      };
    }catch(e){ debugLog('failed to set global puente_openLessonWeek: '+ String(e)); }

    function renderWeekSidebar(lesson, weeks){
      if (!vWeekList) return;
      vWeekList.innerHTML = '';
      weeks.forEach(w=>{
          const btn = document.createElement('button'); btn.className='week-item'; btn.type='button'; btn.style.display='block'; btn.style.width='100%'; btn.style.textAlign='left'; btn.style.padding='8px'; btn.style.border='0'; btn.style.borderBottom='1px solid #f1f2f4'; btn.dataset.week = String(w.week || w.weekNumber || '');
          btn.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between"><div><div style=\"font-weight:600\">Week ${w.week||w.weekNumber}</div><div class=\"muted\" style=\"font-size:13px;margin-top:4px\">${w.title||''}</div></div><div class=\"week-check\" aria-hidden=\"true\">&nbsp;</div></div>`;
        btn.addEventListener('click', ()=> showWeekInline(lesson, w));
        vWeekList.appendChild(btn);
            // fetch progress for this week and update the small marker
            (async function(btnEl, lessonId, weekNum){
              try{
                const uid = getUserIdForApi();
                const qs = `lessonId=${encodeURIComponent(lessonId||'')}&week=${encodeURIComponent(weekNum)}` + (uid? `&userId=${encodeURIComponent(uid)}` : '');
                const r = await fetch(`${API_BASE}/api/progress/summary?${qs}`);
                if (!r.ok) return;
                const j = await r.json().catch(()=>null);
                if (!j) return;
                const chk = btnEl.querySelector('.week-check');
                const best = typeof j.bestScore === 'number' ? j.bestScore : null;
                const pass = typeof j.passThreshold === 'number' ? (best !== null && best >= j.passThreshold) : (best !== null && best >= 70);
                if (chk){ chk.innerHTML = pass? '✓' : (j.attemptsCount? '•' : ''); }
              }catch(e){}
            })(btn, lesson.id, w.week || w.weekNumber);
      });
    }

    // Attach handlers for scheduled program module clicks
    try{
      const sched = document.getElementById('vendorScheduledList');
      if (sched){ sched.querySelectorAll('li[data-week]').forEach(li => li.addEventListener('click', async (e)=>{
        const wk = li.dataset.week; const lessonId = 'market_english_greetings';
          // ask for video URL if not present; try server first then fallback to localStorage
          let existing = null;
          try{ existing = await fetchServerModuleVideo(lessonId, wk); }catch(e){}
          if (!existing) existing = getModuleVideo(lessonId, wk);
          if (!existing){ const url = prompt(`Provide video URL for ${lessonId} — week ${wk} (leave empty to use lesson's default)`);
            if (url){ // try save to server (requires admin token). If that fails, save locally.
              const saved = await postServerModuleVideo(lessonId, wk, url);
              if (saved && saved.ok){ /* saved server-side */ }
              else { setModuleVideo(lessonId, wk, url); }
            }
          }
        // set pending open and open inline
        try{ sessionStorage.setItem('puente_pending_open', JSON.stringify({ lessonId, week: Number(wk) })); }catch(e){}
        openLessonInline(lessonId);
      })); }
    }catch(e){}

    function escapeHTML(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    // Progress helpers (localStorage + best-effort server sync)
    function progressKey(lessonId, weekNum){ return `puente_progress_${lessonId}_${weekNum}`; }
    function loadProgress(lessonId, weekNum){ try{ const s = localStorage.getItem(progressKey(lessonId, weekNum)); return s? JSON.parse(s) : null; }catch(e){ return null; } }
    function saveProgress(lessonId, weekNum, data){ try{ localStorage.setItem(progressKey(lessonId, weekNum), JSON.stringify(data)); }catch(e){}
      // best-effort server POST to persist progress if endpoint exists
      try{ const uid = getUserIdForApi(); const body = { lessonId, week: weekNum, progress: data }; if (uid) body.userId = uid; fetch(`${API_BASE}/api/progress`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) }).catch(()=>{}); }catch(e){}
    }

    // Compute vendor KPIs for a lesson by aggregating /api/progress/summary across weeks 1..12
    async function computeVendorKPIs(lessonId){
      if (!lessonId) return;
      const perfEl = document.getElementById('vendorKpiPerformance');
      const attEl = document.getElementById('vendorKpiAttempts');
      const compEl = document.getElementById('vendorKpiCompletion');
      const weeks = Array.from({length:12}, (_,i)=>i+1);
      try{
        const uid = getUserIdForApi();
        const calls = weeks.map(w=> {
          const qs = `lessonId=${encodeURIComponent(lessonId)}&week=${w}` + (uid? `&userId=${encodeURIComponent(uid)}` : '');
          return fetch(`${API_BASE}/api/progress/summary?${qs}`).then(r=> r.ok? r.json().catch(()=>null) : null).catch(()=>null);
        });
        const results = await Promise.all(calls);
        let perfArr = [], attempts = 0, passed = 0;
        results.forEach(r=>{ if (!r) return; if (typeof r.bestScore === 'number'){ perfArr.push(r.bestScore); if (r.bestScore >= (r.passThreshold||70)) passed++; } if (r.attemptsCount) attempts += Number(r.attemptsCount||0); });
        const performance = perfArr.length? Math.round((perfArr.reduce((a,b)=>a+b,0)/perfArr.length)*10)/10 : '-';
        const completion = Math.round((passed / weeks.length) * 100);
        if (perfEl) perfEl.querySelector('div:last-child').textContent = performance === '-' ? '-' : (performance + '%');
        if (attEl) attEl.querySelector('div:last-child').textContent = String(attempts);
        if (compEl) compEl.querySelector('div:last-child').textContent = completion + '%';
      }catch(e){ /* ignore KPI errors */ }
    }

    async function showWeekInline(lesson, week){
      if (!vWeekDetail) return;
      const title = escapeHTML(week.title || `Week ${week.week||week.weekNumber||''}`);
      // video (allow module-specific override saved via localStorage)
      let videoHtml = '';
      const weekNum = week.week || week.weekNumber || '';
      // check server override first, then localStorage, then lesson's default
      let overrideVideo = null;
      try{ overrideVideo = await fetchServerModuleVideo(lesson.id, weekNum); }catch(e){}
      if (!overrideVideo) overrideVideo = getModuleVideo(lesson.id, weekNum);
      const yt = overrideVideo || week.youtubeUrl || week.videoUrl || '';
      if (yt && /youtube\.com|youtu\.be/i.test(yt)){
        try{ const link = (new URL(yt, window.location.href)).toString();
          // embed simple iframe for YouTube when possible
          try{
            let iframeSrc = link;
            if (/youtube\.com\/watch\?v=/.test(link)) iframeSrc = link.replace('/watch?v=', '/embed/');
            else if (/youtu\.be\//.test(link)) iframeSrc = link.replace('youtu.be/', 'www.youtube.com/embed/');
            videoHtml = `<div style=\"padding:8px;border-radius:8px;overflow:hidden\"><iframe src=\"${escapeHTML(iframeSrc)}\" style=\"width:100%;height:320px;border:0;\" allow=\"accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture\" allowfullscreen></iframe></div>`;
          }catch(e){ videoHtml = `<div class=\"youtube-card\" style=\"padding:8px;background:#000;color:#fff;border-radius:8px\"><a href=\"${escapeHTML(link)}\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:inherit;text-decoration:none\">▶ Watch on YouTube</a></div>`; }
        }catch(e){ videoHtml = `<a href=\"${escapeHTML(yt)}\" target=\"_blank\">Open video</a>`; }
      } else if (yt){
        // fallback to HTML5 video
        videoHtml = `<video id=\"puente_week_video\" controls preload=\"metadata\" style=\"width:100%;max-height:360px;border-radius:8px;background:#000\"><source src=\"${escapeHTML(yt)}\"></video>`;
      }
      // phrases
      let phrasesHtml = '';
      if (Array.isArray(week.phrases)){
        phrasesHtml = `<div><strong>Phrases</strong><ul>${week.phrases.map(p=>`<li>${escapeHTML(p.phrase||p)}</li>`).join('')}</ul></div>`;
      }
      // exercises
          let idx = 0;
          async function renderNext(){
              if (idx >= activities.length){
              runner.innerHTML = '<div class="muted">All activities complete — validating completion with server...</div>';
              // Server-validated completion: check attempts/summary for this user
              try{
                const uid = getUserIdForApi();
                const qs = `lessonId=${encodeURIComponent(lesson.id||'')}&week=${encodeURIComponent(weekNum)}` + (uid? `&userId=${encodeURIComponent(uid)}` : '');
                const r = await fetch(`${API_BASE}/api/progress/summary?${qs}`);
                if (r.ok){ const j = await r.json().catch(()=>null);
                    const best = (j && typeof j.bestScore === 'number') ? j.bestScore : null;
                    const pass = (j && typeof j.passThreshold === 'number') ? j.passThreshold : 70;
                    if (best !== null && best >= pass){
                      // mark completed server-side and locally
                      const p = loadProgress(lesson.id||'', weekNum) || {};
                      p.attempts = (p.attempts||0);
                      p.bestScore = best;
                      saveProgress(lesson.id||'', weekNum, p);
                      try{ updateTileProgress(lesson.id||'', weekNum, best, true); }catch(e){}
                      showToast('Module completed (validated)');
                    } else {
                      // not passed yet
                      runner.innerHTML = `<div class="muted">You have not yet passed the required quiz/exercises. Server best score: ${best===null? '—' : best + '%'} (required ${pass}%). Please complete the exercises.</div>`;
                      showToast('Module not marked complete — pass the quiz first');
                      return;
                    }
                } else {
                    // server unreachable — fallback to local mark
                    const p = loadProgress(lesson.id||'', weekNum) || {};
                    p.attempts = (p.attempts||0); p.bestScore = 100; saveProgress(lesson.id||'', weekNum, p); updateTileProgress(lesson.id||'', weekNum, 100, true); showToast('Module completed (offline fallback)');
                }
              }catch(e){
                // on error fallback to local mark
                try{ const p = loadProgress(lesson.id||'', weekNum) || {}; p.attempts = (p.attempts||0); p.bestScore = 100; saveProgress(lesson.id||'', weekNum, p); updateTileProgress(lesson.id||'', weekNum, 100, true); showToast('Module completed (fallback)'); }catch(err){}
              }
              // auto-open next module (if exists)
              try{ const nextLi = document.querySelector('#vendorScheduledList li[data-week="'+ (Number(weekNum)+1) +'\"]'); if (nextLi){ setTimeout(()=>{ nextLi.click(); }, 800); } }catch(e){}
              return;
            }
            const act = activities[idx]; runner.innerHTML = `<div style="margin-bottom:6px"><strong>${escapeHTML(act.label)}</strong></div>`;
            const container = document.createElement('div'); runner.appendChild(container);
            act.render(container, ()=>{ idx++; renderNext(); });
          }
              const btn = document.createElement('button'); btn.className='btn'; btn.style.marginTop='8px'; btn.textContent='Mark phrases practiced'; btn.addEventListener('click', ()=>{ activities.find(a=>a.id==='phrases').done = true; doneCb(); }); el.appendChild(btn);
              container.appendChild(el);
            }});
          }
          // 3. Exercises - require user to submit at least once or click complete
          if (Array.isArray(week.exercises) && week.exercises.length){
            activities.push({ id:'exercises', label:'Complete the exercises', done:false, render:function(container, doneCb){
              container.innerHTML = '';
              const heading = document.createElement('div'); heading.innerHTML = `<div style=\"margin-bottom:8px\"><strong>Activity: Complete exercises</strong></div>`; container.appendChild(heading);
              const exWrap = document.createElement('div'); exWrap.id = 'vendorActivityExercises'; container.appendChild(exWrap);
              // reuse existing rendering logic for exercises
              try{ const tmpWeek = Object.assign({}, week); const tmpLesson = lesson; // use render code above (vendorExercises)
                const exercisesHtmlFrag = (()=>{
                  const frag = document.createElement('div');
                  (week.exercises||[]).forEach((ex, idx)=>{
                    const exEl = document.createElement('div'); exEl.className='exercise-card'; exEl.style.marginBottom='12px'; exEl.style.padding='8px'; exEl.style.borderRadius='6px'; exEl.style.background='#fff';
                    if (ex.type === 'mcq'){
                      const q = document.createElement('div'); q.innerHTML = `<div style=\"font-weight:600;margin-bottom:8px\">${escapeHTML(ex.question||'Question')}</div>`;
                      const form = document.createElement('form'); form.dataset.idx = idx;
                      (ex.options||[]).forEach((o,i)=>{ const lbl = document.createElement('label'); lbl.style.display='block'; lbl.style.marginBottom='6px'; const input = document.createElement('input'); input.type='radio'; input.name=`activity_ex_${idx}`; input.value = (typeof o==='object' && o.id)? o.id : i; lbl.appendChild(input); lbl.appendChild(document.createTextNode(' ' + (typeof o==='object'? (o.text||o.label||o): o))); form.appendChild(lbl); });
                      const submit = document.createElement('button'); submit.type='button'; submit.className='btn'; submit.textContent='Submit answer'; submit.style.marginTop='8px';
                      const feedback = document.createElement('div'); feedback.className='muted small'; feedback.style.marginTop='8px';
                      submit.addEventListener('click', async ()=>{
                        // simple local check: compare with ex.answerId or ex.answer
                        const fd = new FormData(form); const val = fd.get(`activity_ex_${idx}`);
                        if (val === null){ feedback.textContent = 'Please select an answer.'; return; }
                        let correct = null;
                        if (ex.hasOwnProperty('answerId')) correct = String(ex.answerId);
                        else if (ex.hasOwnProperty('answer')) correct = String(ex.answer);
                        const passed = (String(val) === String(correct));
                        feedback.textContent = passed? 'Correct' : 'Submitted (may be incorrect)';
                        // best-effort save attempt to server
                        try{ const payload = { lessonId: lesson.id||'', week: weekNum, answers: [val] }; await fetch(`${API_BASE}/api/attempts`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) }); }catch(e){}
                      });
                      exEl.appendChild(q); exEl.appendChild(form); exEl.appendChild(submit); exEl.appendChild(feedback);
                    } else {
                      exEl.innerHTML = `<div>${escapeHTML(ex.prompt||ex.question||ex.type||'')}</div>`;
                    }
                    frag.appendChild(exEl);
                  });
                  return frag;
                })();
                exWrap.appendChild(exercisesHtmlFrag);
              }catch(e){ exWrap.innerHTML = '<div class="muted small">Exercises unable to render.</div>'; }
              const doneBtn = document.createElement('button'); doneBtn.className='btn'; doneBtn.style.marginTop='8px'; doneBtn.textContent='Mark exercises complete'; doneBtn.addEventListener('click', ()=>{ activities.find(a=>a.id==='exercises').done = true; doneCb(); }); container.appendChild(doneBtn);
            }});
          }

          // runner state
          let idx = 0;
          function renderNext(){
              if (idx >= activities.length){
              runner.innerHTML = '<div class="muted">All activities complete — validating completion with server...</div>';
              // Server-validated completion: check attempts/summary for this user
              try{
                const uid = getUserIdForApi();
                const qs = `lessonId=${encodeURIComponent(lesson.id||'')}&week=${encodeURIComponent(weekNum)}` + (uid? `&userId=${encodeURIComponent(uid)}` : '');
                const r = await fetch(`${API_BASE}/api/progress/summary?${qs}`);
                if (r.ok){ const j = await r.json().catch(()=>null);
                    const best = (j && typeof j.bestScore === 'number') ? j.bestScore : null;
                    const pass = (j && typeof j.passThreshold === 'number') ? j.passThreshold : 70;
                    if (best !== null && best >= pass){
                      // mark completed server-side and locally
                      const p = loadProgress(lesson.id||'', weekNum) || {};
                      p.attempts = (p.attempts||0);
                      p.bestScore = best;
                      saveProgress(lesson.id||'', weekNum, p);
                      try{ updateTileProgress(lesson.id||'', weekNum, best, true); }catch(e){}
                      showToast('Module completed (validated)');
                    } else {
                      // not passed yet
                      runner.innerHTML = `<div class="muted">You have not yet passed the required quiz/exercises. Server best score: ${best===null? '—' : best + '%'} (required ${pass}%). Please complete the exercises.</div>`;
                      showToast('Module not marked complete — pass the quiz first');
                      return;
                    }
                } else {
                    // server unreachable — fallback to local mark
                    const p = loadProgress(lesson.id||'', weekNum) || {};
                    p.attempts = (p.attempts||0); p.bestScore = 100; saveProgress(lesson.id||'', weekNum, p); updateTileProgress(lesson.id||'', weekNum, 100, true); showToast('Module completed (offline fallback)');
                }
              }catch(e){
                // on error fallback to local mark
                try{ const p = loadProgress(lesson.id||'', weekNum) || {}; p.attempts = (p.attempts||0); p.bestScore = 100; saveProgress(lesson.id||'', weekNum, p); updateTileProgress(lesson.id||'', weekNum, 100, true); showToast('Module completed (fallback)'); }catch(err){}
              }
              // auto-open next module (if exists)
              try{ const nextLi = document.querySelector('#vendorScheduledList li[data-week="'+ (Number(weekNum)+1) +'"]'); if (nextLi){ setTimeout(()=>{ nextLi.click(); }, 800); } }catch(e){}
              return;
            }
            const act = activities[idx]; runner.innerHTML = `<div style=\"margin-bottom:6px\"><strong>${escapeHTML(act.label)}</strong></div>`;
            const container = document.createElement('div'); runner.appendChild(container);
            act.render(container, ()=>{ idx++; renderNext(); });
          }
          // start runner
          setTimeout(()=> renderNext(), 260);
        }
      }catch(e){ console.warn('activity runner failed', e); }
      // wire exercise submit buttons
      const submitButtons = vWeekDetail.querySelectorAll('.submit-ex');
      submitButtons.forEach(btn=> btn.addEventListener('click', async (e)=>{
        const idx = Number(e.currentTarget.dataset.idx);
        const form = vWeekDetail.querySelector(`form[data-idx=\"${idx}\"]`);
        if (!form) return;
        const fd = new FormData(form);
        const val = fd.get(`ex_${idx}`);
        const answers = [];
        // simple: build answers array by checking all forms
        const forms = vWeekDetail.querySelectorAll('form');
        forms.forEach((f, fi)=>{ const ffd = new FormData(f); const v = ffd.get(`ex_${fi}`); if (v === null) answers.push(null); else if (!isNaN(Number(v))) answers.push(Number(v)); else answers.push(String(v)); });
        // prepare payload
        const currentLessonId = lesson.id || '';
        const weekNum = week.week || week.weekNumber || 1;
        let userIdVal = (userIdInput && userIdInput.value) || (function(){ try{ const u = JSON.parse(sessionStorage.getItem('puente_user') || localStorage.getItem('puente:user') || 'null'); return u && (u.email || u.name) ? (u.email||u.name) : ''; }catch(e){ return ''; } })();
        const payload = { lessonId: currentLessonId, week: weekNum, answers: answers, userId: userIdVal || undefined };
        try{
          const res = await fetch(`${API_BASE}/api/attempts`, { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
          const j = await res.json().catch(()=>null);
          const fb = form.querySelector('.ex-feedback'); if (fb) fb.textContent = (res.ok && j && j.attempt && typeof j.attempt.score === 'number') ? `Saved — score: ${j.attempt.score}%` : (j && j.error? `Server: ${j.error}` : `Submitted (status ${res.status})`);
          // on success, refresh week progress marker and vendor KPIs
          if (res.ok){
            try{
              // update local progress best-effort
              const score = (j && j.attempt && typeof j.attempt.score === 'number') ? j.attempt.score : null;
              if (score !== null){
                const p = loadProgress(currentLessonId, weekNum) || { attempts:0, bestScore:0 };
                p.attempts = (p.attempts||0) + 1;
                p.bestScore = Math.max(p.bestScore||0, score);
                saveProgress(currentLessonId, weekNum, p);
              }
              // re-fetch server progress summary for this week and update marker
              const uid2 = getUserIdForApi();
              const qs2 = `lessonId=${encodeURIComponent(currentLessonId||'')}&week=${encodeURIComponent(weekNum)}` + (uid2? `&userId=${encodeURIComponent(uid2)}` : '');
              const pr = await fetch(`${API_BASE}/api/progress/summary?${qs2}`);
              if (pr.ok){ const pj = await pr.json().catch(()=>null); if (pj){ const btn = vWeekList.querySelector(`[data-week=\"${weekNum}\"]`); if (btn){ const chk = btn.querySelector('.week-check'); const best = typeof pj.bestScore === 'number' ? pj.bestScore : null; const pass = typeof pj.passThreshold === 'number' ? (best !== null && best >= pj.passThreshold) : (best !== null && best >= 70); if (chk) chk.innerHTML = pass? '✓' : (pj.attemptsCount? '•' : ''); } }
                // recompute KPIs
                computeVendorKPIs(currentLessonId);
              }
            }catch(e){}
          }
        }catch(err){ const fb = form.querySelector('.ex-feedback'); if (fb) fb.textContent = 'Error submitting attempt'; }
      }));
    }

    if (vClose) vClose.addEventListener('click', ()=>{ if (viewer) viewer.style.display='none'; vWeekList.innerHTML=''; vWeekDetail.innerHTML=''; });

    // initial load
    // Attach resilient handlers for the small 'Enter' buttons in scheduled lists
    function attachScheduledEnterHandlers(){
      try{
        const sched = document.getElementById('vendorScheduledList');
        if (!sched) return;
        sched.querySelectorAll('li[data-week]').forEach(li=>{
          const wk = li.dataset.week;
          const btn = li.querySelector('button');
          if (!btn) return;
          btn.onclick = function(e){ try{ e.stopPropagation(); debugLog('Enter button clicked (vendor) week='+ wk); window.puente_openLessonWeek && window.puente_openLessonWeek('market_english_greetings', Number(wk)); }catch(err){ debugLog('enter handler err: '+ String(err)); } };
        });
      }catch(e){ debugLog('attachScheduledEnterHandlers failed: '+ String(e)); }
    }

    attachScheduledEnterHandlers();
    // Delegated click handler as a final safety net: capture any clicks inside the scheduled list
    try{
      document.addEventListener('click', function delegatedScheduledClick(e){
        try{
          const li = e.target.closest && e.target.closest('#vendorScheduledList li[data-week]');
          if (!li) return;
          // Avoid handling the same click twice
          if (li.__puente_click_handled) return;
          li.__puente_click_handled = true;
          setTimeout(()=>{ try{ li.__puente_click_handled = false; }catch(e){} }, 300);
          const wk = li.dataset.week;
          debugLog('delegated click caught for vendor scheduled week='+ wk);
          try{ e.stopPropagation(); }catch(e){}
          window.puente_openLessonWeek && window.puente_openLessonWeek('market_english_greetings', Number(wk));
        }catch(err){ debugLog('delegatedScheduledClick error: '+ String(err)); }
      }, true);
    }catch(e){ debugLog('failed to attach delegatedScheduledClick: '+ String(e)); }
    fetchLessons().then(list=> renderLessons(list)).catch(()=>{});
  });
})();
