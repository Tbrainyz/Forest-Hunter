import * as THREE from 'three';

// Everything a start.ng style can change on the character.
export const HATS = ['none', 'cap', 'beanie', 'tophat', 'crown'];
export const ACCESSORIES = ['none', 'glasses', 'scarf', 'backpack'];
export const DEFAULT_STYLE = {
  primaryColor: '#9aa3b5',
  secondaryColor: '#4a4f60',
  skinColor: '#d9a066',
  hat: 'none',
  accessory: 'none',
};

const BLACK = new THREE.MeshStandardMaterial({ color: '#1b1b22', roughness: 0.5 });
const GOLD = new THREE.MeshStandardMaterial({ color: '#ffcf4d', metalness: 0.6, roughness: 0.3 });

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function mesh(geometry, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function fill(slot, parts) {
  if (parts.length) slot.add(...parts);
}

function clear(slot) {
  for (const child of [...slot.children]) {
    slot.remove(child);
    child.traverse((o) => o.geometry?.dispose());
  }
}

/**
 * A blocky runner that faces -z. Feet are at y=0, it is ~2.6 units tall.
 * Returns { root, applyStyle(style), animate(time, opts) }.
 */
export function createCharacter(style) {
  const mats = {
    primary: new THREE.MeshStandardMaterial({ roughness: 0.6 }),
    secondary: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
    skin: new THREE.MeshStandardMaterial({ roughness: 0.8 }),
  };

  const root = new THREE.Group();
  const body = new THREE.Group(); // bobs while running
  root.add(body);

  // Limbs pivot at the hip/shoulder so rotation.x swings them.
  const limb = (x, y, mat, length, width) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    pivot.add(box(width, length, width, mat, 0, -length / 2, 0));
    body.add(pivot);
    return pivot;
  };
  const legL = limb(-0.18, 0.8, mats.secondary, 0.8, 0.28);
  const legR = limb(0.18, 0.8, mats.secondary, 0.8, 0.28);
  body.add(box(0.75, 0.85, 0.45, mats.primary, 0, 1.225, 0));
  const armL = limb(-0.5, 1.6, mats.primary, 0.7, 0.22);
  const armR = limb(0.5, 1.6, mats.primary, 0.7, 0.22);
  armL.add(box(0.2, 0.18, 0.2, mats.skin, 0, -0.78, 0));
  armR.add(box(0.2, 0.18, 0.2, mats.skin, 0, -0.78, 0));

  const head = new THREE.Group();
  head.position.y = 1.95;
  body.add(head);
  head.add(box(0.6, 0.6, 0.6, mats.skin));
  head.add(box(0.1, 0.12, 0.02, BLACK, -0.13, 0.05, -0.31));
  head.add(box(0.1, 0.12, 0.02, BLACK, 0.13, 0.05, -0.31));

  const hatSlot = new THREE.Group();
  hatSlot.position.y = 0.3; // top of the head
  head.add(hatSlot);
  const accessorySlot = new THREE.Group();
  body.add(accessorySlot);

  const hats = {
    none: () => [],
    cap: () => [
      box(0.64, 0.2, 0.64, mats.secondary, 0, 0.08, 0),
      box(0.56, 0.05, 0.32, mats.secondary, 0, 0, -0.44),
    ],
    beanie: () => [
      box(0.66, 0.32, 0.66, mats.secondary, 0, 0.1, 0),
      mesh(new THREE.SphereGeometry(0.12, 12, 8), mats.primary, 0, 0.34, 0),
    ],
    tophat: () => [
      mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 20), BLACK, 0, 0.03, 0),
      mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.55, 20), BLACK, 0, 0.3, 0),
      mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.1, 20), mats.secondary, 0, 0.11, 0),
    ],
    crown: () => [
      mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.22, 8, 1, true), GOLD, 0, 0.11, 0),
      ...Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return mesh(new THREE.ConeGeometry(0.07, 0.18, 4), GOLD, Math.sin(a) * 0.3, 0.3, Math.cos(a) * 0.3);
      }),
    ],
  };

  const accessories = {
    none: () => [],
    glasses: () => [
      box(0.2, 0.14, 0.04, BLACK, -0.14, 2.0, -0.32),
      box(0.2, 0.14, 0.04, BLACK, 0.14, 2.0, -0.32),
      box(0.1, 0.03, 0.03, BLACK, 0, 2.02, -0.32),
    ],
    scarf: () => [
      box(0.7, 0.16, 0.5, mats.secondary, 0, 1.66, 0),
      box(0.16, 0.45, 0.06, mats.secondary, 0.18, 1.45, 0.26),
    ],
    backpack: () => [
      box(0.56, 0.62, 0.26, mats.secondary, 0, 1.25, 0.34),
      box(0.58, 0.14, 0.28, mats.primary, 0, 1.5, 0.34),
    ],
  };

  let hat = null;
  let accessory = null;

  function applyStyle(next) {
    const s = { ...DEFAULT_STYLE, ...next };
    mats.primary.color.set(s.primaryColor);
    mats.secondary.color.set(s.secondaryColor);
    mats.skin.color.set(s.skinColor);
    // Hats and accessories share the materials above, so only rebuild on a shape change.
    if (s.hat !== hat) {
      clear(hatSlot);
      fill(hatSlot, (hats[s.hat] ?? hats.none)());
      hat = s.hat;
    }
    if (s.accessory !== accessory) {
      clear(accessorySlot);
      fill(accessorySlot, (accessories[s.accessory] ?? accessories.none)());
      accessory = s.accessory;
    }
  }

  // Positive rotation.x swings a hanging limb forward (towards -z).
  function animate(t, { running = false, airborne = false, speed = 14 } = {}) {
    if (airborne) {
      legL.rotation.x = 0.7;
      legR.rotation.x = -0.4;
      armL.rotation.x = armR.rotation.x = 2.6;
      body.position.y = 0;
    } else if (running) {
      const phase = t * speed * 0.9;
      const swing = Math.sin(phase);
      legL.rotation.x = swing * 0.9;
      legR.rotation.x = -swing * 0.9;
      armL.rotation.x = -swing * 0.8;
      armR.rotation.x = swing * 0.8;
      body.position.y = Math.abs(Math.cos(phase)) * 0.08;
    } else {
      const breathe = Math.sin(t * 2);
      legL.rotation.x = legR.rotation.x = 0;
      armL.rotation.x = armR.rotation.x = breathe * 0.05;
      body.position.y = (breathe + 1) * 0.015;
    }
  }

  applyStyle(style);
  return { root, applyStyle, animate };
}
