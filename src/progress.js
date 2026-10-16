// Per-user progress (level, coins, upgrade ranks), kept in this browser's localStorage.
const KEY = 'foresthunter:progress';

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
};

export function fresh() {
  return { level: 1, coins: 0, up: { scope: 0, ammo: 0, stealth: 0, reload: 0 } };
}

export function get(userId) {
  const p = read()[userId] || {};
  const f = fresh();
  return { level: p.level || 1, coins: p.coins || 0, up: { ...f.up, ...(p.up || {}) } };
}

export function save(userId, prog) {
  const all = read();
  all[userId] = prog;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
}
