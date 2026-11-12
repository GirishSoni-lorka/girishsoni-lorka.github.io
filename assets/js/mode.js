/* Experience mode: AI Agents (default), Classic or Game. The choice is
   remembered in localStorage. The tiny inline script in each page's <head>
   reads the same key so AI Agents visitors never see a flash of finished
   content before the agents start building, and Game visitors never see a
   flash of the page before the world loads. */

const KEY = 'gs-mode';
export const MODES = ['agents', 'classic', 'game'];

/* the stored choice, or null for a first-time visitor */
export function readStoredMode() {
  try {
    const m = localStorage.getItem(KEY);
    return MODES.includes(m) ? m : null;
  } catch (e) { return null; }
}

export function readMode() {
  return readStoredMode() || 'agents';
}

export function saveMode(mode) {
  try { localStorage.setItem(KEY, mode); } catch (e) { /* private mode: the switch still works for this visit */ }
}

/* What a page load should open. Deep links (a hash, or any page other than
   home) always render the page itself: Game Mode and the first-visit selector
   only ever open on a plain visit to the home page. */
export function resolveStart({ stored, isHome, hash }) {
  const deep = !isHome || Boolean(hash && hash !== '#');
  if (stored === 'game') return { mode: deep ? 'classic' : 'game', selector: false };
  if (stored === 'classic' || stored === 'agents') return { mode: stored, selector: false };
  return { mode: 'agents', selector: !deep };
}

const ICON_CLASSIC = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5 10.5h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
const ICON_AGENTS = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 2.2v10.6l2.9-2.7 1.9 4.1 1.9-.9-1.9-4h3.9z" fill="currentColor"/></svg>';
const ICON_GAME = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 13.6 5v6L8 14.2 2.4 11V5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M2.6 5.1 8 8.2l5.4-3.1M8 8.2v5.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';

export function initModeSwitch(initial, onChange) {
  const root = document.createElement('div');
  root.className = 'mode-switch';
  root.setAttribute('role', 'radiogroup');
  root.setAttribute('aria-label', 'Experience mode');
  root.innerHTML = `
    <span class="mode-switch__thumb" aria-hidden="true"></span>
    <button type="button" class="mode-switch__opt" role="radio" data-mode="agents" title="Watch AI agents build this portfolio">${ICON_AGENTS}<span>AI Agents</span></button>
    <button type="button" class="mode-switch__opt" role="radio" data-mode="classic" title="Classic experience">${ICON_CLASSIC}<span>Classic</span></button>
    <button type="button" class="mode-switch__opt" role="radio" data-mode="game" title="Explore the portfolio as a 3D open world">${ICON_GAME}<span>Game</span></button>`;
  document.body.appendChild(root);

  const thumb = root.querySelector('.mode-switch__thumb');
  const opts = [...root.querySelectorAll('.mode-switch__opt')];
  let current = initial;

  const place = () => {
    const on = opts.find(o => o.dataset.mode === current);
    if (!on) return;
    thumb.style.width = `${on.offsetWidth}px`;
    thumb.style.transform = `translateX(${on.offsetLeft - 3}px)`;
  };
  const set = mode => {
    current = mode;
    root.dataset.mode = mode;
    for (const o of opts) {
      const on = o.dataset.mode === mode;
      o.setAttribute('aria-checked', on ? 'true' : 'false');
      o.tabIndex = on ? 0 : -1;
    }
    place();
  };

  for (const o of opts) o.addEventListener('click', () => onChange(o.dataset.mode));
  root.addEventListener('keydown', e => {
    const step = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = opts.findIndex(o => o.dataset.mode === current);
    const next = opts[(i + step + opts.length) % opts.length];
    onChange(next.dataset.mode);
    next.focus();
  });

  set(initial);
  // the thumb snaps into place first, then animates on later changes
  requestAnimationFrame(() => root.classList.add('is-ready'));
  if ('ResizeObserver' in window) new ResizeObserver(place).observe(root);
  if (document.fonts) document.fonts.ready.then(place);

  return { set };
}
