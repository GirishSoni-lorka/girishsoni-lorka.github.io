/* The signal: one unbroken line from the hero to the email address. It is
   drawn by scrolling (a pen sits at 62% of the viewport) and bends into each
   system's diagram on the way down. */

import { clamp, smooth, connector, strokePart, pointAtLen } from './geo.js';

const SIGNAL = '#ff5a1f';
const BONE_FAINT = 'rgba(236, 231, 220, .28)';

export class Signal {
  constructor(canvas, { reduce }) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.reduce = reduce;
    this.pieces = []; this.scenes = []; this.P = [0, 0];
  }

  resize(vw, vh, dpr) {
    this.vw = vw; this.vh = vh; this.dpr = dpr;
    this.canvas.width = Math.round(vw * dpr); this.canvas.height = Math.round(vh * dpr);
  }

  build(scenes, state) {
    this.scenes = scenes; this.pieces = [];
    let prev = null;
    for (const s of scenes) {
      if (!s.piece) continue;
      if (prev) {
        const c = connector(prev.end, s.piece.start, state.vh);
        if (c.total > 2) this.pieces.push({ path: c, scene: null, p: 0 });
      }
      this.pieces.push({ path: s.piece, scene: s, p: 0 });
      prev = s.piece;
    }
  }

  frame(state, field) {
    const { ctx } = this, { sy, vw, vh, time, maxScroll } = state;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    if (!this.pieces.length) return;

    // the pen; near the bottom of the page it runs ahead so the line can finish
    let pen = sy + vh * .62;
    pen += smooth(clamp((sy - (maxScroll - vh * .6)) / (vh * .6))) * vh * 1.5;
    if (this.reduce) pen = Infinity;

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    let head = null, frontier = false;
    const top = sy - 40, bottom = sy + vh + 40;

    for (const pc of this.pieces) {
      const P = pc.path, span = P.end[1] - P.start[1];
      const p = span > 1 ? clamp((pen - P.start[1]) / span) : (pen >= P.start[1] ? 1 : 0);
      pc.p = p;
      if (pc.scene) pc.scene.lineP = p;
      const visible = P.maxY > top && P.minY < bottom;

      if (visible && p > 0) {
        this.stroke(P, p, sy);
        if (pc.scene) for (const br of pc.scene.branches) this.stroke(br, clamp(p / pc.scene.branchSync), sy);
      }
      if (!frontier && p < 1) {
        frontier = true;
        head = p > 0 ? pointAtLen(P, P.total * p, [0, 0]) : [P.start[0], P.start[1]];
      }
    }
    if (!frontier) { const last = this.pieces[this.pieces.length - 1].path; head = [last.end[0], last.end[1]]; }

    for (const s of this.scenes) this.decorate(s, state, pen, field);

    // the moving head of the request
    if (head && state.intro >= 1) {
      const hx = head[0], hy = head[1] - sy;
      if (hy > -20 && hy < vh + 20) {
        const breath = this.reduce ? 0 : (Math.sin(time * 3) + 1) * .5;
        ctx.fillStyle = 'rgba(255, 90, 31, .16)';
        ctx.beginPath(); ctx.arc(hx, hy, 10 + breath * 5, 0, 6.283); ctx.fill();
        ctx.fillStyle = SIGNAL;
        ctx.beginPath(); ctx.arc(hx, hy, 3.6, 0, 6.283); ctx.fill();
      }
    }
  }

  stroke(path, frac, sy) {
    const { ctx } = this;
    ctx.strokeStyle = 'rgba(255, 90, 31, .16)'; ctx.lineWidth = 6;
    strokePart(ctx, path, frac, sy);
    ctx.strokeStyle = SIGNAL; ctx.lineWidth = 1.6;
    strokePart(ctx, path, frac, sy);
  }

  decorate(s, state, pen, field) {
    const { ctx } = this, { sy, vh, time } = state, p = s.lineP;

    // stage labels appear as the line reaches them
    for (const tag of s.tags) {
      const on = p >= tag.at;
      if (on !== tag.on) { tag.on = on; tag.el.classList.toggle('is-on', on); }
    }

    // commits and build-log entries: hollow until the pen passes them
    for (const n of s.nodePts) {
      const y = n[1] - sy;
      if (y < -20 || y > vh + 20) continue;
      const lit = pen >= n[1];
      ctx.beginPath(); ctx.arc(n[0], y, 4.5, 0, 6.283);
      if (lit) {
        ctx.fillStyle = 'rgba(255, 90, 31, .18)'; ctx.beginPath(); ctx.arc(n[0], y, 10, 0, 6.283); ctx.fill();
        ctx.fillStyle = SIGNAL; ctx.beginPath(); ctx.arc(n[0], y, 4.5, 0, 6.283); ctx.fill();
      } else {
        ctx.fillStyle = '#05090b'; ctx.fill();
        ctx.strokeStyle = BONE_FAINT; ctx.lineWidth = 1.2; ctx.stroke();
      }
    }

    // the courier travelling the route, and the doorstep ping
    if (s.route && p > .06) {
      const drawn = Math.min(s.route.total, s.piece.total * p);
      const d = this.reduce ? drawn : (time * 120) % Math.max(1, drawn);
      pointAtLen(s.route, d, this.P);
      const x = this.P[0], y = this.P[1] - sy;
      if (y > -20 && y < vh + 20) {
        ctx.fillStyle = '#ece7dc'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.283); ctx.fill();
        ctx.strokeStyle = SIGNAL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.283); ctx.stroke();
      }
      if (drawn >= s.route.total - 1) {
        const e = s.route.end, ping = this.reduce ? .4 : (time % 1.6) / 1.6;
        ctx.strokeStyle = `rgba(255, 90, 31, ${1 - ping})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(e[0], e[1] - sy, 6 + ping * 22, 0, 6.283); ctx.stroke();
        ctx.fillStyle = SIGNAL; ctx.beginPath(); ctx.arc(e[0], e[1] - sy, 5, 0, 6.283); ctx.fill();
      }
    }

    // retrieval: the question points at the documents it cites
    const gate = s.line === 'stage' ? smooth(clamp((p - .9) / .1)) : smooth(clamp((field ? field.citeW : 0) * 2 - 1));
    if (s.kind === 'cloud' && field && field.citeW > 0 && gate > 0) {
      const a = field.citeW * gate;
      const [qx, qy] = field.query;
      ctx.globalAlpha = a;
      ctx.strokeStyle = SIGNAL; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      field.cites.forEach(c => { ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(c[0], c[1]); ctx.stroke(); });
      ctx.setLineDash([]);
      ctx.fillStyle = SIGNAL; ctx.font = '500 11px "Martian Mono", monospace';
      field.cites.forEach((c, n) => { ctx.fillText(`[${n + 1}]`, c[0] + 8, c[1] - 8); });
      ctx.beginPath(); ctx.arc(qx, qy, 5, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
