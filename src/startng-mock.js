// Local stand-in for the start.ng platform SDK.
// It fakes the two things the game needs from start.ng: who is signed in, and
// that user's central style. Data lives in localStorage so the mock platform
// page (startng.html) and the game share it, even across browser tabs.

const USERS_KEY = 'startng:users';
const SESSION_KEY = 'startng:session';

const TEST_USERS = [
  { id: 'u_ada', username: 'ada', displayName: 'Ada', style: { primaryColor: '#ff6b6b', secondaryColor: '#2b2f4a', skinColor: '#8d5524', hat: 'cap', accessory: 'backpack' } },
  { id: 'u_tunde', username: 'tunde', displayName: 'Tunde', style: { primaryColor: '#1dd1a1', secondaryColor: '#222f3e', skinColor: '#c68642', hat: 'beanie', accessory: 'scarf' } },
  { id: 'u_chioma', username: 'chioma', displayName: 'Chioma', style: { primaryColor: '#a55eea', secondaryColor: '#f7b731', skinColor: '#e0ac69', hat: 'crown', accessory: 'glasses' } },
  { id: 'u_musa', username: 'musa', displayName: 'Musa', style: { primaryColor: '#4b7bec', secondaryColor: '#3d3d3d', skinColor: '#f1c27d', hat: 'tophat', accessory: 'none' } },
];

function readUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY));
    if (Array.isArray(users)) return users;
  } catch {}
  localStorage.setItem(USERS_KEY, JSON.stringify(TEST_USERS));
  return structuredClone(TEST_USERS);
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function current() {
  const id = localStorage.getItem(SESSION_KEY);
  return readUsers().find((u) => u.id === id) ?? null;
}

const listeners = new Set();
function notify() {
  const user = current();
  listeners.forEach((fn) => fn(user));
}
// Fires when another tab (e.g. the start.ng profile page) changes the data.
window.addEventListener('storage', (e) => {
  if (e.key === USERS_KEY || e.key === SESSION_KEY || e.key === null) notify();
});

/** The signed-in user ({ id, username, displayName, style }) or null. */
export async function getCurrentUser() {
  return current();
}

/** Called with the new user (or null) on sign in/out and style changes. Returns an unsubscribe fn. */
export function onUserChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function signIn(userId) {
  localStorage.setItem(SESSION_KEY, userId);
  notify();
  return current();
}

export async function signOut() {
  localStorage.removeItem(SESSION_KEY);
  notify();
}

/** Merge a partial style into the signed-in user's central style. */
export async function updateStyle(patch) {
  const users = readUsers();
  const user = users.find((u) => u.id === localStorage.getItem(SESSION_KEY));
  if (!user) throw new Error('Not signed in');
  user.style = { ...user.style, ...patch };
  writeUsers(users);
  notify();
  return user;
}

/** Mock only: the test accounts shown on the fake sign-in screen. */
export function listTestUsers() {
  return readUsers();
}
