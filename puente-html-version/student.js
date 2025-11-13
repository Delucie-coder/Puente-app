(function(){
  const user = Puente.getUser();
  document.querySelector('[data-username]').textContent = user.username || 'Student';
  document.querySelector('[data-role]').textContent = 'Student';
  document.getElementById('logoutBtn').addEventListener('click', Puente.logout);

  document.getElementById('kpiBookmarks').textContent = '8';
  document.getElementById('kpiProgress').textContent = '62%';
  document.getElementById('kpiDownloads').textContent = '29';

  const data = [
    { title:'Math Basics (Kinyarwanda)', subject:'Math', level:'Primary', type:'PDF', action:'View' },
    { title:'Physics for Riders', subject:'Physics', level:'Secondary', type:'Video', action:'Watch' },
    { title:'Business for Vendors', subject:'Business', level:'Community', type:'Audio', action:'Listen' }
  ];
  const body = document.querySelector('#resourceTable tbody');
  data.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.title}</td>
      <td>${r.subject}</td>
      <td>${r.level}</td>
      <td>${r.type}</td>
      <td><button class="btn link">${r.action}</button></td>`;
    body.appendChild(tr);
  });
})();
