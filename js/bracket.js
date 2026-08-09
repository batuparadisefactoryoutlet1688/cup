/* ============================================================
   bracket.js — tab BRACKET
   ============================================================ */

const Bracket = {
  activeCategory: null,

  // Urutan babak per format, supaya bracket tidak bergantung urutan baris di sheet.
  ROUND_ORDER: {
    BOLA: ['PENYISIHAN', 'SEMI FINAL', 'FINAL'],
    BADMINTON: ['16 BESAR', 'PEREMPAT FINAL', 'SEMI FINAL', 'FINAL']
  },

  sortRounds(rounds, sport) {
    const order = Bracket.ROUND_ORDER[sport] || [];
    return rounds.slice().sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  },

  render() {
    const el = document.getElementById('panel-bracket');
    if (!Bracket.activeCategory) Bracket.activeCategory = DB.categories[0]?.category_id;

    const catTabs = DB.categories.map(c => `
      <button class="date-chip ${c.category_id === Bracket.activeCategory ? 'active' : ''}" data-cat="${c.category_id}">
        ${Utils.categoryIcon(c.category_id)} ${Utils.escapeHtml(c.category_name)}
      </button>`).join('');

    const rows = DB.bracket.filter(b => b.category_id === Bracket.activeCategory);
    const cat = DB.categories.find(c => c.category_id === Bracket.activeCategory);
    const rounds = Bracket.sortRounds([...new Set(rows.map(r => r.round))], cat ? cat.sport : '');

    let cols = rounds.map(round => {
      const slots = rows.filter(r => r.round === round);
      return `
        <div class="bracket-round">
          <div class="bracket-round-label">${Utils.escapeHtml(round)}</div>
          ${slots.map(s => Bracket.slotHtml(s)).join('')}
        </div>`;
    }).join('');

    if (!rows.length) cols = '<div class="empty-state">Bracket belum tersedia untuk kategori ini.</div>';

    el.innerHTML = `<div class="date-strip">${catTabs}</div><div class="bracket-wrap">${cols}</div>`;

    el.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => { Bracket.activeCategory = btn.dataset.cat; Bracket.render(); });
    });
    el.querySelectorAll('.bracket-slot').forEach(slot => {
      slot.addEventListener('click', () => MatchModal.open(slot.dataset.matchId));
    });
  },

  slotHtml(entry) {
    const match = DB.matches.find(m => m.match_id === entry.match_id);
    const resolve = (slot, teamId) => {
      if (teamId) return Utils.teamName(teamId);
      if (String(slot).indexOf('WINNER:') === 0) return 'Menunggu pemenang';
      return 'TBD';
    };
    const teamA = match ? match.team_a_id : null;
    const teamB = match ? match.team_b_id : null;
    const aWin = match && match.winner_id && match.winner_id === teamA;
    const bWin = match && match.winner_id && match.winner_id === teamB;

    return `
      <div class="bracket-slot" data-match-id="${entry.match_id}">
        <div class="b-team ${aWin ? 'is-winner' : ''}">${Utils.escapeHtml(resolve(entry.slot_a, teamA))}</div>
        <div class="b-team ${bWin ? 'is-winner' : ''}">${Utils.escapeHtml(resolve(entry.slot_b, teamB))}</div>
      </div>`;
  }
};
