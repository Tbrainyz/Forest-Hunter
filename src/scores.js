// Per-user best scores for Forest Hunter, kept in this browser.
const KEY = 'foresthunter:scores';

function all() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function getBest(userId) {
  return all()[userId]?.score ?? 0;
}

export function submit(user, score) {
  const scores = all();
  const prev = scores[user.id]?.score ?? 0;
  const isBest = score > prev;
  scores[user.id] = { score: Math.max(prev, score), name: user.displayName, color: user.style.primaryColor };
  localStorage.setItem(KEY, JSON.stringify(scores));
  return { best: Math.max(prev, score), isBest };
}

export function top(n = 5) {
  return Object.values(all())
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
