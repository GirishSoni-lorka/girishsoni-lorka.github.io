/* Scenes are the page sections tagged with data-scene. Each one tells the
   particle field which formation to build (data-scene) and the signal line
   which figure to draw (data-line). Measuring turns the live layout into
   page-space geometry, so per-frame work is only "subtract scrollY". */

import { Path, roundedPolyline } from './geo.js';

export function collectScenes(root = document) {
  return [...root.querySelectorAll('[data-scene]')].map((el, index) => ({
    el,
    index,
    kind: el.dataset.scene,
    line: el.dataset.line || 'rail',
    stage: el.querySelector('[data-stage]'),
    rail: el.querySelector('.rail'),
    tags: [...el.querySelectorAll('.tag')].map(t => ({ el: t, at: parseFloat(t.dataset.at || '0'), on: false })),
    nodes: [...el.querySelectorAll('[data-node]')],
    rows: [...el.querySelectorAll('[data-row]')].map(r => ({
      el: r, type: r.dataset.row, glyph: r.querySelector('[data-glyph]'), hot: 0, hover: false, box: null,
    })),
    lineP: 0,
  }));
}

const pageRect = (el, sy) => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top + sy, w: r.width, h: r.height };
};

export function measureScenes(scenes, state) {
  const { vw, vh, sy, mobile } = state;
  const ref = document.querySelector('.hero .wrap') || document.querySelector('.wrap');
  const wr = ref.getBoundingClientRect(), cs = getComputedStyle(ref);
  const cl = wr.left + parseFloat(cs.paddingLeft), cr = wr.right - parseFloat(cs.paddingRight);
  const railX = mobile ? Math.max(8, cl * .5) : (cl + cr) / 2;
  const rightX = mobile ? vw - Math.max(8, cl * .5) : Math.min(vw - 14, cr + Math.min(40, (vw - cr) * .5));

  for (const s of scenes) {
    s.box = pageRect(s.el, sy);
    s.stageBox = s.stage ? pageRect(s.stage, sy) : null;
    s.piece = null; s.branches = []; s.branchSync = 1; s.nodePts = []; s.route = null; s.caret = null;
    const top = s.box.y, bot = s.box.y + s.box.h;
    const leftX = s.rail ? s.rail.getBoundingClientRect().left : railX;

    switch (s.line) {
      case 'hero': {
        const y0 = bot - Math.max(56, vh * .075);
        s.piece = new Path().M(railX, y0).L(railX, bot).done();
        break;
      }
      case 'detour': {
        const b = vh * .32;
        s.piece = new Path().M(railX, top)
          .C(railX, top + b * .6, rightX, top + b * .4, rightX, top + b)
          .L(rightX, bot - b)
          .C(rightX, bot - b * .4, railX, bot - b * .6, railX, bot).done();
        break;
      }
      case 'rail':
        s.piece = new Path().M(railX, top).L(railX, bot).done();
        break;
      case 'rail-left':
        s.piece = new Path().M(leftX, top).L(leftX, bot).done();
        s.nodePts = s.nodes.map(n => {
          const r = pageRect(n, sy);
          return [leftX, n.classList.contains('row') || n.dataset.node === 'mid' ? r.y + r.h / 2 : r.y + 7];
        });
        break;
      case 'contact': {
        const email = s.el.querySelector('.contact__email');
        const range = document.createRange(); range.selectNodeContents(email);
        const rects = [...range.getClientRects()].filter(r => r.width > 1);
        let last = rects[0];
        for (const r of rects) if (r.bottom > last.bottom + 2 || (Math.abs(r.bottom - last.bottom) <= 2 && r.right > last.right)) last = r;
        const lineLeft = Math.min(...rects.filter(r => Math.abs(r.bottom - last.bottom) <= 2).map(r => r.left));
        const uy = last.bottom + sy + 8, ex = last.right + 14;
        const bend = Math.min(70, Math.max(24, lineLeft - leftX));
        s.piece = new Path().M(leftX, top).L(leftX, uy - bend)
          .C(leftX, uy - bend * .35, leftX + bend * .35, uy, Math.max(leftX + bend, lineLeft), uy)
          .L(ex, uy).done();
        s.caret = [ex + 4, uy];
        break;
      }
      case 'stage':
        if (s.stageBox) Object.assign(s, figure(s.kind, s.stageBox));
        break;
    }
    // formations that follow a figure's geometry need it even when the line runs elsewhere
    if (s.line !== 'stage' && s.stageBox && s.kind === 'river') s.route = figure('river', s.stageBox).route;

    for (const row of s.rows) row.box = row.glyph ? pageRect(row.glyph, sy) : null;
  }
  return { railX, rightX };
}

/* ---------- stage figures (the line draws the system's diagram) ---------- */
const mapper = b => (u, v) => [b.x + u * b.w, b.y + v * b.h];

function figure(kind, b) {
  const m = mapper(b);
  if (kind === 'twins') {
    // fork into two lanes (US, China), each running through its population,
    // then tie back together in a single sign-on knot
    const r = b.w * .035, [kx, ky] = m(.5, .915);
    const pre = new Path().M(...m(.5, 0)).C(...m(.5, .1), ...m(.3, .1), ...m(.3, .22))
      .L(...m(.3, .76)).C(...m(.3, .86), ...m(.42, .88), ...m(.5, .88));
    const preLen = pre.done().total;
    const piece = pre.A(kx, ky, r, -Math.PI / 2, Math.PI * 1.5).L(...m(.5, 1)).done();
    const branch = new Path().M(...m(.5, 0)).C(...m(.5, .1), ...m(.72, .1), ...m(.72, .22))
      .L(...m(.72, .76)).C(...m(.72, .86), ...m(.58, .88), ...m(.5, .88)).done();
    return { piece, branches: [branch], branchSync: preLen / piece.total };
  }
  if (kind === 'cloud') {
    // coil inward through the document space and stop on the question
    const [cx, cy] = m(.5, .5), R = b.w * .38, T = 2.25 * Math.PI * 2, pts = [];
    for (let a = 0; a <= T; a += .025) {
      const rr = R * (1 - a / T);
      pts.push([cx + Math.cos(-Math.PI / 2 + a) * rr, cy + Math.sin(-Math.PI / 2 + a) * rr]);
    }
    pts.push([cx, cy]);
    const piece = new Path().M(...m(.5, 0)).C(...m(.5, .05), ...m(.5, .08), cx, cy - R)
      .raw(pts).C(cx + b.w * .16, cy + b.w * .02, ...m(.5, .8), ...m(.5, 1)).done();
    return { piece };
  }
  if (kind === 'river') {
    // a street route from order placed to doorstep
    const pts = [[.22, 0], [.22, .24], [.05, .24], [.05, .62], [.34, .62], [.34, .88], [.62, .88], [.62, .38], [.8, .38], [.8, .7], [.95, .7]]
      .map(([u, v]) => m(u, v));
    const r = Math.min(30, b.w * .03);
    const route = roundedPolyline(pts, r).done();
    const piece = roundedPolyline([...pts, m(.95, 1)], r).done();
    return { piece, route };
  }
  // default: straight through the stage
  return { piece: new Path().M(...m(.5, 0)).L(...m(.5, 1)).done() };
}
