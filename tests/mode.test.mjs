// Mode persistence and the routing rules that decide what a page load opens.
import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
};
const { MODES, readStoredMode, readMode, saveMode, resolveStart } = await import('../assets/js/mode.js');

test('there are exactly three modes and Classic is one of them', () => {
  assert.deepEqual(MODES, ['agents', 'classic', 'game']);
});

test('a first-time visitor has no stored mode and defaults to AI Agents', () => {
  store.clear();
  assert.equal(readStoredMode(), null);
  assert.equal(readMode(), 'agents');
});

test('every mode round-trips through localStorage', () => {
  for (const m of MODES) { saveMode(m); assert.equal(readStoredMode(), m); }
});

test('an unknown stored value is ignored', () => {
  store.set('gs-mode', 'hologram');
  assert.equal(readStoredMode(), null);
});

test('storage that throws (private mode) falls back safely', () => {
  const real = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(readStoredMode(), null);
  assert.doesNotThrow(() => saveMode('game'));
  globalThis.localStorage = real;
});

test('first visit to the home page opens the selector', () => {
  assert.deepEqual(resolveStart({ stored: null, isHome: true, hash: '' }), { mode: 'agents', selector: true });
});

test('first visit through a deep link shows the page, not the selector', () => {
  assert.equal(resolveStart({ stored: null, isHome: true, hash: '#work' }).selector, false);
  assert.equal(resolveStart({ stored: null, isHome: false, hash: '' }).selector, false);
  assert.equal(resolveStart({ stored: null, isHome: false, hash: '#proj-kaifit' }).selector, false);
});

test('a remembered mode is reopened without the selector', () => {
  for (const m of MODES) assert.deepEqual(resolveStart({ stored: m, isHome: true, hash: '' }), { mode: m, selector: false });
});

test('Game Mode never hijacks a deep link or the projects page', () => {
  assert.equal(resolveStart({ stored: 'game', isHome: true, hash: '#contact' }).mode, 'classic');
  assert.equal(resolveStart({ stored: 'game', isHome: false, hash: '' }).mode, 'classic');
  assert.equal(resolveStart({ stored: 'game', isHome: false, hash: '#proj-hrms' }).mode, 'classic');
});

test('a bare "#" is not a deep link', () => {
  assert.equal(resolveStart({ stored: 'game', isHome: true, hash: '#' }).mode, 'game');
});

test('Classic and AI Agents are unaffected by hashes', () => {
  assert.equal(resolveStart({ stored: 'classic', isHome: true, hash: '#work' }).mode, 'classic');
  assert.equal(resolveStart({ stored: 'agents', isHome: false, hash: '#proj-bic' }).mode, 'agents');
});
