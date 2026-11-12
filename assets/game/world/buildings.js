/* The ordinary city between the districts: mid-rise blocks that give the
   streets some enclosure. Each one is solid. */

import * as THREE from '../three.js';
import { WORLD, locations } from '../data/locations.js';
import { seeded } from '../core/poster.js';
import { PALETTE, block } from './builders.js';
import { facadeTexture } from './props.js';

export function buildCity(ctx) {
  const rnd = seeded('city');
  const base = facadeTexture();
  const walls = ['#f1efe9', '#e3e7e8', '#ece4d6', '#dfe5ea'];
  const angles = locations.filter(l => l.angle !== null).map(l => l.angle);

  // three blocks in each gap between two neighbouring districts
  for (const a of angles) {
    const midAngle = a + 36;
    const lots = [[midAngle - 10, 84], [midAngle + 10, 84], [midAngle, 103], [midAngle - 17, 104], [midAngle + 17, 104]];
    lots.forEach(([deg, r], i) => {
      const b = deg * Math.PI / 180;
      const w = 11 + rnd() * 5, d = 10 + rnd() * 4, h = i < 2 ? 12 + rnd() * 10 : 20 + rnd() * 24;
      const g = new THREE.Group();
      g.position.set(Math.sin(b) * r, 0, -Math.cos(b) * r);
      g.rotation.y = -b;
      ctx.scene.add(g);

      const map = base.clone();
      map.repeat.set(Math.round(w / 3.4), Math.round(h / 3.4));
      map.needsUpdate = true;
      const wall = new THREE.MeshStandardMaterial({ map, color: walls[Math.floor(rnd() * walls.length)], roughness: .7, metalness: .05 });

      block(g, ctx.glass('#5f8ea3'), w - .6, 3.4, d - .6);                       // glazed ground floor
      block(g, ctx.mat(PALETTE.white), w + .5, .35, d + .5, 0, 3.4, 0);           // canopy line
      block(g, wall, w, h - 3.75, d, 0, 3.75, 0);
      block(g, ctx.mat(PALETTE.concrete), w + .4, .5, d + .4, 0, h, 0);           // roof slab
      block(g, ctx.mat(PALETTE.steel, { metal: .4, rough: .5 }), w * .3, 1.6, d * .3, w * .18, h + .5, -d * .12);
      if (rnd() > .5) block(g, ctx.mat(PALETTE.signal, { rough: .5 }), .5, h - 4, .3, -w / 2 + .9, 3.75, d / 2 + .05);

      ctx.solidBox(g, 0, 0, w + .5, d + .5, h + 2);
    });
  }
  return WORLD;
}
