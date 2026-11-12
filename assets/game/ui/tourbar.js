/* The guided tour's controls: where the tour is, one button to move it on
   and one to end it. Two of these exist: one in the HUD while the explorer
   is on the move, one at the foot of the information panel at each stop. */

import { h, icon } from './dom.js';

export function createTourBar({ onNext, onEnd, foot = false }) {
  const step = h('p', { class: 'gtour__step' });
  const title = h('p', { class: 'gtour__title' });
  const label = h('span');
  const go = h('button', { class: 'gbtn gbtn--solid', type: 'button', onclick: onNext }, label, icon('skip', 13));
  const end = h('button', { class: 'gbtn', type: 'button', onclick: onEnd }, 'End tour');
  const el = h('div', { class: `gtour${foot ? ' gtour--foot' : ''}`, role: 'group', 'aria-label': 'Guided tour', hidden: true },
    h('div', { class: 'gtour__text', 'aria-live': foot ? null : 'polite' }, step, title),
    h('div', { class: 'gtour__btns' }, go, end));

  return {
    el,
    /* tour: the store's tour state, or null when no tour is running */
    set(tour) {
      el.hidden = !tour;
      if (!tour) return;
      el.style.setProperty('--accent', tour.accent);
      step.textContent = `Guided tour / ${tour.index + 1} of ${tour.total}`;
      const moving = tour.phase === 'travel';
      title.textContent = moving ? `Heading to ${tour.name}` : foot ? (tour.next ? `Next: ${tour.next}` : 'The last stop') : tour.name;
      label.textContent = moving ? 'Skip the walk' : tour.next ? (foot ? 'Next stop' : `Next: ${tour.next}`) : 'Finish the tour';
    },
  };
}
