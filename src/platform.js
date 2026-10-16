// The only file that talks to start.ng. See https://start.ng/docs.md
//
// Players, characters and the leaderboard come from start.ng's hidden connect page, which only
// answers games served from *.start.ng. When the game is opened anywhere else (npm start, a local
// file) there is no connect page, so you play as a local guest and the leaderboard is empty.

const START_NG = 'https://start.ng';
const live = location.hostname.endsWith('.start.ng');

let frame;
function connectFrame() {
  frame ??= new Promise((resolve, reject) => {
    const el = document.createElement('iframe');
    el.src = `${START_NG}/connect`;
    el.hidden = true;
    el.onload = () => resolve(el);
    el.onerror = reject;
    document.body.append(el);
  });
  return frame;
}

// Sends a message and resolves to start.ng's reply, or null if it didn't answer.
async function askStartNg(message, replyType, timeoutMs = 5000) {
  let el;
  try { el = await connectFrame(); } catch { return null; }
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    const done = (reply) => { clearTimeout(timer); removeEventListener('message', onMessage); resolve(reply); };
    const timer = setTimeout(() => done(null), timeoutMs);
    function onMessage(e) {
      if (e.origin !== START_NG || e.source !== el.contentWindow) return; // only trust start.ng
      if (e.data?.type === replyType && e.data.requestId === requestId) done(e.data);
    }
    addEventListener('message', onMessage);
    el.contentWindow.postMessage({ ...message, requestId }, START_NG);
  });
}

// A player is { id, displayName, account, style, face, signedIn }. style/face may be null.
const LOCAL_GUEST = { id: 'guest', displayName: 'Guest', account: null, style: null, face: null, signedIn: false };

export async function getCurrentUser() {
  if (!live) return LOCAL_GUEST;
  const reply = await askStartNg({ type: 'startng:whoami' }, 'startng:user');
  if (reply?.user) {
    const u = reply.user;
    return { id: u.id, displayName: u.name, account: u.account, style: u.style, face: u.face, signedIn: true };
  }
  const g = reply?.guest;
  return g ? { ...LOCAL_GUEST, displayName: g.name || 'Guest', style: g.style, face: g.face } : LOCAL_GUEST;
}

// Calls back when the player signs in/out or changes their character on start.ng in another tab.
export function onUserChange(callback) {
  const key = (p) => JSON.stringify([p.id, p.style]);
  let last;
  getCurrentUser().then((p) => { last ??= key(p); });
  async function check() {
    if (document.hidden) return;
    const p = await getCurrentUser();
    if (last !== undefined && key(p) !== last) callback(p);
    last = key(p);
  }
  document.addEventListener('visibilitychange', check);
  addEventListener('focus', check);
}

export const signInUrl = () => `${START_NG}/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;

// Saves a run. stats must match startng.json. Returns { best, improved, rank, stats } or null (guests, local play).
export async function saveScore(stats) {
  if (!live) return null;
  const reply = await askStartNg({ type: 'startng:score', stats }, 'startng:scoreSaved');
  return reply?.ok ? reply.result : null;
}

// Returns [{ rank, player_id, name, color, score, stats }]. Empty off start.ng.
export async function getLeaderboard(limit = 5) {
  if (!live) return [];
  const reply = await askStartNg({ type: 'startng:leaderboard', limit }, 'startng:leaderboardData');
  return reply?.ok ? reply.entries : [];
}
