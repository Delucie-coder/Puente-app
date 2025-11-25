(function(){
  const API_BASE = '';
  async function el(id){ return document.getElementById(id); }
  document.addEventListener('DOMContentLoaded', async ()=>{
    const lessonsSel = await el('amv_lessons');
    const weeksWrap = await el('amv_weeks');
    const status = await el('amv_status');
    const refresh = await el('amv_refresh');
    const logout = await el('amv_logout');

    function setStatus(txt){ if (status) status.textContent = txt || ''; }

    async function fetchLessons(){ try{ const r = await fetch(`${API_BASE}/api/lessons`); if (!r.ok) return []; const j = await r.json(); return j.lessons || []; }catch(e){ return []; } }

    function getToken(){ try{ return sessionStorage.getItem('puente_token') || localStorage.getItem('puente:token') || null; }catch(e){ return null; } }

    async function fetchModuleVideo(lessonId, week){ try{ const r = await fetch(`${API_BASE}/api/module-video?lessonId=${encodeURIComponent(lessonId)}&week=${encodeURIComponent(week)}`); if (!r.ok) return null; const j = await r.json().catch(()=>null); return j && j.url ? j.url : null; }catch(e){ return null; } }
    async function postModuleVideo(lessonId, week, url){ try{ const headers = {'Content-Type':'application/json'}; const token = getToken(); if (token) headers['Authorization'] = 'Bearer ' + token; const r = await fetch(`${API_BASE}/api/module-video`, { method:'POST', headers, body: JSON.stringify({ lessonId, week, url }) }); const j = await r.json().catch(()=>null); return { ok: r.ok, resp: j }; }catch(e){ return { ok:false }; } }

    async function renderWeeksForLesson(lessonId, weeks){ weeksWrap.innerHTML = '';
      const count = (Array.isArray(weeks) && weeks.length) ? weeks.length : 6;
      for (let i=1;i<=count;i++){
        const div = document.createElement('div'); div.className='week-item';
        div.innerHTML = `<div style="font-weight:700;margin-bottom:6px">Week ${i}</div><div class="small muted" id="wv_${i}_info">Loading...</div><div style="margin-top:8px"><input type="text" id="wv_${i}_input" placeholder="video URL" style="width:100%"></div><div style="margin-top:8px;display:flex;gap:8px"><button class="btn" id="wv_${i}_save">Save</button><button class="btn warn" id="wv_${i}_clear">Clear</button></div>`;
        weeksWrap.appendChild(div);
        (function(weekNum){ setTimeout(async ()=>{
            const info = document.getElementById(`wv_${weekNum}_info`);
            const input = document.getElementById(`wv_${weekNum}_input`);
            const save = document.getElementById(`wv_${weekNum}_save`);
            const clear = document.getElementById(`wv_${weekNum}_clear`);
            if (info) info.textContent = 'Fetching...';
            const url = await fetchModuleVideo(lessonId, weekNum);
            if (info) info.textContent = url? `Server URL: ${url}` : 'No server URL set';
            if (input) input.value = url || '';
            if (save) save.addEventListener('click', async ()=>{
              setStatus('Saving...');
              const v = input.value.trim();
              const r = await postModuleVideo(lessonId, weekNum, v);
              if (r && r.ok){ setStatus(`Saved week ${weekNum}`); if (info) info.textContent = `Server URL: ${v || '(empty)'}`; } else { setStatus('Save failed (not authorized or network error).'); }
            });
            if (clear) clear.addEventListener('click', async ()=>{
              input.value = '';
              setStatus('Clearing...');
              const r = await postModuleVideo(lessonId, weekNum, '');
              if (r && r.ok){ setStatus(`Cleared week ${weekNum}`); if (info) info.textContent = 'No server URL set'; } else { setStatus('Clear failed (not authorized or network error).'); }
            });
        }, 1); })(i);
      }
    }

    async function loadLessons(){ lessonsSel.innerHTML = ''; const list = await fetchLessons(); if (!list || !list.length){ lessonsSel.innerHTML = '<option>(no lessons)</option>'; return; } list.forEach(l=>{ const o = document.createElement('option'); o.value = l.id; o.textContent = l.title || l.id; lessonsSel.appendChild(o); }); lessonsSel.addEventListener('change', ()=>{ const id = lessonsSel.value; const chosen = list.find(x=>x.id===id); renderWeeksForLesson(id, (chosen && chosen.weeks) ? chosen.weeks : []); }); // select first
      setTimeout(()=>{ if (list[0]){ lessonsSel.value = list[0].id; lessonsSel.dispatchEvent(new Event('change')); } }, 40);
    }

    refresh.addEventListener('click', ()=> loadLessons());
    logout.addEventListener('click', ()=>{ try{ sessionStorage.removeItem('puente_token'); localStorage.removeItem('puente:token'); sessionStorage.removeItem('puente_user'); localStorage.removeItem('puente:user'); setStatus('Logged out'); }catch(e){} });

    await loadLessons();
  });
})();