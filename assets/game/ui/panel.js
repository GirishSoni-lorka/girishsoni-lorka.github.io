/* The information panel: a sheet at the side of the screen (the bottom on
   phones) that shows one piece of the portfolio at a time. */

import { h, icon } from './dom.js';
import { renderPanel } from './content.js';

export function createPanel({ parent, onOpen, onClose }) {
  const eyebrow = h('p', { class: 'gpanel__eyebrow' });
  const title = h('h2', { class: 'gpanel__title', id: 'gpanel-title', tabindex: '-1' });
  const body = h('div', { class: 'gpanel__body' });
  const back = h('button', { class: 'gicon', type: 'button', 'aria-label': 'Back', hidden: true }, icon('back'));
  const close = h('button', { class: 'gicon', type: 'button', 'aria-label': 'Close panel (Esc)' }, icon('close'));
  const root = h('aside', { class: 'gpanel', role: 'dialog', 'aria-labelledby': 'gpanel-title', hidden: true },
    h('header', { class: 'gpanel__head' }, back, h('div', { class: 'gpanel__heading' }, eyebrow, title), close),
    body);
  parent.appendChild(root);

  let current = null, backTo = null, hideTimer = 0;

  function show(panel) {
    const view = renderPanel(panel, show);
    if (!view) return false;
    clearTimeout(hideTimer);
    current = panel; backTo = view.back || null;
    eyebrow.textContent = view.eyebrow;
    title.textContent = view.title;
    root.style.setProperty('--accent', view.accent || '#ff5a1f');
    back.hidden = !backTo;
    body.replaceChildren(...[view.body].flat(Infinity).filter(Boolean));
    body.scrollTop = 0;
    // restart the content transition on every change of panel
    body.classList.remove('is-in'); void body.offsetWidth; body.classList.add('is-in');
    if (root.hidden) { root.hidden = false; void root.offsetWidth; root.classList.add('is-open'); }
    title.focus({ preventScroll: true });
    onOpen(panel);
    return true;
  }

  function hide() {
    if (!current) return;
    current = null;
    root.classList.remove('is-open');
    hideTimer = setTimeout(() => { root.hidden = true; }, 320);
    onClose();
  }

  back.addEventListener('click', () => { if (backTo) show(backTo); });
  close.addEventListener('click', hide);
  // keep Tab inside the panel while it is open
  root.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const items = [...root.querySelectorAll('button:not([hidden]), a[href]')];
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === title)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  return {
    open: show,
    close: hide,
    isOpen: () => Boolean(current),
    current: () => current,
    destroy() { clearTimeout(hideTimer); root.remove(); },
  };
}
