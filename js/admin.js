/* ============================================================
   admin.js — login admin tersembunyi
   Password TIDAK PERNAH ditulis di source code ini.
   Validasi asli terjadi di server (Apps Script Auth.gs) lewat action "ping".
   ============================================================ */

const Admin = {
  _key: null,

  isLoggedIn() {
    return !!Admin._key;
  },

  getKey() {
    return Admin._key || sessionStorage.getItem('tmc_admin_key') || '';
  },

  initTrigger() {
    document.getElementById('admin-trigger').addEventListener('click', Admin.openLogin);
    const saved = sessionStorage.getItem('tmc_admin_key');
    if (saved) Admin._key = saved;
  },

  openLogin() {
    const overlay = document.getElementById('login-modal');
    overlay.classList.remove('hidden');
    document.getElementById('login-msg').textContent = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-password').focus();
  },

  closeLogin() {
    document.getElementById('login-modal').classList.add('hidden');
  },

  async submitLogin() {
    const password = document.getElementById('login-password').value;
    const msgEl = document.getElementById('login-msg');
    msgEl.textContent = 'Memeriksa...';
    msgEl.className = 'admin-msg';
    try {
      await Api.ping(password);
      Admin._key = password;
      sessionStorage.setItem('tmc_admin_key', password);
      msgEl.textContent = 'Login berhasil.';
      msgEl.className = 'admin-msg ok';
      setTimeout(Admin.closeLogin, 500);
      // Kalau modal match sedang terbuka, render ulang supaya panel admin muncul.
      if (MatchModal.currentId) MatchModal.open(MatchModal.currentId);
    } catch (err) {
      msgEl.textContent = 'Password salah.';
      msgEl.className = 'admin-msg err';
    }
  },

  logout() {
    Admin._key = null;
    sessionStorage.removeItem('tmc_admin_key');
    if (MatchModal.currentId) MatchModal.open(MatchModal.currentId);
  }
};