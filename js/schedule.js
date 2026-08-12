/* ============================================================
   schedule.js — tab JADWAL & HASIL
   ============================================================ */

const Schedule = {

  renderJadwal() {
    const el = document.getElementById('panel-jadwal');
    const allDates = [...new Set(DB.matches.map(m => Utils.dateOnly(m.date)))].sort();
    if (!activeDate || !allDates.includes(activeDate)) {
      const today = new Date().toISOString().slice(0, 10);
      activeDate = allDates.find(d => d >= today) || allDates[0];
    }

    const live = DB.matches.filter(m => m.status === 'LIVE');
    const calling = DB.matches.filter(m => m.status === 'CALLING');
    const todays = DB.matches.filter(m => Utils.dateOnly(m.date) === activeDate);

    let html = '';

    html += `<div class="date-strip">` + allDates.map(d => {
      const lbl = Utils.dateLabel(d);
      return `<button class="date-chip ${d === activeDate ? 'active' : ''}" data-date="${d}">${lbl.short}</button>`;
    }).join('') + `</div>`;

    if (live.length) {
      html += `<div class="section"><div class="section-title"><span class="dot-live"></span> Live</div>`;
      html += live.map(m => Schedule.cardHtml(m)).join('');
      html += `</div>`;
    }

    if (calling.length) {
      html += `<div class="section"><div class="section-title">📢 Dipanggil</div>`;
      html += calling.map(m => Schedule.cardHtml(m)).join('');
      html += `</div>`;
    }

    const byCategory = {};
    todays.forEach(m => {
      if (m.status === 'LIVE' || m.status === 'CALLING') return; // sudah tampil di atas
      (byCategory[m.category_id] = byCategory[m.category_id] || []).push(m);
    });

    Object.keys(byCategory).forEach(catId => {
      const list = byCategory[catId].sort((a, b) => Utils.timeOnly(a.start_time).localeCompare(Utils.timeOnly(b.start_time)));
      html += `<div class="section">
        <div class="section-title">${Utils.categoryIcon(catId)} ${Utils.escapeHtml(Utils.categoryLabel(catId))}</div>
        ${list.map(m => Schedule.cardHtml(m)).join('')}
      </div>`;
    });

    if (!live.length && !calling.length && !todays.length) {
      html += `<div class="empty-state">Tidak ada pertandingan di tanggal ini.</div>`;
    }

    el.innerHTML = html;

    el.querySelectorAll('.date-chip').forEach(chip => {
      chip.addEventListener('click', () => { activeDate = chip.dataset.date; Schedule.renderJadwal(); });
    });
    el.querySelectorAll('.match-card').forEach(card => {
      card.addEventListener('click', () => MatchModal.open(card.dataset.matchId));
    });
  },

  renderHasil() {
    const el = document.getElementById('panel-hasil');
    const finished = DB.matches.filter(m => m.status === 'FINISHED');
    if (!finished.length) {
      el.innerHTML = '<div class="empty-state">Belum ada pertandingan yang selesai.</div>';
      return;
    }
    const byCategory = {};
    finished.forEach(m => (byCategory[m.category_id] = byCategory[m.category_id] || []).push(m));

    let html = '';
    Object.keys(byCategory).forEach(catId => {
      html += `<div class="section">
        <div class="section-title">${Utils.categoryIcon(catId)} ${Utils.escapeHtml(Utils.categoryLabel(catId))}</div>
        ${byCategory[catId].map(m => Schedule.cardHtml(m)).join('')}
      </div>`;
    });
    el.innerHTML = html;
    el.querySelectorAll('.match-card').forEach(card => {
      card.addEventListener('click', () => MatchModal.open(card.dataset.matchId));
    });
  },

  cardHtml(m) {
    const isLive = m.status === 'LIVE';
    const teamA = Utils.teamName(m.team_a_id);
    const teamB = Utils.teamName(m.team_b_id);
    const aWin = m.winner_id && m.winner_id === m.team_a_id;
    const bWin = m.winner_id && m.winner_id === m.team_b_id;
    const showScore = m.status === 'LIVE' || m.status === 'FINISHED';

    return `
      <div class="match-card ${isLive ? 'is-live' : ''}" data-match-id="${m.match_id}" tabindex="0">
        <div class="meta-row">
          <span>${Utils.escapeHtml(m.round || '')}</span>
          <span class="badge ${String(m.status).toLowerCase()}">${Utils.statusLabel(m.status)}</span>
        </div>
        <div class="match-teams">
          <div class="team ${aWin ? 'is-winner' : ''}">${Utils.escapeHtml(teamA)}</div>
          ${showScore
            ? `<div class="score ${isLive ? 'is-live' : ''}">${m.score_a ?? 0}</div><div class="vs-sep">:</div><div class="score ${isLive ? 'is-live' : ''}">${m.score_b ?? 0}</div>`
            : `<div class="vs-sep">${Utils.timeOnly(m.start_time)}</div>`}
          <div class="team ${bWin ? 'is-winner' : ''}" style="text-align:right">${Utils.escapeHtml(teamB)}</div>
        </div>
        <div class="venue-row">📍 ${Utils.escapeHtml(Utils.venueLabel(m.venue_id))}${m.referee ? ` · 🧑‍⚖️ ${Utils.escapeHtml(m.referee)}` : ''}</div>
      </div>`;
  }
};
