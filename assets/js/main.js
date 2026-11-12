/* Girish Soni — main.js
   One ticker drives smooth scroll, the x-ray, the particle field and the line.

   The page has three experience modes. Classic, the original experience, is
   the default; AI Agents (agents.js) is loaded on demand. The motion system below
   (field, line, x-ray) runs in both: in AI Agents mode each section's motion
   fades in once the agents have built it, and smooth scrolling (Lenis) stays
   off so the agents' auto-scroll tour and native scrolling are untouched.

   Game mode (assets/game/, loaded on demand) is a separate full-screen 3D
   world. While it runs, the motion system here is paused, not torn down. */

import { clamp } from './geo.js';
import { collectScenes, measureScenes } from './scenes.js';
import { Field } from './field.js';
import { Signal } from './signal.js';
import { initXray } from './xray.js';
import { readStoredMode, readLinkMode, resolveStart, saveMode, initModeSwitch } from './mode.js';
import { openSelector, notice } from './selector.js';
import { launchGame } from './game-launcher.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

function whenLibs(fn) {
  if (window.gsap) fn();
  else addEventListener('load', () => (window.gsap ? fn() : console.warn('gsap failed to load; motion disabled')), { once: true });
}

/* ==========================================================================
   Classic mode
   ========================================================================== */
async function bootClassic(gsap, smooth) {
  document.documentElement.classList.add('js');

  // a rail marker in each "log" section tells the line where to run
  document.querySelectorAll('.railed .wrap').forEach(w => {
    const r = document.createElement('span'); r.className = 'rail'; r.setAttribute('aria-hidden', 'true'); w.prepend(r);
  });

  const scenes = collectScenes();
  const mobileQ = () => innerWidth <= 860;
  const cores = navigator.hardwareConcurrency || 4;
  const count = mobileQ() ? 2600 : cores >= 8 ? 6500 : 4600;

  const state = {
    sy: scrollY, vw: innerWidth, vh: innerHeight, mobile: mobileQ(),
    time: 0, dt: 1 / 60, dScroll: 0, maxScroll: 0,
    pointer: { x: -9999, y: -9999, active: false },
    intro: reduce || !document.querySelector('.hero') ? 1 : 0, heroScan: -1,
  };

  const field = new Field(document.getElementById('field'), { count, reduce });
  const signal = new Signal(document.getElementById('signal'), { reduce });
  const xray = initXray({ fine, reduce, gsap });
  const heroXr = xray.blocks.find(b => b.build === 'intro');
  const hero = document.querySelector('.hero');
  const heroBeam = document.querySelector('.hero__beam');
  const bar = document.querySelector('.bar');

  const makeLenis = () => (!reduce && window.Lenis ? new window.Lenis({ anchors: true, lerp: .09, wheelMultiplier: .95 }) : null);
  let lenis = smooth ? makeLenis() : null;

  function resizeCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, state.mobile ? 1.5 : 2);
    field.resize(state.vw, state.vh, dpr);
    signal.resize(state.vw, state.vh, dpr);
  }
  function measure() {
    state.vw = innerWidth; state.vh = innerHeight; state.mobile = mobileQ(); state.sy = scrollY;
    state.maxScroll = document.documentElement.scrollHeight - state.vh;
    resizeCanvases();
    measureScenes(scenes, state);
    field.measure(scenes);
    signal.build(scenes, state);
    xray.measure(state.sy);
    state.heroTop = hero ? hero.offsetTop : 0; state.heroH = hero ? hero.offsetHeight : 0;
  }

  await document.fonts.ready;
  measure();

  // re-measure on real layout changes (ignore mobile URL-bar height jitter)
  let lastW = innerWidth, lastH = innerHeight, timer = 0;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(measure, 140); };
  addEventListener('resize', () => {
    // canvases always track the viewport; a full re-measure only on real layout changes
    state.vw = innerWidth; state.vh = innerHeight; resizeCanvases();
    if (innerWidth !== lastW || Math.abs(innerHeight - lastH) > 140 || !state.mobile) { lastW = innerWidth; lastH = innerHeight; schedule(); }
  });
  new ResizeObserver(schedule).observe(document.querySelector('main'));

  // pointer
  if (fine) {
    addEventListener('pointermove', e => { state.pointer.x = e.clientX; state.pointer.y = e.clientY; state.pointer.active = true; }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { state.pointer.active = false; });
  }

  // build-log rows light their glyph on hover or focus
  for (const s of scenes) for (const row of s.rows) {
    const on = () => { row.hover = true; }, off = () => { row.hover = false; };
    row.el.addEventListener('pointerenter', on); row.el.addEventListener('pointerleave', off);
    row.el.addEventListener('focusin', on); row.el.addEventListener('focusout', off);
  }

  // the opening: one scan pass builds the hero and pulls the field into order
  if (state.intro < 1) {
    gsap.to(state, { intro: 1, duration: 1.9, delay: .3, ease: 'power2.inOut' });
  }

  let barOn = false, paused = false;
  gsap.ticker.lagSmoothing(0);
  const tick = (time, deltaMs) => {
    if (lenis) lenis.raf(time * 1000);
    if (document.hidden || paused) return;
    state.time = time; state.dt = Math.min(.05, deltaMs / 1000);
    const sy = window.scrollY; state.dScroll = sy - state.sy; state.sy = sy;

    const on = sy > 40;
    if (on !== barOn) { barOn = on; bar.style.setProperty('--bar-bg', on ? '1' : '0'); }

    // intro scan position (viewport space)
    const scanPage = state.heroTop + state.intro * state.heroH;
    state.heroScan = scanPage - sy;
    if (heroBeam) {
      const live = state.intro > 0 && state.intro < 1;
      heroBeam.style.opacity = live ? '1' : '0';
      if (live) heroBeam.style.setProperty('--scan', `${(state.intro * state.heroH).toFixed(1)}px`);
    }
    if (heroXr && !reduce) xray.drive(heroXr, scanPage - heroXr.top);

    for (const s of scenes) for (const row of s.rows) row.hot += ((row.hover ? 1 : 0) - row.hot) * clamp(state.dt * 9);

    xray.frame(state);
    field.frame(state);
    signal.frame(state, field);
  };
  gsap.ticker.add(tick);

  return {
    /* Lenis smooth scrolling belongs to Classic mode only */
    setSmooth(on) {
      if (on && !lenis) lenis = makeLenis();
      if (!on && lenis) { lenis.destroy(); lenis = null; }
      barOn = null; // resync the bar background with the current scroll
    },
    /* Game mode covers the page: stop drawing the field, line and x-ray underneath it */
    setPaused(on) { paused = on; },
  };
}

/* ==========================================================================
   Mode orchestration
   ========================================================================== */
const html = document.documentElement;
const isHome = Boolean(document.querySelector('.hero'));
const start = resolveStart({ stored: readStoredMode(), isHome, hash: location.hash, link: readLinkMode(location.search) });
let mode = start.selector ? null : start.mode; // null while the selector (?mode=choose) is open
let classic = null, classicBooting = false, agents = null, token = 0, game = null;

/* the motion system boots once and keeps running; only smooth scroll follows the mode */
function syncMotion(c) {
  c.setSmooth(mode === 'classic');
  c.setPaused(mode === 'game');
}
function startMotion() {
  if (classic) { syncMotion(classic); return; }
  if (classicBooting) return;
  classicBooting = true;
  whenLibs(() => {
    bootClassic(window.gsap, mode === 'classic').then(c => {
      classic = c;
      syncMotion(c); // the visitor may have switched while it booted
    }).catch(e => console.warn('classic motion failed to start', e));
  });
}

async function startAgents() {
  const my = ++token;
  html.classList.add('mode-agents');
  startMotion();
  try {
    const { createAgents } = await import('./agents.js');
    if (my !== token || mode !== 'agents') return;
    if (agents) agents.destroy();
    agents = createAgents({ reduce });
    agents.start();
  } catch (e) {
    // the content must never stay hidden: fall back to the finished page
    console.warn('AI Agents mode failed to start', e);
    html.classList.remove('ag-pending');
  }
}

function stopAgents() {
  ++token;
  if (agents) { agents.destroy(); agents = null; }
  html.classList.remove('mode-agents', 'ag-pending', 'ag-motion-live');
}

/* Game mode: a full-screen world on top of the page. The page keeps its
   scroll position and its motion system is paused until the visitor returns. */
function startGame(tour = false) {
  html.classList.add('mode-game');
  if (classic) syncMotion(classic);
  const handle = launchGame({ onExit: next => setMode(next), tour });
  game = handle;
  handle.ready.catch(e => {
    if (game !== handle) return; // the visitor already left
    console.warn('Game mode failed to start', e);
    setMode('classic');
    notice(e && e.code === 'unsupported'
      ? 'Game Mode needs WebGL 2, which this browser or device does not provide. Showing the classic site instead.'
      : 'Game Mode could not start on this device. Showing the classic site instead.');
  });
}

function stopGame() {
  if (game) { const g = game; game = null; g.destroy(); }
  html.classList.remove('mode-game');
}

function setMode(next) {
  if (next === mode) return;
  if (mode === 'game') stopGame();
  mode = next; saveMode(next);
  dropLinkMode();
  if (next === 'agents') startAgents();
  else if (next === 'classic') { stopAgents(); startMotion(); }
  else { stopAgents(); startGame(); }
  modeSwitch.set(next);
}

/* once the visitor picks a mode themselves, a ?mode= link no longer applies:
   take it out of the address so a reload does not undo their choice */
function dropLinkMode() {
  try {
    const u = new URL(location.href);
    if (!u.searchParams.has('mode')) return;
    u.searchParams.delete('mode');
    history.replaceState(history.state, '', u.pathname + u.search + u.hash);
  } catch (e) { /* the address stays as it is */ }
}

const modeSwitch = initModeSwitch(start.mode, setMode);

if (start.selector) openSelector({ onChoose: setMode });
else if (mode === 'game') startGame(start.tour);
else if (mode === 'agents') startAgents();
else startMotion();
