import * as THREE from 'three';

// One entry per species. Sizes are in metres, speed is the run speed, points can be negative.
// l/h/w = body length/height/width, lg = leg height, ear/ant = ear/antler size, tail: 1 puff, 2 long.
export const SPECIES = [
  { name: 'Rabbit',   color: '#b9a58a', l: 0.6, h: 0.35, w: 0.3,  lg: 0.18, speed: 4,   points: 10, count: 4, ear: 0.25, tail: 1 },
  { name: 'Squirrel', color: '#a0562a', l: 0.45, h: 0.25, w: 0.2, lg: 0.12, speed: 4.5, points: 15, count: 3, ear: 0.08, tail: 2 },
  { name: 'Pheasant', color: '#8a5a2b', l: 0.5, h: 0.3, w: 0.25,  lg: 0.3,  speed: 3,   points: 20, count: 3, tail: 2 },
  { name: 'Fox',      color: '#d2691e', l: 1,   h: 0.45, w: 0.35, lg: 0.4,  speed: 4,   points: 25, count: 2, ear: 0.2, tail: 2 },
  { name: 'Boar',     color: '#4a3a30', l: 1.5, h: 0.8, w: 0.7,   lg: 0.4,  speed: 3.5, points: 30, count: 2, ear: 0.15 },
  { name: 'Deer',     color: '#9b6b43', l: 1.6, h: 0.8, w: 0.5,   lg: 0.9,  speed: 4,   points: 40, count: 3, ear: 0.2, ant: 0.5 },
  { name: 'Elk',      color: '#6e4a2e', l: 2.2, h: 1.1, w: 0.7,   lg: 1.3,  speed: 3.5, points: 60, count: 1, ear: 0.25, ant: 1.2 },
  { name: 'Bear',     color: '#2d2018', l: 2,   h: 1.2, w: 1,     lg: 0.6,  speed: 2.8, points: 80, count: 1, ear: 0.2 },
  // Rare: spawns on boss levels (and sometimes others). Glows faintly, bolts early, worth a lot.
  { name: 'White Stag', color: '#f2f2ee', l: 2, h: 1, w: 0.6, lg: 1.2, speed: 5, points: 150, count: 0, ear: 0.25, ant: 1, rare: true, glow: true },
  // Special: fast, spooks from far away and vanishes after 25 s. Shooting it earns an extra life.
  { name: 'Golden Fox', color: '#f5c542', l: 0.9, h: 0.4, w: 0.3, lg: 0.35, speed: 8, points: 300, count: 0, ear: 0.2, tail: 2, special: true, glow: true, glowColor: '#ffcc33' },
  // Protected species: shooting one costs you points.
  { name: 'Wolf',     color: '#808389', l: 1.3, h: 0.6, w: 0.4,   lg: 0.6,  speed: 4.2, points: -50, count: 2, ear: 0.2, tail: 2, protected: true },
];

/** Builds a blocky animal facing +z. Returns { g, legs } where g is the Group. */
export function createAnimal(d) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...(d.glow ? { emissive: d.glowColor ?? '#bcd4ff', emissiveIntensity: 0.3 } : {}) });
  const body = mat(d.color);
  const dark = mat(new THREE.Color(d.color).multiplyScalar(0.6));
  const horn = mat('#d8c9a0');
  const white = mat('#ffffff');

  const part = (parent, w, h, l, m, x, y, z) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m);
    o.position.set(x, y, z);
    o.castShadow = true;
    parent.add(o);
    return o;
  };

  part(g, d.w, d.h, d.l, body, 0, d.lg + d.h / 2, 0);
  const hs = d.h * 0.7; // head size
  const hy = d.lg + d.h * 0.9;
  const hz = d.l / 2 + hs * 0.4;
  part(g, hs * 0.8, hs, hs * 1.1, body, 0, hy, hz);

  // Legs pivot at the hip so rotation.x swings them while walking.
  const legs = [];
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(x * d.w * 0.35, d.lg, z * d.l * 0.35);
      part(pivot, d.w * 0.2, d.lg, d.w * 0.2, dark, 0, -d.lg / 2, 0);
      g.add(pivot);
      legs.push(pivot);
    }
    if (d.ear) part(g, hs * 0.15, d.ear, hs * 0.15, body, x * hs * 0.3, hy + hs / 2 + d.ear / 2, hz - hs * 0.2);
    if (d.ant) part(g, 0.05, d.ant, 0.05, horn, x * hs * 0.4, hy + hs / 2 + d.ant / 2, hz - hs * 0.2);
  }
  if (d.tail === 1) part(g, 0.1, 0.1, 0.12, white, 0, d.lg + d.h * 0.7, -d.l / 2 - 0.05);
  if (d.tail === 2) part(g, 0.1, 0.1, d.l * 0.5, dark, 0, d.lg + d.h * 0.7, -d.l / 2 - d.l * 0.25);

  return { g, legs };
}
