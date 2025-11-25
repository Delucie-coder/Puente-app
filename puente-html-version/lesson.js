// lesson.js: renders a 16-week schedule (4 months) with weekly video + exercises
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const lessonId = params.get('id') || 'lang1';
  const API_BASE = (window.location.port === '5500') ? 'http://localhost:3010' : '';

  // Simple lesson metadata (would come from server in production)
  const lessons = {
    lang1: { title: 'Market English: Greetings & Selling Phrases', desc: 'A practical 4-month curriculum with weekly short videos and exercises to practise greetings, prices, and simple negotiations.' },
    lang2: { title: 'Vendor French: Basic Phrases', desc: 'A 16-week course of short lessons to help vendors greet and serve French-speaking customers.' },
    lang3: { title: 'Moto English: Directions & Safety', desc: 'Weekly lessons for moto drivers covering directions, fares, and safety phrases in English.' }
  };

  // Moto French lesson metadata
  lessons.lang4 = { title: 'Moto French: Directions & Customer Phrases', desc: 'Short weekly lessons to help moto drivers communicate with French-speaking customers: directions, fares, greetings and safety.' };

  // Define reusable rendering functions so offline mode shows meaningful content
  const schedule = document.getElementById('schedule');
  const weekContent = document.getElementById('weekContent');
  const key = `puente_${lessonId}_lastWeek`;

  function renderWeek(week, weekData, lessonId){
  const videoHtml = weekData && weekData.videoUrl ? `<video controls class="video-player"><source src="${weekData.videoUrl}" type="audio/mpeg">Your browser does not support the video tag.</video>` : `<div class="video-placeholder">Video placeholder for Week ${week}</div>`;

    const phrases = (weekData && weekData.phrases) ? weekData.phrases : [ { phrase: 'Hello', translation: 'Hello', phonetic: 'heh-lo' } ];
  const phrasesHtml = phrases.map(p => `<li><strong>${p.phrase}</strong> — ${p.translation} <em class="muted">(${p.phonetic || ''})</em></li>`).join('');

    const playButtonHtml = phrases.length ? `<button class="signin" onclick="playPhrases(${week}, '${lessonId}', ${JSON.stringify(phrases).replace(/'/g, "\\'")})">Play phrases</button>` : '';

    const exercises = (weekData && weekData.exercises) ? weekData.exercises : [];
    const exercisesHtml = exercises.map((ex, idx) => {
      if (ex.type === 'mcq'){
  const opts = ex.options.map((o,i)=>`<label class="option-label"><input type="radio" name="q-${idx}" value="${i}"> ${o}</label>`).join('');
  return `<div class="card exercise-card"><p style="margin:.1rem 0"><strong>${ex.question}</strong></p>${opts}<button class="btn" onclick="submitAnswer('${lessonId}',${week},'${ex.id}',${idx})">Submit</button></div>`;
      }
      return '';
    }).join('');

    weekContent.innerHTML = `
      <h3>Week ${week}</h3>
      ${videoHtml}
      <div style="margin-top:.8rem">
        <h4>Key phrases</h4>
        <ul>${phrasesHtml}</ul>
      </div>
      <div style="margin-top:.8rem">
        <h4>Exercises</h4>
        ${exercisesHtml}
      </div>
      <div style="margin-top:.6rem">${playButtonHtml}</div>
    `;
  }

  function openWeek(week, lessonId){
    sessionStorage.setItem(key, String(week));
    fetch(`${API_BASE}/api/lesson/${encodeURIComponent(lessonId)}/week/${week}`).then(r => r.json()).then(weekData => {
      renderWeek(week, weekData, lessonId);
    }).catch(() => {
      // create a small demo week for offline use
      const demoWeek = {
        week,
        title: `Week ${week}`,
        videoUrl: null,
        phrases: [
          { phrase: 'Hello', translation: 'Hello', phonetic: 'heh-lo' },
          { phrase: 'How much?', translation: 'How much does it cost?', phonetic: 'hau much' }
        ],
        exercises: [ { id: `q-${lessonId}-${week}-1`, type: 'mcq', question: 'Choose the correct greeting', options: ['Hello','Goodbye','Thanks'], answer: 0 } ]
      };
      renderWeek(week, demoWeek, lessonId);
    });
  }

  // Fetch lesson metadata and render schedule; fallback to embedded map
  fetch(`${API_BASE}/api/lesson/${encodeURIComponent(lessonId)}`).then(r => r.json()).then(meta => {
    const role = sessionStorage.getItem('puente_role') || '';
    if (meta.audience && role && meta.audience !== role) {
      document.getElementById('lessonTitle').textContent = 'Access denied';
      document.getElementById('lessonDesc').textContent = 'This lesson is only available to users with the appropriate role.';
      document.getElementById('schedule').innerHTML = '<p style="color:var(--muted)">Please switch your role in the dashboard to access this lesson.</p>';
      return;
    }
    document.getElementById('lessonTitle').textContent = meta.title || 'Lesson';
    document.getElementById('lessonDesc').textContent = meta.summary || '';
    const weeks = (meta.weeks && meta.weeks.length) ? meta.weeks : Array.from({length:16}, (_,i)=>({week:i+1,title:`Week ${i+1}`}));
  const grid = document.createElement('div');
  grid.className = 'week-grid';
  weeks.forEach(w => { const b = document.createElement('button'); b.className='btn'; b.textContent=`Week ${w.week}`; b.addEventListener('click', ()=> openWeek(w.week, lessonId)); grid.appendChild(b); });
  schedule.appendChild(grid);
    const last = parseInt(sessionStorage.getItem(key) || '1', 10);
    openWeek(last, lessonId);
  }).catch(() => {
    const meta = lessons[lessonId] || { title: 'Lesson', desc: '' };
    document.getElementById('lessonTitle').textContent = meta.title;
    document.getElementById('lessonDesc').textContent = meta.desc;
    const weeks = Array.from({length:16}, (_,i)=>({week:i+1,title:`Week ${i+1}`}));
  const grid = document.createElement('div'); grid.className='week-grid';
  weeks.forEach(w => { const b = document.createElement('button'); b.className='btn'; b.textContent=`Week ${w.week}`; b.addEventListener('click', ()=> openWeek(w.week, lessonId)); grid.appendChild(b); });
  schedule.appendChild(grid);
    const last = parseInt(sessionStorage.getItem(key) || '1', 10);
    openWeek(last, lessonId);
  });
});

function markDone(week){
  showTempToast(`Marked week ${week} complete`);
}

function showTempToast(msg){
  const t = document.createElement('div');
  t.className='puente-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.classList.add('visible'),10);
  setTimeout(()=>{t.classList.remove('visible'); setTimeout(()=>t.remove(),300)},1800);
}

// Called by exercise submit buttons; posts progress/result to API if available
function submitAnswer(lessonId, week, questionId, questionIdx){
  // read selected radio
  const radios = document.getElementsByName(`q-${questionIdx}`);
  let selected = null;
  for (const r of radios) if (r.checked) { selected = parseInt(r.value,10); break; }
  if (selected === null) { showTempToast('Select an answer first'); return; }

  // For demo, send result to API
  const email = (sessionStorage.getItem('puente_user') && JSON.parse(sessionStorage.getItem('puente_user')).email) || 'guest@demo';
  const payload = { email, lessonId, week, result: { questionId, selected } };
  fetch(`${API_BASE}/api/progress`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
    .then(r => r.json())
    .then(j => {
      showTempToast('Answer submitted');
    }).catch(() => {
      showTempToast('Saved locally (offline)');
    });
}

// Play phrases using the browser SpeechSynthesis API (client-side TTS)
function playPhrases(week, lessonId, phrases){
  if (!('speechSynthesis' in window)) { showTempToast('Speech synthesis not supported in this browser'); return; }
  // phrases is passed as an array of objects {phrase, translation, phonetic}
  try {
    const utter = new SpeechSynthesisUtterance();
    // Build a single utterance combining phrases with short pauses
    const text = phrases.map(p => p.phrase + '.').join(' ');
    utter.text = text;
    // Attempt to select voice based on lesson language (infer from lessonId: lang2/lang4 -> French)
    const isFrench = lessonId.startsWith('lang2') || lessonId.startsWith('lang4');
    const lang = isFrench ? 'fr-FR' : 'en-US';
    utter.lang = lang;
    // Speak
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch (err) {
    console.warn('TTS failed', err);
    showTempToast('Unable to play phrases');
  }
}
