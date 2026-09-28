/* Girish Soni — main.js
   One ticker drives smooth scroll, the x-ray, the particle field and the line. */

import { clamp } from './geo.js';
import { collectScenes, measureScenes } from './scenes.js';
import { Field } from './field.js';
import { Signal } from './signal.js';
import { initXray } from './xray.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

function whenLibs(fn) {
  if (window.gsap) fn();
  else addEventListener('load', () => (window.gsap ? fn() : console.warn('gsap failed to load; motion disabled')), { once: true });
}

whenLibs(async () => {
  const gsap = window.gsap;
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

  const lenis = !reduce && window.Lenis ? new window.Lenis({ anchors: true, lerp: .09, wheelMultiplier: .95 }) : null;

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

  let barOn = false;
  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add((time, deltaMs) => {
    if (lenis) lenis.raf(time * 1000);
    if (document.hidden) return;
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
  });
});
