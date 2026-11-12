/* Ground, the ring boulevard, the five avenues and their markings. */

import * as THREE from '../three.js';
import { WORLD, locations } from '../data/locations.js';
import { PALETTE, add, canvasTexture, disc, ring, strip } from './builders.js';
import { seeded } from '../core/poster.js';

function noise(base, spread, size = 256, seed = 'n') {
  const rnd = seeded(seed);
  const t = canvasTexture(size, size, g => {
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    for (let i = 0; i < size * size / 5; i++) {
      const v = rnd();
      g.fillStyle = v > .5 ? `rgba(255,255,255,${(v - .5) * spread})` : `rgba(0,0,0,${(.5 - v) * spread})`;
      g.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2.5, 1 + rnd() * 2.5);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function buildRoads(ctx) {
  const g = new THREE.Group();
  g.name = 'roads';
  ctx.scene.add(g);

  const grassMap = noise(PALETTE.grass, .2, 256, 'grass'); grassMap.repeat.set(260, 260);
  const grass = new THREE.MeshStandardMaterial({ map: grassMap, roughness: 1 });
  disc(g, grass, 900, 0, 0, 0, 48);

  const asphalt = new THREE.MeshStandardMaterial({ color: PALETTE.asphalt, roughness: .9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const kerb = ctx.mat(PALETTE.paving, { ground: 1 });

  const R = WORLD.ringRadius, half = WORLD.ringWidth / 2, walk = 2;
  ring(g, kerb, R - half - walk, R + half + walk, 0, .03, 0, 128);
  ring(g, asphalt, R - half, R + half, 0, .045, 0, 128);

  const from = WORLD.plazaRadius - 1, to = WORLD.districtRadius - 18;
  const len = to - from, mid = (from + to) / 2, aw = WORLD.avenueWidth;
  const avenues = locations.filter(l => l.angle !== null);
  for (const l of avenues) {
    const a = new THREE.Group();
    a.rotation.y = -l.angle * Math.PI / 180; // local -z runs out from the plaza to the district
    g.add(a);
    strip(a, kerb, aw + walk * 2, len, 0, .032, -mid);
    strip(a, asphalt, aw, len, 0, .047, -mid);
  }

  // lane dashes, one instanced mesh for the whole city
  const dashes = [];
  const count = 64;
  for (let i = 0; i < count; i++) {
    const b = i / count * Math.PI * 2;
    if (avenues.some(l => Math.abs(Math.atan2(Math.sin(b - l.angle * Math.PI / 180), Math.cos(b - l.angle * Math.PI / 180))) < .085)) continue;
    dashes.push([Math.sin(b) * R, -Math.cos(b) * R, -b + Math.PI / 2]);
  }
  for (const l of avenues) {
    const a = l.angle * Math.PI / 180;
    for (let r = from + 3; r < to - 1; r += 5) {
      if (Math.abs(r - R) < half + 1.5) continue;
      dashes.push([Math.sin(a) * r, -Math.cos(a) * r, -a]);
    }
  }
  const dashMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(.22, .02, 2.2), ctx.mat(PALETTE.white, { ground: 4 }), dashes.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  dashes.forEach((d, i) => { p.set(d[0], .07, d[1]); q.setFromAxisAngle(up, d[2]); dashMesh.setMatrixAt(i, m.compose(p, q, s)); });
  dashMesh.receiveShadow = true;
  g.add(dashMesh);

  // the edge of the world: a low wall and a hedge line just inside it
  const wall = add(g, new THREE.CylinderGeometry(WORLD.radius + 1.2, WORLD.radius + 1.2, 1.1, 96, 1, true),
    ctx.mat(PALETTE.concrete, { double: true }), 0, .55, 0, { cast: false });
  wall.name = 'boundary';
  ring(g, ctx.mat(PALETTE.paving, { ground: 1 }), WORLD.radius - 2.6, WORLD.radius + 1.2, 0, .03, 0, 128);

  return g;
}

/* true when a ground point is clear of roads, the plaza and every district */
export function isOpenGround(x, z, margin = 0) {
  const d = Math.hypot(x, z);
  if (d < WORLD.plazaRadius + 2 + margin || d > WORLD.radius - 5 - margin) return false;
  if (Math.abs(d - WORLD.ringRadius) < WORLD.ringWidth / 2 + 3.5 + margin) return false;
  for (const l of locations) {
    if (l.angle === null) continue;
    if (Math.hypot(x - l.x, z - l.z) < 21 + margin) return false;
    const a = l.angle * Math.PI / 180, ux = Math.sin(a), uz = -Math.cos(a);
    const along = x * ux + z * uz;
    if (along > 0 && along < WORLD.districtRadius && Math.abs(x * uz - z * ux) < WORLD.avenueWidth / 2 + 3.5 + margin) return false;
  }
  return true;
}
