/* Developer Headquarters: experience. A glass tower on a white podium, with
   the employment timeline on a screen in the forecourt. */

import * as THREE from '../three.js';
import { experience } from '../data/experience.js';
import { PALETTE, add, block, column, district, kiosk, placard } from '../world/builders.js';

export function buildDeveloperHeadquarters(ctx, loc) {
  const g = district(ctx, loc, { beaconY: 46, beaconZ: -10.5 });
  const white = ctx.mat(PALETTE.white, { rough: .6 });
  const dark = ctx.mat(PALETTE.dark, { rough: .5, metal: .3 });
  const glass = ctx.glass();

  // podium
  block(g, white, 27, 5, 13, 0, 0, -9);
  block(g, glass, 9, 3.3, .3, -8, .7, -2.42);
  block(g, glass, 9, 3.3, .3, 8, .7, -2.42);
  block(g, ctx.mat(PALETTE.concrete), 27.6, .4, 13.6, 0, 5, -9);

  // entrance
  block(g, dark, 5.2, 4.3, .5, 0, 0, -2.4);
  block(g, ctx.glass('#6fa3b4'), 3.6, 3.5, .56, 0, 0, -2.4);
  block(g, white, 7.4, .28, 3.4, 0, 4.3, -1.2);
  column(g, ctx.mat(PALETTE.steel, { metal: .6, rough: .4 }), .09, 4.3, -3.3, 0, .2, { seg: 8 });
  column(g, ctx.mat(PALETTE.steel, { metal: .6, rough: .4 }), .09, 4.3, 3.3, 0, .2, { seg: 8 });

  // name on the fascia
  block(g, dark, 12.5, 1.5, .3, 0, 5.4, -2.7);
  placard(g, [{ t: 'Developer HQ', size: 150, upper: true }], { w: 8.6, px: 1400, pad: 30, y: 6.15, z: -2.53 });

  // main tower: glass in a white frame
  block(g, glass, 11, 40, 9, -4.5, 5.4, -10.5);
  block(g, white, .9, 41, 9.6, -10.4, 5.4, -10.5);
  block(g, white, 12.6, .9, 9.6, -4.5, 45.4, -10.5);
  for (let i = 1; i < 8; i++) block(g, white, 11.1, .16, 9.1, -4.5, 5.4 + i * 5, -10.5, { cast: false });
  // the signal: one orange fin, full height
  block(g, ctx.mat(PALETTE.signal, { rough: .45, emissive: PALETTE.signal, glow: .25 }), .5, 36, 2, 1.25, 5.4, -6.4);

  // second tower
  block(g, ctx.glass('#6d9db0'), 8, 23, 8, 8, 5.4, -10.5);
  block(g, white, 8.6, .7, 8.6, 8, 28.4, -10.5);
  block(g, ctx.mat(PALETTE.steel, { metal: .4, rough: .5 }), 3, 1.6, 3, 8.5, 29.1, -11);

  // mast
  column(g, ctx.mat(PALETTE.steel, { metal: .6, rough: .4 }), .12, 9, -6, 46.3, -11, { seg: 8 });
  add(g, new THREE.SphereGeometry(.28, 12, 8), ctx.glow('#ff3b2f'), -6, 55.5, -11, { cast: false });

  // planters either side of the door
  for (const x of [-5.6, 5.6]) {
    block(g, ctx.mat(PALETTE.concrete), 1.6, .8, 1.6, x, 0, -.8);
    add(g, new THREE.IcosahedronGeometry(.95, 1), ctx.mat(PALETTE.leaf, { flat: true }), x, 1.5, -.8);
    ctx.solidBox(g, x, -.8, 1.7, 1.7, 2.2, 0, { cam: false });
  }
  ctx.solidBox(g, 0, -9, 27.6, 13.6, 50);

  // the timeline screen
  const first = experience[experience.length - 1], last = experience[0];
  const screen = kiosk(ctx, g, {
    x: 0, z: 7, w: 6.2, accent: loc.accent,
    lines: [
      { t: 'Experience', mono: true, size: 40, color: loc.accent },
      { t: `${first.period.slice(4, 8)} to now`, size: 120, upper: true, gap: 20 },
      { t: `${first.company}, then ${last.company}`, size: 46, weight: 600, color: '#c9c6bd', gap: 22 },
      { t: 'Press E for the timeline', mono: true, size: 34, color: '#8f9794', gap: 40 },
    ],
  });
  ctx.interact({ id: 'hq', group: g, lx: 0, lz: 9.6, y: 5.4, radius: 5.5, prompt: loc.prompt, panel: { type: 'experience' }, targets: [screen], major: true });
  return g;
}
