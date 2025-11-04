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

    lessons.forEach(l => {
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
    document.querySelector('main').appendChild(container);
  }

  signout.addEventListener('click', () => {
    sessionStorage.removeItem('puente_user');
    window.location.href = 'index.html';
  });
});

function openLesson(id){
  // Navigate to lesson viewer for the chosen lesson (lesson.html?id=...)
  window.location.href = `lesson.html?id=${encodeURIComponent(id)}`;
}
