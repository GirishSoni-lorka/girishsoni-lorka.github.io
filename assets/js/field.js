/* The field: thousands of points that stand for records. Each scene has a
   formation; scrolling between scenes flies every point from one formation
   to the next. Positions are computed on the CPU and drawn as WebGL points. */

import { clamp, lerp, smooth, easeInOut, rng, pointAtLen, normalAtLen } from './geo.js';

const VS = `
attribute vec2 aPos;
attribute vec3 aMeta;
uniform vec2 uRes;
uniform float uDpr;
uniform float uBase;
varying float vHot;
varying float vA;
void main() {
  vec2 c = aPos / uRes * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
  gl_PointSize = uBase * aMeta.z * uDpr;
  vHot = aMeta.x;
  vA = aMeta.y;
}`;

const FS = `
precision mediump float;
varying float vHot;
varying float vA;
uniform vec3 uBone;
uniform vec3 uSignal;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.16, r) * vA;
  if (a < 0.004) discard;
  gl_FragColor = vec4(mix(uBone, uSignal, vHot) * a, a);
}`;

function shader(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

export class Field {
  constructor(canvas, { count, reduce }) {
    this.canvas = canvas; this.reduce = reduce; this.N = count;
    this.scenes = []; this.cites = [[0, 0], [0, 0], [0, 0]]; this.citeW = 0; this.query = [0, 0];
    let gl = null;
    try { gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, depth: false, stencil: false, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
    this.ok = !!gl;
    if (!gl) { canvas.style.display = 'none'; return; }
    this.gl = gl;

    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog); gl.useProgram(prog);
    this.u = {
      res: gl.getUniformLocation(prog, 'uRes'), dpr: gl.getUniformLocation(prog, 'uDpr'), base: gl.getUniformLocation(prog, 'uBase'),
    };
    gl.uniform3f(gl.getUniformLocation(prog, 'uBone'), 236 / 255, 231 / 255, 220 / 255);
    gl.uniform3f(gl.getUniformLocation(prog, 'uSignal'), 1, 90 / 255, 31 / 255);

    const N = this.N;
    this.data = new Float32Array(N * 5);
    this.buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos'), aMeta = gl.getAttribLocation(prog, 'aMeta');
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(aMeta); gl.vertexAttribPointer(aMeta, 3, gl.FLOAT, false, 20, 8);
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);

    // per-particle randomness and state
    const R = rng(20260928);
    this.r1 = new Float32Array(N); this.r2 = new Float32Array(N); this.r3 = new Float32Array(N); this.r4 = new Float32Array(N);
    this.px = new Float32Array(N); this.py = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      this.r1[i] = R(); this.r2[i] = R(); this.r3[i] = R(); this.r4[i] = R();
      this.px[i] = this.r1[i] * innerWidth; this.py[i] = this.r2[i] * innerHeight;
    }

    // the embedding space: gaussian clusters in 3D, a question at the origin
    const gauss = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); };
    const centers = [[.05, .03, -.04]];
    while (centers.length < 7) {
      const c = [(R() - .5) * .5, (R() - .5) * .46, (R() - .5) * .5];
      if (Math.hypot(...c) > .12 && Math.hypot(...c) < .3) centers.push(c);
    }
    this.cloudN = Math.min(N, 4200);
    this.gx = new Float32Array(N); this.gy = new Float32Array(N); this.gz = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const c = centers[i % centers.length], sd = i % centers.length === 0 ? .045 : .055;
      this.gx[i] = c[0] + gauss() * sd; this.gy[i] = c[1] + gauss() * sd; this.gz[i] = c[2] + gauss() * sd;
    }
    const byDist = [];
    for (let i = 0; i < this.cloudN; i++) byDist.push([i, this.gx[i] ** 2 + this.gy[i] ** 2 + this.gz[i] ** 2]);
    byDist.sort((a, b) => a[1] - b[1]);
    this.near = new Uint8Array(N); byDist.slice(0, 12).forEach(([i]) => { this.near[i] = 1; });
    this.cited = byDist.filter((_, k) => k % 4 === 1).slice(0, 3).map(([i]) => i);

    this.T1 = { x: 0, y: 0, hot: 0, a: 0, s: 1, att: 0 };
    this.T2 = { x: 0, y: 0, hot: 0, a: 0, s: 1, att: 0 };
    this.P = [0, 0]; this.Nm = [0, 0];
  }

  resize(vw, vh, dpr) {
    if (!this.ok) return;
    this.vw = vw; this.vh = vh; this.dpr = dpr;
    this.canvas.width = Math.round(vw * dpr); this.canvas.height = Math.round(vh * dpr);
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.u.res, vw, vh); gl.uniform1f(this.u.dpr, dpr);
    gl.uniform1f(this.u.base, vw < 700 ? 2.3 : 2.7);
  }

  measure(scenes) {
    this.scenes = scenes;
    for (const s of scenes) {
      if (s.kind === 'grid' && s.stageBox) {
        const b = s.stageBox, n = this.N;
        const cols = Math.max(1, Math.round(Math.sqrt(n * b.w / b.h)));
        const rows = Math.ceil(n / cols);
        s.grid = { cols, rows, gx: b.w / cols, gy: b.h / rows };
      }
    }
  }

  /* where particle i sits when parked (invisible, drifting) */
  park(i, T, t) {
    this.dust(i, T, t); T.a = 0; T.hot = 0;
  }

  dust(i, T, t) {
    const r1 = this.r1[i], r2 = this.r2[i], r3 = this.r3[i], r4 = this.r4[i];
    T.x = r1 * this.vw + Math.sin(t * (.05 + .1 * r2) + r3 * 6.283) * 60;
    T.y = r2 * this.vh + Math.cos(t * (.04 + .08 * r4) + r1 * 6.283) * 50;
    T.hot = 0; T.a = .22; T.s = .85; T.att = 0;
  }

  form(s, i, T, t, sy) {
    const r1 = this.r1[i], r2 = this.r2[i], r3 = this.r3[i], r4 = this.r4[i];
    T.hot = 0; T.a = .8; T.s = 1; T.att = 1;
    switch (s.kind) {
      case 'grid': {
        const g = s.grid, b = s.stageBox;
        if (!g || i >= g.cols * g.rows) return this.park(i, T, t);
        const c = i % g.cols, r = (i / g.cols) | 0;
        const u = (c + .5) / g.cols, v = (r + .5) / g.rows;
        T.x = b.x + u * b.w;
        T.y = b.y + v * b.h - sy + Math.sin(t * 1.1 + c * .21 + r * .07) * 1.6;
        // a refresh pass sweeps diagonally across the records every few seconds
        const sweep = Math.exp(-(((u * .8 + v * .6 - (t * .22) % 2.2 + .4) * 7) ** 2));
        const edge = smooth(clamp(u * 7)) * smooth(clamp((1 - u) * 7)) * smooth(clamp(v * 7)) * smooth(clamp((1 - v) * 7));
        T.a = (.5 + .5 * sweep) * edge; T.s = 1 + .35 * sweep;
        if (r4 < .007) T.hot = clamp(Math.sin(t * 1.6 + r3 * 40) * 4 - 3);
        return;
      }
      case 'dust': return this.dust(i, T, t);
      case 'twins': {
        const b = s.stageBox, useN = Math.min(this.N, 4600);
        if (i >= useN) return this.park(i, T, t);
        const n1 = Math.floor(useN * .44);
        if (i < n1 * 2) {
          const A = i < n1, cx = b.x + (A ? .3 : .72) * b.w, cy = b.y + .49 * b.h - sy, R = .16 * b.w;
          const rr = R * Math.sqrt(r1), an = r2 * 6.283 + t * (A ? .1 : -.1);
          T.x = cx + Math.cos(an) * rr; T.y = cy + Math.sin(an) * rr;
          T.a = .55 + .3 * (1 - r1); T.s = .95;
          return;
        }
        // the sync stream arcing between the two populations
        const up = i & 1, u = (r1 + t * (.1 + r2 * .07)) % 1;
        const x0 = up ? .42 : .6, x1 = up ? .6 : .42, y0 = up ? .38 : .6, yc = up ? .2 : .78;
        const w = 1 - u, jit = (r3 - .5) * .02;
        T.x = b.x + (w * w * x0 + 2 * w * u * .51 + u * u * x1) * b.w;
        T.y = b.y + (w * w * y0 + 2 * w * u * (yc + jit) + u * u * y0) * b.h - sy;
        T.hot = 1; T.s = 1.25; T.a = Math.sin(Math.PI * u) * .95;
        return;
      }
      case 'cloud': {
        if (i >= this.cloudN) return this.park(i, T, t);
        const b = s.stageBox, cx = b.x + .5 * b.w, cy = b.y + .5 * b.h - sy;
        const rot = t * .2, tilt = .38;
        const gx = this.gx[i], gy = this.gy[i], gz = this.gz[i];
        const X = gx * Math.cos(rot) + gz * Math.sin(rot);
        const Z = -gx * Math.sin(rot) + gz * Math.cos(rot);
        const Y = gy * Math.cos(tilt) - Z * Math.sin(tilt);
        const Z2 = gy * Math.sin(tilt) + Z * Math.cos(tilt);
        const k = 1.5 / (1.5 + Z2);
        T.x = cx + X * k * b.w * 1.25; T.y = cy + Y * k * b.w * 1.25;
        T.a = .3 + .5 * clamp((k - .8) / .45); T.s = .6 + .55 * k;
        if (this.near[i]) { T.hot = 1; T.a = 1; T.s = 1.6; }
        return;
      }
      case 'river': {
        const route = s.route, useN = Math.min(this.N, 3400);
        if (!route || i >= useN) return this.park(i, T, t);
        const u = (r1 + t * .03 * (.6 + r2 * .8)) % 1;
        pointAtLen(route, u * route.total, this.P); normalAtLen(route, u * route.total, this.Nm);
        const off = (r3 - .5) * Math.min(26, s.stageBox.h * .08);
        T.x = this.P[0] + this.Nm[0] * off; T.y = this.P[1] + this.Nm[1] * off - sy;
        T.a = .7 * smooth(clamp(u * 14)) * smooth(clamp((1 - u) * 14));
        if (r4 > .975) { T.hot = 1; T.s = 1.8; T.a = Math.min(1, T.a * 1.4); }
        return;
      }
      case 'glyphs': return this.glyph(s, i, T, t, sy);
      case 'pulse': case 'cells': case 'ledger': case 'hub': case 'tree': {
        const useN = Math.min(this.N, 3200);
        if (!s.stageBox || i >= useN) return this.park(i, T, t);
        return this.shape(s.kind, s.stageBox, i, i, useN, T, t, sy, 0, true);
      }
      case 'stream': {
        const trunk = s.piece, useN = Math.min(this.N, 2400);
        if (!trunk || i >= useN) return this.park(i, T, t);
        if (r4 < .7 || !s.nodePts.length) {
          const u = (r1 + t * .025 * (.5 + r2)) % 1;
          pointAtLen(trunk, u * trunk.total, this.P);
          T.x = this.P[0] + (r3 - .5) * 12; T.y = this.P[1] - sy;
          T.a = .5 * smooth(clamp(u * 10)) * smooth(clamp((1 - u) * 10)); T.s = .9;
        } else {
          const n = s.nodePts[Math.floor(r1 * s.nodePts.length)], an = r2 * 6.283 + t * .5, rr = 14 + r3 * 16;
          T.x = n[0] + Math.cos(an) * rr; T.y = n[1] + Math.sin(an) * rr - sy;
          T.a = .5; T.s = .9; T.hot = .35;
        }
        return;
      }
      case 'point': {
        const c = s.caret, useN = Math.min(this.N, 2200);
        if (!c || i >= useN) return this.park(i, T, t);
        const core = r4 < .5, an = r1 * 6.283 + t * (.2 + .6 * (1 - r2));
        const rr = core ? 2.4 * r2 : 7 + 64 * r2 * r2;
        T.x = c[0] + Math.cos(an) * rr; T.y = c[1] + Math.sin(an) * rr * .9 - sy;
        T.hot = core ? 1 : .55; T.a = core ? .2 : .55 * (1 - r2); T.s = core ? 1.3 : .8;
        return;
      }
      default: return this.dust(i, T, t);
    }
  }

  /* five small signatures, one per build-log project */
  glyph(s, i, T, t, sy) {
    const rows = s.rows, useN = Math.min(this.N, 2600), per = Math.floor(useN / Math.max(1, rows.length));
    const ri = Math.floor(i / per);
    if (!rows.length || ri >= rows.length || !rows[ri].box) return this.park(i, T, t);
    const row = rows[ri];
    return this.shape(row.type, row.box, i, i - ri * per, per, T, t, sy, row.hot, false);
  }

  shape(type, bx, i, j, per, T, t, sy, boost, big) {
    const r1 = this.r1[i], r2 = this.r2[i], r3 = this.r3[i];
    const cx = bx.x + bx.w * .5, cy = bx.y + bx.h * .5 - sy;
    const W = bx.w * (big ? .82 : .78), H = big ? bx.h * .72 : Math.min(bx.h * .62, 86), R = Math.min(W, H) * .5;
    const z = big ? Math.max(1, R / 40) : 1; // mass grows with the stage
    let hot = 0; T.s = .9; T.a = .7;
    switch (type) {
      case 'pulse': { // a heartbeat of subscriptions, renewing outward
        const n = big ? 5 : 3, ring = j % n, rad = (ring / n + t * (big ? .12 : .28)) % 1, an = r2 * 6.283;
        const rr = rad * R * 1.2 + (r3 - .5) * z * 3;
        T.x = cx + Math.cos(an) * rr; T.y = cy + Math.sin(an) * rr;
        T.a = (1 - rad) * .85; hot = rad < .08 ? 1 : 0;
        if (big && j % 7 === 0) {
          const beat = Math.pow(Math.max(0, Math.sin(t * 2.4)), 12), rc = R * .13 * Math.sqrt(r1) * (1 + beat * .45);
          T.x = cx + Math.cos(an) * rc; T.y = cy + Math.sin(an) * rc; T.a = .75; hot = beat > .3 ? 1 : .35;
        }
        break;
      }
      case 'cells': { // tenants, each in its own box
        const cell = j % 6, col = cell % 3, rw = (cell / 3) | 0, cs = Math.min(W / 3.5, H / 2.3), gap = cs * .22;
        const x0 = cx - (3 * cs + 2 * gap) / 2, y0 = cy - (2 * cs + gap) / 2;
        T.x = x0 + col * (cs + gap) + r1 * cs; T.y = y0 + rw * (cs + gap) + r2 * cs;
        hot = cell === Math.floor(t * .7) % 6 ? 1 : 0; T.a = .6;
        break;
      }
      case 'ledger': { // payroll lines settling into a total
        const n = big ? 9 : 6, line = j % n, lens = [1, .78, .9, .62, .84, .7, .55, .88, .5];
        const L = (line === n - 1 ? .5 : lens[line]) * W * (.88 + .12 * Math.sin(t * 1.2 + line));
        const step = big ? 6 : 4;
        T.x = cx - W / 2 + Math.round(r1 * L / step) * step;
        T.y = cy - H / 2 + (line + .5) * (H / n) + (big ? (r3 - .5) * (H / n) * .3 : 0);
        hot = line === n - 1 ? 1 : 0; T.a = .75;
        break;
      }
      case 'hub': { // referrals flowing to one provider
        const sat = j % 6, an = sat / 6 * 6.283 + .4, sx = cx + Math.cos(an) * R * 1.25, syy = cy + Math.sin(an) * R * .95;
        const mode = j % 10;
        if (mode < 3) { const a2 = r1 * 6.283, rr = Math.sqrt(r2) * 7 * z; T.x = cx + Math.cos(a2) * rr; T.y = cy + Math.sin(a2) * rr; T.a = .5; }
        else if (mode < 6) { const a2 = r1 * 6.283, rr = Math.sqrt(r2) * 4.5 * z; T.x = sx + Math.cos(a2) * rr; T.y = syy + Math.sin(a2) * rr; T.a = .6; }
        else { const f = (r2 + t * .35) % 1, jt = (r3 - .5) * 2 * z; T.x = lerp(sx, cx, f) + jt; T.y = lerp(syy, cy, f) - jt; T.a = Math.sin(Math.PI * f) * .9; hot = 1; }
        break;
      }
      case 'tree': { // category, brand, model, part
        const nodes = [[0, -1]];
        for (let a = 0; a < 3; a++) nodes.push([(a - 1) * .62, 0]);
        for (let a = 0; a < 9; a++) nodes.push([(a - 4) * .23, 1]);
        const parent = k => (k === 0 ? -1 : k < 4 ? 0 : 1 + Math.floor((k - 4) / 3));
        const P = k => [cx + nodes[k][0] * W * .5, cy + nodes[k][1] * H * .42];
        if (j % 3 === 0) { const k = Math.floor(r1 * 13), p = P(k), a2 = r2 * 6.283, rr = Math.sqrt(r3) * 3 * z; T.x = p[0] + Math.cos(a2) * rr; T.y = p[1] + Math.sin(a2) * rr; T.a = .8; }
        else { const k = 1 + Math.floor(r1 * 12), a = P(parent(k)), b = P(k), f = (r2 + t * .3) % 1, jt = (r3 - .5) * 1.6 * z; T.x = lerp(a[0], b[0], f) + jt; T.y = lerp(a[1], b[1], f); T.a = .45; hot = f > .92 ? 1 : 0; }
        break;
      }
      default: this.dust(i, T, t);
    }
    if (big) T.a *= .75;
    T.hot = Math.max(hot, boost); T.a = Math.min(1, T.a + boost * .3); T.att = 1;
  }

  frame(state) {
    if (!this.ok || !this.scenes.length) return;
    const { sy, vh, dt, pointer } = state, N = this.N, reduce = this.reduce;
    const t = reduce ? 0 : state.time, sc = this.scenes, focus = sy + vh * .5;

    // which two formations are live, and how far between them we are
    let from = 0, b = 0;
    for (let j = 1; j < sc.length; j++) {
      const bj = smooth(clamp((focus - sc[j].box.y + vh * .3) / (vh * .45)));
      if (bj >= 1) from = j; else { if (j === from + 1) b = bj; break; }
    }
    if (reduce) b = b > .5 ? 1 : 0;
    const A = sc[from], B = sc[Math.min(from + 1, sc.length - 1)];
    const introOn = state.intro < 1 && from === 0;
    const k = reduce ? 1 : 1 - Math.exp(-dt * 11);
    const dS = state.dScroll || 0, T1 = this.T1, T2 = this.T2, d = this.data;
    const pOn = pointer.active && !reduce, pr = 120;

    for (let i = 0; i < N; i++) {
      this.form(A, i, T1, t, sy);
      if (introOn) {
        // the first build pass: points above the scan line fall into order
        const gx = T1.x, gy = T1.y, ga = T1.a, gh = T1.hot;
        this.dust(i, T2, t);
        const e = smooth(clamp((state.heroScan - gy) / 180 + .15 * this.r3[i]));
        T1.x = lerp(T2.x, gx, e); T1.y = lerp(T2.y, gy, e); T1.a = lerp(.55, ga, e); T1.hot = gh * e; T1.s = 1; T1.att = e;
      }
      let x = T1.x, y = T1.y, hot = T1.hot, a = T1.a, s = T1.s, att = T1.att;
      if (b > 0) {
        this.form(B, i, T2, t, sy);
        const e = reduce ? b : easeInOut(clamp(b * 1.6 - this.r1[i] * .6));
        x = lerp(x, T2.x, e); y = lerp(y, T2.y, e); hot = lerp(hot, T2.hot, e); a = lerp(a, T2.a, e); s = lerp(s, T2.s, e); att = lerp(att, T2.att, e);
        if (!reduce) {
          const w = Math.sin(Math.PI * e) * (16 + 34 * this.r2[i]);
          x += Math.sin(this.r3[i] * 40 + t * 1.3) * w; y += Math.cos(this.r4[i] * 40 + t * 1.1) * w;
        }
      }
      if (pOn) {
        const dx = x - pointer.x, dy = y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < pr * pr && d2 > .01) { const dd = Math.sqrt(d2), f = (1 - dd / pr) ** 2 * 36; x += dx / dd * f; y += dy / dd * f; }
      }
      this.py[i] -= dS * att;
      this.px[i] += (x - this.px[i]) * k;
      this.py[i] += (y - this.py[i]) * k;
      const o = i * 5;
      d[o] = this.px[i]; d[o + 1] = this.py[i]; d[o + 2] = hot; d[o + 3] = a; d[o + 4] = s;
    }

    // cited documents in the embedding space, for the line to point at
    const w = (A.kind === 'cloud' ? 1 - b : 0) + (B.kind === 'cloud' && B !== A ? b : 0);
    this.citeW = w;
    if (w > 0) {
      const S = A.kind === 'cloud' ? A : B, bx = S.stageBox, cx = bx.x + .5 * bx.w, cy = bx.y + .5 * bx.h - sy;
      this.query[0] = cx; this.query[1] = cy;
      this.cited.forEach((i, n) => { this.cites[n][0] = this.px[i]; this.cites[n][1] = this.py[i]; });
    }

    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, d);
    gl.drawArrays(gl.POINTS, 0, N);
  }
}
