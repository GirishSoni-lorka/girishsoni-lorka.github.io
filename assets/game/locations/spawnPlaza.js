/* Spawn Plaza: the centre of the city and the introduction. A fountain, the
   site's mark (a line and an orange point) as a monument, a welcome board
   and a signpost at the head of every avenue. */

import * as THREE from '../three.js';
import { WORLD, locations } from '../data/locations.js';
import { profile } from '../data/profile.js';
import { PALETTE, add, block, column, disc, district, placard, ring } from '../world/builders.js';

export function buildSpawnPlaza(ctx, loc) {
  const g = district(ctx, loc, { court: WORLD.plazaRadius, totem: false, beacon: false });
  const stone = ctx.mat(PALETTE.stone, { ground: 3 });
  ring(g, stone, 9.7, 10, 0, .085, 0);
  ring(g, stone, 14.7, 15, 0, .085, 0);

  // fountain
  column(g, ctx.mat(PALETTE.concrete), 5.3, .55, 0, 0, 0, { seg: 48 });
  disc(g, ctx.mat(PALETTE.water, { rough: .08, metal: .5, opacity: .9 }), 4.8, 0, .57, 0, 48);
  ctx.solidCircle(g, 0, 0, 5.4, .7, { cam: false });

  // monument: the line and the point
  column(g, ctx.mat(PALETTE.dark, { rough: .5, metal: .3 }), 1.3, 1.5, 0, .3, 0, { seg: 32 });
  block(g, ctx.mat(PALETTE.white, { rough: .5 }), .55, 10, .55, 0, 1.8, 0);
  const orbit = new THREE.Group();
  orbit.position.y = 9.2;
  g.add(orbit);
  add(orbit, new THREE.TorusGeometry(2.1, .05, 8, 64), ctx.mat(PALETTE.bone, { rough: .4, metal: .5 }), 0, 0, 0, { rx: Math.PI / 2 });
  const point = add(orbit, new THREE.SphereGeometry(.6, 24, 16), ctx.mat(PALETTE.signal, { rough: .35, emissive: PALETTE.signal, glow: .55 }), 2.1, 0, 0);
  ctx.animated.push(t => { orbit.rotation.y = t * .5; orbit.position.y = 9.2 + Math.sin(t * .8) * .25; point.scale.setScalar(1 + Math.sin(t * 2.4) * .06); });

  // welcome board, turned towards the spawn point
  const board = new THREE.Group();
  board.position.set(-7.4, 0, 8.2);
  board.rotation.y = .62;
  g.add(board);
  const sign = placard(board, [
    { t: 'Welcome', mono: true, size: 40, color: PALETTE.signal },
    { t: profile.name, size: 132, upper: true, gap: 22 },
    { t: profile.title, size: 50, weight: 600, color: '#c9c6bd', gap: 20 },
    { t: 'Press E to meet me', mono: true, size: 36, color: '#8f9794', gap: 42 },
  ], { w: 5.2, px: 1100, z: .14 });
  const bh = sign.userData.h + .5;
  sign.position.y = .5 + bh / 2;
  block(board, ctx.mat(PALETTE.stone), 6.4, .5, 1.2);
  const slab = block(board, ctx.mat(PALETTE.ink, { rough: .35, metal: .4 }), 5.8, bh, .26, 0, .5, 0);
  block(board, ctx.mat(PALETTE.signal, { rough: .4, emissive: PALETTE.signal, glow: .4 }), 5.8, .14, .3, 0, .5 + bh, 0);
  ctx.solidBox(g, -7.4, 8.2, 6.4, 1.2, bh + .6, .62);
  ctx.interact({ id: 'plaza', group: g, lx: -5.6, lz: 10.4, y: bh + 1.7, radius: 7.4, prompt: loc.prompt, panel: { type: 'about' }, targets: [slab, sign], major: true });

  // planters and benches between the avenues
  const shrub = new THREE.IcosahedronGeometry(1.5, 1);
  for (let i = 0; i < 5; i++) {
    if (i === 2) continue; // nothing behind the spawn point: the camera starts there
    const b = (36 + i * 72) * Math.PI / 180, ux = Math.sin(b), uz = -Math.cos(b);
    column(g, ctx.mat(PALETTE.concrete), 1.4, .7, ux * 18.2, 0, uz * 18.2, { seg: 20 });
    add(g, shrub, ctx.mat(i % 2 ? PALETTE.leaf : PALETTE.leafLight, { flat: true }), ux * 18.2, 1.9, uz * 18.2, { ry: i });
    ctx.solidCircle(g, ux * 18.2, uz * 18.2, 1.5, 3.2);
    const bench = new THREE.Group();
    bench.position.set(ux * 15.4, 0, uz * 15.4);
    bench.rotation.y = -b;
    g.add(bench);
    block(bench, ctx.mat(PALETTE.dark, { rough: .6 }), 2, .45, .4);
    block(bench, ctx.mat('#b98a5a', { rough: .7 }), 2.4, .1, .66, 0, .45, 0);
    ctx.solidBox(g, ux * 15.4, uz * 15.4, 2.4, .7, .7, -b, { cam: false });
  }

  // a signpost at the head of each avenue
  for (const l of locations) {
    if (l.angle === null) continue;
    const a = l.angle * Math.PI / 180, ux = Math.sin(a), uz = -Math.cos(a), px = -uz, pz = ux;
    const x = ux * 18.6 + px * 5.2, z = uz * 18.6 + pz * 5.2;
    const post = new THREE.Group();
    post.position.set(x, 0, z);
    post.rotation.y = -a; // faces the centre of the plaza
    g.add(post);
    column(post, ctx.mat(PALETTE.dark, { rough: .5, metal: .4 }), .08, 3.1, 0, 0, 0, { seg: 8 });
    const s = placard(post, [
      { t: l.topic, mono: true, size: 46, color: l.accent },
      { t: l.name, size: 92, upper: true, gap: 18 },
    ], { w: 2.5, px: 820, bg: '#0a1012', pad: 54, corner: 0, y: 2.6, z: .15 });
    block(post, ctx.mat(PALETTE.ink), 2.5, s.userData.h, .06, 0, 2.6 - s.userData.h / 2, .115);
    block(post, ctx.mat(l.accent, { rough: .4, emissive: l.accent, glow: .4 }), 2.5, .1, .1, 0, 2.6 + s.userData.h / 2, .115);
    ctx.solidCircle(g, x, z, .3, 3.4, { cam: false });
  }
  return g;
}
