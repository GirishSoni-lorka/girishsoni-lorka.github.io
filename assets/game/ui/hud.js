/* Heads-up display: who and where you are, what you have found, where to go
   next, the map, and the two ways out (menu, Classic). Driven entirely by
   store changes; nothing here runs per frame except the minimap. */

import { h, icon } from './dom.js';
import { locations, findLocation } from '../data/locations.js';
import { profile } from '../data/profile.js';
import { createMinimap } from './minimap.js';
import { createPrompt } from './prompt.js';

export function createHud({ parent, store, onPause, onExit, onInteract }) {
  const pips = locations.map(l => h('i', { title: l.name, style: `--accent:${l.accent}` }));
  const count = h('span', { class: 'ghud__count' });
  const place = h('p', { class: 'ghud__place' });
  const topic = h('p', { class: 'ghud__topic' });

  const card = h('div', { class: 'ghud__card' },
    h('div', { class: 'ghud__who' },
      h('span', { class: 'ghud__avatar', 'aria-hidden': 'true' }),
      h('div', null,
        h('p', { class: 'ghud__name', text: 'Explorer' }),
        h('p', { class: 'ghud__sub', text: `Visiting ${profile.name}` }))),
    h('div', { class: 'ghud__found', 'aria-label': 'Districts discovered' }, h('span', { class: 'ghud__pips' }, pips), count),
    h('div', { class: 'ghud__where', 'aria-live': 'polite' }, icon('pin', 14), h('div', null, place, topic)));

  const objArrow = h('span', { class: 'gobj__arrow' }, icon('arrow', 16));
  const objName = h('p', { class: 'gobj__name' });
  const objMeta = h('p', { class: 'gobj__meta' });
  const objective = h('div', { class: 'gobj' }, objArrow, h('div', null, h('p', { class: 'gobj__label', text: 'Next district' }), objName, objMeta));

  const mapWrap = h('div', { class: 'ghud__map' });
  const tools = h('div', { class: 'ghud__tools' },
    h('button', { class: 'gbtn gbtn--glass', type: 'button', onclick: onPause, 'aria-label': 'Open the menu (Esc)' }, icon('menu'), h('span', { text: 'Menu' })),
    h('button', { class: 'gbtn gbtn--glass', type: 'button', onclick: () => onExit('classic'), 'aria-label': 'Switch to the Classic experience' }, icon('exit'), h('span', { text: 'Classic' })));

  const toasts = h('div', { class: 'gtoasts', role: 'status', 'aria-live': 'polite' });
  const hint = h('p', { class: 'ghud__hint' });

  const root = h('div', { class: 'ghud' },
    h('div', { class: 'ghud__left' }, card, objective),
    h('div', { class: 'ghud__right' }, mapWrap, tools),
    toasts, hint);
  parent.appendChild(root);

  const minimap = createMinimap({ parent: mapWrap });
  const prompt = createPrompt({ parent: root, onInteract });

  let hintTimer = 0;
  function render(s, prev) {
    if (!prev || s.phase !== prev.phase) {
      root.dataset.phase = s.phase;
      root.inert = s.phase !== 'playing';
    }
    if (!prev || s.location !== prev.location) {
      const l = s.location && findLocation(s.location);
      place.textContent = l ? l.name : 'City streets';
      topic.textContent = l ? l.topic : 'Follow an avenue to a district';
    }
    if (!prev || s.discovered !== prev.discovered) {
      locations.forEach((l, i) => pips[i].classList.toggle('is-on', s.discovered.includes(l.id)));
      count.textContent = `${s.discovered.length} / ${locations.length}`;
    }
    if (!prev || s.objective !== prev.objective) {
      const o = s.objective;
      objective.classList.toggle('is-done', !o);
      objName.textContent = o ? o.name : 'Every district found';
      objMeta.textContent = o ? `${o.distance} m` : 'Explore freely';
      if (o) objArrow.style.transform = `rotate(${o.bearing}deg)`;
    }
    if (!prev || s.prompt !== prev.prompt || s.touch !== prev.touch) prompt.set(s.prompt, s.touch);
    if (!prev || s.locked !== prev.locked || s.touch !== prev.touch) {
      hint.textContent = s.touch ? '' : s.locked ? 'Esc frees the mouse and opens the menu' : 'Click the world to look around with the mouse, or drag';
      hint.classList.add('is-in');
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => hint.classList.remove('is-in'), 7000);
    }
  }
  const stop = store.subscribe(render);
  render(store.get(), null);

  return {
    /* per frame, but it only redraws when the picture changed */
    frame(pos, heading) {
      const s = store.get();
      minimap.draw(pos, heading, s.discovered, s.objective ? s.objective.id : '');
    },
    toast(title, text, accent) {
      const t = h('div', { class: 'gtoast', style: accent ? `--accent:${accent}` : null },
        h('p', { class: 'gtoast__title', text: title }), text ? h('p', { class: 'gtoast__text', text }) : null);
      toasts.appendChild(t);
      requestAnimationFrame(() => t.classList.add('is-in'));
      setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 500); }, 4600);
    },
    destroy() { stop(); clearTimeout(hintTimer); minimap.destroy(); root.remove(); },
  };
}
