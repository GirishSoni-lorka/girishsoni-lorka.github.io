/* Technology Zone: skills. An open-air campus with one pad per skill group.
   Each group has its own kind of display (racks, screens, storage stacks,
   model cores), built from the data in data/skills.js: add a skill there and
   it gets a display and a panel here. */

import * as THREE from '../three.js';
import { skillGroups, allSkills } from '../data/skills.js';
import { PALETTE, add, block, column, disc, district, kiosk, placard, ring } from '../world/builders.js';

const PADS = [[-11.5, 1.5], [11.5, 1.5], [-10.5, -14], [10.5, -14]];

/* one display per group shape; returns the meshes that should be clickable */
const DISPLAYS = {
  rack(ctx, d, accent) {
    const body = block(d, ctx.mat(PALETTE.dark, { rough: .4, metal: .5 }), 1, 2.3, .9, 0, 1, 0);
    for (let i = 0; i < 5; i++) block(d, ctx.glow(i % 2 ? accent : '#d9f3f7'), .7, .06, .04, 0, 1.35 + i * .4, .46, { cast: false });
    return [body];
  },
  screen(ctx, d, accent) {
    column(d, ctx.mat(PALETTE.steel, { metal: .6, rough: .4 }), .07, 1, 0, 1, 0, { seg: 8 });
    const frame = block(d, ctx.mat(PALETTE.dark, { rough: .4, metal: .5 }), 2, 1.3, .12, 0, 1.9, 0);
    block(d, ctx.glow('#12303a'), 1.8, 1.1, .02, 0, 2, .07, { cast: false });
    block(d, ctx.glow(accent), 1.1, .08, .02, -.25, 2.85, .085, { cast: false });
    block(d, ctx.glow('#cfe9ee'), 1.4, .05, .02, -.1, 2.6, .085, { cast: false });
    block(d, ctx.glow('#cfe9ee'), .9, .05, .02, -.35, 2.4, .085, { cast: false });
    return [frame];
  },
  stack(ctx, d, accent) {
    const out = [];
    for (let i = 0; i < 3; i++) {
      out.push(column(d, ctx.mat(PALETTE.steel, { metal: .7, rough: .3 }), .62, .5, 0, 1.08 + i * .66, 0, { seg: 28 }));
      column(d, ctx.glow(accent), .635, .07, 0, 1.3 + i * .66, 0, { seg: 28, cast: false });
    }
    return out;
  },
  core(ctx, d, accent) {
    const core = add(d, new THREE.IcosahedronGeometry(.62, 0), ctx.mat(accent, { rough: .25, metal: .3, flat: true, emissive: accent, glow: .3 }), 0, 2.2, 0);
    const halo = add(d, new THREE.TorusGeometry(.95, .03, 8, 48), ctx.mat(PALETTE.bone, { metal: .6, rough: .3 }), 0, 2.2, 0, { cast: false });
    ctx.animated.push(t => { core.rotation.set(t * .5, t * .7, 0); core.position.y = 2.2 + Math.sin(t * 1.3 + d.position.x) * .1; halo.rotation.set(Math.PI / 2 + Math.sin(t * .6) * .5, t * .4, 0); });
    return [core];
  },
};

export function buildTechnologyZone(ctx, loc) {
  const g = district(ctx, loc, { court: 23, totemX: 12, totemZ: 17, beaconY: 10, beaconZ: -6 });
  const accent = loc.accent;
  const dark = ctx.mat(PALETTE.dark, { rough: .5, metal: .3 });

  // centrepiece: three rings turning around a glass core
  column(g, dark, 1.6, .9, 0, 0, -6, { seg: 32 });
  column(g, ctx.mat(PALETTE.steel, { metal: .6, rough: .4 }), .14, 5, 0, .9, -6, { seg: 10 });
  const rings = [3.2, 2.5, 1.8].map((r, i) => add(g, new THREE.TorusGeometry(r, .09, 10, 72), ctx.mat(i === 1 ? accent : PALETTE.white, { rough: .35, metal: .5 }), 0, 6.4, -6));
  add(g, new THREE.IcosahedronGeometry(.9, 1), ctx.glass('#9ad4de'), 0, 6.4, -6);
  ctx.animated.push(t => rings.forEach((r, i) => r.rotation.set(t * (.25 + i * .12) + i, t * (.18 + i * .1), i)));
  ctx.solidCircle(g, 0, -6, 1.8, 10);

  skillGroups.forEach((group, gi) => {
    const [px, pz] = PADS[gi % PADS.length];
    disc(g, ctx.mat('#3a4349', { ground: 4, rough: .7 }), 5.4, px, .1, pz, 48);
    ring(g, ctx.mat(accent, { ground: 5, rough: .5 }), 5.05, 5.4, px, .12, pz, 64);

    // group pylon at the back of the pad
    block(g, dark, 3.3, 5, .35, px, 0, pz - 4.6);
    block(g, ctx.mat(accent, { rough: .4, emissive: accent, glow: .4 }), 3.3, .14, .4, px, 5, pz - 4.6);
    placard(g, [
      { t: `${group.skills.length} technologies`, mono: true, size: 44, color: accent },
      { t: group.name, size: 120, upper: true, gap: 20 },
    ], { w: 2.9, px: 900, x: px, y: 3.6, z: pz - 4.41 });
    ctx.solidBox(g, px, pz - 4.6, 3.4, .5, 5.2);

    // displays in an arc across the front of the pad
    const n = group.skills.length, spread = n > 1 ? Math.min(1.9, .62 * (n - 1)) : 0;
    group.skills.forEach((skill, i) => {
      const a = n > 1 ? -spread / 2 + spread * i / (n - 1) : 0;
      const dx = Math.sin(a) * 3.6, dz = Math.cos(a) * 3.6 - 1;
      const d = new THREE.Group();
      d.position.set(px + dx, 0, pz + dz);
      d.rotation.y = a;
      g.add(d);
      column(d, ctx.mat(PALETTE.concrete), .8, 1, 0, 0, 0, { seg: 24, top: .7 });
      const targets = DISPLAYS[group.shape](ctx, d, accent);
      placard(d, [{ t: skill.name, size: 92, upper: true }], { w: 1.5, px: 700, pad: 44, bg: '#0a1012', align: 'center', y: .62, z: .82 });
      ctx.solidCircle(g, px + dx, pz + dz, .9, 3.4, { cam: false });
      ctx.interact({
        id: `skill-${skill.id}`, group: g, lx: px + dx + Math.sin(a) * 1.5, lz: pz + dz + Math.cos(a) * 1.5, y: 3.9, radius: 2.7,
        prompt: `Inspect ${skill.name}`, panel: { type: 'skill', id: skill.id }, targets,
      });
    });
  });

  // light masts along the back edge
  for (let i = 0; i < 7; i++) {
    const b = (112 + i * 22.6) * Math.PI / 180, x = Math.sin(b) * 21.4, z = Math.cos(b) * 21.4;
    column(g, ctx.mat(PALETTE.steel, { metal: .6, rough: .4 }), .1, 7.5, x, 0, z, { seg: 8 });
    block(g, ctx.glow(accent), .16, 1.4, .16, x, 7.5, z, { cast: false });
    ctx.solidCircle(g, x, z, .2, 8, { cam: false });
  }

  const screen = kiosk(ctx, g, {
    x: 0, z: 11.5, w: 6.2, accent,
    lines: [
      { t: 'Skills', mono: true, size: 40, color: accent },
      { t: 'Technology Zone', size: 108, upper: true, gap: 20 },
      { t: `${allSkills.length} technologies in ${skillGroups.length} groups. Walk up to any display.`, size: 44, weight: 600, color: '#c9c6bd', gap: 22 },
      { t: 'Press E for the overview', mono: true, size: 34, color: '#8f9794', gap: 40 },
    ],
  });
  ctx.interact({ id: 'tech', group: g, lx: 0, lz: 14, y: 5.6, radius: 4.2, prompt: loc.prompt, panel: { type: 'skills' }, targets: [screen], major: true });
  return g;
}
