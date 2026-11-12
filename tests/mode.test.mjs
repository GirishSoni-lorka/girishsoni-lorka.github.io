// Mode persistence and the routing rules that decide what a page load opens.
import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
};
const { MODES, readStoredMode, readMode, readLinkMode, shareUrl, saveMode, resolveStart } = await import('../assets/js/mode.js');

test('there are exactly three modes and Classic is one of them', () => {
  assert.deepEqual(MODES, ['agents', 'classic', 'game']);
});

test('a first-time visitor has no stored mode and defaults to Classic', () => {
  store.clear();
  assert.equal(readStoredMode(), null);
  assert.equal(readMode(), 'classic');
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

test('a first visit opens Classic, with no selector, on every page', () => {
  assert.deepEqual(resolveStart({ stored: null, isHome: true, hash: '' }), { mode: 'classic', selector: false, tour: false });
  assert.deepEqual(resolveStart({ stored: null, isHome: true, hash: '#work' }), { mode: 'classic', selector: false, tour: false });
  assert.deepEqual(resolveStart({ stored: null, isHome: false, hash: '#proj-kaifit' }), { mode: 'classic', selector: false, tour: false });
});

test('a remembered mode is reopened without the selector', () => {
  for (const m of MODES) assert.deepEqual(resolveStart({ stored: m, isHome: true, hash: '' }), { mode: m, selector: false, tour: false });
});

test('a link can ask for a mode: ?mode=classic | agents | game | tour | choose', () => {
  assert.equal(readLinkMode(''), null);
  assert.equal(readLinkMode('?mode=hologram'), null);
  assert.equal(readLinkMode('?utm=x'), null);
  assert.deepEqual(readLinkMode('?mode=game'), { mode: 'game', tour: false, choose: false });
  assert.deepEqual(readLinkMode('?utm=x&mode=tour'), { mode: 'game', tour: true, choose: false });
  assert.deepEqual(readLinkMode('?mode=choose'), { mode: null, tour: false, choose: true });
});

test('a mode link wins over the remembered mode', () => {
  const at = (search, stored = null, o = {}) => resolveStart({ stored, isHome: true, hash: '', ...o, link: readLinkMode(search) });
  assert.deepEqual(at('?mode=game'), { mode: 'game', selector: false, tour: false });
  assert.deepEqual(at('?mode=tour', 'classic'), { mode: 'game', selector: false, tour: true });
  assert.deepEqual(at('?mode=agents', 'game'), { mode: 'agents', selector: false, tour: false });
  assert.deepEqual(at('?mode=classic', 'game'), { mode: 'classic', selector: false, tour: false });
});

test('a game link never hijacks a deep link or the projects page', () => {
  const link = readLinkMode('?mode=tour');
  assert.deepEqual(resolveStart({ stored: null, isHome: true, hash: '#contact', link }), { mode: 'classic', selector: false, tour: false });
  assert.deepEqual(resolveStart({ stored: null, isHome: false, hash: '', link }), { mode: 'classic', selector: false, tour: false });
});

test('?mode=choose opens the selector on the home page only, over Classic or AI Agents', () => {
  const link = readLinkMode('?mode=choose');
  assert.deepEqual(resolveStart({ stored: null, isHome: true, hash: '', link }), { mode: 'classic', selector: true, tour: false });
  assert.deepEqual(resolveStart({ stored: 'game', isHome: true, hash: '', link }), { mode: 'classic', selector: true, tour: false });
  assert.equal(resolveStart({ stored: 'agents', isHome: true, hash: '', link }).mode, 'agents');
  assert.equal(resolveStart({ stored: null, isHome: false, hash: '', link }).selector, false);
  assert.equal(resolveStart({ stored: null, isHome: true, hash: '#work', link }).selector, false);
});

test('the share link keeps the path (sub-path hosting) and drops hash and other queries', () => {
  assert.equal(shareUrl('https://girish.lorka.in/#work'), 'https://girish.lorka.in/?mode=game');
  assert.equal(shareUrl('http://localhost/me/index.html?mode=tour&x=1#top', true), 'http://localhost/me/index.html?mode=tour');
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
