// Dashboard skeleton script — cleared for redesign
document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard skeleton loaded — redesign in progress');
  const app = document.getElementById('app');
  if (app) {
    const info = document.createElement('div');
    info.className = 'card';
    info.innerHTML = '<p>New dashboard skeleton. Implement components and wiring here.</p>';
    app.appendChild(info);
  }
});

function openLesson(id){
  if (!id) return;
  window.location.href = `lesson.html?id=${encodeURIComponent(id)}`;
}

// --- Interactive prototype wiring ---
(function(){
  const railIds = ['railDashboard','railLessons','railSchedule','railMaterials','railForum','railAssessments','railSettings'];
  function rb(id){return document.getElementById(id);} 
  // cached lessons list from server
  let cachedLessons = [];
  const DEBUG_LOG = true; // toggle detailed console logs

  function setActiveRail(activeId){
    railIds.forEach(id=>{ const el = rb(id); if (!el) return; if (id===activeId){ el.classList.add('active'); el.setAttribute('aria-pressed','true'); } else { el.classList.remove('active'); el.setAttribute('aria-pressed','false'); } });
  }

  // navigation behaviors (basic)
  function initRail(){
    try{
      const dash = rb('railDashboard'); const lessons = rb('railLessons'); const schedule = rb('railSchedule');
      if (dash) dash.addEventListener('click', ()=>{ setActiveRail('railDashboard'); document.getElementById('title').textContent='Welcome'; });
      if (lessons) lessons.addEventListener('click', ()=>{ setActiveRail('railLessons'); document.getElementById('lessonsSection').scrollIntoView({behavior:'smooth'}); document.getElementById('title').textContent='Lessons'; });
      if (schedule) schedule.addEventListener('click', ()=>{ setActiveRail('railSchedule'); document.getElementById('title').textContent='Schedule'; });
      // others: simple focus change
      railIds.forEach(id=>{ const el = rb(id); if (el) el.addEventListener('keydown',(e)=>{ if (e.key==='Enter' || e.key===' ') { e.preventDefault(); el.click(); } }); });
      setActiveRail('railDashboard');
    } catch(e){ console.warn('initRail', e); }
  }

    // Simple toast helper to show brief notifications
    function showToast(message, timeout){
      try{
        timeout = typeof timeout === 'number' ? timeout : 3500;
        let container = document.getElementById('puente-toast-container');
        if (!container){
          container = document.createElement('div'); container.id = 'puente-toast-container';
          container.style.position = 'fixed'; container.style.right = '16px'; container.style.bottom = '16px'; container.style.zIndex = '9999';
          document.body.appendChild(container);
        }
        const t = document.createElement('div'); t.className = 'puente-toast';
        t.textContent = String(message || '');
        t.style.background = 'rgba(0,0,0,0.8)'; t.style.color = '#fff'; t.style.padding = '10px 14px'; t.style.marginTop = '8px'; t.style.borderRadius = '6px'; t.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)'; t.style.fontSize = '13px';
        container.appendChild(t);
        setTimeout(()=>{ try{ t.style.transition = 'opacity 300ms'; t.style.opacity = '0'; setTimeout(()=> t.remove(), 320); }catch(e){} }, timeout);
      }catch(e){/* ignore toast errors */}
    }

  // keyboard shortcuts Alt+1..7 (primary), Ctrl+Alt fallback handled by browser/platform if needed
  document.addEventListener('keydown', (e)=>{
    if (!e.altKey) return; // require Alt
    const k = e.key;
    if (!/^[1-7]$/.test(k)) return;
    const idx = Number(k)-1; const id = railIds[idx]; if (!id) return; e.preventDefault(); const target = rb(id); if (target) { target.click(); target.focus(); }
  });

  // Load lessons from server (fallback to sample)
  async function fetchLessons(){
    try{
      const r = await fetch('/api/lessons'); if (r.ok){ const j=await r.json(); cachedLessons = j.lessons||[]; if (DEBUG_LOG) console.debug('fetchLessons: loaded', cachedLessons.length, 'lessons', cachedLessons.map(x=>x.id)); return cachedLessons; }
    }catch(e){ /* ignore */ }
    // sample fallback
    if (DEBUG_LOG) console.debug('fetchLessons: using fallback sample lessons');
    return [
      {id:'lang1',title:'Market English: Greetings',audience:'vendor',summary:'Short phrases for vendors.'},
      {id:'lang3',title:'Moto English: Directions',audience:'moto',summary:'Directions, fares, safety.'},
      {id:'langAll',title:'Community Phrases',audience:'all',summary:'General useful phrases.'}
    ];
  }

  // Build a 12-week array for lessons that only contain a single-week record
  // Strategy: if the selected lesson has <12 weeks, look for other lessons in the catalog
  // with ids like en_wk1..en_wk6 and fr_wk7..fr_wk12 and merge their week objects by week number.
  function assemble12Weeks(lesson){
    if (!lesson) return [];
    const existing = Array.isArray(lesson.weeks) ? lesson.weeks.slice() : [];
    if (DEBUG_LOG) console.debug('assemble12Weeks: lesson', lesson.id, 'existing weeks count', existing.length);
    if (existing.length >= 12) { if (DEBUG_LOG) console.debug('assemble12Weeks: already 12+ weeks, returning existing'); return existing; }
    // try to collect program pieces from cachedLessons
    const programMap = {};
    // include the lesson's own weeks
    existing.forEach(w=> { if (w && w.week) programMap[w.week] = w; });
    cachedLessons.forEach(l => {
      if (!l || !l.id) return;
      // match ids like en_wk1, fr_wk7, or vendor_bilingual which already contains full weeks
      const m = l.id.match(/^(en|fr)_wk(\d{1,2})$/i);
      if (m && Array.isArray(l.weeks)){
        l.weeks.forEach(w => { if (w && w.week) programMap[w.week] = programMap[w.week] || w; });
      }
      // if we hit a full-program lesson (12 weeks) for same audience/title, include its weeks
      if (Array.isArray(l.weeks) && l.weeks.length >= 12 && (l.id === lesson.id || l.title && lesson.title && l.title.toLowerCase().includes((lesson.title||'').split('—')[0].trim().toLowerCase()))) {
        l.weeks.forEach(w => { if (w && w.week) programMap[w.week] = programMap[w.week] || w; });
      }
    });
    // produce ordered array 1..12
    const out = [];
    for (let i=1;i<=12;i++){
      if (programMap[i]) out.push(programMap[i]); else {
        // if lesson had a weeks entry matching this index by position, use it; else placeholder
        const found = existing.find(w=> (w.week||w.weekNumber) === i);
        if (found) out.push(found);
        else out.push({ week: i, title: `Week ${i}` });
      }
    }

    // If programMap is mostly empty, try collecting single-week lessons named en_wkN / fr_wkN
    const realCount = out.filter(w => w && (w.phrases || (w.exercises && w.exercises.length))).length;
    if (realCount < 2) {
      if (DEBUG_LOG) console.debug('assemble12Weeks: insufficient real weeks found (', realCount, '), attempting to assemble from en_wk*/fr_wk* lessons');
      const weekSources = {};
      cachedLessons.forEach(l => {
        const m = l.id && l.id.match(/^(en|fr)_wk(\d{1,2})$/i);
        if (m && Array.isArray(l.weeks) && l.weeks.length) {
          const w = l.weeks[0]; if (w && w.week) weekSources[w.week] = w;
        }
        // also support lessons that are single-week objects in their root (some older formats)
        if (Array.isArray(l.weeks) && l.weeks.length===1 && l.weeks[0] && l.weeks[0].week) {
          weekSources[l.weeks[0].week] = weekSources[l.weeks[0].week] || l.weeks[0];
        }
      });
      // if we found weekSources, overwrite out entries
      if (Object.keys(weekSources).length) {
        for (let i=1;i<=12;i++){
          if (weekSources[i]) out[i-1] = weekSources[i];
        }
      } else {
        // fallback: if there's a full-program lesson like vendor_bilingual, use it
        const full = cachedLessons.find(l=> Array.isArray(l.weeks) && l.weeks.length>=12);
        if (full) { if (DEBUG_LOG) console.debug('assemble12Weeks: using full-program lesson', full.id); return full.weeks.slice(0,12); }
      }
    }
    return out;
  }
  if (DEBUG_LOG) console.debug('assemble12Weeks: ready');

  function renderLessons(list){
    const wrap = document.getElementById('lessonsList'); if (!wrap) return; wrap.innerHTML='';
    const role = sessionStorage.getItem('puente_role')||'';
    const filtered = list.filter(l=>{ if (!role) return true; return l.audience==='all' || l.audience===role; });
    filtered.forEach(l=>{
      const d = document.createElement('div'); d.className='lesson-card card';
      d.innerHTML = `<strong class="lesson-title">${l.title}</strong><div class="muted lesson-summary" style="font-size:13px;margin-top:6px">${l.summary||''}</div><div style="margin-top:8px"><button class="btn open-lesson">Open</button></div>`;
      d.querySelector('.open-lesson').addEventListener('click', ()=> showLesson(l));
      wrap.appendChild(d);
    });
  }

  // Show the lesson weeks in the UI (renders the program-week-grid)
  function showLesson(lesson){
    if (!lesson) return;
    const title = document.getElementById('title'); if (title) title.textContent = lesson.title || 'Lesson';
    const weeksSection = document.getElementById('weeksSection'); const weeksGrid = document.getElementById('weeksGrid'); const weeksTitle = document.getElementById('weeksTitle');
    const weekDetail = document.getElementById('weekDetail'); if (weekDetail) { weekDetail.style.display='none'; weekDetail.innerHTML=''; }
    if (!weeksSection || !weeksGrid) return;
    // reveal with animation
    weeksSection.style.display = '';
    // small delay to allow transition from display change
    requestAnimationFrame(()=> weeksSection.classList.add('open'));
    weeksTitle.textContent = lesson.title + ' — Program weeks';
    weeksGrid.innerHTML = '';
    // assemble a full 12-weeks program when possible
    const weeks = assemble12Weeks(lesson);
    // create tiles (and mark as fade-in to animate entry)
      const programWeeks = weeks; // keep reference for click handlers
      weeks.forEach((w, idx) => {
        const tile = document.createElement('button');
        tile.className = 'program-week-tile card fade-in';
        tile.setAttribute('type','button');
        tile.setAttribute('role','listitem');
        tile.setAttribute('tabindex','0');
        tile.setAttribute('aria-selected','false');
        const wn = w.week || (w.weekNumber|| (idx+1));
        tile.dataset.week = String(wn);
        // show thumbnail and duration if available
        const thumbHtml = w.thumbnailUrl? `<div style="height:78px;margin-bottom:8px;border-radius:8px;overflow:hidden"><img src="${w.thumbnailUrl}" alt="Week ${wn} thumbnail" style="width:100%;height:100%;object-fit:cover"></div>` : '';
        const durHtml = w.duration? `<div class="muted" style="font-size:12px;margin-bottom:6px">${w.duration}</div>` : '';
        tile.innerHTML = `
          ${thumbHtml}
          ${durHtml}
          <div class="program-week-number">Week ${wn}</div>
          <div class="program-week-title">${w.title||''}</div>
          <div class="program-week-progress" aria-hidden="true"><div class="bar"></div></div>
          <div class="prog-meta"><span class="program-week-score"><span class="prog-percent">-</span></span><span class="program-week-tick pending" aria-hidden="true">•</span></div>
        `;
        tile.addEventListener('click', async ()=>{
          try{
            const clickedWeekNum = Number(tile.dataset.week);
            // try to find the week object in the assembled program
            let weekObj = (programWeeks || []).find(w => Number((w && (w.week || w.weekNumber)) || 0) === clickedWeekNum);
            // if not present, attempt to fetch the week from the server endpoint
            if (!weekObj && lesson && lesson.id){
              try{
                const resp = await fetch(`/api/lesson/${encodeURIComponent(lesson.id)}/week/${encodeURIComponent(String(clickedWeekNum))}`);
                if (resp.ok) weekObj = await resp.json();
              }catch(e){ /* ignore fetch errors and fall back to placeholder */ }
            }
            if (!weekObj) weekObj = { week: clickedWeekNum, title: `Week ${clickedWeekNum}` };
            if (DEBUG_LOG) console.debug('tile.click -> showWeek', { lessonId: lesson.id, weekNum: clickedWeekNum, weekObj });
            showWeek(lesson, weekObj);
            // Apply visual selection to the clicked tile
            setTimeout(()=>{
              try{
                const weeksGrid = document.getElementById('weeksGrid'); if (!weeksGrid) return;
                const tiles = weeksGrid.querySelectorAll('.program-week-tile'); tiles.forEach(t=> t.classList.remove('selected'));
                tile.classList.add('selected');
                // update aria-selected attributes
                tiles.forEach(t=> t.setAttribute('aria-selected','false'));
                tile.setAttribute('aria-selected','true');
                // persist clicked week selection
                if (lesson && lesson.id) localStorage.setItem('puente_selectedLesson', lesson.id);
                localStorage.setItem('puente_selectedWeek', String(clickedWeekNum));
              }catch(e){/* ignore */}
            }, 60);
          }catch(err){ console.error('tile click handler error', err); }
        });
        tile.addEventListener('keydown', (ev)=>{
          // Enter or Space opens
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); tile.click(); }
        });
        weeksGrid.appendChild(tile);
        // initialize tile progress from saved state if present
        try{
          const saved = loadProgress(lesson.id, wn);
          if (saved && typeof saved.bestScore === 'number'){
            updateTileProgress(lesson.id, wn, saved.bestScore, (saved.bestScore||0) >= (saved.passThreshold||70));
          }
        }catch(e){}
        // stagger fade-in
        setTimeout(()=> tile.classList.remove('fade-in'), 40 * idx);
      });

      // enable keyboard navigation for the weeks grid
      setupWeekGridKeyboard(weeksGrid);

      // auto-open first week (if no prior selection) so users see the video & activities when they click Open
      try{
        const persisted = localStorage.getItem('puente_selectedWeek');
        if (!persisted){
          const firstWeek = (weeks && weeks.length)? (weeks[0] || null) : null;
          if (firstWeek) setTimeout(()=> showWeek(lesson, firstWeek), 280);
        }
      }catch(e){/* ignore */}

    // fetch per-week progress and update tiles (non-blocking)
    const lessonId = lesson.id;
    weeks.forEach((w)=>{
      const wn = w.week || w.weekNumber || null; if (!wn) return;
      fetch(`/api/progress/summary?lessonId=${encodeURIComponent(lessonId||'')}&week=${encodeURIComponent(wn)}`)
        .then(r => r.ok? r.json() : null).then(data => {
          const selector = `[data-week="${wn}"]`;
          const tile = weeksGrid.querySelector(selector);
          if (!tile || !data) return;
          const percentEl = tile.querySelector('.prog-percent');
          const tickEl = tile.querySelector('.program-week-tick');
            const barEl = tile.querySelector('.program-week-progress .bar');
          if (typeof data.bestScore === 'number'){
            const pct = Math.round(data.bestScore);
            if (percentEl) percentEl.textContent = pct + '%';
              if (barEl) barEl.style.width = pct + '%';
            if (typeof data.passThreshold === 'number' && pct >= data.passThreshold){
              tickEl && tickEl.classList.remove('pending'); tickEl && tickEl.classList.add('done'); tickEl && (tickEl.textContent='✓');
            } else {
              tickEl && tickEl.classList.remove('done'); tickEl && tickEl.classList.add('pending'); tickEl && (tickEl.textContent='•');
            }
          } else if (data && data.attemptsCount){
            if (percentEl) percentEl.textContent = (data.attemptsCount||0) + ' attempts';
              if (barEl) barEl.style.width = '10%';
          }
        }).catch(()=>{});
    });

    // recompute KPIs for this lesson
    computeKPIs(lesson.id);
  }

    // Keyboard navigation: arrow keys move focus between tiles inside weeksGrid
    function setupWeekGridKeyboard(weeksGrid){
      if (!weeksGrid) return;
      weeksGrid.setAttribute('role','list');
      weeksGrid.addEventListener('keydown', (e)=>{
        const keys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
        if (!keys.includes(e.key)) return;
        const focusable = Array.from(weeksGrid.querySelectorAll('.program-week-tile'));
        if (!focusable.length) return;
        const idx = focusable.indexOf(document.activeElement);
        let next = idx;
        const cols = Math.max(1, Math.floor(weeksGrid.clientWidth / 140)); // rough columns
        if (e.key === 'ArrowRight') next = Math.min(focusable.length-1, idx + 1);
        if (e.key === 'ArrowLeft') next = Math.max(0, idx - 1);
        if (e.key === 'ArrowDown') next = Math.min(focusable.length-1, idx + cols);
        if (e.key === 'ArrowUp') next = Math.max(0, idx - cols);
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = focusable.length-1;
        if (next !== idx){ e.preventDefault(); focusable[next].focus(); }
      });
      // also manage aria-selected on focus
      weeksGrid.addEventListener('focusin', (e)=>{
        const tile = e.target.closest('.program-week-tile'); if (!tile) return;
        const others = weeksGrid.querySelectorAll('.program-week-tile'); others.forEach(t=> t.setAttribute('aria-selected','false'));
        tile.setAttribute('aria-selected','true');
      });
    }

  // Show a single week's detail (phrases/exercises)
  function showWeek(lesson, week){
    const weekDetail = document.getElementById('weekDetail'); if (!weekDetail) return;
    if (DEBUG_LOG) console.debug('showWeek called', { lessonId: lesson && lesson.id, week });
    weekDetail.style.display = '';
    const role = sessionStorage.getItem('puente_role')||'';
    const lines = [];
    lines.push(`<h4>${week.title || ('Week ' + (week.week||''))}</h4>`);
    // phrases
    if (week.phrases){
      const p = week.phrases;
      if (typeof p === 'object' && (p.vendor || p.moto)){
        lines.push(`<strong>Phrases (${role || 'all'})</strong>`);
        const list = (role && p[role])? p[role] : (p.vendor||[]).concat(p.moto||[]);
        lines.push('<ul>');
        (list||[]).forEach(ph => { lines.push(`<li><strong>${ph.phrase}</strong> — <span class="muted">${ph.translation||''} ${ph.phonetic? ' — '+ph.phonetic:''}</span></li>`); });
        lines.push('</ul>');
      } else if (Array.isArray(week.phrases)){
        lines.push('<strong>Phrases</strong><ul>');
        week.phrases.forEach(ph=> lines.push(`<li><strong>${ph.phrase}</strong> — <span class="muted">${ph.translation||''}</span></li>`));
        lines.push('</ul>');
      }
    }
    // exercises (interactive for mcq)
    if (week.exercises && Array.isArray(week.exercises)){
      lines.push('<strong>Exercises</strong>');
      // placeholder container to be filled after DOM insertion
      lines.push('<div id="exercisesContainer"></div>');
    }
    // media links
    // media: embed video when possible, else show links
    if (week.videoUrl || week.audioUrl){
      lines.push('<div class="mt-1 media-block">');
      if (week.videoUrl){
        const v = week.videoUrl;
        // simple heuristics: embed <video> for direct mp4/webm, iframe for youtube, else link
        if (/\.(mp4|webm|ogg)(\?|$)/i.test(v)){
          lines.push(`<video controls preload="metadata" style="width:100%;max-height:360px;border-radius:8px;background:#000"><source src="${v}"></video>`);
        } else if (/youtube\.com|youtu\.be/i.test(v)){
          // convert to embed URL when possible
          let embed = v;
          try{
            const u = new URL(v, window.location.href);
            if (u.hostname.includes('youtu')){
              const vid = u.searchParams.get('v') || (u.pathname ? u.pathname.split('/').pop() : '');
              if (vid) embed = `https://www.youtube.com/embed/${vid}`;
            }
          }catch(e){}
          lines.push(`<div style="position:relative;padding-top:56.25%"><iframe src="${embed}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border-radius:8px"></iframe></div>`);
        } else {
          lines.push(`<div><a href="${v}" target="_blank" class="btn link-btn">Open video</a></div>`);
        }
      }
      if (week.audioUrl) lines.push(`<div style="margin-top:8px"><audio controls src="${week.audioUrl}">Your browser does not support audio.</audio></div>`);
      lines.push('</div>');
    }

    if (lines.length === 0) {
      weekDetail.innerHTML = '<p class="muted">No content available for this week.</p>';
    } else {
      weekDetail.innerHTML = lines.join('');
    }
    // after insertion, render interactive exercises
    try{
      const exWrap = weekDetail.querySelector('#exercisesContainer');
      if (exWrap && Array.isArray(week.exercises)){
        renderExercises(week.exercises, lesson, week, exWrap);
      }
    }catch(e){ console.warn('renderExercises failed', e); }
    weekDetail.scrollIntoView({behavior:'smooth'});
    // highlight selected tile
    try{
      const weeksGrid = document.getElementById('weeksGrid'); if (weeksGrid){
        const tiles = weeksGrid.querySelectorAll('.program-week-tile'); tiles.forEach(t=> t.classList.remove('selected'));
        const sel = weeksGrid.querySelector(`[data-week="${week.week||week.weekNumber}"]`);
        if (sel) sel.classList.add('selected');
      }
      // persist selection
      if (lesson && lesson.id) localStorage.setItem('puente_selectedLesson', lesson.id);
      if (week && (week.week || week.weekNumber)) localStorage.setItem('puente_selectedWeek', String(week.week || week.weekNumber));
    }catch(e){/* ignore persist errors */}
  }

  // Progress storage helpers (localStorage + optional server sync)
  function progressKey(lessonId, weekNum){ return `puente_progress_${lessonId}_${weekNum}`; }
  function loadProgress(lessonId, weekNum){ try{ const s = localStorage.getItem(progressKey(lessonId,weekNum)); return s? JSON.parse(s) : null; }catch(e){ return null; } }
  function saveProgress(lessonId, weekNum, data){ try{ localStorage.setItem(progressKey(lessonId,weekNum), JSON.stringify(data)); }catch(e){}
    // try to POST to server progress endpoint if available (best-effort)
    try{ fetch('/api/progress', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ lessonId, week: weekNum, progress: data }) }).catch(()=>{}); }catch(e){}
  }

  // update tile visuals (progress bar and tick)
  function updateTileProgress(lessonId, weekNum, percent, passed){
    try{
      const weeksGrid = document.getElementById('weeksGrid'); if (!weeksGrid) return;
      const tile = weeksGrid.querySelector(`[data-week="${weekNum}"]`);
      if (!tile) return;
      const bar = tile.querySelector('.program-week-progress .bar'); if (bar) bar.style.width = (percent||0) + '%';
      const tick = tile.querySelector('.program-week-tick'); if (tick){ if (passed){ tick.classList.remove('pending'); tick.classList.add('done'); tick.textContent='✓'; } else { tick.classList.remove('done'); tick.classList.add('pending'); tick.textContent='•'; } }
    }catch(e){/* ignore */}
  }

  // Render exercises interactively into container
  function renderExercises(exercises, lesson, week, container){
    container.innerHTML = '';
    const lessonId = lesson && lesson.id; const weekNum = week && (week.week || week.weekNumber);
    const prog = loadProgress(lessonId, weekNum) || {};
    exercises.forEach((ex, idx) => {
      const exDiv = document.createElement('div'); exDiv.className = 'exercise-card';
      if (ex.type === 'mcq'){
        // render question and options
        const q = document.createElement('div'); q.innerHTML = `<div style="margin-bottom:8px"><strong>${ex.question||'Question'}</strong></div>`;
        const form = document.createElement('form'); form.className = 'mcq-form';
        (ex.options||[]).forEach((opt,i)=>{
          const id = `opt_${lessonId}_${weekNum}_${idx}_${i}`;
          const label = document.createElement('label'); label.className='option-label';
          // Support options as simple strings or objects like { id: 'A', text: 'Option text' }
          const optionValue = (opt && typeof opt === 'object' && opt.id) ? String(opt.id) : String(i);
          const optionText = (opt && typeof opt === 'object') ? (opt.text || opt.label || opt.title || String(opt)) : String(opt);
          label.innerHTML = `<input type="radio" name="${lessonId}_${weekNum}_${idx}" value="${optionValue}" id="${id}"> <span style="margin-left:8px">${optionText}</span>`;
          form.appendChild(label);
        });
        const submit = document.createElement('button'); submit.className='btn btn-primary'; submit.type='button'; submit.style.marginTop='8px'; submit.textContent = 'Submit';
        const feedback = document.createElement('div'); feedback.className='small muted'; feedback.style.marginTop='8px';
        submit.addEventListener('click', ()=>{
          const formData = new FormData(form); const val = formData.get(`${lessonId}_${weekNum}_${idx}`);
          if (val === null){ feedback.textContent = 'Please select an answer.'; return; }
          const selectedVal = String(val);
          // Determine canonical correct value. Support both ex.answerId (id string) and ex.answer (index or id)
          let correctVal = null;
          if (ex.hasOwnProperty('answerId')) {
            correctVal = String(ex.answerId);
          } else if (ex.hasOwnProperty('answer')) {
            if (typeof ex.answer === 'number') {
              const optAt = (ex.options || [])[ex.answer];
              if (optAt && typeof optAt === 'object' && optAt.id) correctVal = String(optAt.id);
              else correctVal = String(ex.answer);
            } else {
              correctVal = String(ex.answer);
            }
          }
          // Compare either as strings or numeric values when appropriate
          const passed = (selectedVal === correctVal) || (!isNaN(Number(selectedVal)) && !isNaN(Number(correctVal)) && Number(selectedVal) === Number(correctVal));
          // Determine human-readable correct answer text
          let correctText = '';
          if (correctVal !== null) {
            const opts = ex.options || [];
            const found = opts.find(o => (typeof o === 'object' && String(o.id) === correctVal) || String(o) === correctVal);
            if (found) correctText = (typeof found === 'object') ? (found.text || found.label || found.title || String(found)) : String(found);
            else if (!isNaN(Number(correctVal))) {
              const idx = Number(correctVal);
              const o = opts[idx];
              correctText = o ? (typeof o === 'object' ? (o.text || o.label || o.title || String(o)) : String(o)) : '';
            }
          }
          feedback.textContent = passed? 'Correct!' : `Incorrect — correct answer: ${correctText || ''}`;
          // update progress object: store attempts and bestScore
          const p = loadProgress(lessonId, weekNum) || { attempts:0, bestScore:0 };
          p.attempts = (p.attempts||0) + 1;
          if (passed) p.bestScore = 100; else p.bestScore = Math.max(p.bestScore||0, 0);
          saveProgress(lessonId, weekNum, p);
          // update tile progress visually
          updateTileProgress(lessonId, weekNum, p.bestScore || 0, !!p.bestScore);
          // Best-effort: submit attempt to server so attempts are recorded (may require authentication)
          try{
            const answersArr = [];
            const forms = container.querySelectorAll('.mcq-form');
            forms.forEach((f, fi) => {
              const fd = new FormData(f);
              const v = fd.get(`${lessonId}_${weekNum}_${fi}`);
              if (v === null) answersArr.push(null);
              else if (!isNaN(Number(v))) answersArr.push(Number(v));
              else answersArr.push(String(v));
            });
            fetch('/api/attempts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ lessonId: lessonId, week: weekNum, answers: answersArr }) })
              .then(r => r.ok? r.json().catch(()=>null): null)
              .then(res => {
                  if (res && res.attempt && typeof res.attempt.score === 'number'){
                    p.bestScore = res.attempt.score;
                    saveProgress(lessonId, weekNum, p);
                    updateTileProgress(lessonId, weekNum, p.bestScore || 0, (p.bestScore||0) >= 70);
                    // show server-saved feedback to the user
                    try{
                      if (feedback) feedback.textContent = `Saved to server — score: ${res.attempt.score}%`;
                      showToast(`Saved to server — score: ${res.attempt.score}%`, 3500);
                    }catch(e){}
                  } else if (res && res.error){
                    try{ if (feedback) feedback.textContent = `Server error: ${res.error}`; }catch(e){}
                    showToast(`Server error: ${res.error}`, 4500);
                  } else {
                    try{ if (feedback) feedback.textContent = 'Attempt submitted (server did not return score).'; }catch(e){}
                    showToast('Attempt submitted (server did not return score).', 3500);
                  }
                }).catch(()=>{
                  try{ if (feedback) feedback.textContent = 'Saved locally (server unavailable or unauthenticated).'; }catch(e){}
                  showToast('Saved locally (server unavailable or unauthenticated).', 4500);
                });
          }catch(e){/* ignore best-effort submission errors */}
        });
        exDiv.appendChild(q); exDiv.appendChild(form); exDiv.appendChild(submit); exDiv.appendChild(feedback);
      } else if (ex.type === 'roleplay' || ex.type === 'drill' || ex.type === 'map'){
        const prompt = document.createElement('div'); prompt.innerHTML = `<div class="small">${ex.prompt || ex.question || ''}</div>`;
        exDiv.appendChild(prompt);
      } else {
        exDiv.innerHTML = `<div>${ex.type} ${ex.question||''}</div>`;
      }
      container.appendChild(exDiv);
    });
  }

  // compute KPIs by fetching /api/progress/summary for up to 12 weeks
  async function computeKPIs(lessonId){
    try{
      const weeks = Array.from({length: Math.min(12,16)}, (_,i)=>i+1);
      const calls = weeks.map(w=> fetch(`/api/progress/summary?lessonId=${encodeURIComponent(lessonId||'')}&week=${w}`).then(r=> r.ok? r.json().catch(()=>null):null).catch(()=>null));
      const results = await Promise.all(calls);
      const perf = []; let attempted=0; let passed=0;
      results.forEach(r=>{ if (!r) return; if (typeof r.bestScore==='number') { perf.push(r.bestScore); if (r.bestScore >= (r.passThreshold||70)) passed++; } if (r.attemptsCount>0) attempted++; });
      const performance = perf.length? Math.round((perf.reduce((a,b)=>a+b,0)/perf.length)*10)/10 : '-';
      const attendance = Math.round((attempted / weeks.length) * 100) + '%';
      const completion = Math.round((passed / weeks.length) * 100) + '%';
      document.getElementById('kpiPerformance').textContent = performance=== '-'? '-' : performance + '%';
      document.getElementById('kpiAttendance').textContent = attendance;
      document.getElementById('kpiCompletion').textContent = completion;
    }catch(e){ console.warn('computeKPIs', e); }
  }

  // role handling
  async function initRoleAndData(){
    const sel = document.getElementById('roleSelect');
    const saved = sessionStorage.getItem('puente_role')||''; if (sel) sel.value = saved;
    sel && sel.addEventListener('change', async ()=>{ sessionStorage.setItem('puente_role', sel.value); const lessons = await fetchLessons(); renderLessons(lessons); });
    const lessons = await fetchLessons(); renderLessons(lessons);
    // restore persisted lesson/week selection if present
    try{
      const selLesson = localStorage.getItem('puente_selectedLesson');
      const selWeek = localStorage.getItem('puente_selectedWeek');
      if (selLesson){
        const found = lessons.find(x=> x.id === selLesson);
        if (found){
          showLesson(found);
          if (selWeek){
            // find the week object inside assembled 12-week program and show
            const weekNum = Number(selWeek);
            const program = assemble12Weeks(found);
            const wobj = (program||[]).find(w=> (w.week||w.weekNumber) === weekNum) || { week: weekNum, title: `Week ${weekNum}` };
            // small delay so tiles render
            setTimeout(()=> showWeek(found, wobj), 400);
          }
          return;
        }
      }
    }catch(e){/* ignore */}

    // compute KPIs for first lesson if available
    if (lessons && lessons.length) computeKPIs(lessons[0].id);
  }

  // Back to lessons button handler
  try{
    const backBtn = document.getElementById('backToLessons'); if (backBtn) backBtn.addEventListener('click', ()=>{
      const weeksSection = document.getElementById('weeksSection'); if (!weeksSection) return; weeksSection.classList.remove('open');
      setTimeout(()=>{ weeksSection.style.display='none'; const lessonsSec = document.getElementById('lessonsSection'); lessonsSec && lessonsSec.scrollIntoView({behavior:'smooth'}); }, 220);
      // clear persisted selection
      localStorage.removeItem('puente_selectedWeek'); localStorage.removeItem('puente_selectedLesson');
    });
  }catch(e){/* ignore */}

  // init
  try{ initRail(); initRoleAndData(); }catch(e){ console.warn(e); }

  // expose a helper to open a lesson+week from other UI (calendar popovers)
  window.puente_openLessonWeek = function(lessonId, weekNum){
    try{
      if (!lessonId) return;
      const lid = String(lessonId);
      const found = (cachedLessons || []).find(x=> String(x.id) === lid);
      if (found){
        // use existing in-place UI
        showLesson(found);
        const program = assemble12Weeks(found);
        const wnum = Number(weekNum) || (program && program.length? program[0].week || program[0].weekNumber : 1);
        const wobj = (program||[]).find(w=> (w.week||w.weekNumber) === wnum) || { week: wnum, title: `Week ${wnum}` };
        setTimeout(()=> showWeek(found, wobj), 320);
        return;
      }
      // fallback: fetch lesson from server then open
      fetch(`/api/lesson/${encodeURIComponent(lid)}`).then(r=> r.ok? r.json(): null).then(data=>{
        const lesson = data && data.lesson? data.lesson : data;
        if (!lesson) return;
        // cache it locally for future
        try{ cachedLessons = cachedLessons || []; if (!cachedLessons.find(x=> x.id === lesson.id)) cachedLessons.push(lesson); }catch(e){}
        showLesson(lesson);
        const program = assemble12Weeks(lesson);
        const wnum = Number(weekNum) || (program && program.length? program[0].week || program[0].weekNumber : 1);
        const wobj = (program||[]).find(w=> (w.week||w.weekNumber) === wnum) || { week: wnum, title: `Week ${wnum}` };
        setTimeout(()=> showWeek(lesson, wobj), 320);
      }).catch(err=> console.warn('openLessonWeek fetch failed', err));
    }catch(e){ console.warn('puente_openLessonWeek', e); }
  };

})();

/* ------------------ UI Enhancements: Calendar & Notices ------------------ */
// Calendar + notices: add month navigation and server-backed events
(function(){
  const DEBUG = true;
  function qs(sel){ return document.querySelector(sel); }

  let current = { year: (new Date()).getFullYear(), month: (new Date()).getMonth() };

  function formatMonthTitle(year, month){ return new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' }); }

  function renderCalendar(year, month){
    const grid = qs('.calendar-grid'); if (!grid) return;
    // update header title
    const headerTitle = qs('.calendar-card > .calendar-header > strong'); if (headerTitle) headerTitle.textContent = formatMonthTitle(year, month);
    // remove existing day cells except headers
    grid.querySelectorAll('.day:not(.header)').forEach(n=> n.remove());
    const first = new Date(year, month, 1);
    const last = new Date(year, month+1, 0);
    const pad = first.getDay(); // 0..6
    for (let i=0;i<pad;i++){ const d=document.createElement('div'); d.className='day'; grid.appendChild(d); }
    for (let d=1; d<= last.getDate(); d++){
      const dd = document.createElement('button'); dd.className='day'; dd.setAttribute('type','button'); dd.setAttribute('aria-label', `Day ${d}`); dd.textContent = String(d);
      const date = new Date(year, month, d);
      dd.dataset.date = date.toISOString();
      if (isSameDay(date,new Date())) dd.classList.add('today');
      dd.addEventListener('click', (e)=>{ showDayPopover(e.currentTarget); });
      // keyboard support: Enter opens popover
      dd.addEventListener('keydown', (ev)=>{ if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); dd.click(); } });
      grid.appendChild(dd);
    }
  }

  function isSameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

  async function fetchEventsForDate(date){
    // date is a Date object
    const iso = date.toISOString().slice(0,10); // YYYY-MM-DD
    try{
      const r = await fetch(`/api/events?date=${encodeURIComponent(iso)}`);
      if (r.ok) return await r.json();
    }catch(e){ if (DEBUG) console.debug('fetchEventsForDate failed', e); }
    // fallback sample
    return { events: [ { title: 'Orientation — Vendors', time: '10:00 AM' }, { title: 'Market safety talk', time: '2:30 PM' } ] };
  }

  async function showDayPopover(target){
    const pop = document.getElementById('calendarPopover'); if (!pop) return;
    const iso = target.dataset.date; const d = iso? new Date(iso) : null;
    pop.innerHTML = '';
    const header = document.createElement('header'); header.innerHTML = `<strong>${d? d.toDateString() : 'Day'}</strong><button class="close-btn" aria-label="Close">✕</button>`;
    const list = document.createElement('div'); list.className='assign-list';
    pop.appendChild(header); pop.appendChild(list);
    pop.style.display='block';
    // position near target
    const rect = target.getBoundingClientRect();
    pop.style.position = 'fixed'; pop.style.left = Math.min(window.innerWidth-340, rect.right + 8) + 'px'; pop.style.top = Math.max(20, rect.top) + 'px';
    header.querySelector('.close-btn').addEventListener('click', ()=> pop.style.display='none');

    // fetch and render events
    if (d){
      const data = await fetchEventsForDate(d);
      const events = (data && data.events) ? data.events : (Array.isArray(data)? data : []);
      if (!events || events.length === 0) list.innerHTML = '<div class="small muted">No events for this day.</div>';
      else {
        // render events; if an event contains lessonId/week, make it clickable to open the lesson
        list.innerHTML = events.map(it=>{
          if (it.lessonId) {
            return `<div class="assign-item"><div style="flex:1"><button class="link-btn open-event" data-lesson="${it.lessonId}" data-week="${it.week||''}"><strong>${it.title}</strong></button><div class="meta">${it.time||''}</div></div></div>`;
          }
          return `<div class="assign-item"><div><strong>${it.title}</strong><div class="meta">${it.time || ''}</div></div></div>`;
        }).join('');
        // attach handlers for open-event
        Array.from(list.querySelectorAll('.open-event')).forEach(btn=> btn.addEventListener('click', (ev)=>{
          const b = ev.currentTarget; const lid = b.dataset.lesson; const wk = b.dataset.week; try{ if (window.puente_openLessonWeek) window.puente_openLessonWeek(lid, wk); }catch(e){};
          const pop = document.getElementById('calendarPopover'); if (pop) pop.style.display='none';
        }));
      }
    }
  }

  async function fetchNotices(){
    try{
      const r = await fetch('/api/notices'); if (r.ok){ const j = await r.json(); return j.notices || j; }
    }catch(e){ if (DEBUG) console.debug('fetchNotices failed, using fallback'); }
    // fallback static notices
    return [
      {title:'Time Extension Notice', author:'Admin', date:'12 Jan'},
      {title:'COVID-19 Vaccination Survey', author:'Health', date:'02 Jan'}
    ];
  }

  async function renderNotices(){
    const notices = await fetchNotices();
    const nb = qs('.notice-board'); if (!nb) return;
    nb.innerHTML = '<h4 style="margin-bottom:8px">Notice Board</h4>';
    notices.forEach(n=>{
      const item = document.createElement('div'); item.className='notice-item'; item.style.display='flex'; item.style.gap='10px'; item.style.alignItems='flex-start'; item.style.marginBottom='10px';
      item.innerHTML = `<div style="width:42px;height:42px;border-radius:8px;background:#f3f4f6"></div><div style="flex:1"><strong>${n.title}</strong><div class="muted">By ${n.author||'Admin'} • ${n.date||''}</div></div>`;
      nb.appendChild(item);
    });
    const viewAll = document.createElement('div'); viewAll.style.textAlign='center'; viewAll.style.marginTop='6px'; viewAll.innerHTML = '<button class="btn link-btn">View all notices</button>';
    nb.appendChild(viewAll);

    // upcoming: also populate upcoming-card
    const up = document.querySelector('.upcoming-card'); if (up){ up.innerHTML = '<h4 style="margin-bottom:8px">Upcoming</h4>'; notices.slice(0,3).forEach(n=>{ const e = document.createElement('div'); e.className='upcoming-item'; e.innerHTML = `<div style="flex:1"><strong>${n.title}</strong><div class="muted">${n.date||''}</div></div>`; up.appendChild(e); }); }
  }

  function initUI(){
    // render current month
    renderCalendar(current.year, current.month);
    renderNotices();
    // wire nav
    const prev = document.getElementById('calPrev'); const next = document.getElementById('calNext');
    if (prev) prev.addEventListener('click', ()=>{ const dt = new Date(current.year, current.month-1, 1); current.year = dt.getFullYear(); current.month = dt.getMonth(); renderCalendar(current.year, current.month); });
    if (next) next.addEventListener('click', ()=>{ const dt = new Date(current.year, current.month+1, 1); current.year = dt.getFullYear(); current.month = dt.getMonth(); renderCalendar(current.year, current.month); });

    // close popover when clicking outside
    document.addEventListener('click', (e)=>{ const pop = document.getElementById('calendarPopover'); if (!pop) return; if (pop.style.display==='none') return; const within = pop.contains(e.target) || e.target.closest('.calendar-grid'); if (!within) pop.style.display='none'; });
    // close on escape
    document.addEventListener('keydown', (e)=>{ if (e.key==='Escape'){ const pop = document.getElementById('calendarPopover'); if (pop) pop.style.display='none'; } });
  }

  // start after DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI); else initUI();
})();
