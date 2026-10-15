import * as THREE from 'three';
import * as platform from './platform.js';
import * as scores from './scores.js';
import { createCharacter } from './character.js';
import { SPECIES, createAnimal } from './animals.js';

const ROUND_TIME = 90; // seconds
const AMMO = 15;
const RELOAD = 0.6; // seconds between shots
const WORLD = 85; // animals stay inside this radius
const FOV = 75;
const SCOPE_FOV = 18;
const TREES = 450;
const WALK = 4.5; // metres per second
const SPRINT = 8;
const ZOOM_WALK = 1.5; // creeping while scoped
const SPOOK = { sprint: 24, walk: 12, creep: 6 }; // how close you can get while moving before animals bolt

const $ = (id) => document.getElementById(id);
const ui = {
  avatar: $('avatar'), username: $('username'),
  score: $('score'), ammo: $('ammo'), time: $('time'), best: $('best'),
  overlay: $('overlay'), title: $('title'), message: $('message'), action: $('action'), board: $('board'),
  scope: $('scope'), dot: $('dot'), label: $('label'), msg: $('msg'), zoomBtn: $('zoomBtn'), walkBtn: $('walkBtn'),
};

// Field guide (bottom-left)
$('guide').innerHTML = '<b>Field guide</b>' + SPECIES.map((d) =>
  `<div class="${d.protected ? 'bad' : ''}">${d.name}${d.protected ? ' (protected)' : ''}<span class="pts">${d.points > 0 ? '+' : ''}${d.points}</span></div>`).join('');

// --- Scene -----------------------------------------------------------------

const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const SKY = new THREE.Color('#a9c4b0');
scene.background = SKY;
scene.fog = new THREE.Fog(SKY, 18, 105);

const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 220);
camera.rotation.order = 'YXZ';

scene.add(new THREE.HemisphereLight('#ffffff', '#3b5a35', 1.2));
const sun = new THREE.DirectionalLight('#fff2d0', 1.6);
sun.position.set(30, 60, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 200 });
scene.add(sun);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#4a7a3c' }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Trees are instanced: one draw call for all trunks, one for all leaves.
const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.45, 4, 6), new THREE.MeshStandardMaterial({ color: '#5b3a22' }), TREES);
const leaves = new THREE.InstancedMesh(new THREE.ConeGeometry(2.2, 6, 7), new THREE.MeshStandardMaterial({ color: '#2f6b34' }), TREES);
const tmp = new THREE.Object3D();
const treeSpots = []; // trunk positions, used to stop the hunter walking through trees
for (let i = 0; i < TREES; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = 9 + Math.sqrt(Math.random()) * 95;
  const s = 0.8 + Math.random() * 0.9;
  tmp.position.set(Math.cos(a) * r, 2 * s, Math.sin(a) * r);
  tmp.scale.setScalar(s);
  treeSpots.push({ x: tmp.position.x, z: tmp.position.z, r: 0.45 * s + 0.4 });
  tmp.updateMatrix();
  trunks.setMatrixAt(i, tmp.matrix);
  tmp.position.y = 6.5 * s;
  tmp.updateMatrix();
  leaves.setMatrixAt(i, tmp.matrix);
}
scene.add(trunks, leaves);

// --- Hunter (visible on the menu, wearing the signed-in start.ng style) ------

const hero = createCharacter();
scene.add(hero.root); // stands at the origin facing -z, which is also where the camera sits when hunting

// The hunter's position (camera height 1.7). Walk with WASD.
const player = new THREE.Vector3(0, 1.7, 0);
let walkTime = 0;

// --- Animals -----------------------------------------------------------------

let animals = [];

function limit(x, z) {
  const r = Math.hypot(x, z);
  return r > WORLD ? [(x * WORLD) / r, (z * WORLD) / r] : [x, z];
}

function wander(a) {
  const p = a.g.position;
  const t = Math.random() * Math.PI * 2;
  const r = 5 + Math.random() * 12;
  [a.tx, a.tz] = limit(p.x + Math.cos(t) * r, p.z + Math.sin(t) * r);
}

function flee(a) {
  const p = a.g.position;
  const dx = p.x - player.x;
  const dz = p.z - player.z;
  const len = Math.hypot(dx, dz) || 1;
  [a.tx, a.tz] = limit(p.x + (dx / len) * 35, p.z + (dz / len) * 35);
  a.wait = 0;
  a.fleeing = 3;
}

function spawnAnimals() {
  for (const a of animals) scene.remove(a.g);
  animals = [];
  for (const d of SPECIES) {
    for (let i = 0; i < d.count; i++) {
      const { g, legs } = createAnimal(d);
      const t = Math.random() * Math.PI * 2;
      const r = 18 + Math.random() * 50;
      g.position.set(Math.cos(t) * r, 0, Math.sin(t) * r);
      const a = { g, legs, d, fleeing: 0, wait: Math.random() * 3, dead: false, deadFor: 0, tx: 0, tz: 0 };
      g.userData.animal = a;
      wander(a);
      scene.add(g);
      animals.push(a);
    }
  }
}

function updateAnimals(dt, time) {
  for (const a of animals) {
    const p = a.g.position;
    if (a.dead) {
      a.deadFor += dt;
      a.g.rotation.z = Math.min(a.deadFor * 4, 1.5); // topple over
      if (a.deadFor > 2) a.g.visible = false;
      continue;
    }
    if (a.wait > 0) {
      a.wait -= dt;
      for (const leg of a.legs) leg.rotation.x = 0;
      continue;
    }
    const dx = a.tx - p.x;
    const dz = a.tz - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.5) {
      a.fleeing = 0;
      a.wait = 1 + Math.random() * 4;
      wander(a);
      continue;
    }
    const running = a.fleeing > 0;
    if (running) a.fleeing -= dt;
    const step = a.d.speed * (running ? 1.5 : 0.35) * dt;
    p.x += (dx / dist) * step;
    p.z += (dz / dist) * step;
    a.g.rotation.y = Math.atan2(dx, dz);
    p.y = Math.abs(Math.sin(time * 9)) * (running ? 0.08 : 0.04);
    const swing = Math.sin(time * (running ? 14 : 7)) * (running ? 0.7 : 0.4);
    a.legs.forEach((leg, i) => { leg.rotation.x = i % 3 === 0 ? swing : -swing; });
  }
}

// --- Aiming ------------------------------------------------------------------

const ray = new THREE.Raycaster();
ray.far = 110;
const CENTER = new THREE.Vector2(0, 0);

function animalOf(obj) {
  while (obj && !obj.userData.animal) obj = obj.parent;
  return obj?.userData.animal ?? null;
}

// Trees are in the ray's way too, so you need a clear line of sight.
function pick() {
  ray.setFromCamera(CENTER, camera);
  const targets = animals.filter((a) => !a.dead).map((a) => a.g);
  const hit = ray.intersectObjects([...targets, trunks, leaves], true)[0];
  return hit ? animalOf(hit.object) : null;
}

let ac;
function bang() {
  try {
    ac = ac || new AudioContext();
    const n = ac.sampleRate * 0.3;
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(ac.destination);
    src.start();
  } catch {}
}

let msgTimer;
function say(text, cls) {
  ui.msg.textContent = text;
  ui.msg.className = cls;
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => (ui.msg.textContent = ''), 1800);
}

// --- Game state ----------------------------------------------------------------

let user = null;
let state = 'ready'; // ready | running | paused | over
let time = 0; // clock, always ticking
let overAt = -1;
let yaw = 0, pitch = 0, fov = FOV;
let score, ammo, left, cooldown, bagged, protectedHits;
let hadLock = false;
let labelTimer = 0;

function resetRound() {
  score = 0; ammo = AMMO; left = ROUND_TIME; cooldown = 0; bagged = 0; protectedHits = 0;
  yaw = 0; pitch = 0;
  player.set(0, 1.7, 0);
  updateHud();
}

function updateHud() {
  ui.score.textContent = score;
  ui.ammo.textContent = ammo;
  ui.time.textContent = Math.ceil(left);
}

function lock() {
  try { canvas.requestPointerLock()?.catch?.(() => {}); } catch {}
}

function start() {
  spawnAnimals();
  resetRound();
  state = 'running';
  ui.overlay.hidden = true;
  lock();
}

function pause() {
  state = 'paused';
  hadLock = false;
  showOverlay({ title: 'Paused', message: 'Click resume to get back to the hunt.', button: 'Resume' });
}

function resume() {
  state = 'running';
  ui.overlay.hidden = true;
  lock();
}

function end() {
  if (state !== 'running') return;
  state = 'over';
  overAt = time;
  hadLock = false;
  document.exitPointerLock?.();
  const { best, isBest } = scores.submit(user, score);
  ui.best.textContent = best;
  ui.scope.hidden = true;
  ui.label.textContent = '';
  showOverlay({
    title: isBest ? 'New best!' : 'Hunt over',
    message: `${user.displayName}, you scored ${score}. ${bagged} animal${bagged === 1 ? '' : 's'} bagged${protectedHits ? `, ${protectedHits} protected` : ''}.`,
    button: 'Hunt again',
    board: true,
  });
}

function shoot() {
  if (state !== 'running' || ammo <= 0 || cooldown > 0) return;
  ammo--;
  cooldown = RELOAD;
  bang();
  pitch += 0.015; // recoil
  const a = pick();
  if (a) {
    a.dead = true;
    a.deadFor = 0;
    score += a.d.points;
    bagged++;
    if (a.d.protected) {
      protectedHits++;
      say(`Protected ${a.d.name}! ${a.d.points}`, 'bad');
    } else {
      say(`${a.d.name} +${a.d.points}`, 'good');
    }
  }
  for (const x of animals) {
    if (!x.dead && x.g.position.distanceTo(player) < 45) flee(x);
  }
  updateHud();
  if (ammo === 0) setTimeout(end, 1500);
}

// --- Overlay / HUD ---------------------------------------------------------------

function leaderboardRow(entry, i) {
  const li = document.createElement('li');
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = entry.color;
  const name = document.createElement('span');
  name.textContent = `${i + 1}. ${entry.name}`;
  const pts = document.createElement('span');
  pts.className = 'score';
  pts.textContent = entry.score;
  li.append(dot, name, pts);
  return li;
}

function showOverlay({ title, message, button, board = false }) {
  ui.title.textContent = title;
  ui.message.textContent = message;
  ui.action.textContent = button;
  ui.board.replaceChildren(...(board ? scores.top(5).map(leaderboardRow) : []));
  ui.overlay.hidden = false;
}

function showIdle() {
  if (!user) {
    showOverlay({
      title: 'Forest Hunter',
      message: 'Sign in with your start.ng account to hunt. Your hunter wears your start.ng style.',
      button: 'Sign in on start.ng',
    });
  } else {
    showOverlay({
      title: 'Forest Hunter',
      message: `Hi ${user.displayName}! You have ${ROUND_TIME} seconds and ${AMMO} shots. Zoom in to identify an animal first. Protected species cost you points.`,
      button: 'Start hunting',
      board: true,
    });
  }
}

function primaryAction() {
  if (!user) window.open('startng.html', 'startng');
  else if (state === 'paused') resume();
  else if (state !== 'running' && time - overAt > 0.5) start();
}

function refreshUser(u) {
  const switched = (u?.id ?? null) !== (user?.id ?? null);
  user = u;
  hero.applyStyle(u?.style); // default look when signed out
  ui.avatar.style.background = u?.style.primaryColor ?? '#555';
  ui.avatar.textContent = u ? u.displayName[0].toUpperCase() : '?';
  ui.username.textContent = u ? u.displayName : 'Not signed in';
  ui.best.textContent = u ? scores.getBest(u.id) : 0;
  if (switched) {
    resetRound();
    state = 'ready';
    showIdle();
  }
}

// --- Input -------------------------------------------------------------------------

const keys = {};
let rightDown = false, touchZoom = false, touchWalk = false, dragging = false, dragMoved = 0;
const locked = () => document.pointerLockElement === canvas;

addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (state !== 'running') {
    if (e.code === 'Space' || e.code === 'Enter') primaryAction();
    return;
  }
  if (e.code === 'Space') shoot();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

addEventListener('mousemove', (e) => {
  if (state !== 'running' || !(locked() || dragging)) return;
  const k = (0.0022 * fov) / FOV;
  yaw -= e.movementX * k;
  pitch -= e.movementY * k;
  dragMoved += Math.abs(e.movementX) + Math.abs(e.movementY);
});
addEventListener('mousedown', (e) => {
  if (state !== 'running' || e.target !== canvas) return;
  if (e.button === 2) rightDown = true;
  else if (locked()) shoot();
  else { dragging = true; dragMoved = 0; } // fallback when pointer lock is unavailable
});
addEventListener('mouseup', (e) => {
  if (e.button === 2) rightDown = false;
  else if (dragging) { dragging = false; if (dragMoved < 4) shoot(); }
});
addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('pointerlockchange', () => {
  if (locked()) hadLock = true;
  else if (hadLock && state === 'running') pause(); // Esc pressed
});

ui.action.addEventListener('click', primaryAction);

// Touch: drag to look, tap to shoot, hold the Zoom button to scope in.
let touch = null;
canvas.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  touch = { id: t.identifier, x: t.clientX, y: t.clientY, moved: 0, at: performance.now() };
}, { passive: true });
canvas.addEventListener('touchmove', (e) => {
  if (!touch || state !== 'running') return;
  const t = [...e.changedTouches].find((c) => c.identifier === touch.id);
  if (!t) return;
  const k = (0.004 * fov) / FOV;
  yaw -= (t.clientX - touch.x) * k;
  pitch -= (t.clientY - touch.y) * k;
  touch.moved += Math.abs(t.clientX - touch.x) + Math.abs(t.clientY - touch.y);
  touch.x = t.clientX;
  touch.y = t.clientY;
}, { passive: true });
canvas.addEventListener('touchend', () => {
  if (touch && state === 'running' && touch.moved < 10 && performance.now() - touch.at < 300) shoot();
  touch = null;
});
ui.zoomBtn.addEventListener('pointerdown', () => { touchZoom = true; });
for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) ui.zoomBtn.addEventListener(ev, () => { touchZoom = false; });
ui.walkBtn.addEventListener('pointerdown', () => { touchWalk = true; });
for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) ui.walkBtn.addEventListener(ev, () => { touchWalk = false; });

// --- Loop ----------------------------------------------------------------------------

// WASD walks relative to where you're looking. Shift sprints (louder), scoping slows you to a creep.
function movePlayer(dt, zoomed) {
  const fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) + (touchWalk ? 1 : 0);
  const side = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  if (!fwd && !side) return;
  const sprint = (keys.ShiftLeft || keys.ShiftRight) && !zoomed && fwd > 0;
  const speed = zoomed ? ZOOM_WALK : sprint ? SPRINT : WALK;
  const len = Math.hypot(fwd, side);
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  player.x += ((-sin * fwd + cos * side) / len) * speed * dt;
  player.z += ((-cos * fwd - sin * side) / len) * speed * dt;
  const r = Math.hypot(player.x, player.z);
  if (r > WORLD - 5) { player.x *= (WORLD - 5) / r; player.z *= (WORLD - 5) / r; }
  for (const t of treeSpots) { // push out of trunks
    const dx = player.x - t.x, dz = player.z - t.z, d = Math.hypot(dx, dz);
    if (d < t.r) { player.x = t.x + (dx / d) * t.r; player.z = t.z + (dz / d) * t.r; }
  }
  walkTime += dt * (sprint ? 10 : 7);
  // Animals notice you when you move close to them. Standing still keeps you hidden.
  const radius = sprint ? SPOOK.sprint : zoomed ? SPOOK.creep : SPOOK.walk;
  for (const a of animals) {
    if (!a.dead && a.fleeing <= 0.5 && a.g.position.distanceTo(player) < radius) flee(a);
  }
}

function step(dt) {
  time += dt;
  const hunting = state === 'running' || state === 'paused';
  const zoomed = hunting && (rightDown || keys.KeyZ || touchZoom);
  const steady = keys.ShiftLeft || keys.ShiftRight;

  updateAnimals(dt, time);

  if (state === 'running') {
    left -= dt;
    cooldown = Math.max(0, cooldown - dt);
    const k = 1.6 * dt * (fov / FOV);
    if (keys.ArrowLeft) yaw += k;
    if (keys.ArrowRight) yaw -= k;
    if (keys.ArrowUp) pitch += k;
    if (keys.ArrowDown) pitch -= k;
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
    movePlayer(dt, zoomed);
    if (left <= 0) { left = 0; end(); }
    updateHud();
  }

  hero.root.visible = !hunting;
  if (hunting) {
    fov += ((zoomed ? SCOPE_FOV : FOV) - fov) * Math.min(1, dt * 10);
    const sway = zoomed ? (steady ? 0.0004 : 0.0028) : 0; // hold Shift to steady the scope
    const moving = state === 'running' && (keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD || touchWalk);
    camera.position.set(player.x, player.y + (moving && !zoomed ? Math.sin(walkTime) * 0.04 : 0), player.z);
    camera.rotation.set(pitch + Math.sin(time * 1.7) * sway, yaw + Math.sin(time * 1.1) * sway, 0);
  } else {
    // Menu: look at the hunter from the front.
    fov = 50;
    hero.root.position.set(player.x, 0, player.z);
    hero.root.rotation.y = yaw + Math.sin(time * 0.5) * 0.4;
    hero.animate(time, { running: false });
    const c = Math.cos(yaw), s = Math.sin(yaw); // keep the camera in front of the hunter
    camera.position.set(player.x + 1.9 * c - 3.6 * s, 1.7, player.z - 1.9 * s - 3.6 * c);
    camera.lookAt(player.x, 1.3, player.z);
  }
  camera.fov = fov;
  camera.updateProjectionMatrix();

  ui.scope.hidden = !(zoomed && state === 'running');
  ui.dot.classList.toggle('off', zoomed);

  // While scoped, name whatever is under the crosshair.
  labelTimer -= dt;
  if (labelTimer <= 0) {
    labelTimer = 0.12;
    const a = zoomed && state === 'running' ? pick() : null;
    ui.label.className = a?.d.protected ? 'bad' : '';
    ui.label.textContent = a ? (a.d.protected ? `${a.d.name} · PROTECTED` : `${a.d.name} · +${a.d.points}`) : '';
  }
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// --- Boot ---------------------------------------------------------------------------------

resetRound();
spawnAnimals();
platform.onUserChange(refreshUser);
refreshUser(await platform.getCurrentUser());
showIdle();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  step(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
});
