/* Achievement Center: education, recognition and milestones. A domed
   rotunda with a ring of columns; inside, one stele per verified entry
   around a central award. */

import * as THREE from '../three.js';
import { achievements, education } from '../data/achievements.js';
import { PALETTE, add, block, column, disc, district, placard, ring } from '../world/builders.js';

export function buildAchievementCenter(ctx, loc) {
  const g = district(ctx, loc, { beaconY: 16, beaconZ: 0, totemX: 10.5, totemZ: 13 });
  const accent = loc.accent;
  const white = ctx.mat(PALETTE.white, { rough: .55 });
  const gold = ctx.mat('#d8ae4a', { rough: .3, metal: .85 });

  disc(g, ctx.mat(PALETTE.stone, { ground: 4 }), 10.6, 0, .1, 0);
  ring(g, ctx.mat(accent, { ground: 5, rough: .5 }), 6.6, 6.85, 0, .12, 0);

  // colonnade, open towards the plaza
  const N = 12;
  for (let i = 0; i < N; i++) {
    const a = (i + .5) / N * Math.PI * 2, x = Math.sin(a) * 8.8, z = Math.cos(a) * 8.8;
    column(g, white, .52, 7.2, x, 0, z, { seg: 20, top: .44 });
    column(g, ctx.mat(PALETTE.concrete), .72, .3, x, 0, z, { seg: 20 });
    ctx.solidCircle(g, x, z, .62, 8, { cam: false });
  }
  // entablature and dome
  add(g, new THREE.CylinderGeometry(9.7, 9.7, 1, 64, 1, true), ctx.mat(PALETTE.white, { rough: .55, double: true }), 0, 7.7, 0);
  ring(g, white, 7.6, 9.7, 0, 8.2, 0).rotation.x = -Math.PI / 2;
  add(g, new THREE.RingGeometry(7.6, 9.7, 64), ctx.mat(PALETTE.white, { rough: .55, double: true }), 0, 7.2, 0, { rx: Math.PI / 2 });
  add(g, new THREE.SphereGeometry(8.4, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), ctx.mat('#b9aee6', { rough: .18, metal: .6, double: true }), 0, 8.2, 0);
  column(g, gold, .16, 2.2, 0, 16.5, 0, { seg: 8 });
  ring(g, ctx.mat(accent, { rough: .4, emissive: accent, glow: .5, double: true }), 9.72, 9.9, 0, 7.75, 0);
  // the roof, for the camera only: it stays under the ceiling instead of cutting through the dome
  ctx.solidCircle(g, 0, 0, 9.9, 17, { solid: false, base: 6.7 });

  // the award
  column(g, ctx.mat(PALETTE.dark, { rough: .5, metal: .3 }), 1.25, 1.3, 0, 0, 0, { seg: 32 });
  column(g, gold, .22, .7, 0, 1.3, 0, { seg: 16, top: .12 });
  const cup = column(g, gold, .3, .9, 0, 2, 0, { seg: 24, top: .7 });
  const star = add(g, new THREE.OctahedronGeometry(.42, 0), ctx.mat('#ffd76a', { rough: .2, metal: .6, flat: true, emissive: '#ffb52e', glow: .5 }), 0, 3.7, 0);
  ctx.animated.push(t => { star.rotation.y = t * 1.1; star.position.y = 3.7 + Math.sin(t * 1.6) * .12; });
  ctx.solidCircle(g, 0, 0, 1.4, 4, { cam: false });

  // one stele per verified entry, around the back of the hall
  const entries = [
    ...achievements.map(a => ({ kind: 'Recognition', title: a.title, note: '' })),
    ...education.map(e => ({ kind: 'Education', title: e.degree, note: e.period })),
  ];
  const targets = [cup, star];
  entries.forEach((e, i) => {
    const a = Math.PI + (i - (entries.length - 1) / 2) * .78;
    const x = Math.sin(a) * 6.2, z = Math.cos(a) * 6.2;
    const s = new THREE.Group();
    s.position.set(x, 0, z);
    s.rotation.y = a + Math.PI; // faces the award
    g.add(s);
    const slab = block(s, ctx.mat(PALETTE.ink, { rough: .4, metal: .4 }), 2.9, 3.5, .3);
    block(s, ctx.mat(accent, { rough: .4, emissive: accent, glow: .4 }), 2.9, .12, .34, 0, 3.5, 0);
    const lines = [
      { t: e.kind, mono: true, size: 42, color: accent },
      { t: e.title, size: 74, gap: 22 },
    ];
    if (e.note) lines.push({ t: e.note, mono: true, size: 36, color: '#8f9794', gap: 28 });
    placard(s, lines, { w: 2.6, px: 820, pad: 50, y: 1.95, z: .16 });
    ctx.solidBox(g, x, z, 3, .5, 3.7, a + Math.PI, { cam: false });
    targets.push(slab);
  });

  ctx.interact({ id: 'achievements', group: g, lx: 0, lz: 3.6, y: 5.2, radius: 5.2, prompt: loc.prompt, panel: { type: 'achievements' }, targets, major: true });
  return g;
}
