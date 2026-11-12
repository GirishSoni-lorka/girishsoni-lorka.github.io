/* Mission Control: contact. A domed control building, a tracking dish and a
   radio mast, with a console in the forecourt that opens every contact
   method. */

import * as THREE from '../three.js';
import { contact } from '../data/contact.js';
import { PALETTE, add, block, column, district, placard, ring } from '../world/builders.js';

export function buildMissionControl(ctx, loc) {
  const g = district(ctx, loc, { beaconY: 12, beaconZ: -8, totemX: 11, totemZ: 13 });
  const accent = loc.accent;
  const white = ctx.mat(PALETTE.white, { rough: .5 });
  const dark = ctx.mat(PALETTE.dark, { rough: .5, metal: .3 });
  const steel = ctx.mat(PALETTE.steel, { metal: .6, rough: .4 });

  // control building
  column(g, white, 8, 4.2, 0, 0, -8, { seg: 48 });
  column(g, ctx.glass('#6f9fc0'), 8.06, 1.5, 0, 1.6, -8, { seg: 48 });
  add(g, new THREE.SphereGeometry(7.6, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), ctx.mat(PALETTE.white, { rough: .35, metal: .15 }), 0, 4.2, -8);
  add(g, new THREE.TorusGeometry(7.85, .13, 8, 72), ctx.glow(accent), 0, 4.25, -8, { rx: Math.PI / 2, cast: false });
  block(g, dark, 3.8, 3.3, .8, 0, 0, -.2);
  block(g, ctx.glass('#5f8fb0'), 2.6, 2.7, .86, 0, 0, -.2);
  placard(g, [{ t: 'Mission Control', size: 120, upper: true }], { w: 5.2, px: 1300, pad: 30, bg: '#0a1012', y: 3.75, z: .23 });
  ctx.solidCircle(g, 0, -8, 8.25, 14);

  // tracking dish
  column(g, steel, .55, 8.5, -12.5, 0, -2.5, { seg: 16, top: .35 });
  column(g, dark, 1.3, .5, -12.5, 0, -2.5, { seg: 20 });
  const head = new THREE.Group();
  head.position.set(-12.5, 8.7, -2.5);
  g.add(head);
  const tilt = new THREE.Group();
  tilt.rotation.x = .75;
  head.add(tilt);
  add(tilt, new THREE.SphereGeometry(5, 40, 12, 0, Math.PI * 2, 0, .82), ctx.mat(PALETTE.white, { rough: .4, metal: .2, double: true }), 0, 5, 0, { rx: Math.PI });
  column(tilt, steel, .06, 3.4, 0, 0, 0, { seg: 6 });
  add(tilt, new THREE.SphereGeometry(.3, 12, 8), ctx.glow(accent), 0, 3.5, 0, { cast: false });
  ctx.animated.push(t => { head.rotation.y = Math.sin(t * .12) * 1.1 + .6; });
  ctx.solidCircle(g, -12.5, -2.5, 1.4, 9, { cam: false });

  // radio mast
  column(g, steel, .16, 24, 12.5, 0, -3.5, { seg: 8, top: .07 });
  for (const y of [8, 14, 19]) add(g, new THREE.TorusGeometry(.7 - y * .02, .04, 6, 20), steel, 12.5, y, -3.5, { rx: Math.PI / 2, cast: false });
  const lamp = add(g, new THREE.SphereGeometry(.26, 12, 8), ctx.glow('#ff3b2f'), 12.5, 24.2, -3.5, { cast: false });
  ctx.animated.push(t => { lamp.visible = (t % 1.6) < .9; });
  column(g, dark, 1, .5, 12.5, 0, -3.5, { seg: 16 });
  ctx.solidCircle(g, 12.5, -3.5, 1.05, 24, { cam: false });

  // contact console: one screen per channel, straight from the data
  const shown = contact.methods.filter(m => ['email', 'linkedin', 'github'].includes(m.id));
  const cw = shown.length * 2.3 + .6;
  block(g, dark, cw, 1.05, 1.5, 0, 0, 7);
  block(g, ctx.mat(accent, { rough: .4, emissive: accent, glow: .4 }), cw, .08, 1.54, 0, 1.05, 7);
  const targets = [];
  shown.forEach((m, i) => {
    const x = (i - (shown.length - 1) / 2) * 2.3;
    const s = new THREE.Group();
    s.position.set(x, 1.13, 7.1);
    s.rotation.x = -.32;
    g.add(s);
    targets.push(block(s, ctx.mat(PALETTE.ink, { rough: .35, metal: .4 }), 2.05, 1.5, .12));
    placard(s, [
      { t: m.label, mono: true, size: 54, color: accent },
      { t: m.id === 'email' ? 'Say hello' : 'Open profile', size: 88, upper: true, gap: 22 },
    ], { w: 1.8, px: 620, pad: 44, y: .75, z: .07 });
  });
  ring(g, ctx.mat(accent, { ground: 5, rough: .5 }), 3.3, 3.5, 0, .12, 9.6);
  ctx.solidBox(g, 0, 7, cw, 1.6, 2.6, 0, { cam: false });
  ctx.interact({ id: 'mission', group: g, lx: 0, lz: 9.6, y: 4.2, radius: 5, prompt: loc.prompt, panel: { type: 'contact' }, targets, major: true });
  return g;
}
