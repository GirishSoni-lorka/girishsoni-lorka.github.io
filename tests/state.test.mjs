// Game state: the store, phase transitions, settings and navigation maths.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, nextPhase, initialState, discover } from '../assets/game/core/store.js';
import { sanitize, defaults, autoQuality, resolveQuality, lowerQuality, QUALITY, QUALITY_ORDER } from '../assets/game/core/settings.js';
import { guide } from '../assets/game/systems/navigation.js';
import { createPerformance } from '../assets/game/systems/performance.js';
import { locations, locationAt, nextObjective, WORLD } from '../assets/game/data/locations.js';

test('store: set merges, notifies once, and ignores no-op writes', () => {
  const s = createStore({ a: 1, b: 2 });
  let calls = 0, seenPrev = null;
  s.subscribe((state, prev) => { calls++; seenPrev = prev; });
  assert.equal(s.set({ a: 1 }), false);
  assert.equal(calls, 0);
  assert.equal(s.set({ a: 5 }), true);
  assert.equal(calls, 1);
  assert.deepEqual(s.get(), { a: 5, b: 2 });
  assert.deepEqual(seenPrev, { a: 1, b: 2 });
});

test('store: unsubscribe and clear stop notifications', () => {
  const s = createStore({ a: 1 });
  let calls = 0;
  const off = s.subscribe(() => calls++);
  off(); s.set({ a: 2 });
  s.subscribe(() => calls++); s.clear(); s.set({ a: 3 });
  assert.equal(calls, 0);
});

test('phases: the happy path', () => {
  let p = initialState.phase;
  assert.equal(p, 'loading');
  p = nextPhase(p, 'ready'); assert.equal(p, 'intro');
  p = nextPhase(p, 'start'); assert.equal(p, 'playing');
  p = nextPhase(p, 'open'); assert.equal(p, 'panel');
  p = nextPhase(p, 'open'); assert.equal(p, 'panel', 'moving between panels stays in the panel phase');
  p = nextPhase(p, 'close'); assert.equal(p, 'playing');
  p = nextPhase(p, 'pause'); assert.equal(p, 'paused');
  p = nextPhase(p, 'resume'); assert.equal(p, 'playing');
});

test('phases: impossible transitions are ignored', () => {
  assert.equal(nextPhase('loading', 'start'), 'loading');
  assert.equal(nextPhase('intro', 'pause'), 'intro');
  assert.equal(nextPhase('paused', 'open'), 'paused');
  assert.equal(nextPhase('panel', 'pause'), 'panel');
  assert.equal(nextPhase('playing', 'nonsense'), 'playing');
});

test('discovery: adds once and keeps identity when nothing changes', () => {
  const a = ['plaza'];
  const b = discover(a, 'hq');
  assert.deepEqual(b, ['plaza', 'hq']);
  assert.equal(discover(b, 'hq'), b);
});

test('the player starts in the plaza with it already discovered', () => {
  assert.deepEqual(initialState.discovered, ['plaza']);
  assert.equal(locationAt(WORLD.spawn.x, WORLD.spawn.z).id, 'plaza');
});

test('settings: bad input is repaired', () => {
  assert.deepEqual(sanitize(null), defaults);
  assert.deepEqual(sanitize({ quality: 'ultra', sensitivity: 'fast', invertY: 1 }), { quality: 'auto', sensitivity: 1, invertY: true });
  assert.equal(sanitize({ sensitivity: 99 }).sensitivity, 2.5);
  assert.equal(sanitize({ sensitivity: 0 }).sensitivity, .3);
});

test('settings: automatic quality follows the device', () => {
  assert.equal(autoQuality({ lowPower: true, touch: false, cores: 16 }), 'low');
  assert.equal(autoQuality({ lowPower: false, touch: true, cores: 8 }), 'medium');
  assert.equal(autoQuality({ lowPower: false, touch: false, cores: 4 }), 'medium');
  assert.equal(autoQuality({ lowPower: false, touch: false, cores: 12 }), 'high');
  assert.equal(resolveQuality('low', { lowPower: false, touch: false, cores: 12 }), 'low');
});

test('settings: quality steps down and stops at low', () => {
  assert.equal(lowerQuality('high'), 'medium');
  assert.equal(lowerQuality('medium'), 'low');
  assert.equal(lowerQuality('low'), null);
  for (const q of QUALITY_ORDER) assert.ok(QUALITY[q].pixelRatio >= 1);
  assert.equal(QUALITY.low.shadows, 0);
});

test('performance: two slow windows in a row ask for lower quality', () => {
  let slow = 0;
  const p = createPerformance({ onSlow: () => slow++, windowSeconds: 1 });
  for (let i = 0; i < 125; i++) p.frame(.05);  // 4 s warm-up, then two 1 s windows at 20 fps
  assert.equal(slow, 1);
  slow = 0;
  const q = createPerformance({ onSlow: () => slow++, windowSeconds: 1 });
  for (let i = 0; i < 1200; i++) q.frame(1 / 60);
  assert.equal(slow, 0, 'a steady 60 fps never triggers it');
});

test('navigation: distance and relative bearing', () => {
  const north = { x: 0, z: -80 };
  // camera yaw 0 looks north
  assert.deepEqual(guide(0, 0, 0, north), { distance: 80, bearing: 0 });
  const east = guide(0, 0, 0, { x: 50, z: 0 });
  assert.equal(east.bearing, 90);
  // turn the view to face east: the same target is now straight ahead
  assert.equal(guide(0, 0, -Math.PI / 2, { x: 50, z: 0 }).bearing, 0);
  assert.equal(Math.abs(guide(0, 0, 0, { x: 0, z: 40 }).bearing), 180);
});

test('navigation: objectives follow the tour order', () => {
  assert.equal(nextObjective(['plaza']).id, 'hq');
  assert.equal(nextObjective(['plaza', 'hq', 'tech']).id, 'garage');
  assert.equal(nextObjective(locations.map(l => l.id)), null);
});

test('world: six districts, inside the bounds, not overlapping', () => {
  assert.equal(locations.length, 6);
  assert.deepEqual(locations.map(l => l.id), ['plaza', 'hq', 'tech', 'garage', 'achievements', 'mission']);
  for (const l of locations) {
    assert.ok(Math.hypot(l.x, l.z) + l.radius < WORLD.radius, `${l.id} fits in the world`);
    assert.equal(locationAt(l.x, l.z).id, l.id);
    for (const o of locations) if (o !== l) assert.ok(Math.hypot(l.x - o.x, l.z - o.z) > l.radius + o.radius, `${l.id} and ${o.id} do not overlap`);
  }
  assert.equal(locationAt(0, -45), null, 'the avenue between two districts is open street');
});
