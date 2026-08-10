/* ============================================================
   match.js — modal detail pertandingan + kontrol admin
   ============================================================ */

const MatchModal = {
  currentId: null,

  async open(matchId) {
    MatchModal.currentId = matchId;
    const overlay = document.getElementById('match-modal');
    overlay.classList.remove('hidden');
    document.getElementById('match-modal-body').innerHTML = '<div class="loading-strip">Memuat...</div>';
    try {
      const detail = await Api.getMatchDetail(matchId);
      MatchModal.render(detail);
    } catch (err) {
      document.getElementById('match-modal-body').innerHTML =
        '<div class="empty-state">Gagal memuat detail.<br>' + Utils.escapeHtml(err.message) + '</div>';
    }
  },

  close() {
    document.getElementById('match-modal').classList.add('hidden');
    MatchModal.currentId = null;
  },

  render(m) {
    const teamAName = m.team_a ? m.team_a.team_name : 'TBD';
    const teamBName = m.team_b ? m.team_b.team_name : 'TBD';
    const aWin = m.winner_id && m.winner_id === m.team_a_id;
    const bWin = m.winner_id && m.winner_id === m.team_b_id;
    const playersA = (m.team_a && m.team_a.players) || [];
    const playersB = (m.team_b && m.team_b.players) || [];
    const showScore = m.status === 'LIVE' || m.status === 'FINISHED';

    let html = `
      <div class="m-round">${Utils.escapeHtml(m.round || '')} · ${Utils.escapeHtml(Utils.categoryLabel(m.category_id))}</div>
      <h2>${Utils.escapeHtml(teamAName)} <span style="color:var(--chalk-dim)">vs</span> ${Utils.escapeHtml(teamBName)}</h2>

      ${(playersA.length || playersB.length) ? `
        <div class="modal-players-row">
          <div class="modal-players-col">${playersA.map(p => `<div class="p-name">${Utils.escapeHtml(p)}</div>`).join('')}</div>
          <div class="modal-players-vs">VS</div>
          <div class="modal-players-col">${playersB.map(p => `<div class="p-name">${Utils.escapeHtml(p)}</div>`).join('')}</div>
        </div>
      ` : ''}

      ${showScore ? `
      <div class="modal-score-row">
        <div class="team-name ${aWin ? 'is-winner' : ''}" style="${aWin ? 'color:var(--gold)' : ''}">${Utils.escapeHtml(teamAName)}</div>
        <div class="score-big">${m.score_a ?? '-'}</div>
        <div class="score-big" style="color:var(--chalk-dim)">:</div>
        <div class="score-big">${m.score_b ?? '-'}</div>
        <div class="team-name ${bWin ? 'is-winner' : ''}" style="${bWin ? 'color:var(--gold)' : ''}">${Utils.escapeHtml(teamBName)}</div>
      </div>
      ` : ''}

      <div class="info-line"><span>Status</span><span>${Utils.statusLabel(m.status)}</span></div>
      <div class="info-line"><span>Tanggal</span><span>${Utils.dateLabel(m.date).full} · ${Utils.timeOnly(m.start_time)}</span></div>
      <div class="info-line"><span>Venue</span><span>${Utils.escapeHtml(Utils.venueLabel(m.venue_id))}</span></div>
      ${m.winner_id ? `<div class="info-line"><span>Pemenang</span><span>${Utils.escapeHtml(m.winner_id === m.team_a_id ? teamAName : teamBName)}</span></div>` : ''}
      ${m.next_match ? `<div class="info-line"><span>Next</span><span>${Utils.escapeHtml(m.next_match.round)}</span></div>` : ''}
    `;

    if (Admin.isLoggedIn()) {
      html += MatchModal.adminControlsHtml(m, teamAName, teamBName);
    }

    document.getElementById('match-modal-body').innerHTML = html;
    if (Admin.isLoggedIn()) MatchModal.bindAdminControls(m);
  },

  adminControlsHtml(m, teamAName, teamBName) {
    const disabledFinished = m.status === 'FINISHED' ? 'disabled' : '';
    return `
      <div class="admin-panel">
        <h3>⚙ Panel Admin</h3>

        <div class="field-row">
          <select id="status-select">
            ${['SCHEDULED','CALLING','LIVE','FINISHED','POSTPONED','CANCELLED'].map(s =>
              `<option value="${s}" ${m.status === s ? 'selected' : ''}>${Utils.statusLabel(s)}</option>`
            ).join('')}
          </select>
          <button class="btn" id="btn-set-status">Update Status</button>
        </div>

        <div class="field-row">
          <input type="number" class="score-input" id="score-a-input" value="${m.score_a || 0}" min="0">
          <span style="align-self:center;color:var(--chalk-dim)">:</span>
          <input type="number" class="score-input" id="score-b-input" value="${m.score_b || 0}" min="0">
          <button class="btn" id="btn-set-score">Update Skor</button>
        </div>

        <div class="btn-row">
          <button class="btn primary win-btn" id="btn-win-a" ${disabledFinished}>${Utils.escapeHtml(teamAName)} Menang</button>
          <button class="btn primary win-btn" id="btn-win-b" ${disabledFinished}>${Utils.escapeHtml(teamBName)} Menang</button>
        </div>

        <div class="admin-msg" id="admin-msg"></div>
      </div>
    `;
  },

  bindAdminControls(m) {
    const msg = (text, ok) => {
      const el = document.getElementById('admin-msg');
      el.textContent = text;
      el.className = 'admin-msg ' + (ok ? 'ok' : 'err');
    };

    document.getElementById('btn-set-status').addEventListener('click', async () => {
      const status = document.getElementById('status-select').value;
      try {
        await Api.setStatus(m.match_id, status, Admin.getKey());
        msg('Status diperbarui.', true);
        await MatchModal.open(m.match_id);
        renderAll();
      } catch (err) { msg(err.message, false); }
    });

    document.getElementById('btn-set-score').addEventListener('click', async () => {
      const a = document.getElementById('score-a-input').value;
      const b = document.getElementById('score-b-input').value;
      try {
        await Api.setScore(m.match_id, a, b, Admin.getKey());
        msg('Skor diperbarui.', true);
        await MatchModal.open(m.match_id);
        renderAll();
      } catch (err) { msg(err.message, false); }
    });

    document.getElementById('btn-win-a').addEventListener('click', () => MatchModal.confirmWinner(m, m.team_a_id));
    document.getElementById('btn-win-b').addEventListener('click', () => MatchModal.confirmWinner(m, m.team_b_id));
  },

  async confirmWinner(m, winnerId) {
    if (!winnerId) return;
    if (!confirm('Tetapkan pemenang dan tandai FINISHED? Tindakan ini tidak bisa dibatalkan lewat aplikasi.')) return;
    const msgEl = document.getElementById('admin-msg');
    try {
      await Api.setWinner(m.match_id, winnerId, Admin.getKey());
      msgEl.textContent = 'Pemenang ditetapkan, bracket diperbarui.';
      msgEl.className = 'admin-msg ok';
      await MatchModal.open(m.match_id);
      const data = await Api.getAll();
      Object.assign(DB, data);
      renderAll();
    } catch (err) {
      msgEl.textContent = err.message;
      msgEl.className = 'admin-msg err';
    }
  }
};
