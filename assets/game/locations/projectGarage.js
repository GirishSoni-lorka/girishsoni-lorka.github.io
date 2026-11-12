/* Project Garage: projects. A long open hangar with one bay per project.
   Bays are generated from data/projects.js, so adding a project there adds a
   bay, a poster and a panel without touching this file. */

import * as THREE from '../three.js';
import { projects } from '../data/projects.js';
import { drawPoster, POSTER_W, POSTER_H } from '../core/poster.js';
import { PALETTE, add, block, column, district, kiosk, placard, strip } from '../world/builders.js';

const BAY = 5.2;

function posterTexture(project, index) {
  const canvas = document.createElement('canvas');
  drawPoster(canvas, project, index);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (project.image) {
    // a real preview image replaces the generated poster as soon as it loads
    new THREE.TextureLoader().load(new URL(project.image, document.baseURI).href, img => {
      t.image = img.image; t.needsUpdate = true; img.dispose();
    }, undefined, () => { /* keep the generated poster */ });
  }
  return t;
}

export function buildProjectGarage(ctx, loc) {
  const n = projects.length, span = Math.max(4, n) * BAY, W = span + 2.4;
  const g = district(ctx, loc, { court: Math.max(23, W / 2 + 1.5), totemX: 13, totemZ: 16, beaconY: 10, beaconZ: -9 });
  const accent = loc.accent;
  const dark = ctx.mat(PALETTE.dark, { rough: .55, metal: .25 });
  const white = ctx.mat(PALETTE.white, { rough: .6 });

  // shell: back wall, ends, roof, fascia
  block(g, dark, W, 9, 1, 0, 0, -13.5);
  block(g, white, 1, 9, 10, -W / 2 + .5, 0, -8.5);
  block(g, white, 1, 9, 10, W / 2 - .5, 0, -8.5);
  block(g, white, W + 1.2, .6, 11.4, 0, 9, -8.3);
  block(g, ctx.mat(accent, { rough: .5 }), W + 1.2, .8, .3, 0, 8.2, -2.75);
  placard(g, [{ t: 'Project Garage', size: 150, upper: true, color: PALETTE.ink }], { w: 9.5, px: 1500, pad: 26, y: 8.6, z: -2.58 });
  for (let i = 0; i < 7; i++) block(g, ctx.mat(PALETTE.steel, { metal: .5, rough: .5 }), W, .25, .25, 0, 8.75, -12.4 + i * 1.5, { cast: false });
  strip(g, ctx.mat('#3a4349', { ground: 4, rough: .75 }), W - 2, 10, 0, .1, -8.5);
  ctx.solidBox(g, 0, -13.5, W, 1, 10);
  ctx.solidBox(g, -W / 2 + .5, -8.5, 1, 10, 10);
  ctx.solidBox(g, W / 2 - .5, -8.5, 1, 10, 10);

  // bays
  for (let i = 0; i <= n; i++) {
    const x = (i - n / 2) * BAY;
    block(g, white, .35, 9, 2.6, x, 0, -11.7);
    ctx.solidBox(g, x, -11.7, .5, 2.7, 10, 0, { cam: false });
  }
  projects.forEach((p, i) => {
    const x = (i - (n - 1) / 2) * BAY;
    const poster = add(g, new THREE.PlaneGeometry(3.7, 3.7 * POSTER_H / POSTER_W),
      new THREE.MeshBasicMaterial({ map: posterTexture(p, i), toneMapped: false }), x, 4.55, -12.96, { cast: false, receive: false });
    block(g, ctx.glow(p.accent), 3.7, .1, .12, x, 1.95, -12.94, { cast: false });
    placard(g, [{ t: String(i + 1).padStart(2, '0'), mono: true, size: 150, color: p.accent }], { w: .9, px: 300, pad: 30, y: 7.6, z: -12.96, x: x - 1.4 });
    strip(g, ctx.mat(p.accent, { ground: 5, rough: .6 }), 3.7, .22, x, .12, -4.6);
    ctx.interact({ id: `project-${p.id}`, group: g, lx: x, lz: -9.2, y: 1.2, radius: 2.9, prompt: `View ${p.name}`, panel: { type: 'project', id: p.id }, targets: [poster] });
  });

  // a parked runabout, so it reads as a garage from across the city
  const car = new THREE.Group();
  car.position.set(-13.5, 0, 5.5); car.rotation.y = .5;
  g.add(car);
  block(car, ctx.mat(accent, { rough: .3, metal: .5 }), 4.3, .75, 1.95, 0, .42, 0);
  block(car, ctx.glass('#51707c'), 2.3, .62, 1.7, -.25, 1.17, 0);
  block(car, ctx.glow('#fff3d6'), .06, .16, 1.5, 2.16, .78, 0, { cast: false });
  for (const [wx, wz] of [[-1.35, -1], [-1.35, 1], [1.35, -1], [1.35, 1]]) {
    add(car, new THREE.CylinderGeometry(.44, .44, .3, 18), ctx.mat('#15191c', { rough: .7 }), wx, .44, wz, { rx: Math.PI / 2 });
  }
  ctx.solidBox(g, -13.5, 5.5, 4.5, 2.2, 1.9, .5, { cam: false });

  // charging posts
  for (const x of [-17, -10]) {
    column(g, dark, .22, 1.5, x, 0, 9.2, { seg: 12 });
    block(g, ctx.glow(accent), .12, .5, .05, x, .85, 9.43, { cast: false });
    ctx.solidCircle(g, x, 9.2, .3, 1.6, { cam: false });
  }

  const screen = kiosk(ctx, g, {
    x: 3, z: 8.5, w: 6.2, accent,
    lines: [
      { t: 'Projects', mono: true, size: 40, color: accent },
      { t: 'The build log', size: 116, upper: true, gap: 20 },
      { t: `${n} production systems, one bay each. Walk up to a poster for the write-up.`, size: 44, weight: 600, color: '#c9c6bd', gap: 22 },
      { t: 'Press E for all projects', mono: true, size: 34, color: '#8f9794', gap: 40 },
    ],
  });
  ctx.interact({ id: 'garage', group: g, lx: 3, lz: 11, y: 5.6, radius: 4.4, prompt: loc.prompt, panel: { type: 'projects' }, targets: [screen], major: true });
  return g;
}
