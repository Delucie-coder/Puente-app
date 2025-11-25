// Admin dashboard script — manage settings and review attempts
(function(){
  const DEBUG = true;
  // detect API base similar to dashboard.js
  let API_BASE = '';
  try{
    if (window.location.port === '5500') API_BASE = 'http://localhost:3010';
    else if (window.location.protocol === 'file:') API_BASE = 'http://localhost:3001';
    else if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') API_BASE = 'http://localhost:3001';
    else API_BASE = '';
  }catch(e){ API_BASE = 'http://localhost:3001'; }
  if (DEBUG) console.debug('admin: API_BASE', API_BASE);

  function rb(id){ return document.getElementById(id); }

  const lessonsListEl = rb('lessonsList');
  const lessonTitleEl = rb('lessonTitle');
  const lessonMetaEl = rb('lessonMeta');
  const settingsPanel = rb('settingsPanel');
  const passThresholdEl = rb('passThreshold');
  const thresholdSourceEl = rb('thresholdSource');
  const saveSettingsBtn = rb('saveSettings');
  const attemptsPanel = rb('attemptsPanel');
  const attemptsList = rb('attemptsList');
  const adminUser = rb('adminUser');
  const adminEmail = rb('adminEmail');
  const adminPassword = rb('adminPassword');
  const btnLogin = rb('btnLogin');

  let cachedLessons = [];
  let selectedLesson = null;
  let authToken = localStorage.getItem('puente_admin_token') || null;

  function setAuth(token, user){ authToken = token; if (token) localStorage.setItem('puente_admin_token', token); else localStorage.removeItem('puente_admin_token'); adminUser.textContent = user ? (user.name || user.email) : 'Not signed in'; }

  async function fetchLessons(){
    try{
      const r = await fetch(`${API_BASE}/api/lessons`);
      if (r.ok){ const j = await r.json(); cachedLessons = j.lessons || []; renderLessons(); return; }
    }catch(e){ console.warn('fetchLessons failed', e); }
    // fallback sample lessons
    cachedLessons = [ { id:'market_english_greetings', title:'Market English: Greetings', audience:'vendor' }, { id:'moto_directions', title:'Moto English: Directions', audience:'moto' } ];
    renderLessons();
  }

  function renderLessons(){
    lessonsListEl.innerHTML = '';
    cachedLessons.forEach(l => {
      const b = document.createElement('button'); b.className = 'lesson-item'; b.type='button'; b.dataset.lesson = l.id; b.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${escapeHTML(l.title||l.id)}</strong><div class="small-muted">${escapeHTML(l.audience||'all')}</div></div><div style="margin-left:12px" class="small-muted">ID:${escapeHTML(l.id)}</div></div>`;
      b.addEventListener('click', ()=> selectLesson(l));
      lessonsListEl.appendChild(b);
    });
  }

  function escapeHTML(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  async function selectLesson(lesson){
    selectedLesson = lesson;
    // highlight
    Array.from(lessonsListEl.querySelectorAll('.lesson-item')).forEach(n=> n.classList.remove('selected'));
    const btn = lessonsListEl.querySelector(`[data-lesson="${lesson.id}"]`); if (btn) btn.classList.add('selected');
    lessonTitleEl.textContent = lesson.title || lesson.id;
    lessonMetaEl.textContent = `Audience: ${lesson.audience||'all'} • ID: ${lesson.id}`;
    // fetch server settings for lesson
    try{
      const r = await fetch(`${API_BASE}/api/settings?lessonId=${encodeURIComponent(lesson.id)}`);
      if (r.ok){ const j = await r.json(); passThresholdEl.value = j.passThreshold || 70; thresholdSourceEl.textContent = `Source: ${j.source || 'default'}`; settingsPanel.style.display=''; attemptsPanel.style.display=''; loadAttemptsSummary(lesson.id); return; }
    }catch(e){ console.warn('get settings failed', e); }
    // fallback
    passThresholdEl.value = 70; thresholdSourceEl.textContent = 'Source: default'; settingsPanel.style.display=''; attemptsPanel.style.display=''; attemptsList.textContent = 'No attempts available.';
  }

  async function saveSettings(){
    if (!selectedLesson) return alert('Select a lesson first');
    const val = Number(passThresholdEl.value || 70);
    const payload = { passThreshold: Math.round(val), lessonId: selectedLesson.id };
    try{
      const headers = {'Content-Type':'application/json'}; if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
      const r = await fetch(`${API_BASE}/api/settings`, { method:'POST', headers, body: JSON.stringify(payload) });
      const j = await r.json(); if (r.ok) { alert('Saved'); thresholdSourceEl.textContent = `Source: ${j.lessonId? 'lesson' : 'default'}`; } else { alert('Save failed: '+ (j.error||JSON.stringify(j))); }
    }catch(e){ console.warn('save settings failed', e); alert('Save failed (network)'); }
  }

  async function loadAttemptsSummary(lessonId){
    try{
      // fetch for weeks 1..12
      const calls = [];
      for (let w=1; w<=12; w++) calls.push(fetch(`${API_BASE}/api/progress/summary?lessonId=${encodeURIComponent(lessonId)}&week=${w}`, { headers: authToken? { Authorization: 'Bearer ' + authToken } : {} }).then(r=> r.ok? r.json().catch(()=>null): null).catch(()=>null));
      const results = await Promise.all(calls);
      let out = '';
      results.forEach((r,i)=>{ if (!r) out += `<div>Week ${i+1}: no data</div>`; else out += `<div>Week ${i+1}: attempts ${r.attemptsCount||0} • best ${r.bestScore===null||r.bestScore===undefined? '-' : r.bestScore+'%'}</div>`; });
      attemptsList.innerHTML = out;
    }catch(e){ console.warn('loadAttemptsSummary', e); attemptsList.textContent = 'Failed to load attempts.'; }
  }

  // Admin login
  async function adminLogin(){
    const email = adminEmail.value; const password = adminPassword.value;
    try{
      const r = await fetch(`${API_BASE}/api/login`, { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
      const j = await r.json(); if (r.ok && j.token){ setAuth(j.token, j.user || { email }); alert('Signed in'); fetchLessons(); } else { alert('Login failed: ' + (j.error||JSON.stringify(j))); }
    }catch(e){ console.warn('login failed', e); alert('Login request failed'); }
  }

  // wire events
  saveSettingsBtn && saveSettingsBtn.addEventListener('click', saveSettings);
  rb('refreshLessons') && rb('refreshLessons').addEventListener('click', fetchLessons);
  btnLogin && btnLogin.addEventListener('click', adminLogin);

  // initial
  if (authToken){ adminUser.textContent = 'Signed in (admin)'; }
  fetchLessons();

})();
(function(){
  const user = Puente.getUser();
  document.querySelector('[data-username]').textContent = user.username || 'Admin';
  document.querySelector('[data-role]').textContent = 'Admin';
  document.getElementById('logoutBtn').addEventListener('click', Puente.logout);

  document.getElementById('kpiUsers').textContent = '5,412';
  document.getElementById('kpiResources').textContent = '1,238';
  document.getElementById('kpiDownloads').textContent = '24,901';

  const queue = [
    { title:'Motorcycle Maintenance Basics', author:'Sam K', subject:'Engineering', type:'PDF' },
    { title:'Market Math — Quick Change', author:'Amina V', subject:'Math', type:'PDF' }
  ];
  const body = document.querySelector('#modTable tbody');
  queue.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.title}</td>
      <td>${item.author}</td>
      <td>${item.subject}</td>
      <td>${item.type}</td>
      <td class="actions">
        <button class="btn approve">Approve</button>
        <button class="btn reject">Reject</button>
      </td>`;
    body.appendChild(tr);
  });
})();
