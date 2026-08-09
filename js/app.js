/* ============================================================
   app.js — inti aplikasi: state, tabs, auto-refresh, helper umum
   ============================================================ */

const REFRESH_MS = 15000;

const DB = {
  settings: {},
  categories: [],
  teams: [],
  venues: [],
  matches: [],
  bracket: [],
  announcement: []
};

let activeTab = 'jadwal';
let activeDate = null; // dipakai tab jadwal
let refreshTimer = null;

// ---------- Helper umum (dipakai schedule.js, bracket.js, match.js) ----------

const Utils = {
  // Shim sementara: backend kadang mengirim date/time mentah (ISO+Z) kalau
  // normalizeMatch_ belum berjalan di Apps Script. Idealnya backend selalu
  // kirim date="yyyy-MM-dd" & time="HH:mm" polos.
  dateOnly(raw) {
    if (!raw) return '';
    if (String(raw).indexOf('T') !== -1) return String(raw).slice(0, 10);
    return String(raw);
  },

  timeOnly(raw) {
    if (!raw) return '--:--';
    if (String(raw).indexOf('T') !== -1) {
      const d = new Date(raw);
      return d.getUTCHours().toString().padStart(2, '0') + ':' + d.getUTCMinutes().toString().padStart(2, '0');
    }
    return String(raw);
  },

  dateLabel(dateStr) {
    const clean = Utils.dateOnly(dateStr);
    const d = new Date(clean + 'T00:00:00');
    if (isNaN(d)) return clean;
    const hari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()];
    const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()];
    return { short: d.getDate() + ' ' + bulan, full: hari + ', ' + d.getDate() + ' ' + bulan };
  },

  teamName(teamId) {
    if (!teamId) return 'TBD';
    const t = DB.teams.find(t => t.team_id === teamId);
    return t ? t.team_name : teamId;
  },

  venueLabel(venueId) {
    const v = DB.venues.find(v => v.venue_id === venueId);
    if (!v) return '';
    return v.venue_name + (v.court ? ' · ' + v.court : '');
  },

  categoryLabel(catId) {
    const c = DB.categories.find(c => c.category_id === catId);
    return c ? c.category_name : catId;
  },

  categoryIcon(catId) {
    if (catId === 'BOLA') return '⚽';
    return '🏸';
  },

  statusLabel(status) {
    const map = {
      SCHEDULED: 'Terjadwal', CALLING: 'Dipanggil', LIVE: 'Live',
      FINISHED: 'Selesai', POSTPONED: 'Ditunda', CANCELLED: 'Batal'
    };
    return map[status] || status || '-';
  },

  escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};

// ---------- Boot ----------

async function boot() {
  showRefreshIndicator();
  try {
    const data = await Api.getAll();
    Object.assign(DB, data);
    renderHeader();
    renderAll();
  } catch (err) {
    document.getElementById('app-root').innerHTML =
      '<div class="empty-state">Gagal memuat data.<br>' + Utils.escapeHtml(err.message) + '</div>';
  } finally {
    hideRefreshIndicator();
  }
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    showRefreshIndicator();
    try {
      const data = await Api.getAll();
      Object.assign(DB, data);
      renderAll(); // header tidak perlu re-render tiap 15 detik
    } catch (err) {
      // diamkan; auto-refresh berikutnya akan coba lagi
    } finally {
      hideRefreshIndicator();
    }
  }, REFRESH_MS);
}

function showRefreshIndicator() {
  document.getElementById('refresh-indicator').classList.add('show');
}
function hideRefreshIndicator() {
  setTimeout(() => document.getElementById('refresh-indicator').classList.remove('show'), 400);
}

function renderHeader() {
  document.getElementById('tournament-name').textContent =
    DB.settings.tournament_name || 'Tournament Match Center';
  document.getElementById('tournament-status').textContent =
    DB.settings.status || '-';
}

function renderAll() {
  renderAnnouncement();
  if (activeTab === 'jadwal') Schedule.renderJadwal();
  if (activeTab === 'hasil') Schedule.renderHasil();
  if (activeTab === 'bracket') Bracket.render();
  if (activeTab === 'teams') renderTeams();
  if (activeTab === 'info') renderInfo();
}

function renderAnnouncement() {
  const el = document.getElementById('announcement-slot');
  if (!DB.announcement.length) { el.innerHTML = ''; return; }
  el.innerHTML = DB.announcement.map(a =>
    `<div class="announcement">📢 <strong>${Utils.escapeHtml(a.title)}</strong> — ${Utils.escapeHtml(a.message)}</div>`
  ).join('');
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== 'panel-' + tab));
  renderAll();
}

function renderTeams() {
  const el = document.getElementById('panel-teams');
  const groups = DB.categories.map(cat => {
    const teams = DB.teams.filter(t => t.category_id === cat.category_id);
    return `
      <div class="section">
        <div class="section-title">${Utils.categoryIcon(cat.category_id)} ${Utils.escapeHtml(cat.category_name)}</div>
        <div class="team-grid">
          ${teams.map(t => `
            <div class="team-item">
              <div class="t-no">#${Utils.escapeHtml(t.team_no)}</div>
              ${Utils.escapeHtml(t.team_name)}
            </div>
          `).join('')}
        </div>
      </div>`;
  }).join('');
  el.innerHTML = groups || '<div class="empty-state">Belum ada data tim.</div>';
}

function renderInfo() {
  const el = document.getElementById('panel-info');
  el.innerHTML = `
    <div class="section">
      <div class="info-line"><span>Turnamen</span><span>${Utils.escapeHtml(DB.settings.tournament_name || '-')}</span></div>
      <div class="info-line"><span>Status</span><span>${Utils.escapeHtml(DB.settings.status || '-')}</span></div>
      <div class="info-line"><span>Zona waktu</span><span>${Utils.escapeHtml(DB.settings.timezone || '-')}</span></div>
      <div class="info-line"><span>Versi data</span><span>${Utils.escapeHtml(DB.settings.version || '-')}</span></div>
    </div>
    <div class="section">
      <div class="section-title">Venue</div>
      ${DB.venues.map(v => `
        <div class="info-line"><span>${Utils.escapeHtml(v.venue_name)} · ${Utils.escapeHtml(v.court)}</span><span>${Utils.escapeHtml(v.location)}</span></div>
      `).join('')}
    </div>
  `;
}

window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  Admin.initTrigger();
  Admin.updateTriggerState();

  // Tutup modal manapun lewat Esc atau klik area gelap di luar kartu.
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(o => o.classList.add('hidden'));
    }
  });

  boot().then(startAutoRefresh);
});
