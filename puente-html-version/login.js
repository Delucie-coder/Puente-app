// Small interaction script for the sign-up CTAs
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const pwInput = document.getElementById('password');
  const pwToggle = document.getElementById('pwToggle');
  const forgotBtn = document.getElementById('forgotBtn');
  const resetModal = document.getElementById('resetModal');
  const sendReset = document.getElementById('sendReset');
  const resetEmail = document.getElementById('resetEmail');

  // Password show/hide
  pwToggle.addEventListener('click', () => {
    const t = pwInput.getAttribute('type') === 'password' ? 'text' : 'password';
    pwInput.setAttribute('type', t);
    pwToggle.setAttribute('aria-label', t === 'text' ? 'Hide password' : 'Show password');
  });

  // Login submit (demo only)
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = pwInput.value.trim();
    if (!email || !password) {
      showToast('Please fill in email and password');
      return;
    }
    // Attempt to authenticate with mock API; fallback to client-side demo if unavailable
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(r => {
      if (!r.ok) throw new Error('Network');
      return r.json();
    }).then(data => {
      const user = data.user || { email };
      sessionStorage.setItem('puente_user', JSON.stringify(user));
      sessionStorage.setItem('puente_token', data.token || 'demo');
      showToast('Signed in as ' + email);
      setTimeout(() => window.location.href = 'dashboard.html', 700);
    }).catch(() => {
      // Fallback: local demo
      const user = { email };
      try { sessionStorage.setItem('puente_user', JSON.stringify(user)); } catch (err){}
      showToast('Signed in (offline demo) as ' + email);
      setTimeout(() => window.location.href = 'dashboard.html', 700);
    });
  });

  // Forgot password -> open modal
  forgotBtn.addEventListener('click', () => {
    openReset();
  });

  // Send reset (demo)
  sendReset.addEventListener('click', () => {
    const mail = resetEmail.value.trim();
    if (!mail) { showToast('Enter an email to reset'); return; }
    closeReset();
    showToast('Password reset link sent to ' + mail);
  });
});

function openReset(){
  const m = document.getElementById('resetModal');
  m.classList.remove('hidden');
}

function closeReset(){
  const m = document.getElementById('resetModal');
  m.classList.add('hidden');
}

function showToast(msg){
  const toast = document.createElement('div');
  toast.className = 'puente-toast';
  toast.setAttribute('role','status');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 10);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}
