// Modernized login handling for Puente
const API_BASE = (window.location.port === '5500') ? 'http://localhost:3010' : '';
const loginForm = document.getElementById('loginForm');
if (loginForm){
  loginForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    if(!role){ alert('Please select a role'); return; }
    const email = username || `${role}@demo`;

    // first attempt to login with password (server will require password if user has one)
    try {
      const resp = await fetch(`${API_BASE}/api/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
  if (resp.ok){ const j = await resp.json(); const user = j.user || { email }; try{ sessionStorage.setItem('puente_user', JSON.stringify(user)); sessionStorage.setItem('puente_role', user.role || role); if (j.token) sessionStorage.setItem('puente_token', j.token); else if (user.token) sessionStorage.setItem('puente_token', user.token); }catch(e){}
      const dest1 = (user.role || role) === 'admin' ? 'dashboard-admin.html' : (user.role || role) === 'vendor' ? 'dashboard-vendor.html' : (user.role || role) === 'moto' ? 'dashboard-moto.html' : (user.role || role) === 'contributor' ? 'contributor.html' : 'dashboard.html';
      window.location.href = dest1; return; }
      // if not ok and status 401, offer to register
      if (resp.status === 401){
        // attempt registration
        const reg = await fetch(`${API_BASE}/api/register`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email, name: username || 'Guest', password, role }) });
  if (reg.ok){ const jr = await reg.json(); const user = jr.user; try{ sessionStorage.setItem('puente_user', JSON.stringify(user)); sessionStorage.setItem('puente_role', user.role || role); if (jr.token) sessionStorage.setItem('puente_token', jr.token); else if (user.token) sessionStorage.setItem('puente_token', user.token); }catch(e){}
      const dest2 = (user.role || role) === 'admin' ? 'dashboard-admin.html' : (user.role || role) === 'vendor' ? 'dashboard-vendor.html' : (user.role || role) === 'moto' ? 'dashboard-moto.html' : (user.role || role) === 'contributor' ? 'contributor.html' : 'dashboard.html';
      window.location.href = dest2; return; }
        if (reg.status === 409) { alert('User already exists with a password. Please retry login with correct password.'); return; }
      }
      // other errors -> fallback to demo login creation
    } catch (err) {
      console.warn('Auth request failed', err);
    }

    // Fallback: create a simple demo user on client and continue
    const user = { email, name: username || 'Guest', role };
    try { localStorage.setItem('puente:user', JSON.stringify(user)); } catch(e){}
    try { sessionStorage.setItem('puente_user', JSON.stringify(user)); } catch(e){}
    try { sessionStorage.setItem('puente_role', role); } catch(e){}
    const dest3 = role === 'admin' ? 'dashboard-admin.html' : role === 'vendor' ? 'dashboard-vendor.html' : role === 'moto' ? 'dashboard-moto.html' : role === 'contributor' ? 'contributor.html' : 'dashboard.html';
    window.location.href = dest3;
  });
}

function getUser(){
  try { return JSON.parse(localStorage.getItem('puente:user')) || JSON.parse(sessionStorage.getItem('puente_user')); }
  catch(e){ return null; }
}
function logout(){
  try { localStorage.removeItem('puente:user'); } catch(e){}
  try { sessionStorage.removeItem('puente_user'); sessionStorage.removeItem('puente_role'); } catch(e){}
  window.location.href = 'index.html';
}
window.Puente = { getUser, logout };
