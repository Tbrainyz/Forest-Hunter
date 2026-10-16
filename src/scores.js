// Personal best, kept in this browser and shown in the HUD.
// The shared leaderboard lives on start.ng (see platform.js).
const KEY = 'foresthunter:scores';

function all() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export function getBest(userId) {
  return all()[userId] ?? 0;
}

export function submit(user, score) {
  const scores = all();
  const prev = scores[user.id] ?? 0;
  scores[user.id] = Math.max(prev, score);
  try { localStorage.setItem(KEY, JSON.stringify(scores)); } catch {}
  return { best: scores[user.id], isBest: score > prev };
}
