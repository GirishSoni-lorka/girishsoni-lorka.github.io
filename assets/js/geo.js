/* Geometry helpers shared by the signal line and the particle field.
   Paths are dense polylines ([x, y] pairs) with cumulative arc length. */

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);
export const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Path {
  constructor() { this.pts = []; this.cx = 0; this.cy = 0; }
  M(x, y) { this.pts.push([x, y]); this.cx = x; this.cy = y; return this; }
  L(x, y) {
    const n = Math.max(1, Math.ceil(Math.hypot(x - this.cx, y - this.cy) / 6));
    for (let i = 1; i <= n; i++) this.pts.push([lerp(this.cx, x, i / n), lerp(this.cy, y, i / n)]);
    this.cx = x; this.cy = y; return this;
  }
  C(x1, y1, x2, y2, x, y) {
    const x0 = this.cx, y0 = this.cy;
    const est = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x - x2, y - y2);
    const n = Math.max(8, Math.ceil(est / 5));
    for (let i = 1; i <= n; i++) {
      const t = i / n, u = 1 - t;
      this.pts.push([
        u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
        u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y,
      ]);
    }
    this.cx = x; this.cy = y; return this;
  }
  /* circle/arc around (ox, oy) from angle a0 to a1 */
  A(ox, oy, r, a0, a1) {
    const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * r / 4));
    for (let i = 1; i <= n; i++) {
      const a = lerp(a0, a1, i / n);
      this.pts.push([ox + Math.cos(a) * r, oy + Math.sin(a) * r]);
    }
    const l = this.pts[this.pts.length - 1]; this.cx = l[0]; this.cy = l[1]; return this;
  }
  raw(list) {
    for (const p of list) this.pts.push(p);
    const l = this.pts[this.pts.length - 1]; this.cx = l[0]; this.cy = l[1]; return this;
  }
  done() { return finalize(this.pts); }
}

export function finalize(pts) {
  const len = new Float32Array(pts.length);
  for (let i = 1; i < pts.length; i++) len[i] = len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
  return { pts, len, total: len[len.length - 1] || 0, minY, maxY, start: pts[0], end: pts[pts.length - 1] };
}

/* point at arc length d (binary search) */
export function pointAtLen(path, d, out = [0, 0]) {
  const { pts, len, total } = path;
  if (d <= 0) { out[0] = pts[0][0]; out[1] = pts[0][1]; return out; }
  if (d >= total) { const l = pts[pts.length - 1]; out[0] = l[0]; out[1] = l[1]; return out; }
  let lo = 0, hi = len.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (len[mid] < d) lo = mid; else hi = mid; }
  const seg = len[hi] - len[lo], k = seg ? (d - len[lo]) / seg : 0;
  out[0] = lerp(pts[lo][0], pts[hi][0], k); out[1] = lerp(pts[lo][1], pts[hi][1], k);
  return out;
}

/* tangent-normal at arc length d */
export function normalAtLen(path, d, out = [0, 0]) {
  const a = pointAtLen(path, d - 2, [0, 0]), b = pointAtLen(path, d + 2, [0, 0]);
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  out[0] = -dy / l; out[1] = dx / l; return out;
}

/* stroke a fraction of a path onto a 2D context; returns the head point */
export function strokePart(ctx, path, frac, oy = 0) {
  if (frac <= 0 || !path.total) return null;
  const { pts, len } = path, target = path.total * clamp(frac);
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1] - oy);
  let hx = pts[0][0], hy = pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (len[i] <= target) { hx = pts[i][0]; hy = pts[i][1]; ctx.lineTo(hx, hy - oy); }
    else {
      const seg = len[i] - len[i - 1], k = seg ? (target - len[i - 1]) / seg : 0;
      hx = lerp(pts[i - 1][0], pts[i][0], k); hy = lerp(pts[i - 1][1], pts[i][1], k);
      ctx.lineTo(hx, hy - oy); break;
    }
  }
  ctx.stroke();
  return [hx, hy];
}

/* orthogonal route with rounded corners */
export function roundedPolyline(points, r) {
  const p = new Path().M(points[0][0], points[0][1]);
  for (let i = 1; i < points.length - 1; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i], [cx, cy] = points[i + 1];
    const d1 = Math.hypot(bx - ax, by - ay) || 1, d2 = Math.hypot(cx - bx, cy - by) || 1;
    const rr = Math.min(r, d1 / 2, d2 / 2);
    p.L(bx - (bx - ax) / d1 * rr, by - (by - ay) / d1 * rr);
    p.C(bx, by, bx, by, bx + (cx - bx) / d2 * rr, by + (cy - by) / d2 * rr);
  }
  const last = points[points.length - 1];
  return p.L(last[0], last[1]);
}

/* a smooth drop from a to b: straight down, then a bend into b */
export function connector(a, b, vh) {
  const p = new Path().M(a[0], a[1]);
  const dy = b[1] - a[1];
  if (dy <= 1) return p.L(b[0], b[1]).done();
  if (Math.abs(b[0] - a[0]) < 1) return p.L(b[0], b[1]).done();
  const hb = Math.min(dy, Math.max(90, vh * .24));
  if (dy > hb) p.L(a[0], b[1] - hb);
  p.C(a[0], b[1] - hb * .45, b[0], b[1] - hb * .55, b[0], b[1]);
  return p.done();
}
