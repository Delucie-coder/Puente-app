(function(){
  // Shared helpers for the Puente dashboards
  const API_BASE = (window.location.protocol === 'file:') ? 'http://localhost:3001' : (window.location.port === '5500' ? 'http://localhost:3010' : '');

  function debugLog(msg){
    try{
      console.log('PUENTE-DEBUG:', msg);
      const wrap = document.getElementById('puente-debug-log');
      if (wrap){ const el = document.createElement('div'); el.textContent = '['+ new Date().toLocaleTimeString() +'] '+ String(msg); wrap.appendChild(el); wrap.scrollTop = wrap.scrollHeight; }
    }catch(e){}
  }

  function getUserRaw(){ try{ return sessionStorage.getItem('puente_user') || localStorage.getItem('puente:user') || null; }catch(e){ return null; } }
  function getUser(){ try{ const raw = getUserRaw(); if (!raw) return null; return JSON.parse(raw); }catch(e){ return null; } }
  function getUserDisplay(){ try{ const u = getUser(); if (!u) return ''; return u.name || u.email || ''; }catch(e){ return ''; } }

  function getUserIdForApi(){ try{ const u = getUser(); if (u && (u.email || u.name)) return u.email || u.name; const uid = (document.getElementById('ms_userid') && document.getElementById('ms_userid').value) || (document.getElementById('vs_userid') && document.getElementById('vs_userid').value) || (document.getElementById('ds_userid') && document.getElementById('ds_userid').value); return uid || null; }catch(e){ return null; } }

  function moduleVideoKey(lessonId, weekNum){ return `puente_module_video_${lessonId}_${weekNum}`; }
  function setModuleVideo(lessonId, weekNum, url){ try{ if (!lessonId || !weekNum) return; localStorage.setItem(moduleVideoKey(lessonId,weekNum), String(url||'')); }catch(e){} }
  function getModuleVideo(lessonId, weekNum){ try{ const v = localStorage.getItem(moduleVideoKey(lessonId,weekNum)); return v || null; }catch(e){ return null; } }

  async function fetchServerModuleVideo(lessonId, weekNum){ try{ const r = await fetch(`${API_BASE}/api/module-video?lessonId=${encodeURIComponent(lessonId)}&week=${encodeURIComponent(weekNum)}`); if (r.ok){ const j = await r.json().catch(()=>null); if (j && j.url) return j.url; } }catch(e){} return null; }
  async function postServerModuleVideo(lessonId, weekNum, url){ try{ const token = (function(){ try{ const raw = sessionStorage.getItem('puente_token') || localStorage.getItem('puente:token') || null; return raw; }catch(e){return null;} })(); const headers = {'Content-Type':'application/json'}; if (token) headers['Authorization'] = 'Bearer ' + token; const body = { lessonId, week: weekNum, url }; const r = await fetch(`${API_BASE}/api/module-video`, { method:'POST', headers, body: JSON.stringify(body) }); if (r.ok) return await r.json().catch(()=>null); return null; }catch(e){ return null; }

  // safe global helper so Enter/Open buttons work even if other scripts load later
  window.puente_openLessonWeek = window.puente_openLessonWeek || function(lessonId, week){
    try{ sessionStorage.setItem('puente_pending_open', JSON.stringify({ lessonId, week: Number(week) })); }catch(e){}
    try{ // try to click scheduled element in the page
      const sel = Array.from(document.querySelectorAll('[data-week]')).find(el=> el.dataset && String(el.dataset.week) === String(week) && window.getComputedStyle(el).display !== 'none');
      if (sel) { try{ sel.click(); return; }catch(e){} }
    }catch(e){}
    try{ // fallback to open lesson page
      window.location.href = `lesson.html?id=${encodeURIComponent(lessonId)}`;
    }catch(e){}
  };

  function renderSignedInBanner(containerId){
    try{
      const c = document.getElementById(containerId);
      if (!c) return;
      const name = getUserDisplay();
      const role = sessionStorage.getItem('puente_role') || '';
      c.innerHTML = `<div style="font-size:13px;color:#374151">Signed in as <strong>${name||'Student'}</strong> — <span style="font-weight:700">Student</span> → <span style="font-weight:700">${role === 'vendor' ? 'Vendor' : role === 'moto' ? 'Motorcyclist' : '—'}</span></div>`;
    }catch(e){}
  }

  // Expose helpers
  window.PuenteCommon = {
    API_BASE,
    debugLog,
    getUser,
    getUserDisplay,
    getUserIdForApi,
    fetchServerModuleVideo,
    postServerModuleVideo,
    setModuleVideo,
    getModuleVideo,
    renderSignedInBanner
  };
})();
