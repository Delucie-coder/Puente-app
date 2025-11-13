(function(){
  const user = Puente.getUser();
  document.querySelector('[data-username]').textContent = user.username || 'Contributor';
  document.querySelector('[data-role]').textContent = 'Contributor';
  document.getElementById('logoutBtn').addEventListener('click', Puente.logout);

  document.getElementById('kpiUploads').textContent = '12';
  document.getElementById('kpiApproved').textContent = '9';
  document.getElementById('kpiPending').textContent = '3';

  const uploads = [
    { title:'Safe Riding Tips', subject:'Civics', level:'Community', type:'PDF', status:'approved' },
    { title:'Quick Math for Change', subject:'Math', level:'Primary', type:'PDF', status:'pending' }
  ];
  const body = document.querySelector('#uploadTable tbody');
  uploads.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.title}</td>
      <td>${u.subject}</td>
      <td>${u.level}</td>
      <td>${u.type}</td>
      <td><span class="badge ${u.status}">${u.status}</span></td>`;
    body.appendChild(tr);
  });
})();
