// Light / dark theme: the inline <head> script, the toggle button and
// theme.js must agree, and both palettes must define the same variables.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEMES, PALETTES, resolveTheme } from '../assets/js/theme.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('a first visit is dark; a stored choice wins', () => {
  assert.equal(resolveTheme(null), 'dark');
  assert.equal(resolveTheme('nonsense'), 'dark');
  for (const t of THEMES) assert.equal(resolveTheme(t), t);
});

test('every page applies a stored light theme before paint and has a toggle', () => {
  for (const page of ['index.html', 'projects.html']) {
    const html = read(page);
    const script = html.match(/<script>(\(function\(\)\{var t;[\s\S]*?)<\/script>/);
    assert.ok(script, `${page}: theme head script`);
    assert.ok(script[1].includes("'gs-theme'"), `${page}: reads gs-theme`);
    assert.ok(script[1].includes(PALETTES.light.meta), `${page}: light theme-color matches theme.js`);
    assert.ok(html.indexOf(script[0]) < html.indexOf('</head>'), `${page}: script is in <head>`);
    assert.ok(/<button class="theme-toggle" type="button" aria-label="Switch to light theme"/.test(html), `${page}: toggle in the bar`);
  }
});

test('the light palette overrides every colour the dark one defines', () => {
  const css = read('assets/css/site.css');
  const block = sel => {
    const i = css.indexOf(sel + ' {');
    assert.ok(i >= 0, sel);
    return new Set([...css.slice(i, css.indexOf('}', i)).matchAll(/(--[\w-]+):/g)].map(m => m[1]));
  };
  const dark = block(':root[data-theme="light"] :is(.game, .game-loading)');
  const light = block(':root[data-theme="light"]');
  assert.deepEqual([...light].sort(), [...dark].sort());
  assert.match(css, new RegExp(`--ground: ${PALETTES.light.ground};`));
});

test('no stylesheet hard-codes the dark ink or signal colour in rgba()', () => {
  for (const f of ['assets/css/site.css', 'assets/css/agents.css', 'assets/css/selector.css']) {
    const css = read(f);
    assert.ok(!/rgba\(236, 231, 220,/.test(css), `${f}: use rgba(var(--bone-rgb), a)`);
    assert.ok(!/rgba\(255, 90, 31,/.test(css), `${f}: use rgba(var(--signal-rgb), a)`);
  }
});
