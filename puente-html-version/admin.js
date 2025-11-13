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
