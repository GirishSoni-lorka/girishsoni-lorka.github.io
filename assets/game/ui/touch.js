/* Touch controls: a virtual stick to move, drag anywhere on the view to
   look, and buttons for interact, jump and sprint. Created on touch devices
   (or the first time a finger touches the world) and fed into the same
   input object the keyboard uses. */

import { h, icon } from './dom.js';

export function createTouch({ parent, canvas, input, store }) {
  const knob = h('span', { class: 'gstick__knob' });
  const stick = h('div', { class: 'gstick', 'aria-label': 'Move' }, knob);
  const act = h('button', { class: 'gtouch__btn gtouch__btn--act', type: 'button', 'aria-label': 'Interact', hidden: true }, 'E');
  const jump = h('button', { class: 'gtouch__btn', type: 'button', 'aria-label': 'Jump' }, icon('jump', 20));
  const run = h('button', { class: 'gtouch__btn', type: 'button', 'aria-label': 'Sprint', 'aria-pressed': 'false' }, icon('run', 20));
  const root = h('div', { class: 'gtouch' }, stick, h('div', { class: 'gtouch__btns' }, act, run, jump));
  parent.appendChild(root);

  // movement stick
  let stickId = null, cx = 0, cy = 0;
  const R = 46;
  const moveStick = e => {
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const dead = l < 8;
    input.setMove(dead ? 0 : dx / R, dead ? 0 : -dy / R);
    // pushing the stick to its edge is a run
    input.setSprint(running || l > R * 1.55);
  };
  const endStick = e => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    knob.style.transform = '';
    input.setMove(0, 0); input.setSprint(running);
  };
  stick.addEventListener('pointerdown', e => {
    e.preventDefault();
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    const r = stick.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    moveStick(e);
  });
  stick.addEventListener('pointermove', e => { if (e.pointerId === stickId) moveStick(e); });
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);

  // look: one finger dragging on the world
  let lookId = null, lx = 0, ly = 0, travelled = 0;
  const onDown = e => {
    if (e.pointerType !== 'touch' || lookId !== null) return;
    e.preventDefault(); // no synthetic mouse events for this touch
    lookId = e.pointerId; lx = e.clientX; ly = e.clientY; travelled = 0;
  };
  const onMove = e => {
    if (e.pointerId !== lookId) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY; travelled += Math.abs(dx) + Math.abs(dy);
    if (store.get().phase === 'playing') input.addLook(dx * 2.4, dy * 2.4);
  };
  const onUp = e => {
    if (e.pointerId !== lookId) return;
    lookId = null;
    if (travelled < 10 && store.get().phase === 'playing') input.press('click', e);
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  // buttons
  let running = false;
  const tap = (el, fn) => el.addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
  tap(act, () => input.press('interact'));
  tap(jump, () => input.press('jump'));
  tap(run, () => { running = !running; run.setAttribute('aria-pressed', String(running)); input.setSprint(running); });

  const stop = store.subscribe((s, prev) => {
    if (s.prompt !== prev.prompt) act.hidden = !s.prompt;
    if (s.phase !== prev.phase) { root.dataset.phase = s.phase; if (s.phase !== 'playing') { input.setMove(0, 0); knob.style.transform = ''; } }
  });
  root.dataset.phase = store.get().phase;
  act.hidden = !store.get().prompt;

  return {
    destroy() {
      stop();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      root.remove();
    },
  };
}
