/* Keyboard, mouse and pointer lock. Touch controls (ui/touch.js) feed the
   same object through setMove / addLook / press, so the rest of the game
   never needs to know which device is in use. */

const KEYS = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
};

export function createInput({ canvas, isPlaying, onAction }) {
  const held = new Set();
  const look = { dx: 0, dy: 0 };
  const stick = { x: 0, y: 0, sprint: false };
  let jump = false, dragging = false, moved = 0, wantUnlock = false;

  const typing = e => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);

  const onKeyDown = e => {
    if (e.code === 'Escape') { onAction('escape'); return; }
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!isPlaying()) return;
    const k = KEYS[e.code];
    if (k) { held.add(k); e.preventDefault(); return; }
    if (e.code === 'Space') { if (!e.repeat) jump = true; e.preventDefault(); return; }
    if (e.code === 'KeyE' || e.code === 'Enter') { if (!e.repeat) onAction('interact'); e.preventDefault(); }
  };
  const onKeyUp = e => { const k = KEYS[e.code]; if (k) held.delete(k); };
  const clear = () => { held.clear(); dragging = false; jump = false; };

  const locked = () => document.pointerLockElement === canvas;
  const onMouseDown = e => { if (e.button === 0) { dragging = true; moved = 0; } };
  const onMouseUp = e => {
    if (e.button !== 0 || !dragging) return;
    dragging = false;
    // a press that did not turn into a drag is a click on the world
    if (moved < 6 && e.target === canvas && isPlaying()) onAction('click', e);
  };
  const onMouseMove = e => {
    if (!isPlaying()) return;
    if (locked()) { look.dx += e.movementX; look.dy += e.movementY; return; }
    if (dragging) { moved += Math.abs(e.movementX) + Math.abs(e.movementY); look.dx += e.movementX * 1.6; look.dy += e.movementY * 1.6; }
  };
  const onLockChange = () => {
    const on = locked();
    onAction('lock', on);
    // Esc releases the lock before any keydown reaches the page: treat an
    // unexpected release as a request for the pause menu
    if (!on && !wantUnlock && isPlaying()) onAction('escape');
    wantUnlock = false;
  };
  const onContext = e => e.preventDefault();

  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  addEventListener('blur', clear);
  canvas.addEventListener('mousedown', onMouseDown);
  addEventListener('mouseup', onMouseUp);
  addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onLockChange);
  canvas.addEventListener('contextmenu', onContext);

  return {
    /* what the player wants this frame */
    intent() {
      let mx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0) + stick.x;
      let my = (held.has('up') ? 1 : 0) - (held.has('down') ? 1 : 0) + stick.y;
      const l = Math.hypot(mx, my);
      if (l > 1) { mx /= l; my /= l; }
      const j = jump; jump = false;
      return { mx, my, sprint: held.has('sprint') || stick.sprint, jump: j };
    },
    look() { const out = { dx: look.dx, dy: look.dy }; look.dx = look.dy = 0; return out; },
    clear,
    setMove(x, y) { stick.x = x; stick.y = y; },
    setSprint(on) { stick.sprint = on; },
    addLook(dx, dy) { look.dx += dx; look.dy += dy; },
    press(action, payload) { if (action === 'jump') jump = true; else onAction(action, payload); },
    lock() {
      if (locked() || !canvas.requestPointerLock) return;
      try {
        const p = canvas.requestPointerLock();
        if (p && p.catch) p.catch(() => { /* refused: dragging still turns the camera */ });
      } catch (e) { /* same */ }
    },
    unlock() { if (locked()) { wantUnlock = true; document.exitPointerLock(); } },
    isLocked: locked,
    destroy() {
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      removeEventListener('blur', clear);
      canvas.removeEventListener('mousedown', onMouseDown);
      removeEventListener('mouseup', onMouseUp);
      removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onLockChange);
      canvas.removeEventListener('contextmenu', onContext);
      if (locked()) document.exitPointerLock();
    },
  };
}
