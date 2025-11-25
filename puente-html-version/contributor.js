// Contributor page script
(function(){
  let API_BASE = '';
  try{
    if (window.location.port === '5500') API_BASE = 'http://localhost:3010';
    else if (window.location.protocol === 'file:') API_BASE = 'http://localhost:3001';
    else if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') API_BASE = 'http://localhost:3001';
    else API_BASE = '';
  }catch(e){ API_BASE = 'http://localhost:3001'; }

  function rb(id){ return document.getElementById(id); }
  const contribEmail = rb('contribEmail');
  const contribLogin = rb('contribLogin');
  const resTitle = rb('resTitle');
  const resUrl = rb('resUrl');
  const resFile = rb('resFile');
  const resAudience = rb('resAudience');
  const btnUpload = rb('btnUpload');
  const resourceList = rb('resourceList');

  let token = null;

  async function fetchResources(){
    try{
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const r = await fetch(`${API_BASE}/api/resources`, { headers });
      if (r.ok){ const j = await r.json(); renderResources(j.resources || j); return; }
    }catch(e){}
    resourceList.innerHTML = '<div class="small-muted">Failed to load resources.</div>';
  }

  function renderResources(list){
    resourceList.innerHTML = '';
    if (!list || !list.length) { resourceList.innerHTML = '<div class="small-muted">No resources yet</div>'; return; }
    list.forEach(r => {
      const d = document.createElement('div'); d.className = 'resource-item';
      const url = r.url || r.link || null;
      const filename = r.filename || (url? url.split('/').pop() : '');
      const created = r.created ? (new Date(r.created)).toLocaleString() : '';

      // preview: image thumbnail when possible
      let previewHtml = '<div style="width:64px;height:48px;border-radius:6px;background:#fafafa;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12px">No preview</div>';
      if (url && /\.(png|jpg|jpeg|gif|webp|bmp)(\?|$)/i.test(url)) {
        previewHtml = `<img src="${escapeHTML(url)}" alt="${escapeHTML(filename)}" style="width:64px;height:48px;object-fit:cover;border-radius:6px"/>`;
      } else if (url && /\.(mp4|webm|ogg)(\?|$)/i.test(url)) {
        previewHtml = `<div style="width:64px;height:48px;border-radius:6px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center">🎬</div>`;
      } else if (url && /\.(pdf)(\?|$)/i.test(url)) {
        previewHtml = `<div style="width:64px;height:48px;border-radius:6px;background:#fafafa;display:flex;align-items:center;justify-content:center">PDF</div>`;
      }

      const audience = r.audience || 'all';
      d.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center">
          <div class="res-preview">${previewHtml}</div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div>
                <strong>${escapeHTML(r.title||r.id||'Untitled')}</strong>
                <div class="small-muted" style="font-size:12px">${escapeHTML(filename||'')}</div>
              </div>
              <div class="small-muted" style="font-size:12px">${escapeHTML(audience)}</div>
            </div>
            <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
              <button class="btn open-res">Open</button>
              <button class="btn copy-res">Copy URL</button>
              <div class="small-muted" style="margin-left:auto">${escapeHTML(created)}</div>
            </div>
          </div>
        </div>
      `;

      // handlers
      const openBtn = d.querySelector('.open-res');
      const copyBtn = d.querySelector('.copy-res');
      if (openBtn){ openBtn.addEventListener('click', ()=>{ if (url) window.open(url, '_blank', 'noopener'); else alert('No URL available for this resource'); }); }
      if (copyBtn){ copyBtn.addEventListener('click', ()=>{ if (!url) return alert('No URL to copy'); if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(()=> showToast('Copied URL to clipboard')); } else { try { const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); showToast('Copied URL'); } catch(e){ alert('Copy not supported'); } } }); }

      resourceList.appendChild(d);
    });
  }

  function escapeHTML(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  async function login(){
    const email = contribEmail.value || 'contrib@example.com';
    try{
      const r = await fetch(`${API_BASE}/api/login`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email }) });
      const j = await r.json(); if (r.ok && j.token){ token = j.token; alert('Signed in'); fetchResources(); } else { alert('Login failed'); }
    }catch(e){ alert('Login error'); }
  }

  async function upload(){
    const title = resTitle.value || 'Untitled';
    const url = resUrl.value || null;
    const audience = resAudience.value || 'all';
    if (!title) return alert('Add a title');

    btnUpload.disabled = true;
    btnUpload.textContent = 'Uploading...';

    try{
      let response;
      // if file selected, send multipart/form-data
      if (resFile && resFile.files && resFile.files.length){
        const fd = new FormData();
        fd.append('title', title);
        fd.append('audience', audience);
        fd.append('file', resFile.files[0]);
        if (url) fd.append('url', url);
        const headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;
        response = await fetch(`${API_BASE}/api/resource`, { method: 'POST', body: fd, headers });
      } else {
        // fallback to JSON POST (server supports url entries)
        const body = { title, audience };
        if (url) body.url = url;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        response = await fetch(`${API_BASE}/api/resource`, { method: 'POST', headers, body: JSON.stringify(body) });
      }

      const j = await response.json().catch(()=>({}));
      if (response.ok){
        alert('Uploaded');
        resTitle.value=''; resUrl.value=''; if (resFile) resFile.value='';
        fetchResources();
      } else {
        alert('Upload failed: '+(j.error||JSON.stringify(j)));
      }
    }catch(e){ alert('Upload error'); }
    finally{ btnUpload.disabled = false; btnUpload.textContent = 'Submit Resource'; }
  }

  contribLogin && contribLogin.addEventListener('click', login);
  btnUpload && btnUpload.addEventListener('click', upload);
  fetchResources();
})();
// Optional legacy UI wiring — guard if Puente exists
try{
  if (window.Puente){
    (function(){
      const user = (Puente.getUser && Puente.getUser()) || {};
      const elUser = document.querySelector('[data-username]');
      const elRole = document.querySelector('[data-role]');
      if (elUser) elUser.textContent = user.username || 'Contributor';
      if (elRole) elRole.textContent = 'Contributor';
      const logoutBtn = document.getElementById('logoutBtn'); if (logoutBtn && Puente.logout) logoutBtn.addEventListener('click', Puente.logout);

      const kpiUploads = document.getElementById('kpiUploads'); if (kpiUploads) kpiUploads.textContent = '12';
      const kpiApproved = document.getElementById('kpiApproved'); if (kpiApproved) kpiApproved.textContent = '9';
      const kpiPending = document.getElementById('kpiPending'); if (kpiPending) kpiPending.textContent = '3';
    })();
  }
}catch(e){ /* ignore */ }
