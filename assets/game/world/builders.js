/* Shared building blocks for the world: the build context (materials,
   colliders, interactables), mesh helpers and canvas-drawn signage. */

import * as THREE from '../three.js';
import { boxCollider, circleCollider } from '../systems/collision.js';
import { wrapText } from '../core/poster.js';

export const PALETTE = {
  concrete: '#d8d4ca', paving: '#cfcabf', white: '#f0eee8', stone: '#bdb9ae', dark: '#262d32',
  asphalt: '#434a50', glass: '#86bccb', grass: '#86ab78', leaf: '#5d9659', leafLight: '#7fb26a',
  trunk: '#6d5746', bone: '#ece7dc', signal: '#ff5a1f', steel: '#98a1a6', water: '#6db4cc', ink: '#0a1012',
};

export const SANS = 'Archivo, system-ui, -apple-system, "Segoe UI", sans-serif';
export const MONO = '"Martian Mono", ui-monospace, Consolas, monospace';

/* local (x, z) of a top-level group to world (x, z) */
export function toWorld(group, lx, lz) {
  const s = Math.sin(group.rotation.y), c = Math.cos(group.rotation.y);
  return { x: group.position.x + lx * c + lz * s, z: group.position.z - lx * s + lz * c };
}

export function createContext(scene) {
  const mats = new Map();
  const cached = (key, make) => {
    if (!mats.has(key)) mats.set(key, make());
    return mats.get(key);
  };

  const ctx = {
    scene,
    colliders: [],      // see systems/collision.js
    interactables: [],  // { id, x, y, z, radius, prompt, panel }
    clickTargets: [],   // meshes whose userData.interact names an interactable
    animated: [],       // (t, dt) => void, run every frame
    night: [],          // (k) => void, run when the day/night blend (0..1) changes

    /* lit surface. Options: rough, metal, flat, emissive, glow, opacity, double, ground (z-fight layer) */
    mat(color, o = {}) {
      return cached(`s${color}${JSON.stringify(o)}`, () => new THREE.MeshStandardMaterial({
        color, roughness: o.rough ?? .86, metalness: o.metal ?? 0, flatShading: Boolean(o.flat),
        emissive: o.emissive || '#000000', emissiveIntensity: o.glow ?? 1,
        transparent: o.opacity !== undefined, opacity: o.opacity ?? 1,
        side: o.double ? THREE.DoubleSide : THREE.FrontSide,
        polygonOffset: Boolean(o.ground), polygonOffsetFactor: -(o.ground || 0), polygonOffsetUnits: -(o.ground || 0) * 2,
      }));
    },
    glass(tint = PALETTE.glass) {
      return cached(`g${tint}`, () => new THREE.MeshStandardMaterial({ color: tint, roughness: .12, metalness: .75, envMapIntensity: 1.25 }));
    },
    /* unlit: screens, light strips, beacons */
    glow(color, o = {}) {
      return cached(`b${color}${JSON.stringify(o)}`, () => new THREE.MeshBasicMaterial({
        color, toneMapped: false, transparent: o.opacity !== undefined, opacity: o.opacity ?? 1,
        depthWrite: o.opacity === undefined, side: o.double ? THREE.DoubleSide : THREE.FrontSide, fog: o.fog !== false,
      }));
    },

    solidBox(group, lx, lz, w, d, h = 4, lrot = 0, o) {
      const p = toWorld(group, lx, lz);
      ctx.colliders.push(boxCollider(p.x, p.z, w, d, group.rotation.y + lrot, h, o));
    },
    solidCircle(group, lx, lz, r, h = 4, o) {
      const p = toWorld(group, lx, lz);
      ctx.colliders.push(circleCollider(p.x, p.z, r, h, o));
    },
    /* something the player can walk up to (or click) to open a panel */
    interact({ id, group, lx = 0, lz = 0, y = 2.6, radius = 4.5, prompt, panel, targets = [], major = false }) {
      const p = toWorld(group, lx, lz);
      ctx.interactables.push({ id, x: p.x, y, z: p.z, radius, prompt, panel, major });
      for (const m of targets) { m.userData.interact = id; ctx.clickTargets.push(m); }
    },
  };
  return ctx;
}

/* ---------- meshes ---------- */

export function add(parent, geometry, material, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  parent.add(m);
  return m;
}

/* a box standing on y */
export const block = (parent, material, w, h, d, x = 0, y = 0, z = 0, o) =>
  add(parent, new THREE.BoxGeometry(w, h, d), material, x, y + h / 2, z, o);

/* a cylinder standing on y; o.top sets a different top radius */
export const column = (parent, material, r, h, x = 0, y = 0, z = 0, o = {}) =>
  add(parent, new THREE.CylinderGeometry(o.top ?? r, r, h, o.seg ?? 24), material, x, y + h / 2, z, o);

/* flat ground shapes */
export const disc = (parent, material, r, x = 0, y = 0, z = 0, seg = 64) =>
  add(parent, new THREE.CircleGeometry(r, seg), material, x, y, z, { rx: -Math.PI / 2, cast: false });

export const ring = (parent, material, r0, r1, x = 0, y = 0, z = 0, seg = 96) =>
  add(parent, new THREE.RingGeometry(r0, r1, seg), material, x, y, z, { rx: -Math.PI / 2, cast: false });

export const strip = (parent, material, w, d, x = 0, y = 0, z = 0, ry = 0) => {
  const m = add(parent, new THREE.PlaneGeometry(w, d), material, x, y, z, { cast: false });
  m.rotation.set(-Math.PI / 2, 0, ry);
  return m;
};

/* ---------- signage ---------- */

/* lines: [{ t, size, color, mono, weight, gap }]. Returns a texture and its aspect ratio. */
export function makeLabel(lines, o = {}) {
  const W = o.px || 1024, pad = o.pad ?? 56;
  const canvas = document.createElement('canvas');
  let g = canvas.getContext('2d');
  const font = l => `${l.weight || (l.mono ? 500 : 800)} ${l.size || 64}px ${l.mono ? MONO : SANS}`;
  const rows = [];
  for (const l of lines) {
    g.font = font(l);
    const text = l.mono || l.upper ? l.t.toUpperCase() : l.t;
    for (const [i, part] of wrapText(g, text, W - pad * 2).entries()) {
      const wide = g.measureText(part).width, max = W - pad * 2;
      const size = wide > max ? Math.floor((l.size || 64) * max / wide) : (l.size || 64); // a single long word shrinks to fit
      rows.push({ ...l, t: part, size, gap: i ? 6 : (l.gap ?? 18) });
    }
  }
  let H = pad * 2 - (rows[0] ? rows[0].gap : 0);
  for (const r of rows) H += (r.size || 64) * 1.08 + r.gap;
  if (o.accent) H += 30;
  canvas.width = W; canvas.height = Math.ceil(H);
  g = canvas.getContext('2d');
  if (o.bg) {
    g.fillStyle = o.bg;
    g.beginPath(); g.roundRect(0, 0, W, canvas.height, o.corner ?? 28); g.fill();
  }
  g.textBaseline = 'top';
  g.textAlign = o.align === 'center' ? 'center' : 'left';
  const x = o.align === 'center' ? W / 2 : pad;
  let y = pad - (rows[0] ? rows[0].gap : 0);
  for (const r of rows) {
    y += r.gap;
    g.font = font(r);
    g.fillStyle = r.color || PALETTE.bone;
    g.fillText(r.t, x, y);
    y += (r.size || 64) * 1.08;
  }
  if (o.accent) {
    g.fillStyle = o.accent;
    g.fillRect(o.align === 'center' ? W / 2 - 60 : pad, y + 14, 120, 8);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: W / canvas.height };
}

/* a flat sign, `w` metres wide, centred on (x, y, z) */
export function placard(parent, lines, o = {}) {
  const { texture, aspect } = makeLabel(lines, o);
  const w = o.w || 4, h = w / aspect;
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: !o.bg || (o.corner ?? 28) > 0, toneMapped: false,
    side: o.double ? THREE.DoubleSide : THREE.FrontSide, alphaTest: .02,
  });
  const m = add(parent, new THREE.PlaneGeometry(w, h), material, o.x || 0, o.y || 0, o.z || 0, { ry: o.ry, rx: o.rx, cast: false, receive: false });
  m.userData.h = h;
  return m;
}

/* a canvas-backed texture from any drawing function */
export function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d'), canvas);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ---------- district scaffolding ---------- */

/* The common ground of every district: a paved forecourt facing the plaza,
   an accent ring, a name totem at the entrance and a beacon above it. */
export function district(ctx, loc, o = {}) {
  const g = new THREE.Group();
  g.name = loc.id;
  g.position.set(loc.x, 0, loc.z);
  g.rotation.y = -(loc.angle || 0) * Math.PI / 180;
  ctx.scene.add(g);

  const r = o.court ?? 19;
  disc(g, ctx.mat(PALETTE.paving, { ground: 2 }), r, 0, .06, 0);
  ring(g, ctx.mat(loc.accent, { ground: 3, rough: .55 }), r - .7, r, 0, .08, 0);
  ring(g, ctx.mat(PALETTE.white, { ground: 3 }), r - 4.2, r - 4, 0, .08, 0);

  if (o.totem !== false) totem(ctx, g, loc, o.totemX ?? 9.5, o.totemZ ?? 14.5);
  if (o.beacon !== false) {
    const b = add(g, new THREE.CylinderGeometry(.35, .9, 90, 12, 1, true), ctx.glow(loc.accent, { opacity: .3, fog: false, double: true }),
      0, (o.beaconY ?? 20) + 45, o.beaconZ ?? -6, { cast: false, receive: false });
    b.renderOrder = 2;
  }
  return g;
}

export function totem(ctx, g, loc, x, z) {
  const ry = Math.atan2(-x, 22 - z) * .6; // turned a little towards people arriving
  const t = new THREE.Group();
  t.position.set(x, 0, z); t.rotation.y = ry;
  g.add(t);
  block(t, ctx.mat(PALETTE.dark, { rough: .5, metal: .3 }), 3.4, 4.2, .4);
  block(t, ctx.mat(loc.accent, { rough: .4, emissive: loc.accent, glow: .35 }), 3.4, .18, .44, 0, 4.2, 0);
  block(t, ctx.mat(PALETTE.stone), 3.9, .25, .9);
  placard(t, [
    { t: loc.topic, mono: true, size: 44, color: loc.accent },
    { t: loc.name, size: 104, upper: true, gap: 26 },
  ], { w: 3, px: 900, y: 2.3, z: .215 });
  ctx.solidBox(g, x, z, 3.6, .8, 4.2, ry);
}

/* a free-standing information screen; returns the screen mesh (a click target) */
export function kiosk(ctx, g, { x = 0, z = 0, w = 5, lines, accent }) {
  const k = new THREE.Group();
  k.position.set(x, 0, z);
  g.add(k);
  const sign = placard(k, lines, { w: w - .7, px: 1000, z: .13 });
  const h = sign.userData.h + .5;
  sign.position.y = .45 + h / 2;
  block(k, ctx.mat(PALETTE.stone), w + .7, .45, 1.2);
  const screen = block(k, ctx.mat(PALETTE.ink, { rough: .35, metal: .4 }), w, h, .24, 0, .45, 0);
  block(k, ctx.mat(accent, { rough: .4, emissive: accent, glow: .4 }), w, .14, .28, 0, .45 + h, 0);
  ctx.solidBox(g, x, z, w + .7, 1.2, h + .6);
  return screen;
}
