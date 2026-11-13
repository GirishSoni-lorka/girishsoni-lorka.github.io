/* Colour theme: dark (the original, and the default) or light. The choice is
   remembered in localStorage under gs-theme. A tiny inline script in each
   page's <head> applies a stored "light" before first paint, so a returning
   visitor never sees a flash of the other theme.

   The CSS palette lives in site.css (:root and :root[data-theme="light"]).
   The canvases (particle field, signal line) cannot read CSS, so they take
   the same colours from PALETTES and repaint when the theme changes. */

const KEY = 'gs-theme';
export const THEMES = ['dark', 'light'];

export const PALETTES = {
  dark: {
    light: false,
    ground: '#05090b', bone: [236, 231, 220], signal: [255, 90, 31],
    meta: '#05090B',
  },
  light: {
    light: true,
    ground: '#f2eee6', bone: [17, 24, 27], signal: [194, 65, 12],
    meta: '#F2EEE6',
  },
};

export function readStoredTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return THEMES.includes(t) ? t : null;
  } catch (e) { return null; }
}

/* the theme a page load opens with: the stored choice, else dark */
export function resolveTheme(stored) {
  return THEMES.includes(stored) ? stored : 'dark';
}

export function currentTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function palette(theme = currentTheme()) {
  return PALETTES[theme] || PALETTES.dark;
}

const listeners = new Set();
export function onTheme(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function apply(theme) {
  const html = document.documentElement;
  if (theme === 'light') html.dataset.theme = 'light';
  else delete html.dataset.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', palette(theme).meta);
  const scheme = document.querySelector('meta[name="color-scheme"]');
  if (scheme) scheme.setAttribute('content', theme);
  for (const fn of listeners) fn(palette(theme), theme);
}

export function setTheme(theme, origin = null) {
  if (!THEMES.includes(theme) || theme === currentTheme()) return;
  try { localStorage.setItem(KEY, theme); } catch (e) { /* private mode: still switches for this visit */ }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce || !origin) { apply(theme); return; }

  // the new palette spreads out in a circle from the toggle
  const r = origin.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const s = document.documentElement.style;
  s.setProperty('--tx', `${x}px`); s.setProperty('--ty', `${y}px`); s.setProperty('--tr', `${radius}px`);
  try {
    document.startViewTransition(() => apply(theme));
  } catch (e) { apply(theme); }
}

/* wire every .theme-toggle on the page (the button lives in the top bar) */
export function initThemeToggle() {
  const buttons = [...document.querySelectorAll('.theme-toggle')];
  const label = () => {
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    for (const b of buttons) {
      b.setAttribute('aria-label', `Switch to ${next} theme`);
      b.title = `Switch to ${next} theme`;
    }
  };
  for (const b of buttons) {
    b.addEventListener('click', () => setTheme(currentTheme() === 'light' ? 'dark' : 'light', b));
  }
  onTheme(label);
  label();

  // keep several open tabs in step
  addEventListener('storage', e => {
    if (e.key === KEY) apply(resolveTheme(e.newValue));
  });
}
