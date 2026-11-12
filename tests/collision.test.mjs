// Collision maths and the player step built on it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { circleCollider, boxCollider, resolve, pointBlocked, cameraDistance, clampToWorld } from '../assets/game/systems/collision.js';
import { stepPlayer, MOVE } from '../assets/game/player/controller.js';
import { WORLD } from '../assets/game/data/locations.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const player = (o = {}) => ({ x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, heading: Math.PI, grounded: true, ...o });
const run = (s, intent, seconds, colliders = [], yaw = 0) => { for (let t = 0; t < seconds; t += 1 / 60) stepPlayer(s, { mx: 0, my: 0, sprint: false, jump: false, ...intent }, yaw, 1 / 60, colliders); return s; };

test('a circle is pushed out of a circle', () => {
  const p = { x: 1, z: 0 };
  assert.equal(resolve(p, .5, [circleCollider(0, 0, 1)]), true);
  assert.ok(near(p.x, 1.5) && near(p.z, 0));
});

test('no overlap means no movement', () => {
  const p = { x: 3, z: 0 };
  assert.equal(resolve(p, .5, [circleCollider(0, 0, 1)]), false);
  assert.deepEqual(p, { x: 3, z: 0 });
});

test('a circle is pushed out of a box face and corner', () => {
  const box = boxCollider(0, 0, 4, 2);
  const face = { x: 0, z: 1.2 };
  resolve(face, .5, [box]);
  assert.ok(near(face.z, 1.5) && near(face.x, 0));
  const corner = { x: 2.2, z: 1.2 };
  resolve(corner, .5, [box]);
  assert.ok(near(Math.hypot(corner.x - 2, corner.z - 1), .5), 'ends exactly one radius from the corner');
});

test('a point inside a box leaves through the nearest face', () => {
  const p = { x: 1.7, z: .1 };
  resolve(p, .5, [boxCollider(0, 0, 4, 2)]);
  assert.ok(near(p.x, 2.5) && near(p.z, .1));
});

test('rotated boxes collide in their own frame', () => {
  const box = boxCollider(0, 0, 10, 1, Math.PI / 2); // now long along z
  const blocked = { x: .2, z: 4 };
  resolve(blocked, .5, [box]);
  assert.ok(near(blocked.x, 1), `pushed to the side, got x=${blocked.x}`);
  const free = { x: 4, z: 0 };
  assert.equal(resolve(free, .5, [box]), false, 'where the unrotated box would have been is now free');
});

test('height: anything shorter than the base of the player is cleared', () => {
  const kerb = boxCollider(0, 0, 2, 2, 0, .6);
  assert.equal(resolve({ x: 0, z: 0 }, .5, [kerb], 0), true);
  assert.equal(resolve({ x: 0, z: 0 }, .5, [kerb], 1), false);
});

test('camera-only occluders never move the player', () => {
  const crown = circleCollider(0, 0, 2, 6, { solid: false, base: 2 });
  assert.equal(resolve({ x: 0, z: 0 }, .5, [crown]), false);
  assert.equal(pointBlocked(0, 3, 0, [crown]), true);
  assert.equal(pointBlocked(0, 1, 0, [crown]), false, 'under the crown is clear');
});

test('thin props are solid but ignored by the camera', () => {
  const pole = circleCollider(0, 0, .2, 5, { cam: false });
  assert.equal(resolve({ x: 0, z: .1 }, .5, [pole]), true);
  assert.equal(pointBlocked(0, 1, 0, [pole]), false);
});

test('the camera stops short of a wall and is free otherwise', () => {
  const wall = boxCollider(0, 5, 20, 1, 0, 10);
  const d = cameraDistance({ x: 0, y: 1.5, z: 0 }, { x: 0, y: 0, z: 1 }, 7, [wall]);
  assert.ok(d < 4.5 && d >= 3.5, `stops before the wall, got ${d}`);
  assert.equal(cameraDistance({ x: 0, y: 1.5, z: 0 }, { x: 0, y: 0, z: -1 }, 7, [wall]), 7);
  assert.equal(cameraDistance({ x: 0, y: 11, z: 0 }, { x: 0, y: 0, z: 1 }, 7, [wall]), 7, 'above the wall is free');
});

test('the world has an edge', () => {
  const p = { x: 300, z: 400 };
  assert.equal(clampToWorld(p, 100), true);
  assert.ok(near(Math.hypot(p.x, p.z), 100));
  assert.equal(clampToWorld({ x: 10, z: 10 }, 100), false);
});

test('player: W walks away from the camera at walking speed', () => {
  const s = run(player(), { my: 1 }, 2);
  assert.ok(s.z < -7 && Math.abs(s.x) < 1e-6, `moved north, z=${s.z}`);
  assert.ok(near(s.speed, MOVE.walk, .05));
  assert.equal(s.anim, 'walk');
});

test('player: movement is relative to the camera', () => {
  const s = run(player(), { my: 1 }, 1, [], -Math.PI / 2); // camera looks east
  assert.ok(s.x > 3 && Math.abs(s.z) < 1e-6);
  const r = run(player(), { mx: 1 }, 1);                   // strafe right while looking north
  assert.ok(r.x > 3);
});

test('player: sprinting is faster and switches animation', () => {
  const s = run(player(), { my: 1, sprint: true }, 2);
  assert.ok(near(s.speed, MOVE.run, .05));
  assert.equal(s.anim, 'run');
});

test('player: diagonal input is not faster', () => {
  const s = run(player(), { mx: 1, my: 1 }, 2);
  assert.ok(s.speed <= MOVE.walk + .01);
});

test('player: stops and idles when the keys are released', () => {
  const s = run(player(), { my: 1 }, 1);
  run(s, {}, 1.5);
  assert.ok(s.speed < .05);
  assert.equal(s.anim, 'idle');
});

test('player: turns to face the way it moves', () => {
  const s = run(player({ heading: Math.PI }), { mx: 1 }, 1.5);
  assert.ok(near(Math.atan2(Math.sin(s.heading), Math.cos(s.heading)), Math.PI / 2, .05), `faces east, heading=${s.heading}`);
});

test('player: jump leaves the ground, comes back, and cannot double-jump', () => {
  const s = player();
  stepPlayer(s, { mx: 0, my: 0, jump: true }, 0, 1 / 60, []);
  assert.equal(s.grounded, false);
  assert.equal(s.anim, 'jump');
  const vy = s.vy;
  stepPlayer(s, { mx: 0, my: 0, jump: true }, 0, 1 / 60, []);
  assert.ok(s.vy < vy, 'a second press in the air does nothing');
  let peak = 0;
  for (let i = 0; i < 120; i++) { stepPlayer(s, { mx: 0, my: 0 }, 0, 1 / 60, []); peak = Math.max(peak, s.y); }
  assert.ok(peak > 1.2 && peak < 2.2, `sensible jump height, got ${peak}`);
  assert.equal(s.y, 0);
  assert.equal(s.grounded, true);
});

test('player: a building stops the player', () => {
  const s = run(player(), { my: 1, sprint: true }, 4, [boxCollider(0, -10, 30, 4, 0, 20)]);
  assert.ok(near(s.z, -8 + MOVE.radius, .02), `stopped at the wall, z=${s.z}`);
});

test('player: slides along a wall instead of sticking', () => {
  const s = run(player({ x: 0, z: -7.4 }), { my: 1, mx: 1 }, 2, [boxCollider(0, -10, 60, 4, 0, 20)]);
  assert.ok(s.x > 4, `slid east, x=${s.x}`);
  assert.ok(s.z >= -8 + MOVE.radius - .02);
});

test('player: cannot leave the world', () => {
  const s = run(player(), { my: 1, sprint: true }, 30);
  assert.ok(Math.hypot(s.x, s.z) <= WORLD.radius + 1e-6);
});
