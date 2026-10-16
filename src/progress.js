// Per-player progress (level, coins, upgrades, lives, run score), kept in this browser's localStorage.
// A "run" is one go at the campaign: you start with 3 lives, lose one for every failed level, and the run
// ends at 0 lives. Coins and upgrades survive a run ending; the level restarts from the last checkpoint
// (the level after a cleared boss level).
const KEY = 'foresthunter:progress';
export const START_LIVES = 3;
export const MAX_LIVES = 5;

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
};

export function fresh() {
  return { level: 1, coins: 0, up: { scope: 0, ammo: 0, stealth: 0, reload: 0 }, lives: START_LIVES, runScore: 0, checkpoint: 1 };
}

export function get(userId) {
  const p = read()[userId] || {};
  const f = fresh();
  return {
    level: p.level || 1,
    coins: p.coins || 0,
    up: { ...f.up, ...(p.up || {}) },
    lives: p.lives > 0 ? Math.min(p.lives, MAX_LIVES) : START_LIVES,
    runScore: p.runScore || 0,
    checkpoint: p.checkpoint || 1,
  };
}

export function save(userId, prog) {
  const all = read();
  all[userId] = prog;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
}
