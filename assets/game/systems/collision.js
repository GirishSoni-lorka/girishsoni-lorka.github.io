/* Collision on a flat world. Every solid thing is a circle or a rotated box
   on the ground plane, with a height. The player is a circle. The same
   colliders stop the camera from passing through buildings.

   Pure maths, no 3D imports: unit-tested under Node. */

/* opts.cam: false   the camera ignores it (thin poles, low kerbs)
   opts.solid: false the player ignores it: it only hides the camera (tree crowns)
   opts.base         height the collider starts at, for things that overhang */
export function circleCollider(x, z, r, h = 4, opts = {}) {
  return { type: 'circle', x, z, r, h, base: opts.base || 0, reach: r, cam: opts.cam !== false, solid: opts.solid !== false };
}

/* rot is a rotation about the vertical axis, same sign as Object3D.rotation.y */
export function boxCollider(x, z, w, d, rot = 0, h = 4, opts = {}) {
  return {
    type: 'box', x, z, hw: w / 2, hd: d / 2, rot, sin: Math.sin(rot), cos: Math.cos(rot), h,
    base: opts.base || 0, reach: Math.hypot(w, d) / 2, cam: opts.cam !== false, solid: opts.solid !== false,
  };
}

/* Push a circle (pos.x, pos.z, radius) out of every collider it overlaps.
   `y` is the height of the base of the circle: anything shorter is cleared.
   Mutates pos. Returns true when something was hit. */
export function resolve(pos, radius, colliders, y = 0) {
  let hit = false;
  for (let pass = 0; pass < 2; pass++) {
    let moved = false;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (!c.solid || y >= c.h - .02) continue;
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const far = radius + c.reach;
      if (dx > far || dx < -far || dz > far || dz < -far) continue;

      if (c.type === 'circle') {
        const min = radius + c.r, d = Math.hypot(dx, dz);
        if (d >= min) continue;
        if (d < 1e-6) pos.x += min;
        else { pos.x += dx / d * (min - d); pos.z += dz / d * (min - d); }
        moved = true;
        continue;
      }

      // into the frame of the box
      let lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
      const cx = Math.max(-c.hw, Math.min(c.hw, lx)), cz = Math.max(-c.hd, Math.min(c.hd, lz));
      const ex = lx - cx, ez = lz - cz;
      const d2 = ex * ex + ez * ez;
      if (d2 >= radius * radius) continue;
      if (d2 < 1e-10) {
        // centre is inside: leave through the nearest face
        const px = c.hw - Math.abs(lx) + radius, pz = c.hd - Math.abs(lz) + radius;
        if (px < pz) lx += (lx < 0 ? -px : px); else lz += (lz < 0 ? -pz : pz);
      } else {
        const d = Math.sqrt(d2), push = radius - d;
        lx += ex / d * push; lz += ez / d * push;
      }
      pos.x = c.x + lx * c.cos + lz * c.sin;
      pos.z = c.z - lx * c.sin + lz * c.cos;
      moved = true;
    }
    if (!moved) break;
    hit = true;
  }
  return hit;
}

export function pointBlocked(x, y, z, colliders, pad = .25) {
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (!c.cam || y >= c.h || y < c.base) continue;
    const dx = x - c.x, dz = z - c.z;
    if (c.type === 'circle') {
      if (dx * dx + dz * dz < (c.r + pad) * (c.r + pad)) return true;
    } else {
      const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
      if (Math.abs(lx) < c.hw + pad && Math.abs(lz) < c.hd + pad) return true;
    }
  }
  return false;
}

/* How far the camera may sit from `from` along the unit direction `dir`
   before something solid is in the way. */
export function cameraDistance(from, dir, max, colliders, min = 1.1) {
  const near = [];
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (!c.cam) continue;
    const reach = max + c.reach + 1;
    if (Math.abs(c.x - from.x) < reach && Math.abs(c.z - from.z) < reach) near.push(c);
  }
  if (!near.length) return max;
  const steps = 18, step = max / steps;
  for (let i = 1; i <= steps; i++) {
    const t = step * i;
    if (pointBlocked(from.x + dir.x * t, from.y + dir.y * t, from.z + dir.z * t, near)) return Math.max(min, t - step);
  }
  return max;
}

/* keep a point inside the circular world */
export function clampToWorld(pos, radius) {
  const d = Math.hypot(pos.x, pos.z);
  if (d <= radius) return false;
  pos.x *= radius / d; pos.z *= radius / d;
  return true;
}
