/* Repeated street furniture and greenery. Everything here is instanced:
   a few hundred objects cost about a dozen draw calls. */

import * as THREE from '../three.js';
import { WORLD, locations } from '../data/locations.js';
import { circleCollider, boxCollider, pointBlocked } from '../systems/collision.js';
import { seeded } from '../core/poster.js';
import { PALETTE, canvasTexture } from './builders.js';
import { isOpenGround } from './roads.js';

const UP = new THREE.Vector3(0, 1, 0);

/* fill an InstancedMesh from [{ x, y, z, ry, sx, sy, sz, color }] */
function instanced(scene, geometry, material, items, { cast = true, receive = true } = {}) {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  items.forEach((it, i) => {
    p.set(it.x, it.y || 0, it.z);
    q.setFromAxisAngle(UP, it.ry || 0);
    s.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
    mesh.setMatrixAt(i, m.compose(p, q, s));
    if (it.color) mesh.setColorAt(i, c.set(it.color));
  });
  mesh.castShadow = cast; mesh.receiveShadow = receive;
  mesh.computeBoundingSphere();
  scene.add(mesh);
  return mesh;
}

export function buildProps(ctx) {
  const { scene } = ctx;
  const rnd = seeded('props');
  const avenues = locations.filter(l => l.angle !== null).map(l => l.angle * Math.PI / 180);
  const nearAvenue = (b, gap) => avenues.some(a => Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) < gap);

  /* ---------- trees ---------- */
  const trees = [];
  const plant = (x, z, s = .85 + rnd() * .55) => {
    trees.push({ x, z, s, ry: rnd() * 6.28, tint: rnd() });
    ctx.colliders.push(circleCollider(x, z, .45 * s, 6, { cam: false }));
    ctx.colliders.push(circleCollider(x, z, 1.7 * s, 6.2 * s, { solid: false, base: 2.1 * s })); // the crown, for the camera only
  };
  // avenue rows
  for (const a of avenues) {
    const ux = Math.sin(a), uz = -Math.cos(a), px = -uz, pz = ux;
    for (let r = 27; r < 62; r += 7) {
      if (Math.abs(r - WORLD.ringRadius) < 9) continue;
      for (const side of [-1, 1]) plant(ux * r + px * side * 6.6, uz * r + pz * side * 6.6, 1);
    }
  }
  // outer edge of the ring boulevard
  for (let i = 0; i < 40; i++) {
    const b = i / 40 * Math.PI * 2 + .08;
    if (nearAvenue(b, .2)) continue;
    plant(Math.sin(b) * (WORLD.ringRadius + 8.2), -Math.cos(b) * (WORLD.ringRadius + 8.2), 1.05);
  }
  // parkland, wherever the ground is open and nothing is built
  for (let tries = 0, placed = 0; tries < 900 && placed < 120; tries++) {
    const b = rnd() * Math.PI * 2, r = 24 + rnd() * (WORLD.radius - 30);
    const x = Math.sin(b) * r, z = -Math.cos(b) * r;
    if (!isOpenGround(x, z, 1) || pointBlocked(x, 1, z, ctx.colliders, 3)) continue;
    if (trees.some(t => (t.x - x) ** 2 + (t.z - z) ** 2 < 16)) continue;
    plant(x, z); placed++;
  }
  // beyond the wall, to soften the edge of the world
  for (let i = 0; i < 70; i++) {
    const b = rnd() * Math.PI * 2, r = WORLD.radius + 5 + rnd() * 26;
    trees.push({ x: Math.sin(b) * r, z: -Math.cos(b) * r, s: 1 + rnd() * .8, ry: rnd() * 6.28, tint: rnd() });
  }

  const leafA = new THREE.Color(PALETTE.leaf), leafB = new THREE.Color(PALETTE.leafLight), tmp = new THREE.Color();
  const tint = t => `#${tmp.copy(leafA).lerp(leafB, t.tint).getHexString()}`;
  instanced(scene, new THREE.CylinderGeometry(.16, .26, 1, 7), ctx.mat(PALETTE.trunk),
    trees.map(t => ({ x: t.x, y: 1.3 * t.s, z: t.z, sx: t.s, sy: 2.6 * t.s, sz: t.s })));
  const crown = new THREE.IcosahedronGeometry(1, 1);
  const leaf = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .9, flatShading: true });
  instanced(scene, crown, leaf, trees.map(t => ({ x: t.x, y: 3.5 * t.s, z: t.z, ry: t.ry, sx: 1.9 * t.s, sy: 1.6 * t.s, sz: 1.9 * t.s, color: tint(t) })));
  instanced(scene, crown, leaf, trees.map(t => ({
    x: t.x + Math.sin(t.ry) * .5 * t.s, y: 4.9 * t.s, z: t.z + Math.cos(t.ry) * .5 * t.s, ry: t.ry * 2,
    sx: 1.25 * t.s, sy: 1.15 * t.s, sz: 1.25 * t.s, color: tint({ tint: Math.min(1, t.tint + .35) }),
  })), { cast: false }); // the lower crown already throws the shadow

  /* ---------- street lamps ---------- */
  const lamps = [];
  const lamp = (x, z, ry) => { lamps.push({ x, z, ry }); ctx.colliders.push(circleCollider(x, z, .18, 5.4, { cam: false })); };
  for (const a of avenues) {
    const ux = Math.sin(a), uz = -Math.cos(a), px = -uz, pz = ux;
    let k = 0;
    for (let r = 30.5; r < 62; r += 7) {
      if (Math.abs(r - WORLD.ringRadius) < 9) continue;
      const side = k++ % 2 ? 1 : -1;
      // the arm reaches back over the road
      lamp(ux * r + px * side * 4.4, uz * r + pz * side * 4.4, Math.atan2(-px * side, -pz * side));
    }
  }
  for (let i = 0; i < 20; i++) {
    const b = i / 20 * Math.PI * 2 + .16;
    if (nearAvenue(b, .16)) continue;
    const r = WORLD.ringRadius - WORLD.ringWidth / 2 - 1;
    lamp(Math.sin(b) * r, -Math.cos(b) * r, Math.atan2(Math.sin(b), -Math.cos(b)));
  }
  const steel = ctx.mat(PALETTE.dark, { rough: .45, metal: .6 });
  instanced(scene, new THREE.CylinderGeometry(.07, .11, 5.2, 8), steel, lamps.map(l => ({ x: l.x, y: 2.6, z: l.z })), { cast: false });
  instanced(scene, new THREE.BoxGeometry(.26, .1, 1.5), steel,
    lamps.map(l => ({ x: l.x + Math.sin(l.ry) * .6, y: 5.2, z: l.z + Math.cos(l.ry) * .6, ry: l.ry })), { cast: false });
  instanced(scene, new THREE.BoxGeometry(.18, .04, .8), ctx.glow('#fff3d6'),
    lamps.map(l => ({ x: l.x + Math.sin(l.ry) * .85, y: 5.13, z: l.z + Math.cos(l.ry) * .85, ry: l.ry })), { cast: false, receive: false });
  // at night each lamp throws a pool of light on the ground: a soft additive disc, not a real light
  const poolGeo = new THREE.CircleGeometry(6.5, 28);
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTexture(), color: '#ffd9a0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12,
  });
  const pools = instanced(scene, poolGeo, poolMat,
    lamps.map(l => ({ x: l.x + Math.sin(l.ry) * .85, y: .1, z: l.z + Math.cos(l.ry) * .85 })), { cast: false, receive: false });
  pools.visible = false;
  ctx.night.push(k => { pools.visible = k > .02; poolMat.opacity = k * .5; });

  /* ---------- benches along the ring ---------- */
  const benches = [];
  for (let i = 0; i < 10; i++) {
    const b = i / 10 * Math.PI * 2 + .55;
    if (nearAvenue(b, .2)) continue;
    const r = WORLD.ringRadius + WORLD.ringWidth / 2 + 1.1;
    const x = Math.sin(b) * r, z = -Math.cos(b) * r, ry = -b;
    benches.push({ x, z, ry });
    ctx.colliders.push(boxCollider(x, z, 2.4, .7, ry, .7, { cam: false }));
  }
  instanced(scene, new THREE.BoxGeometry(2.3, .1, .62), ctx.mat('#b98a5a', { rough: .7 }), benches.map(b => ({ ...b, y: .5 })));
  instanced(scene, new THREE.BoxGeometry(1.9, .45, .36), ctx.mat(PALETTE.dark, { rough: .6 }), benches.map(b => ({ ...b, y: .225 })));

  /* ---------- distant skyline ---------- */
  const towers = [];
  const shades = ['#dfe6ea', '#cdd6dc', '#e9e6df', '#bfcbd3', '#d6dde0'];
  for (let i = 0; i < 120; i++) {
    const b = rnd() * Math.PI * 2, r = 175 + rnd() * 210;
    const w = 16 + rnd() * 20, h = 26 + rnd() * rnd() * 130;
    towers.push({ x: Math.sin(b) * r, y: h / 2, z: -Math.cos(b) * r, ry: rnd() * 3.14, sx: w, sy: h, sz: 14 + rnd() * 18, color: shades[i % shades.length] });
  }
  const windows = facadeTexture(), litWindows = facadeTexture(true);
  windows.repeat.set(4, 10); litWindows.repeat.set(4, 10);
  const skyline = new THREE.MeshStandardMaterial({ map: windows, roughness: .6, metalness: .1, emissive: '#ffffff', emissiveMap: litWindows, emissiveIntensity: 0 });
  instanced(scene, new THREE.BoxGeometry(1, 1, 1), skyline, towers, { cast: false, receive: false });
  ctx.night.push(k => { skyline.emissiveIntensity = k * .5; });
}

/* a soft round falloff, for the pools of lamplight */
function poolTexture() {
  return canvasTexture(128, 128, g => {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(.35, 'rgba(255,255,255,.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  });
}

/* A tileable facade: rows of windows on a pale wall. `lit` draws the same
   windows as they look at night (some on, the wall black), for use as an
   emissive map over the daytime texture. */
export function facadeTexture(lit = false) {
  const t = canvasTexture(128, 128, g => {
    g.fillStyle = lit ? '#000000' : '#f2f0ea'; g.fillRect(0, 0, 128, 128);
    const rnd = seeded('facade');
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const v = rnd();
      if (lit) {
        if (v > .86 || (v > .3 && v < .42)) { g.fillStyle = v > .86 ? '#ffd9a0' : '#e8a45c'; g.fillRect(x * 32 + 5, y * 32 + 6, 22, 20); } // about one window in four is lit
        continue;
      }
      g.fillStyle = v > .8 ? '#9fc4d6' : v > .4 ? '#6f97ad' : '#587f96';
      g.fillRect(x * 32 + 5, y * 32 + 6, 22, 20);
      g.fillStyle = 'rgba(255,255,255,.22)';
      g.fillRect(x * 32 + 5, y * 32 + 6, 22, 4);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
