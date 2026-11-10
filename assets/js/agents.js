/* AI Agents mode — the same portfolio, revealed as if a team of AI agents
   were building it live in a design tool.

   Nothing here creates portfolio content. Every block is a real element of
   the page, hidden in place (its box is kept, so nothing shifts) and revealed
   by an agent in four stages: empty → selection → wireframe → completed.

   Architecture
   - One requestAnimationFrame loop drives a virtual clock, every cursor and
     every selection frame. Pausing stops the clock, so everything freezes in
     step, CSS animations included (html.ag-paused).
   - Each agent runs a small async "life" script (claim a block, travel,
     select, wireframe, reveal). Its awaits resolve on the virtual clock from
     the single loop; there is no per-cursor loop or timer.
   - Cursors and frames live in one absolutely positioned layer in page
     coordinates, so they scroll natively with the content. Only transforms
     (and, during a drag, the size of the selection box) change per frame.
   - IntersectionObserver decides what is near the viewport. Agents only
     build what the visitor can see (plus a little ahead), top to bottom at
     first and, once the visitor scrolls, closest-to-view first. */

import { figure } from './scenes.js';

const BLUE = '#4d8dff';

/* name, colour and the kinds of block each agent prefers */
const ROSTER = [
  { name: 'Architect', color: '#7aa2ff', skills: ['layout'] },
  { name: 'Designer', color: '#f472b6', skills: ['hero', 'diagram'] },
  { name: 'Claude', color: '#e8875b', skills: ['content', 'hero'] },
  { name: 'Reviewer', color: '#f87171', skills: ['review', 'contact'] },
  { name: 'Frontend', color: '#5cc8ff', skills: ['ui', 'hero'] },
  { name: 'Creative', color: '#fdba74', skills: ['projects', 'diagram'] },
  { name: 'Backend', color: '#b794f6', skills: ['tech'] },
  { name: 'Codex', color: '#4fd1a5', skills: ['ui', 'contact'] },
  { name: 'Researcher', color: '#facc15', skills: ['content', 'tech'] },
  { name: 'Engineer', color: '#86efac', skills: ['tech', 'projects'] },
  { name: 'Systems', color: '#a5b4c8', skills: ['layout', 'tech'] },
  { name: 'Developer', color: '#22d3ee', skills: ['projects', 'ui'] },
];

const VERBS = {
  layout: ['Laying out', 'Structuring'],
  hero: ['Composing', 'Designing'],
  content: ['Writing', 'Building'],
  ui: ['Rendering', 'Building'],
  tech: ['Wiring', 'Assembling'],
  projects: ['Assembling', 'Rendering'],
  diagram: ['Drawing', 'Plotting'],
  review: ['Finishing', 'Polishing'],
  contact: ['Connecting', 'Building'],
};

const DIAGRAMS = {
  grid: 'records grid', twins: 'US + China sync diagram', cloud: 'retrieval diagram', river: 'delivery route',
  pulse: 'subscription pulse', cells: 'tenant cells', ledger: 'tax ledger', hub: 'referral hub', tree: 'catalog tree',
};

const ICONS = {
  pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9M11 3.5v9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6L12.6 8z" fill="currentColor"/></svg>',
  skip: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.6v8.8L9.6 8zM12 3.5v9" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" fill="currentColor"/></svg>',
  auto: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v9M4.2 8l3.8 3.8L11.8 8M3.5 13.5h9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  replay: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.3 8a4.7 4.7 0 1 0 1.5-3.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3 2.6v2.8h2.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  fold: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6.5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[(Math.random() * list.length) | 0];
const minJerk = u => u * u * u * (10 - 15 * u + 6 * u * u); // human reaching profile
const pad2 = n => String(n).padStart(2, '0');
const clock24 = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };
const clip = (s, n = 30) => { s = s.replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };
const headingText = el => clip((el.querySelector('h1, h2, h3') || el).textContent || '');
const el = (tag, cls, htmlStr) => { const n = document.createElement(tag); if (cls) n.className = cls; if (htmlStr) n.innerHTML = htmlStr; return n; };

/* seeded per-agent personality so every visit feels like the same team */
function personality(i) {
  let s = (i + 1) * 9301 + 49297;
  const r = () => ((s = (s * 233280 + 49297) % 233280) / 233280);
  return {
    speed: .82 + r() * .4, // how fast they move
    bend: .1 + r() * .2, // how curved their paths are
    side: r() < .5 ? -1 : 1, // which way they tend to curve
    react: .1 + r() * .35, // pause before picking the next task
    amp: 9 + r() * 18, f1: .35 + r() * .5, f2: .3 + r() * .45, ph: r() * 6.283, // idle drift
  };
}

/* ---------- what counts as a block, and what to call it ---------- */
function describe(node) {
  const kind = node.closest('[data-scene]')?.dataset.scene || '';
  const is = sel => node.matches(sel);
  if (is('.bar')) return ['layout', 'navigation bar', 'Navbar'];
  if (is('.foot')) return ['review', 'footer', 'Footer'];
  if (is('[data-stage]')) return ['diagram', DIAGRAMS[kind] || `${kind || 'system'} diagram`, 'Diagram'];
  if (is('.hero__status')) return ['hero', 'availability status', 'StatusBadge'];
  if (is('.hero__name')) return ['hero', 'hero heading', 'HeroTitle'];
  if (is('.hero__lead')) return ['content', 'introduction', 'HeroIntro'];
  if (is('.hero__actions')) return ['ui', 'call-to-action buttons', 'HeroActions'];
  if (is('.manifesto__xr')) return ['content', 'approach statement', 'Manifesto'];
  if (is('.principle')) return ['tech', `principle “${headingText(node)}”`, 'PrincipleCard'];
  if (is('.chapter__title, .sheet__title')) return ['content', `“${headingText(node)}” title`, 'ProjectTitle'];
  if (is('.chapter__meta, .sheet__meta')) return ['content', 'project meta', 'ProjectMeta'];
  if (is('.chapter__lead, .sheet__lead')) return ['content', 'project summary', 'ProjectSummary'];
  if (is('.chapter__wins, .sheet__list')) return ['tech', 'outcomes list', 'OutcomeList'];
  if (is('.chapter__stack, .sheet__stack')) return ['tech', 'tech stack', 'TechStack'];
  if (is('.sheet__sub')) return ['ui', `“${headingText(node)}” subheading`, 'Subheading'];
  if (is('.row')) return ['projects', `project card “${clip(node.querySelector('.row__name')?.textContent || '', 24)}”`, 'ProjectRow'];
  if (is('.toc > li')) return ['projects', `index card “${clip(node.querySelector('.toc__name')?.textContent || '', 24)}”`, 'IndexCard'];
  if (is('.log__all')) return ['ui', 'projects link', 'LinkCTA'];
  if (is('.commit > .xr')) return ['content', `experience “${clip(node.querySelector('.commit__where')?.textContent || '', 22)}”`, 'ExperienceEntry'];
  if (is('.contact__head')) return ['contact', 'contact heading', 'ContactHeader'];
  if (is('.contact__email')) return ['contact', 'email link', 'EmailLink'];
  if (is('.contact__links')) return ['contact', 'contact links', 'ContactLinks'];
  if (is('.xr')) return ['layout', `section header “${headingText(node)}”`, 'SectionHeader'];
  return ['ui', 'component', 'Component'];
}

function collectBlocks() {
  const out = [], seen = new Set();
  const add = node => {
    if (!node || seen.has(node)) return;
    seen.add(node);
    const [role, label, comp] = describe(node);
    out.push({
      el: node, role, label, comp, index: out.length,
      stage: node.matches('[data-stage]'),
      state: 'empty', x: 0, y: 0, w: 0, h: 0, frame: null, agent: null, reviewedAt: -99,
    });
  };
  add(document.querySelector('.bar'));
  const sel = 'main .xr, main [data-stage], main .log__all, main .contact__email, main .contact__links, main .toc > li';
  for (const node of document.querySelectorAll(sel)) {
    if (node.closest('.xr__bone')) continue;
    if (node.classList.contains('xr')) {
      const row = node.closest('.row');
      if (row) { add(row); continue; }
      // long copy blocks are built piece by piece; compact ones in one go
      if (node.matches('.hero__xr, .chapter__copy, .sheet__copy')) {
        const skin = node.querySelector(':scope > .xr__skin');
        if (skin) { for (const kid of skin.children) add(kid); continue; }
      }
    }
    add(node);
  }
  add(document.querySelector('.foot'));
  return out;
}

/* stage diagrams: the same geometry the classic signal line draws, as SVG */
function diagramFor(stage, uid) {
  const kind = stage.closest('[data-scene]')?.dataset.scene || '';
  const w = stage.clientWidth, h = stage.clientHeight;
  const wrap = el('div', 'ag-diagram');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.dataset.kind = kind;
  wrap.dataset.size = `${w}x${h}`;
  let paths = [];
  if (w > 10 && h > 10 && (kind === 'twins' || kind === 'cloud' || kind === 'river')) {
    const f = figure(kind, { x: 0, y: 0, w, h });
    paths = [f.piece, ...(f.branches || [])].filter(Boolean);
  }
  const d = p => {
    const pts = p.pts, step = pts.length > 500 ? 2 : 1;
    let s = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = step; i < pts.length; i += step) s += `L${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
    const l = pts[pts.length - 1];
    return `${s}L${l[0].toFixed(1)} ${l[1].toFixed(1)}`;
  };
  const ends = paths.length ? [paths[0].start, paths[0].end] : [];
  wrap.innerHTML = `<div class="ag-diagram__dots${kind === 'grid' ? ' is-grid' : ''}"></div>${paths.length ? `
    <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" data-uid="${uid}">
      ${paths.map((p, k) => `<path class="ag-path${k ? ' ag-path--branch' : ''}" pathLength="1" d="${d(p)}"/>`).join('')}
      ${ends.map(([x, y]) => `<circle class="ag-node" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5"/>`).join('')}
    </svg>` : ''}`;
  return wrap;
}

/* skeleton bars from the real text line boxes of a block, as CSS gradients */
function skeletonStyle(b) {
  const r0 = b.el.getBoundingClientRect();
  const lines = [];
  const walker = document.createTreeWalker(b.el, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (n.nodeValue.trim() && !n.parentElement.closest('.xr__bone, .ag-diagram, .tag') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const range = document.createRange();
  while (walker.nextNode() && lines.length < 40) {
    range.selectNodeContents(walker.currentNode);
    for (const r of range.getClientRects()) {
      if (r.width < 2 || r.height < 2) continue;
      const hit = lines.find(l => Math.abs(l.top - r.top) < 4 && r.left - l.right < 18 && l.left - r.right < 18);
      if (hit) { hit.left = Math.min(hit.left, r.left); hit.right = Math.max(hit.right, r.right); hit.h = Math.max(hit.h, r.height); }
      else lines.push({ top: r.top, left: r.left, right: r.right, h: r.height });
    }
  }
  const bars = lines.map(l => {
    const bh = Math.max(4, Math.round(l.h * (l.h > 40 ? .58 : .5)));
    return { x: Math.round(l.left - r0.left), y: Math.round(l.top - r0.top + (l.h - bh) / 2), w: Math.round(l.right - l.left), h: bh };
  });
  for (const btn of b.el.querySelectorAll('.btn')) {
    const r = btn.getBoundingClientRect();
    bars.push({ x: Math.round(r.left - r0.left), y: Math.round(r.top - r0.top), w: Math.round(r.width), h: Math.round(r.height), soft: true });
  }
  if (!bars.length) return null;
  return {
    backgroundImage: bars.map(s => (s.soft ? 'linear-gradient(var(--sk-soft), var(--sk-soft))' : 'linear-gradient(var(--sk), var(--sk))')).join(','),
    backgroundSize: bars.map(s => `${s.w}px ${s.h}px`).join(','),
    backgroundPosition: bars.map(s => `${s.x}px ${s.y}px`).join(','),
  };
}

/* ==========================================================================
   The engine
   ========================================================================== */
export function createAgents({ reduce = false } = {}) {
  const html = document.documentElement;
  const bar = document.querySelector('.bar');
  const foot = document.querySelector('.foot');
  let panelLift = -1;

  let alive = false, paused = false, raf = 0, last = 0, clock = 0, gen = 0;
  let sy = scrollY, vw = innerWidth, vh = innerHeight, startSy = scrollY;
  let handover = scrollY > 40, measureAll = true, finished = false, barOn = null;
  // auto-scroll tour: the page glides down on its own, waiting for the agents
  let auto = false, autoY = 0, autoV = 0, autoGoal = 0, gateAt = 0, autoBtn = null;
  let layer, frameBox, cursorBox, panel, logList, progressEl, onlineEl, pauseBtn;
  let io = null, io2 = null, ro = null, resizeTimer = 0;
  let atEnd = false, live = null, sections = [], you = null;
  const timers = [];
  const blocks = [];
  const byEl = new Map();
  const visible = new Set(); // in the build zone (upper part of the screen)
  const onScreen = new Set(); // anywhere on screen: the footer only ever reaches the bottom edge
  const agents = [];
  const frames = new Set();
  const diagrams = [];
  const off = [];
  const logQueue = [];
  let lastLogAt = 0;

  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); off.push(() => target.removeEventListener(type, fn, opts)); };
  const wait = s => new Promise(res => timers.push({ t: clock + s, res }));
  const later = (s, fn) => timers.push({ t: clock + s, res: fn });

  /* ---------- measuring ---------- */
  function measure(b) {
    const r = b.el.getBoundingClientRect();
    b.x = r.left + scrollX; b.y = r.top + sy; b.w = r.width; b.h = r.height;
  }
  const inView = b => b.y < sy + vh && b.y + b.h > sy;

  /* ---------- logging ---------- */
  function log(agent, text, now = false) {
    const item = { agent, text };
    if (now) { show(item); return; }
    logQueue.push(item);
    if (logQueue.length > 3) logQueue.shift(); // never fall far behind what is happening
  }
  function show({ agent, text }) {
    if (!logList) return;
    const li = el('li', 'ag-log__item');
    const time = el('time'); time.textContent = clock24();
    const dot = el('i'); dot.style.setProperty('--c', agent ? agent.def.color : 'var(--ash)');
    const who = el('b'); who.textContent = agent ? agent.def.name : 'System';
    const what = el('span'); what.textContent = ` — ${text}`;
    li.append(time, dot, who, what);
    logList.appendChild(li);
    while (logList.children.length > 4) logList.firstElementChild.remove();
    lastLogAt = performance.now();
  }
  function flushLog(now) {
    if (logQueue.length && now - lastLogAt > 520) show(logQueue.shift());
  }
  function progress() {
    if (!progressEl) return;
    let done = 0; for (const b of blocks) if (b.state === 'done') done++;
    progressEl.textContent = `${done}/${blocks.length}`;
    syncLive();
    if (done === blocks.length && !finished) {
      finished = true;
      const rev = agents.find(a => a.def.name === 'Reviewer') || agents[0];
      log(rev || null, 'Final review passed — portfolio shipped');
    }
  }

  /* ---------- cursors ---------- */
  function makeAgent(def, i) {
    const node = el('div', 'ag-cursor', `
      <svg class="ag-cursor__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.2 2.6v16.6l4.3-4.1 2.9 6.3 3-1.4-2.9-6.2h6z"/></svg>
      <span class="ag-cursor__ring"></span>
      <span class="ag-cursor__tag"></span>`);
    node.style.setProperty('--c', def.color);
    node.querySelector('.ag-cursor__tag').textContent = def.name;
    cursorBox.appendChild(node);
    // enter from just outside the viewport
    const edge = i % 3, a = {
      def, el: node, ring: node.querySelector('.ag-cursor__ring'), ...personality(ROSTER.indexOf(def)),
      x: edge === 0 ? -40 : edge === 1 ? vw + 40 : rand(.1, .9) * vw,
      y: edge === 2 ? sy + vh + 40 : sy + rand(.15, .85) * vh,
      mv: null, state: 'idle', task: null, key: '', down: false, idleSince: 0, resting: false,
      home: { u: rand(.08, .92), v: rand(.18, .88) }, homeAt: 0, reviewAt: 6 + i,
      enter: .2 + i * .1,
    };
    return a;
  }

  function moveTo(a, target, dur) {
    return new Promise(res => {
      const [tx, ty] = target();
      const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy) || 1;
      const side = Math.random() < .8 ? a.side : -a.side;
      if (a.resting) { a.resting = false; a.el.classList.remove('is-resting'); }
      a.idleSince = clock;
      a.mv = { fx: a.x, fy: a.y, nx: -dy / d, ny: dx / d, bend: Math.min(160, d * a.bend * rand(.55, 1.15)) * side, target, t0: clock, dur: Math.max(.08, dur), res };
    });
  }
  const travel = (a, x, y) => Math.min(1.3, (.22 + Math.sqrt(Math.hypot(x - a.x, y - a.y)) / 42) / a.speed);

  /* idle spots spread out so name tags never pile up */
  function freeSpot(a) {
    let best = null, bestD = -1;
    for (let k = 0; k < 10; k++) {
      const c = { u: rand(.08, .92), v: rand(.18, .86) };
      let d = Infinity;
      for (const o of agents) if (o !== a) d = Math.min(d, Math.hypot((o.home.u - c.u) * vw, (o.home.v - c.v) * vh));
      if (d > 150) return c;
      if (d > bestD) { bestD = d; best = c; }
    }
    return best;
  }

  function setDown(a, v) { if (a.down !== v) { a.down = v; a.el.classList.toggle('is-down', v); } }
  function click(a) {
    if (a.ring.animate) a.ring.animate([{ transform: 'scale(.3)', opacity: .9 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.2,.7,.3,1)' });
  }

  /* an agent that is off screen re-enters from the nearest viewport edge */
  function enterNear(a, x) {
    const top = sy - 80, bot = sy + vh + 80;
    if (a.y >= top && a.y <= bot) return;
    a.y = a.y < top ? sy - 36 : sy + vh + 36;
    a.x = clamp(x + rand(-220, 220), 12, vw - 12);
  }

  function step(a, dt) {
    if (a.mv) {
      const m = a.mv, u = clamp((clock - m.t0) / m.dur), e = minJerk(u);
      const [tx, ty] = m.target();
      const cx = (m.fx + tx) / 2 + m.nx * m.bend, cy = (m.fy + ty) / 2 + m.ny * m.bend, iu = 1 - e;
      a.x = iu * iu * m.fx + 2 * iu * e * cx + e * e * tx;
      a.y = iu * iu * m.fy + 2 * iu * e * cy + e * e * ty;
      if (u >= 1) { a.mv = null; m.res(); }
      return;
    }
    if (a.state !== 'idle') { a.idleSince = clock; if (a.resting) { a.resting = false; a.el.classList.remove('is-resting'); } return; }
    // long idle: fade back so finished content reads cleanly
    if (!a.resting && clock - a.idleSince > 3.5) { a.resting = true; a.el.classList.add('is-resting'); }
    // idle: hover near a home spot in the viewport with a slow, personal drift
    const tx = a.home.u * vw + Math.sin(clock * a.f1 + a.ph) * a.amp;
    const ty = sy + a.home.v * vh + Math.cos(clock * a.f2 + a.ph * 1.3) * a.amp * .7;
    if (Math.abs(ty - a.y) > vh * 1.3) a.y = a.y < ty ? sy - 36 : sy + vh + 36;
    const k = 1 - Math.exp(-dt * 2.4);
    a.x += (tx - a.x) * k; a.y += (ty - a.y) * k;
  }

  /* ---------- frames (selection → wireframe → done) ---------- */
  function makeFrame(b, a) {
    const f = {
      b, a, stage: 'select', key: '', dimKey: '',
      el: el('div', 'ag-frame is-select', `
        <div class="ag-frame__sk"></div>
        <i class="ag-h ag-h--tl"></i><i class="ag-h ag-h--tr"></i><i class="ag-h ag-h--bl"></i><i class="ag-h ag-h--br"></i>
        <span class="ag-frame__dim"></span>
        <span class="ag-frame__tip"><i></i><b></b></span>`),
    };
    f.el.style.setProperty('--c', a.def.color);
    f.dim = f.el.querySelector('.ag-frame__dim');
    f.sk = f.el.querySelector('.ag-frame__sk');
    f.el.querySelector('.ag-frame__tip b').textContent = `${a.def.name} · <${b.comp} />`;
    frameBox.appendChild(f.el);
    frames.add(f);
    return f;
  }
  function setStage(f, stage) {
    f.stage = stage;
    f.el.className = `ag-frame is-${stage}`;
  }
  function dropFrame(f) {
    if (!f) return;
    f.el.remove(); frames.delete(f);
    if (f.b && f.b.frame === f) f.b.frame = null;
  }
  function renderFrame(f) {
    const b = f.b;
    let x = b.x, y = b.y, w = b.w, h = b.h;
    if (f.stage === 'select') {
      const a = f.a;
      x = Math.min(b.x, a.x); y = Math.min(b.y, a.y); w = Math.abs(a.x - b.x); h = Math.abs(a.y - b.y);
    }
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const key = `${x}|${y}|${w}|${h}`;
    if (key === f.key) return;
    f.key = key;
    f.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    f.el.style.width = `${w}px`; f.el.style.height = `${h}px`;
    if (f.stage !== 'review') f.dim.textContent = `${w} × ${h}`;
  }

  /* ---------- block states ---------- */
  function setBlock(b, state) {
    b.state = state;
    if (state === 'done') b.el.removeAttribute('data-ag');
    else b.el.dataset.ag = state;
  }
  function drawDiagram(b, instant) {
    if (!b.stage) return;
    const d = b.el.querySelector(':scope > .ag-diagram');
    if (d) { d.classList.toggle('is-instant', !!instant); d.classList.add('is-drawn'); }
  }
  function reveal(b) {
    b.state = 'done';
    b.el.dataset.ag = 'reveal';
    drawDiagram(b, false);
    const f = b.frame;
    if (f) { setStage(f, 'done'); later(.85, () => dropFrame(f)); }
    later(.75, () => { if (b.state === 'done' && b.el.dataset.ag === 'reveal') b.el.removeAttribute('data-ag'); });
    b.agent = null;
    progress();
  }
  function finishNow(b) {
    if (b.frame) dropFrame(b.frame);
    b.agent = null;
    setBlock(b, 'done');
    drawDiagram(b, true);
  }

  /* ---------- scheduling ---------- */
  function pending() {
    const list = [];
    for (const b of blocks) if (b.state === 'empty' && (visible.has(b) || (atEnd && onScreen.has(b)))) list.push(b);
    return list;
  }
  function tempo() {
    const n = pending().length;
    return n > agents.length * 2 ? .55 : n > agents.length ? .75 : 1;
  }
  function claim(a) {
    let list = pending();
    if (!list.length) return null;
    if (handover) {
      // the visitor is driving: build what is closest to the middle of the screen first
      const mid = sy + vh * .45;
      for (const b of list) measure(b);
      const dist = b => (mid < b.y ? b.y - mid : mid > b.y + b.h ? mid - b.y - b.h : 0);
      list = list.sort((p, q) => dist(p) - dist(q) || p.index - q.index);
    }
    const top = list.slice(0, 3);
    const fit = top.find(x => a.def.skills.includes(x.role));
    // the reviewer keeps to finishing work unless the team is swamped
    if (!fit && a.def.skills.includes('review') && list.length <= agents.length) return null;
    const b = fit || top[0];
    b.state = 'claimed'; b.agent = a;
    return b;
  }

  async function work(a, b, g) {
    const stop = () => g !== gen || !alive || b.state === 'done';
    a.task = b; a.state = 'busy';
    measure(b);
    log(a, `${pick(VERBS[b.role] || VERBS.ui)} ${b.label}`);
    const tp = tempo();

    // travel to the top-left corner
    enterNear(a, b.x);
    await moveTo(a, () => [b.x, b.y], travel(a, b.x, b.y) * tp);
    if (stop()) return;

    // stage 2: drag a selection out to the bottom-right corner
    setBlock(b, 'select');
    b.frame = makeFrame(b, a);
    setDown(a, true); click(a);
    const diag = Math.hypot(b.w, b.h);
    await moveTo(a, () => [b.x + b.w, b.y + b.h], ((.38 + Math.min(.45, diag / 2400)) / a.speed) * tp);
    setDown(a, false);
    if (stop()) return;

    // stage 3: wireframe — outline, skeleton and a label while the agent edits
    setBlock(b, 'wire');
    const f = b.frame;
    if (f) {
      if (b.stage) f.sk.classList.add('is-media');
      else { const s = skeletonStyle(b); if (s) Object.assign(f.sk.style, s); else f.sk.classList.add('is-media'); }
      setStage(f, 'wire');
      if (b.y - sy < 30) f.el.classList.add('tip-inside');
    }
    const edits = b.w * b.h > 90000 ? 2 : 1;
    for (let i = 0; i < edits; i++) {
      const rx = rand(.12, .88), ry = rand(.2, .8);
      await moveTo(a, () => [b.x + b.w * rx, b.y + b.h * ry], (rand(.22, .4) / a.speed) * tp);
      if (stop()) return;
      setDown(a, true); click(a);
      await wait(rand(.08, .16) * tp);
      setDown(a, false);
      if (stop()) return;
    }
    await wait(rand(.15, .3) * tp);
    if (stop()) return;

    // stage 4: completed
    reveal(b);
    a.task = null;
  }

  /* the reviewer double-checks finished work while there is nothing to build */
  async function review(a, g) {
    const done = blocks.filter(b => b.state === 'done' && !b.el.hasAttribute('data-ag') && clock - b.reviewedAt > 30 && visible.has(b));
    for (const b of done) measure(b);
    const list = done.filter(b => inView(b) && b.h < vh * .8 && b.w > 40);
    if (!list.length) return false;
    const b = pick(list);
    b.reviewedAt = clock;
    a.state = 'busy';
    await moveTo(a, () => [b.x + b.w * .85, b.y + Math.min(b.h, 60) * .5], travel(a, b.x, b.y));
    if (g !== gen) return true;
    const f = makeFrame(b, a);
    f.el.querySelector('.ag-frame__tip b').textContent = '✓ Looks right';
    setStage(f, 'review');
    log(a, `Checking ${pick(['spacing', 'alignment', 'contrast', 'type scale', 'line length'])} on ${b.label}`);
    click(a);
    await wait(1.1);
    f.el.classList.add('is-leaving');
    later(.4, () => dropFrame(f));
    return true;
  }

  async function life(a, g) {
    await wait(a.enter);
    while (alive && g === gen) {
      const b = claim(a);
      if (b) {
        await work(a, b, g);
        if (g !== gen) return;
        a.state = 'idle';
        await wait(a.react * tempo());
        continue;
      }
      a.state = 'idle';
      if (a.def.name === 'Reviewer' && clock > a.reviewAt) {
        a.reviewAt = clock + rand(5, 9);
        if (await review(a, g)) { if (g !== gen) return; a.state = 'idle'; continue; }
      }
      if (clock > a.homeAt) {
        a.homeAt = clock + rand(3.5, 7.5);
        a.home = freeSpot(a);
      }
      await wait(.15);
    }
  }

  function spawnLives() {
    const g = gen;
    for (const a of agents) life(a, g).catch(fail);
  }

  /* ---------- the one loop ---------- */
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    try {
      clock += dt;
      // reads first
      const y = scrollY;
      const scrolled = y !== sy;
      sy = y;
      atEnd = sy + vh >= document.documentElement.scrollHeight - 4;
      if (scrolled || measureAll) {
        // only what is being worked on; finished blocks are mid-reveal (scaled) and stay put
        for (const f of frames) if (f.stage !== 'done') measure(f.b);
        for (const a of agents) if (a.task && a.task.state === 'claimed') measure(a.task);
        measureAll = false;
      }
      if (auto) tour(dt);
      // timers on the virtual clock
      for (let i = timers.length - 1; i >= 0; i--) {
        if (timers[i].t <= clock) { const t = timers[i]; timers.splice(i, 1); t.res(); }
      }
      // then writes
      for (const a of agents) {
        step(a, dt);
        const key = `${a.x.toFixed(1)}|${a.y.toFixed(1)}`;
        if (key !== a.key) { a.key = key; a.el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`; }
      }
      for (const f of frames) renderFrame(f);
      flushLog(now);
    } catch (e) { fail(e); }
  }
  /* ---------- auto-scroll tour ---------- */
  // how fast to glide: wait while unbuilt blocks sit in the upper part of the
  // screen, crawl while new ones come into view, cruise through empty stretches
  function cruise() {
    const s = Math.max(.6, vh / 900);
    let near = false, ahead = false;
    for (const b of visible) {
      if (b.state === 'done') continue;
      measure(b);
      if (b.y + b.h <= sy) continue;
      if (b.y - sy < vh * .5) near = true; else ahead = true;
    }
    return near ? 0 : ahead ? 85 * s : 240 * s;
  }
  function tour(dt) {
    // something else moved the page (anchor jump, scroll restore): a visitor if we were gliding, otherwise just follow
    if (Math.abs(sy - autoY) > 6) { if (autoV >= .3) { stopAuto(true); return; } autoY = sy; }
    if (clock > gateAt) { gateAt = clock + .15; autoGoal = cruise(); }
    autoV += (autoGoal - autoV) * (1 - Math.exp(-dt * 2.2));
    if (autoV < .3) return;
    const max = document.documentElement.scrollHeight - vh;
    autoY = Math.min(max, autoY + autoV * dt);
    window.scrollTo(0, autoY);
    if (autoY >= max - 1) { stopAuto(false); log(null, 'Reached the end — auto-scroll off'); }
  }
  function setAutoBtn() {
    if (!autoBtn) return;
    autoBtn.setAttribute('aria-pressed', auto ? 'true' : 'false');
    autoBtn.title = auto ? 'Stop auto-scroll' : 'Auto-scroll';
    autoBtn.setAttribute('aria-label', auto ? 'Stop auto-scroll' : 'Start auto-scroll');
  }
  function startAuto(delay = 0) {
    if (reduce || !alive) return;
    auto = true; autoY = scrollY; autoV = 0; autoGoal = 0; gateAt = clock + delay;
    html.classList.add('ag-autoscroll');
    setAutoBtn();
  }
  function stopAuto(byVisitor) {
    if (!auto) return;
    auto = false; autoV = 0;
    html.classList.remove('ag-autoscroll');
    setAutoBtn();
    if (byVisitor) {
      handover = true;
      log(null, 'Visitor took over scrolling — building what is in view');
    } else startSy = scrollY; // our own last glide is not the visitor scrolling
  }

  function run() {
    if (!alive || paused || document.hidden || raf) return;
    last = performance.now();
    autoY = scrollY;
    raf = requestAnimationFrame(loop);
  }
  function halt() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  let failed = false;
  function fail(e) {
    if (failed) return;
    failed = true;
    console.warn('AI Agents mode stopped; showing the finished page', e);
    halt();
    for (const b of blocks) finishNow(b);
    for (const f of [...frames]) dropFrame(f);
    if (cursorBox) cursorBox.hidden = true;
    setLive(true);
  }

  /* ---------- controls ---------- */
  function resetRun() {
    gen++;
    timers.length = 0;
    for (const f of [...frames]) dropFrame(f);
    for (const a of agents) { a.mv = null; a.task = null; a.state = 'idle'; setDown(a, false); }
  }
  function setPaused(v) {
    if (paused === v || !alive) return;
    paused = v;
    html.classList.toggle('ag-paused', v);
    if (pauseBtn) {
      pauseBtn.innerHTML = v ? ICONS.play : ICONS.pause;
      pauseBtn.setAttribute('aria-label', v ? 'Resume agents' : 'Pause agents');
      pauseBtn.title = v ? 'Resume' : 'Pause';
      pauseBtn.setAttribute('aria-pressed', v ? 'true' : 'false');
    }
    log(null, v ? 'Agents paused' : 'Agents resumed', true);
    if (v) halt(); else run();
  }
  function skip() {
    if (!alive) return;
    resetRun();
    for (const b of blocks) finishNow(b);
    finished = true;
    stopAuto(false);
    progress();
    log(null, 'Skipped — every section revealed', true);
    spawnLives();
  }
  function replay() {
    if (!alive) return;
    resetRun();
    finished = false;
    for (const b of blocks) {
      setBlock(b, 'empty'); b.agent = null; b.reviewedAt = -99;
      const d = b.stage && b.el.querySelector(':scope > .ag-diagram');
      if (d) d.classList.remove('is-drawn', 'is-instant');
    }
    html.classList.add('ag-autoscroll');
    window.scrollTo(0, 0);
    sy = 0; handover = false; startSy = 0;
    startAuto(1.2);
    agents.forEach((a, i) => { a.enter = .2 + i * .12; });
    progress();
    log(null, 'Replay — rebuilding from an empty canvas', true);
    spawnLives();
    if (paused) setPaused(false);
  }

  /* ---------- DOM ---------- */
  function buildPanel(count) {
    panel = el('aside', 'ag-panel is-folded'); // starts small: just the header
    panel.setAttribute('aria-label', 'Agent activity');
    panel.innerHTML = `
      <div class="ag-panel__head">
        <span class="ag-panel__live" aria-hidden="true"></span>
        <span class="ag-panel__title">Agents</span>
        <span class="ag-panel__meta"><span class="ag-panel__online"></span><span class="ag-panel__progress"></span></span>
        <span class="ag-panel__ctrl">
          <button type="button" class="ag-btn" data-act="pause" title="Pause" aria-label="Pause agents" aria-pressed="false">${ICONS.pause}</button>
          <button type="button" class="ag-btn" data-act="auto" title="Auto-scroll" aria-label="Start auto-scroll" aria-pressed="false">${ICONS.auto}</button>
          <button type="button" class="ag-btn" data-act="skip" title="Skip animation" aria-label="Skip animation">${ICONS.skip}</button>
          <button type="button" class="ag-btn" data-act="replay" title="Replay" aria-label="Replay construction">${ICONS.replay}</button>
          <button type="button" class="ag-btn ag-btn--fold" data-act="fold" title="Show activity log" aria-label="Expand activity log" aria-expanded="false">${ICONS.fold}</button>
        </span>
      </div>
      <ol class="ag-log"></ol>`;
    logList = panel.querySelector('.ag-log');
    progressEl = panel.querySelector('.ag-panel__progress');
    onlineEl = panel.querySelector('.ag-panel__online');
    onlineEl.textContent = count ? `${count} online · ` : '';
    pauseBtn = panel.querySelector('[data-act="pause"]');
    autoBtn = panel.querySelector('[data-act="auto"]');
    if (reduce) panel.querySelectorAll('[data-act="pause"], [data-act="skip"], [data-act="auto"]').forEach(n => n.remove());
    on(panel, 'click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'pause') setPaused(!paused);
      else if (act === 'skip') skip();
      else if (act === 'auto') { if (auto) stopAuto(false); else { startAuto(); log(null, 'Auto-scroll on', true); if (paused) setPaused(false); } }
      else if (act === 'replay') reduce ? log(null, 'Reduced motion is on — the layout is shown finished', true) : replay();
      else if (act === 'fold') {
        const folded = panel.classList.toggle('is-folded');
        btn.setAttribute('aria-expanded', folded ? 'false' : 'true');
        btn.setAttribute('aria-label', folded ? 'Expand activity log' : 'Collapse activity log');
        btn.title = folded ? 'Show activity log' : 'Hide activity log';
      }
    });
    document.body.appendChild(panel);
  }

  function buildDiagrams() {
    blocks.filter(b => b.stage).forEach((b, i) => {
      const old = b.el.querySelector(':scope > .ag-diagram');
      const d = diagramFor(b.el, i);
      if (old) {
        if (old.dataset.size === d.dataset.size) return;
        if (old.classList.contains('is-drawn')) d.classList.add('is-drawn', 'is-instant');
        old.replaceWith(d);
        diagrams.splice(diagrams.indexOf(old), 1, d);
      } else { b.el.prepend(d); diagrams.push(d); }
    });
  }

  function syncBar() {
    if (panel && foot) {
      // ride above the footer instead of covering it
      const lift = Math.max(0, Math.round(innerHeight - foot.getBoundingClientRect().top));
      if (lift !== panelLift) { panelLift = lift; panel.style.setProperty('--lift', `${lift}px`); }
    }
    if (!bar) return;
    const v = scrollY > 40;
    if (v !== barOn) { barOn = v; bar.style.setProperty('--bar-bg', v ? '1' : '0'); }
  }

  /* the classic motion (field, line) plays in a section once its blocks are built */
  function setLive(v) {
    if (v === live) return;
    live = v;
    html.classList.toggle('ag-motion-live', v);
  }
  function syncLive() {
    if (!alive) return;
    const mid = innerHeight * .5;
    for (const s of sections) {
      const r = s.el.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) { setLive(s.blocks.every(b => b.state === 'done')); return; }
    }
    // between sections (e.g. the footer): live once everything in view is built
    let ok = true;
    for (const b of onScreen) if (b.state !== 'done') { ok = false; break; }
    setLive(ok);
  }

  /* the visitor's own pointer, drawn as one more cursor on the team */
  function buildYou() {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    you = el('div', 'ag-cursor ag-cursor--you', `<svg class="ag-cursor__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.2 2.6v16.6l4.3-4.1 2.9 6.3 3-1.4-2.9-6.2h6z"/></svg><span class="ag-cursor__ring"></span><span class="ag-cursor__tag">You</span>`);
    you.setAttribute('aria-hidden', 'true');
    document.body.appendChild(you);
    html.classList.add('ag-you');
    const ring = you.querySelector('.ag-cursor__ring');
    let shown = false, overLink = false;
    on(window, 'pointermove', e => {
      if (e.pointerType === 'touch') return;
      you.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      if (!shown) { shown = true; you.classList.add('is-on'); }
      const link = e.target instanceof Element && !!e.target.closest('a, button');
      if (link !== overLink) { overLink = link; you.classList.toggle('is-link', link); }
    }, { passive: true });
    on(html, 'mouseleave', () => { shown = false; you.classList.remove('is-on'); });
    on(window, 'pointerdown', e => {
      if (e.pointerType === 'touch') return;
      you.classList.add('is-down');
      if (ring.animate) ring.animate([{ transform: 'scale(.3)', opacity: .9 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.2,.7,.3,1)' });
    });
    on(window, 'pointerup', () => you.classList.remove('is-down'));
  }

  function agentCount() {
    const w = innerWidth;
    if (w <= 600) return 4;
    if (w <= 860) return 5;
    if (w <= 1100) return 7;
    return 8;
  }

  /* ==========================================================================
     Public API
     ========================================================================== */
  return {
    start() {
      if (alive) return;
      alive = true;
      blocks.push(...collectBlocks());
      for (const b of blocks) {
        byEl.set(b.el, b);
        if (reduce) b.state = 'done';
        else setBlock(b, 'empty');
      }
      html.classList.add('ag-live');
      html.classList.remove('ag-pending');

      layer = el('div', 'ag-layer');
      layer.setAttribute('aria-hidden', 'true');
      frameBox = el('div', 'ag-layer__frames');
      cursorBox = el('div', 'ag-layer__cursors');
      layer.append(frameBox, cursorBox);
      document.body.appendChild(layer);

      buildDiagrams();
      sections = [...document.querySelectorAll('main [data-scene]')].map(s => ({ el: s, blocks: blocks.filter(b => s.contains(b.el)) }));
      buildYou();
      on(window, 'scroll', () => {
        syncBar();
        syncLive();
        if (!handover && !auto && Math.abs(scrollY - startSy) > 60) {
          handover = true;
          log(null, 'Visitor took over scrolling — building what is in view');
        }
      }, { passive: true });
      // the visitor's own wheel, touch, keys or scrollbar hand scrolling back to them
      const takeOver = () => { if (auto) stopAuto(true); };
      const keys = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar']);
      on(window, 'wheel', takeOver, { passive: true });
      on(window, 'touchstart', e => { if (!(e.target instanceof Element && e.target.closest('.ag-panel, .mode-switch'))) takeOver(); }, { passive: true });
      on(window, 'keydown', e => { if (keys.has(e.key) && !(e.target instanceof Element && e.target.closest('input, textarea, button'))) takeOver(); });
      on(document, 'mousedown', e => { if (e.target === html || e.target === document.body) takeOver(); });
      on(window, 'resize', () => {
        vw = innerWidth; vh = innerHeight; measureAll = true; autoY = scrollY; syncBar(); syncLive();
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(buildDiagrams, 220);
      });

      if (reduce) {
        for (const b of blocks) drawDiagram(b, true);
        buildPanel(0);
        syncBar();
        progress();
        log(null, 'Reduced motion is on — the layout is shown finished', true);
        setLive(true);
        return;
      }

      const n = agentCount();
      const roster = ROSTER.slice(0, n);
      buildPanel(n);
      syncBar();
      roster.forEach((def, i) => agents.push(makeAgent(def, i)));
      progress();
      log(null, `${n} agents online — building the portfolio`, true);

      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(entries => {
          for (const e of entries) {
            const b = byEl.get(e.target);
            if (!b) continue;
            if (e.isIntersecting) visible.add(b); else visible.delete(b);
          }
        }, { rootMargin: '0px 0px -12% 0px' }); // only what is on screen, so the building is always seen
        for (const b of blocks) io.observe(b.el);
        io2 = new IntersectionObserver(entries => {
          for (const e of entries) {
            const b = byEl.get(e.target);
            if (!b) continue;
            if (e.isIntersecting) onScreen.add(b); else onScreen.delete(b);
          }
        });
        for (const b of blocks) io2.observe(b.el);
      } else {
        for (const b of blocks) { visible.add(b); onScreen.add(b); }
      }
      if ('ResizeObserver' in window) {
        ro = new ResizeObserver(() => { measureAll = true; });
        ro.observe(document.body);
      }

      // keyboard users never tab into invisible content: focusing a block finishes it
      on(document, 'focusin', e => {
        const t = e.target instanceof Element ? e.target : null;
        if (!t) return;
        for (const b of blocks) if (b.state !== 'done' && b.el.contains(t)) { finishNow(b); progress(); }
      });
      on(document, 'visibilitychange', () => { if (document.hidden) halt(); else run(); });

      spawnLives();
      run();
      startAuto(1.2);
    },

    destroy() {
      alive = false;
      gen++;
      halt();
      clearTimeout(resizeTimer);
      timers.length = 0;
      if (io) io.disconnect();
      if (io2) io2.disconnect();
      if (ro) ro.disconnect();
      io = io2 = ro = null;
      onScreen.clear(); sections = [];
      if (you) { you.remove(); you = null; }
      off.splice(0).forEach(fn => fn());
      for (const b of blocks) b.el.removeAttribute('data-ag');
      blocks.length = 0; byEl.clear(); visible.clear();
      frames.clear(); agents.length = 0; logQueue.length = 0;
      diagrams.splice(0).forEach(d => d.remove());
      if (layer) layer.remove();
      if (panel) panel.remove();
      layer = panel = logList = progressEl = pauseBtn = null;
      if (bar) bar.style.removeProperty('--bar-bg');
      auto = false;
      live = null;
      html.classList.remove('ag-live', 'ag-paused', 'ag-pending', 'ag-autoscroll', 'ag-motion-live', 'ag-you');
    },
  };
}
