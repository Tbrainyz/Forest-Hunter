import { SPECIES } from './animals.js';

// Endless levels: every level gets a mission, and everything gets harder as the level goes up.

export const MAX_RANK = 5;

// Upgrades bought with coins. cost(rank) is the price of the next rank.
export const UPGRADES = [
  { id: 'scope',   name: 'Steady scope', desc: 'Less scope sway',              cost: (r) => 40 + 30 * r },
  { id: 'ammo',    name: 'Extra ammo',   desc: '+2 shots every round',         cost: (r) => 50 + 40 * r },
  { id: 'stealth', name: 'Soft steps',   desc: 'Animals notice you later',     cost: (r) => 45 + 35 * r },
  { id: 'reload',  name: 'Quick bolt',   desc: 'Shoot faster',                 cost: (r) => 40 + 30 * r },
];

export function difficulty(lv) {
  const boss = lv % 5 === 0;
  return {
    time: boss ? Math.max(80, 125 - 2 * lv) : Math.max(60, 95 - 2 * lv),
    ammo: Math.max(7, 15 - Math.floor(lv / 2)), // fewer shots as levels rise
    speed: Math.min(1.8, 1 + 0.04 * lv),        // animals run faster
    skit: Math.min(1.5, 1 + 0.03 * lv),         // and notice you from further away
    wolves: 2 + Math.floor(lv / 3),             // more protected animals to avoid
  };
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function buildLevel(lv) {
  const boss = lv % 5 === 0; // every 5th level: find the White Stag
  const pool = lv < 4 ? ['Rabbit', 'Squirrel', 'Pheasant', 'Fox']
    : lv < 8 ? ['Rabbit', 'Squirrel', 'Pheasant', 'Fox', 'Boar', 'Deer']
    : ['Rabbit', 'Squirrel', 'Pheasant', 'Fox', 'Boar', 'Deer', 'Elk', 'Bear'];
  const species = pick(pool);
  const have = SPECIES.find((s) => s.name === species).count;
  const type = boss ? 'stag' : ['score', 'bag', 'distance', 'streak', 'clean'][(lv - 1) % 5];
  const goals = {
    stag: 1,
    score: 40 + 18 * lv,
    bag: Math.min(have, 1 + Math.floor(lv / 5)),
    distance: Math.min(80, Math.round(20 + 2.5 * lv)),
    streak: Math.min(5, 2 + Math.floor(lv / 6)),
    clean: 30 + 15 * lv,
  };
  return {
    level: lv,
    diff: difficulty(lv),
    fox: lv >= 2 && Math.random() < Math.min(0.6, 0.3 + 0.03 * lv), // the Golden Fox (extra life) turns up now and then
    stag: boss || Math.random() < 0.3, // the rare White Stag may also turn up on other levels (+150 points)
    mission: { type, species, goal: goals[type], progress: 0, done: false, failed: false },
  };
}

export function describe(m) {
  const p = `${m.progress}/${m.goal}`;
  switch (m.type) {
    case 'stag': return 'Find and bag the White Stag';
    case 'score': return `Score ${m.goal} points (${m.progress}/${m.goal})`;
    case 'bag': return `Bag ${m.species} ×${m.goal} (${p})`;
    case 'distance': return `Hit an animal from ${m.goal} m or more (best ${m.progress} m)`;
    case 'streak': return `Hit ${m.goal} in a row without missing (${m.progress}/${m.goal})`;
    case 'clean': return `Score ${m.goal} without hitting a protected animal (${m.progress}/${m.goal})`;
  }
}

// Call after every shot. c = { hit, dist, streak, score, protectedHits }.
export function updateMission(m, c) {
  if (m.done || m.failed) return;
  const ok = c.hit && !c.hit.d.protected;
  switch (m.type) {
    case 'stag': if (ok && c.hit.d.rare) { m.progress = 1; m.done = true; } break;
    case 'bag': if (ok && c.hit.d.name === m.species) m.progress++; m.done = m.progress >= m.goal; break;
    case 'score': m.progress = Math.max(0, c.score); m.done = c.score >= m.goal; break;
    case 'clean':
      m.progress = Math.max(0, c.score);
      if (c.protectedHits > 0) m.failed = true; else m.done = c.score >= m.goal;
      break;
    case 'distance': if (ok) m.progress = Math.max(m.progress, Math.round(c.dist)); m.done = m.progress >= m.goal; break;
    case 'streak': m.progress = c.streak; m.done = c.streak >= m.goal; break;
  }
}

export function reward(level, score, cleared) {
  const base = Math.floor(Math.max(score, 0) / (cleared ? 5 : 10));
  return cleared ? base + 20 + 5 * level : base;
}
