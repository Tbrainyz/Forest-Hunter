// The mock start.ng site: sign in as a test user and edit the central style.
import * as THREE from 'three';
import * as platform from './platform.js';
import { createCharacter, HATS, ACCESSORIES } from './character.js';

const $ = (id) => document.getElementById(id);
const form = $('styleForm');
const label = (s) => s[0].toUpperCase() + s.slice(1);

for (const [name, options] of [['hat', HATS], ['accessory', ACCESSORIES]]) {
  form.elements[name].replaceChildren(...options.map((o) => new Option(label(o), o)));
}

// Live preview of the character.
const renderer = new THREE.WebGLRenderer({ canvas: $('preview'), antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(260, 320, false);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight('#ffffff', '#555566', 1.4));
const key = new THREE.DirectionalLight('#ffffff', 1.4);
key.position.set(3, 5, 4);
scene.add(key);
const camera = new THREE.PerspectiveCamera(35, 260 / 320, 0.1, 50);
camera.position.set(0, 1.5, 6.5);
camera.lookAt(0, 1.25, 0);
const hero = createCharacter();
scene.add(hero.root);
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  hero.root.rotation.y = Math.PI + Math.sin(t * 0.8) * 0.7; // face the camera, sway
  hero.animate(t);
  renderer.render(scene, camera);
});

function userButton(u) {
  const button = document.createElement('button');
  button.className = 'user-card';
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.style.background = u.style.primaryColor;
  avatar.textContent = u.displayName[0];
  const name = document.createElement('strong');
  name.textContent = u.displayName;
  const handle = document.createElement('span');
  handle.className = 'muted';
  handle.textContent = `@${u.username}`;
  button.append(avatar, name, handle);
  button.addEventListener('click', () => platform.signIn(u.id));
  return button;
}

function render(u) {
  $('signin').hidden = !!u;
  $('profile').hidden = !u;
  $('navUser').textContent = u ? `Signed in as @${u.username}` : '';
  if (!u) {
    $('users').replaceChildren(...platform.listTestUsers().map(userButton));
    return;
  }
  $('hello').textContent = `Hi, ${u.displayName}`;
  for (const [k, v] of Object.entries(u.style)) {
    const field = form.elements[k];
    if (field && field.value !== v) field.value = v;
  }
  hero.applyStyle(u.style);
}

form.addEventListener('input', (e) => platform.updateStyle({ [e.target.name]: e.target.value }));
$('signout').addEventListener('click', () => platform.signOut());
platform.onUserChange(render);
render(await platform.getCurrentUser());
