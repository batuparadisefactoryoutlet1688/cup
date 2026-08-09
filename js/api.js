/* ============================================================
   api.js — komunikasi ke Apps Script Web App
   ============================================================ */

// GANTI dengan URL deploy Apps Script kamu (Deploy > Manage deployments)
const API_URL = 'https://script.google.com/macros/s/AKfycbxGcgrCR6nz1Ne_U-8dlPNpOG-m01CAR5DWU4xxxmdMx0-mQMIgAgjoD4jiK_tTTYgJ/exec';

const Api = {
  async getAll() {
    return Api._get({ action: 'all' });
  },

  async getMatchDetail(id) {
    return Api._get({ action: 'match', id: id });
  },

  async _get(params) {
    const url = new URL(API_URL);
    Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));
    const res = await fetch(url.toString());
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Gagal mengambil data');
    return json.data;
  },

  // Semua admin action lewat sini. adminKey diambil dari Admin.getKey().
  async _post(action, payload, adminKey) {
    const body = Object.assign({ action: action, key: adminKey }, payload);
    // Kirim sebagai text/plain supaya browser tidak melakukan CORS preflight
    // (Apps Script Web App tidak menangani OPTIONS request).
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Aksi gagal');
    return json.data;
  },

  async ping(adminKey) {
    return Api._post('ping', {}, adminKey);
  },

  async setScore(matchId, scoreA, scoreB, adminKey) {
    return Api._post('setScore', { match_id: matchId, score_a: scoreA, score_b: scoreB }, adminKey);
  },

  async setStatus(matchId, status, adminKey) {
    return Api._post('setStatus', { match_id: matchId, status: status }, adminKey);
  },

  async setWinner(matchId, winnerId, adminKey) {
    return Api._post('setWinner', { match_id: matchId, winner_id: winnerId }, adminKey);
  }
};
