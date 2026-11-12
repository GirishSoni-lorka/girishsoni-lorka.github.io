/* Pause menu: resume, controls, settings, and the ways back to the rest of
   the site. */

import { h, icon } from './dom.js';
import { QUALITY } from '../core/settings.js';
import { shareUrl } from '../../js/mode.js';

const CONTROLS = [
  ['W A S D / arrows', 'Move'], ['Mouse', 'Look around (click the world to capture it, or drag)'],
  ['Shift', 'Sprint'], ['Space', 'Jump'], ['E / Enter', 'Interact with what is in reach'],
  ['Click', 'Open a sign, screen or display you can see'], ['Esc', 'Pause, or close a panel'],
  ['T', 'Guided tour: be walked round every district'], ['N', 'Day or night'], ['M', 'Sound on or off'],
];
const TOUCH_CONTROLS = [
  ['Left stick', 'Move'], ['Drag the view', 'Look around'], ['Run', 'Hold to sprint'],
  ['Jump', 'Jump'], ['E', 'Interact with what is in reach'], ['Tap', 'Open a sign, screen or display'],
  ['Route button', 'Guided tour: be walked round every district'],
];

export function createMenu({ parent, store, settings, onResume, onExit, onSettings, onTour }) {
  const view = h('div', { class: 'gmenu__view' });
  const root = h('div', { class: 'gmenu', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Game menu', hidden: true },
    h('div', { class: 'gmenu__card' }, view));
  parent.appendChild(root);

  const heading = (text, sub) => [h('p', { class: 'gmenu__eyebrow', text: sub }), h('h2', { class: 'gmenu__title', text })];
  const backBtn = () => h('button', { class: 'gbtn', type: 'button', onclick: () => show('main') }, icon('back'), 'Back');

  /* copy the address that opens Game Mode directly; show it if copying is not allowed */
  async function share(e) {
    const btn = e.currentTarget, url = shareUrl(location.href);
    try {
      await navigator.clipboard.writeText(url);
      btn.lastChild.textContent = 'Link copied';
    } catch (err) {
      btn.replaceWith(h('input', { class: 'gmenu__url', type: 'text', readonly: true, value: url, 'aria-label': 'Link to this world', onfocus: ev => ev.target.select() }));
    }
  }

  const views = {
    main: () => [
      heading('Paused', 'Game Mode'),
      h('div', { class: 'gmenu__list' },
        h('button', { class: 'gbtn gbtn--solid', type: 'button', onclick: onResume, 'data-first': true }, 'Resume'),
        h('button', { class: 'gbtn', type: 'button', onclick: onTour }, icon('route'), store.get().tour ? 'End the guided tour' : 'Guided tour'),
        h('button', { class: 'gbtn', type: 'button', onclick: () => show('controls') }, 'Controls'),
        h('button', { class: 'gbtn', type: 'button', onclick: () => show('settings') }, 'Settings'),
        h('button', { class: 'gbtn', type: 'button', onclick: () => onExit('classic') }, icon('exit'), 'Return to Classic Mode')),
      h('div', { class: 'gmenu__foot' },
        h('button', { class: 'gmenu__alt', type: 'button', onclick: () => onExit('agents') }, 'Or switch to AI Agents mode'),
        h('button', { class: 'gmenu__alt', type: 'button', onclick: share }, 'Copy a link to this world')),
    ],
    controls: () => [
      heading('Controls', store.get().touch ? 'Touch' : 'Keyboard and mouse'),
      h('dl', { class: 'gmenu__keys' }, (store.get().touch ? TOUCH_CONTROLS : CONTROLS).map(([k, v]) => h('div', null, h('dt', { text: k }), h('dd', { text: v })))),
      backBtn(),
    ],
    settings: () => {
      const note = h('p', { class: 'gmenu__note' });
      const describe = () => {
        note.textContent = settings.quality === 'auto'
          ? `Auto is using ${QUALITY[store.get().quality].label.toLowerCase()} on this device, and steps down if the frame rate drops.`
          : 'Fixed. Choose Auto to let the game adjust itself.';
      };
      const options = ['auto', 'low', 'medium', 'high'].map(q => h('button', {
        class: 'gseg__opt', type: 'button', role: 'radio', 'aria-checked': String(settings.quality === q),
        onclick: e => {
          settings.quality = q;
          for (const o of e.currentTarget.parentNode.children) o.setAttribute('aria-checked', String(o === e.currentTarget));
          onSettings(); describe();
        },
      }, q === 'auto' ? 'Auto' : QUALITY[q].label));
      describe();
      const value = h('output', { text: `${settings.sensitivity.toFixed(1)}x` });
      return [
        heading('Settings', 'Saved on this device'),
        h('div', { class: 'gfield' },
          h('span', { class: 'gfield__label', id: 'gq-label', text: 'Graphics quality' }),
          h('div', { class: 'gseg', role: 'radiogroup', 'aria-labelledby': 'gq-label' }, options), note),
        h('label', { class: 'gfield' },
          h('span', { class: 'gfield__label' }, 'Camera sensitivity ', value),
          h('input', {
            type: 'range', min: '0.3', max: '2.5', step: '0.1', value: String(settings.sensitivity),
            oninput: e => { settings.sensitivity = Number(e.target.value); value.textContent = `${settings.sensitivity.toFixed(1)}x`; onSettings(); },
          })),
        h('label', { class: 'gfield gfield--check' },
          h('input', { type: 'checkbox', checked: settings.invertY || null, onchange: e => { settings.invertY = e.target.checked; onSettings(); } }),
          h('span', { text: 'Invert vertical look' })),
        h('label', { class: 'gfield gfield--check' },
          h('input', { type: 'checkbox', checked: settings.night || null, onchange: e => { settings.night = e.target.checked; onSettings(); } }),
          h('span', { text: 'Night' })),
        h('label', { class: 'gfield gfield--check' },
          h('input', { type: 'checkbox', checked: settings.sound || null, onchange: e => { settings.sound = e.target.checked; onSettings(); } }),
          h('span', { text: 'Sound' })),
        backBtn(),
      ];
    },
  };

  function show(name) {
    view.replaceChildren(...views[name]().flat(Infinity).filter(Boolean));
    const first = view.querySelector('[data-first]') || view.querySelector('button, input');
    if (first) first.focus({ preventScroll: true });
  }

  root.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const items = [...root.querySelectorAll('button, input')];
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  return {
    open() { root.hidden = false; void root.offsetWidth; root.classList.add('is-open'); show('main'); },
    close() { root.classList.remove('is-open'); root.hidden = true; },
    destroy() { root.remove(); },
  };
}
