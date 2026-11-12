// The guided tour: route planning along the streets, and the driver that
// walks the explorer from stop to stop.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tourRoute, routeLength, standAt, nearestAvenue, bearingOf, polar, createTour } from '../assets/game/systems/tour.js';
import { stepPlayer, MOVE } from '../assets/game/player/controller.js';
import { locations, WORLD } from '../assets/game/data/locations.js';
import { isOpenGround } from '../assets/game/world/roads.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const targetOf = l => (l.angle === null ? { x: -5.6, z: 10.4, radius: 7 } : { ...polar(l.angle, WORLD.districtRadius - 10), radius: 5 });
const districts = locations.filter(l => l.angle !== null);

test('bearings and avenues', () => {
  for (const l of districts) {
    assert.ok(near(bearingOf(l.x, l.z), l.angle, .1), l.id);
    assert.equal(nearestAvenue(l.angle + 20), l.angle);
    assert.equal(nearestAvenue(l.angle - 20), l.angle);
  }
  assert.equal(nearestAvenue(350), 0, 'wraps round north');
});

test('every route ends exactly at its target', () => {
  for (const a of locations) for (const b of locations) {
    const pts = tourRoute(targetOf(a), b, targetOf(b));
    assert.deepEqual(pts[pts.length - 1], { x: targetOf(b).x, z: targetOf(b).z }, `${a.id} -> ${b.id}`);
  }
});

test('routes keep to the streets: no waypoint and no step crosses open ground', () => {
  const offRoad = (p, q) => {
    for (let i = 1; i < 8; i++) {
      const x = p.x + (q.x - p.x) * i / 8, z = p.z + (q.z - p.z) * i / 8;
      if (isOpenGround(x, z, 1.5)) return { x, z };
    }
    return null;
  };
  for (const a of locations) for (const b of locations) {
    if (a === b) continue;
    let p = targetOf(a);
    for (const q of tourRoute(p, b, targetOf(b))) {
      assert.equal(offRoad(p, q), null, `${a.id} -> ${b.id} leaves the road between (${p.x.toFixed(0)}, ${p.z.toFixed(0)}) and (${q.x.toFixed(0)}, ${q.z.toFixed(0)})`);
      p = q;
    }
  }
});

test('between districts the route follows the ring the short way round', () => {
  const [hq, tech, , , mission] = districts;
  const ringPoints = pts => pts.filter(p => near(Math.hypot(p.x, p.z), WORLD.ringRadius, .01));
  const east = ringPoints(tourRoute(targetOf(hq), tech, targetOf(tech)));
  assert.ok(east.length >= 2 && east.every(p => p.x >= -.01), 'HQ to Technology Zone goes east');
  const west = ringPoints(tourRoute(targetOf(hq), mission, targetOf(mission)));
  assert.ok(west.length >= 2 && west.every(p => p.x <= .01), 'HQ to Mission Control goes west');
  // never much longer than walking in via the plaza
  for (const a of districts) for (const b of districts) {
    if (a === b) continue;
    assert.ok(routeLength(targetOf(a), tourRoute(targetOf(a), b, targetOf(b))) < 250, `${a.id} -> ${b.id}`);
  }
});

test('from the plaza a route goes straight down the avenue', () => {
  for (const l of districts) {
    const pts = tourRoute(WORLD.spawn, l, targetOf(l));
    assert.equal(pts.length, 3);
    for (const p of pts) assert.ok(near(bearingOf(p.x, p.z), l.angle, .5), l.id);
  }
  assert.equal(tourRoute(WORLD.spawn, locations[0], targetOf(locations[0])).length, 1, 'already in the plaza');
});

test('standAt stops short of the end and faces it', () => {
  const s = standAt({ x: 0, z: 0 }, [{ x: 0, z: -10 }], 2);
  assert.ok(near(s.x, 0) && near(s.z, -8));
  assert.ok(near(Math.sin(s.heading), 0) && near(Math.cos(s.heading), -1), 'faces north, towards the end');
  assert.ok(near(standAt({ x: 0, z: 0 }, [{ x: 0, z: -1 }], 5).z, 0), 'never further back than where it came from');
});

test('boost raises the top speed for the tour only', () => {
  const run = boost => {
    const s = { x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, heading: 0, grounded: true };
    for (let i = 0; i < 120; i++) stepPlayer(s, { mx: 0, my: 1, sprint: true, jump: false, boost }, 0, 1 / 60, []);
    return s.speed;
  };
  assert.ok(near(run(undefined), MOVE.run, .05));
  assert.ok(near(run(1.5), MOVE.run * 1.5, .1));
});

/* a little simulation: the driver steering a real stepPlayer through an empty world */
function simulate({ instant = false, obstacle = false } = {}) {
  const log = [], states = [];
  const s = { x: WORLD.spawn.x, y: 0, z: WORLD.spawn.z, vx: 0, vz: 0, vy: 0, heading: 0, grounded: true };
  const stops = locations.map(l => ({ location: l, target: targetOf(l) }));
  const tour = createTour({
    stops, instant,
    teleport: p => { s.x = p.x; s.z = p.z; s.vx = s.vz = 0; log.push('teleport'); },
    onArrive: (stop, i) => log.push(`arrive:${stop.location.id}:${i}`),
    onChange: st => states.push(st),
  });
  // a wall across the north avenue that cannot be walked round
  const colliders = obstacle ? [{ type: 'box', x: 0, z: -45, hw: 60, hd: 1, rot: 0, sin: 0, cos: 1, h: 4, base: 0, reach: 61, cam: true, solid: true }] : [];
  const walk = seconds => {
    for (let i = 0; i < seconds * 60 && tour.travelling; i++) stepPlayer(s, tour.drive(1 / 60, s, .7), .7, 1 / 60, colliders);
  };
  return { tour, s, log, states, walk, stops };
}

test('the tour walks to every stop in order and then ends', () => {
  const { tour, s, log, states, walk, stops } = simulate();
  tour.start(s);
  assert.equal(tour.active, true);
  for (let i = 0; i < stops.length; i++) {
    walk(40);
    assert.equal(tour.travelling, false, `reached stop ${i} within 40 s`);
    assert.equal(log.at(-1), `arrive:${stops[i].location.id}:${i}`);
    const t = stops[i].target;
    assert.ok(Math.hypot(s.x - t.x, s.z - t.z) <= t.radius, 'standing inside the interaction radius');
    assert.equal(states.at(-1).phase, 'arrived');
    assert.equal(states.at(-1).next, i + 1 < stops.length ? stops[i + 1].location.name : null);
    assert.equal(tour.last, i === stops.length - 1);
    if (i + 1 < stops.length) assert.equal(tour.next(s), true);
  }
  assert.ok(!log.includes('teleport'), 'no shortcut was needed on clear streets');
  assert.equal(tour.next(s), false, 'nothing after the last stop');
  assert.equal(tour.active, false);
  assert.equal(states.at(-1), null);
});

test('skip, a blocked street and reduced motion all jump straight to the stop', () => {
  const a = simulate();
  a.tour.start(a.s); a.walk(40); a.tour.next(a.s);
  a.tour.skip();
  assert.deepEqual(a.log.slice(-2), ['teleport', 'arrive:hq:1']);
  const t = a.stops[1].target;
  assert.ok(Math.hypot(a.s.x - t.x, a.s.z - t.z) <= t.radius);

  const b = simulate({ obstacle: true });
  b.tour.start(b.s); b.walk(40); b.tour.next(b.s); b.walk(40);
  assert.deepEqual(b.log.slice(-2), ['teleport', 'arrive:hq:1'], 'stuck behind a wall: jumps instead of running on the spot for ever');

  const c = simulate({ instant: true });
  c.tour.start(c.s);
  assert.deepEqual(c.log, ['teleport', 'arrive:plaza:0']);
});

test('stop ends the tour from any state, and drive is idle when not travelling', () => {
  const { tour, s, states } = simulate();
  assert.deepEqual(tour.drive(1 / 60, s, 0), { mx: 0, my: 0, sprint: false, jump: false });
  tour.start(s); tour.stop();
  assert.equal(tour.active, false);
  assert.equal(states.at(-1), null);
  assert.equal(tour.next(s), false);
});
