(function() {
  // Point API calls at the mock server when testing locally
  const API_BASE = (window.location.protocol === 'file:') 
    ? 'http://localhost:3001' 
    : ((window.location.port === '5500') 
        ? 'http://localhost:3010' 
        : '/api');

  async function fetchMotos() {
    try {
      const response = await fetch(`${API_BASE}/motos`);
      if (!response.ok) throw new Error('Failed to fetch motos');
      const data = await response.json();
      renderMotos(data);
    } catch (error) {
      console.error('Error fetching motos:', error);
      document.getElementById('moto-list').innerHTML = `<p>Error loading motos</p>`;
    }
  }

  function renderMotos(motos) {
    const list = document.getElementById('moto-list');
    list.innerHTML = '';
    motos.forEach(moto => {
      const item = document.createElement('div');
      item.className = 'moto-item';
      item.innerHTML = `<h3>${moto.name}</h3><p>${moto.owner}</p>`;
      list.appendChild(item);
    });
  }

  // Initialize
  fetchMotos();
})();
