// Simple client-side protection for demo dashboard
document.addEventListener('DOMContentLoaded', () => {
  const user = sessionStorage.getItem('puente_user');
  const welcome = document.getElementById('welcomeText');
  const signout = document.getElementById('signout');

  if (!user) {
    // Redirect back to login if not authenticated
    window.location.href = 'index.html';
    return;
  }

  const obj = JSON.parse(user);
  welcome.textContent = `Signed in as ${obj.email}. This is a demo dashboard.`;

  // Profile picture handling: load saved image from sessionStorage if present
  const profilePic = document.getElementById('profilePic');
  const profileInput = document.getElementById('profileInput');
  const changePic = document.getElementById('changePic');
  const removePic = document.getElementById('removePic');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');

  profileName.textContent = obj.name || obj.email || 'Guest';
  profileEmail.textContent = obj.email || '';

  const saved = sessionStorage.getItem('puente_profile_pic');
  if (saved) profilePic.src = saved;

  changePic.addEventListener('click', () => profileInput.click());

  // Resize/compress image client-side, then upload to server; fallback to sessionStorage
  function resizeImage(file, maxSize = 400, quality = 0.75){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round(height * (maxSize / width));
              width = maxSize;
            } else {
              width = Math.round(width * (maxSize / height));
              height = maxSize;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mime, quality);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  profileInput.addEventListener('change', async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    try {
      // limit files to images and to reasonable size (client-side)
      if (!file.type.startsWith('image/')) throw new Error('Not an image');
      const MAX_BYTES = 2 * 1024 * 1024; // 2MB client-side limit
      if (file.size > MAX_BYTES) {
        // continue but we will resize/compress; user feedback could be added
      }
      const resized = await resizeImage(file, 600, 0.78);

      // try upload to server endpoint
      try {
        const resp = await fetch('/api/profile/photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: obj.email, dataUrl: resized })
        });
        if (resp.ok) {
          const json = await resp.json();
          if (json && json.url) {
            profilePic.src = json.url;
            try { sessionStorage.setItem('puente_profile_pic', json.url); } catch (e){}
            return;
          }
        }
      } catch (err) {
        console.warn('Upload failed, falling back to local preview', err);
      }

      // fallback: preview locally and store in sessionStorage
      profilePic.src = resized;
      try { sessionStorage.setItem('puente_profile_pic', resized); } catch (err) { console.warn('Could not save profile image', err); }
    } catch (err) {
      console.warn('Image processing failed', err);
    }
  });

  removePic.addEventListener('click', () => {
    // remove saved picture and reset to default logo
    sessionStorage.removeItem('puente_profile_pic');
    profilePic.src = 'Images/puentelogo.png';
    // clear file input value
    profileInput.value = '';
  });

  // Render recommended lessons (small curated list for moto drivers and vendors)
  // Fetch lessons from API (fallback to local list)
  fetch('/api/lessons').then(r => r.json()).then(json => {
    const lessons = json.lessons || [];
    renderLessons(lessons);
  }).catch(() => {
    const lessons = [
      { id: 'lang1', title: 'Market English: Greetings & Selling Phrases', summary: 'Short phrases for greeting customers, asking prices, and simple negotiations.', lang: 'English'},
      { id: 'lang2', title: 'Vendor French: Basic Phrases', summary: 'Common French phrases to help vendors speak with French-speaking customers.', lang: 'French'},
      { id: 'lang3', title: 'Moto English: Directions & Safety', summary: 'Essential English words and sentences for moto drivers—giving directions, safety words, and fares.', lang: 'English'},
      { id: 'lang4', title: 'Moto French: Directions & Customer Phrases', summary: 'French phrases for moto drivers — directions, fares, and customer interactions.', lang: 'French'}
    ];
    renderLessons(lessons);
  });

  function renderLessons(lessons){
    const container = document.createElement('div');
    container.style.marginTop = '1rem';
    const h = document.createElement('h3');
    h.textContent = 'Recommended lessons for your area';
    container.appendChild(h);
    const ul = document.createElement('div');
    ul.style.display = 'grid';
    ul.style.gridTemplateColumns = 'repeat(auto-fit,minmax(220px,1fr))';
    ul.style.gap = '0.6rem';

    // filter lessons by selected role
    const role = sessionStorage.getItem('puente_role') || '';
    const filtered = lessons.filter(l => {
      if (!role) return true; // if no role selected, show all
      return (role === 'vendor' && l.audience === 'vendor') || (role === 'moto' && l.audience === 'moto');
    });

    filtered.forEach(l => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div style="padding:0.8rem">
          <h4 style="margin:0 0 0.4rem 0">${l.title}</h4>
          <p style="margin:0 0 0.6rem 0;color:#6b7280">${l.summary}</p>
          <button onclick="openLesson('${l.id}')">Open lesson</button>
        </div>
      `;
      ul.appendChild(card);
    });

    container.appendChild(ul);
    // append into the left column container
    const left = document.getElementById('lessonsContainer') || document.querySelector('.dash-main');
    left.appendChild(container);
  }

  // ===== Grades & Deadlines (client-side demo data) =====
  function loadAssignments(){
    const raw = sessionStorage.getItem('puente_assignments');
    if (raw) return JSON.parse(raw);
    // sample assignments (dates in ISO YYYY-MM-DD)
    const now = new Date();
    function isoAdd(days){
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()+days);
      return d.toISOString().slice(0,10);
    }
    const samples = [
      {id:'a1', title:'Lesson 1: Greetings Quiz', due: isoAdd(3), score: 88},
      {id:'a2', title:'Market Roleplay Exercise', due: isoAdd(7), score: null},
      {id:'a3', title:'Moto Directions Test', due: isoAdd(12), score: null},
      {id:'a4', title:'Vendor French Vocabulary', due: isoAdd(20), score: null}
    ];
    try { sessionStorage.setItem('puente_assignments', JSON.stringify(samples)); } catch (e){}
    return samples;
  }

  function renderGrades(assignments){
    const wrap = document.getElementById('gradesList');
    if (!wrap) return;
    if (!assignments || !assignments.length){ wrap.textContent = 'No grades yet.'; return; }
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Assignment</th><th>Due</th><th style="text-align:right">Score</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    assignments.forEach(a=>{
      const tr = document.createElement('tr');
      const due = new Date(a.due);
      tr.innerHTML = `<td style="max-width:160px">${a.title}</td><td>${a.due}</td><td style="text-align:right">${a.score===null||a.score===undefined?'-':(a.score+'%')}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.innerHTML = '';
    wrap.appendChild(table);
  }

  function renderMiniCalendar(assignments){
    const cal = document.getElementById('miniCalendar');
    const upcoming = document.getElementById('upcomingList');
    if (!cal || !upcoming) return;
    cal.innerHTML = '';
    upcoming.innerHTML = '';
    // build map of due dates
    const byDate = {};
    assignments.forEach(a=>{ if (!byDate[a.due]) byDate[a.due]=[]; byDate[a.due].push(a); });

    const today = new Date();
    const year = today.getFullYear(), month = today.getMonth();
    // headers
    const grid = document.createElement('div'); grid.className='mini-calendar-grid';
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(h=>{
      const hd = document.createElement('div'); hd.className='day header'; hd.textContent = h; grid.appendChild(hd);
    });
    // first day of month
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    // pad
    for(let i=0;i<startDay;i++){ const d=document.createElement('div'); d.className='day'; grid.appendChild(d); }
    for(let d=1; d<=daysInMonth; d++){
      const dateStr = new Date(year, month, d).toISOString().slice(0,10);
      const cell = document.createElement('div'); cell.className='day'; cell.textContent = d;
      if (dateStr === (new Date()).toISOString().slice(0,10)) cell.classList.add('today');
      if (byDate[dateStr]) cell.classList.add('has-deadline');
      // tooltip showing assignments
      if (byDate[dateStr]){
        cell.title = byDate[dateStr].map(x=>`${x.title} (${x.due})`).join('\n');
      }
      grid.appendChild(cell);
    }
    cal.appendChild(grid);

    // upcoming list (next 6 items)
    const sorted = assignments.slice().sort((a,b)=> new Date(a.due)-new Date(b.due));
    const soon = sorted.slice(0,6);
    soon.forEach(s=>{
      const itm = document.createElement('div'); itm.className='upcoming-item';
      itm.innerHTML = `<div style="flex:1">${s.title}</div><div style="white-space:nowrap">${s.due}</div>`;
      upcoming.appendChild(itm);
    });
  }

  // load and render
  const assignments = loadAssignments();
  renderGrades(assignments);
  renderMiniCalendar(assignments);

  // Role handling: load saved role and wire selector
  const roleSelect = document.getElementById('roleSelect');
  const roleNote = document.getElementById('roleNote');
  const savedRole = sessionStorage.getItem('puente_role') || '';
  if (savedRole) {
    roleSelect.value = savedRole;
    roleNote.textContent = `Active role: ${savedRole}. Lessons filtered accordingly.`;
  }
  roleSelect.addEventListener('change', () => {
    const val = roleSelect.value;
    sessionStorage.setItem('puente_role', val);
    // re-render lessons by clearing and fetching again
    document.getElementById('lessonsContainer').innerHTML = '';
    // try to fetch real lessons then render
    fetch('/api/lessons').then(r=>r.json()).then(j=> renderLessons(j.lessons || [])).catch(()=> renderLessons([
      { id: 'lang1', title: 'Market English: Greetings & Selling Phrases', summary: 'Short phrases...', audience: 'vendor'},
      { id: 'lang2', title: 'Vendor French: Basic Phrases', summary: 'Common French phrases...', audience: 'vendor'},
      { id: 'lang3', title: 'Moto English: Directions & Safety', summary: 'Essential English...', audience: 'moto'},
      { id: 'lang4', title: 'Moto French: Directions & Customer Phrases', summary: 'French phrases...', audience: 'moto'}
    ]));
    roleNote.textContent = val ? `Active role: ${val}. Lessons filtered accordingly.` : 'Choose your user type to filter lessons.';
  });

  signout.addEventListener('click', () => {
    sessionStorage.removeItem('puente_user');
    window.location.href = 'index.html';
  });
});

function openLesson(id){
  // Navigate to lesson viewer for the chosen lesson (lesson.html?id=...)
  window.location.href = `lesson.html?id=${encodeURIComponent(id)}`;
}
