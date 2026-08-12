/* ============================================================
   api.js — komunikasi ke Apps Script Web App
   ============================================================ */

// GANTI dengan URL deploy Apps Script kamu (Deploy > Manage deployments)
const API_URL = 'https://script.google.com/macros/s/AKfycbymHDbwb6wTdH_IPVA5A9vyxi-M_22LOy5nD6NrnIvGqrQ_ZkSbkVIyQGR3yzaPzRTR/exec';

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
    return Api._request(url.toString());
  },

  // Semua admin action lewat sini. adminKey diambil dari Admin.getKey().
  async _post(action, payload, adminKey) {
    const body = Object.assign({ action: action, key: adminKey }, payload);
    // Kirim sebagai text/plain supaya browser tidak melakukan CORS preflight
    // (Apps Script Web App tidak menangani OPTIONS request).
    return Api._request(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
  },

  // Fetch + auto-retry. Kadang Apps Script/jaringan balikin HTML (bukan JSON) --
  // misal WiFi publik dengan halaman login, atau Google lagi throttle sesaat.
  // Coba ulang sampai 3x dengan jeda kecil sebelum benar-benar dianggap gagal.
  // Error aplikasi (ok:false, misal "Unauthorized") TIDAK di-retry -- itu bukan
  // masalah jaringan, langsung dilempar apa adanya.
  async _request(url, options) {
    const maxAttempts = 3;
    let lastErr;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await fetch(url, options);
        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch (e) {
          throw new Error('BAD_RESPONSE');
        }
        if (!json.ok) {
          const err = new Error(json.error || 'Gagal memproses permintaan');
          err.noRetry = true;
          throw err;
        }
        return json.data;
      } catch (err) {
        lastErr = err;
        if (err.noRetry) throw err;
        if (attempt < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
        }
      }
    }
    throw new Error(
      lastErr.message === 'BAD_RESPONSE'
        ? 'Sinyal tidak stabil, coba lagi sebentar.'
        : (lastErr.message || 'Gagal terhubung ke server')
    );
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
