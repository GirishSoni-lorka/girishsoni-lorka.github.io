/* The loading screen, which becomes the introduction once the world is
   ready. It is the first thing Game Mode shows and loads no 3D code itself. */

import { h, icon } from './dom.js';

const CSS_URL = new URL('../game.css', import.meta.url).href;

function ensureCss() {
  return new Promise(resolve => {
    if (document.querySelector('link[data-game-css]')) return resolve();
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = CSS_URL; link.dataset.gameCss = '';
    link.onload = link.onerror = () => resolve();
    document.head.appendChild(link);
    setTimeout(resolve, 3000); // never block the game on a stylesheet
  });
}

const KEYBOARD = [
  ['W A S D', 'Move'], ['Mouse', 'Look around'], ['Shift', 'Sprint'],
  ['Space', 'Jump'], ['E', 'Interact'], ['Esc', 'Menu'],
];
const TOUCH = [
  ['Left stick', 'Move'], ['Drag', 'Look around'], ['Run', 'Sprint'],
  ['Jump', 'Jump'], ['Tap E', 'Interact'], ['Menu', 'Pause'],
];

export async function createLoading({ onExit }) {
  await ensureCss();
  const touch = matchMedia('(pointer: coarse)').matches;

  const bar = h('span', { class: 'gl__fill' });
  const pct = h('span', { class: 'gl__pct', text: '0%' });
  const label = h('span', { class: 'gl__label', text: 'Starting' });
  const start = h('button', { class: 'gbtn gbtn--solid gl__start', type: 'button' }, 'Enter the world');
  const tour = h('button', { class: 'gbtn gl__start', type: 'button' }, icon('route'), 'Take the guided tour');
  const starts = h('div', { class: 'gl__starts', hidden: true }, start, tour);
  const controls = h('dl', { class: 'gl__keys', hidden: true },
    (touch ? TOUCH : KEYBOARD).map(([k, v]) => h('div', null, h('dt', { text: k }), h('dd', { text: v }))));

  const root = h('div', { class: 'game-loading', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Game Mode' },
    h('button', { class: 'gbtn gl__exit', type: 'button', onclick: () => onExit('classic') }, icon('exit'), 'Back to Classic'),
    h('div', { class: 'gl__in' },
      h('p', { class: 'gl__eyebrow' }, 'Game Mode ', h('span', { text: '/' }), ' Girish Soni'),
      h('h2', { class: 'gl__title' }, 'The portfolio, ', h('br'), 'as a city'),
      h('p', { class: 'gl__lead', text: 'Six districts, one story. Walk up to anything that glows and press E to read what it holds.' }),
      h('div', { class: 'gl__progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100' },
        h('span', { class: 'gl__track' }, bar),
        h('span', { class: 'gl__meta' }, label, pct)),
      controls,
      starts,
      h('p', { class: 'gl__tip', hidden: true, text: 'Short on time? The guided tour walks you round all six districts.' })));
  document.body.appendChild(root);
  requestAnimationFrame(() => root.classList.add('is-in'));

  let shown = 0, target = 0, raf = 0, alive = true;
  const progressEl = root.querySelector('.gl__progress');
  const tick = () => {
    if (!alive) return;
    shown += (target - shown) * .16;
    if (target - shown < .002) shown = target;
    const p = Math.round(shown * 100);
    bar.style.transform = `scaleX(${shown})`;
    pct.textContent = `${p}%`;
    progressEl.setAttribute('aria-valuenow', String(p));
    raf = shown < 1 ? requestAnimationFrame(tick) : 0;
  };

  const tip = root.querySelector('.gl__tip');
  let main = start; // what Enter does
  const onKey = e => { if (e.code === 'Enter' && !starts.hidden && !['BUTTON', 'A'].includes(e.target.tagName)) main.click(); };

  return {
    /* progress only ever moves forward */
    progress(p, text) {
      target = Math.max(target, Math.min(1, p));
      if (text) label.textContent = text;
      if (!raf) raf = requestAnimationFrame(tick);
    },
    /* The world is built: show the controls and wait for the visitor.
       onStart(withTour) runs once. tourFirst makes the tour the main choice
       (a visitor who followed a ?mode=tour link). */
    ready(onStart, { tourFirst = false } = {}) {
      this.progress(1, 'Ready');
      shown = 1; // no easing on the last step: the bar and the label agree
      root.classList.add('is-ready');
      if (tourFirst) {
        main = tour;
        tour.classList.add('gbtn--solid'); start.classList.remove('gbtn--solid');
        start.textContent = 'Explore on my own';
        starts.prepend(tour);
      }
      controls.hidden = false; starts.hidden = false; tip.hidden = tourFirst;
      let done = false;
      const choose = withTour => () => { if (done) return; done = true; removeEventListener('keydown', onKey); onStart(withTour); };
      start.addEventListener('click', choose(false));
      tour.addEventListener('click', choose(true));
      addEventListener('keydown', onKey);
      main.focus({ preventScroll: true });
    },
    /* fade away; the world takes over */
    leave() {
      root.classList.add('is-leaving');
      setTimeout(() => this.destroy(), 700);
    },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      removeEventListener('keydown', onKey);
      root.remove();
    },
  };
}
