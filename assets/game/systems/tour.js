/* The guided tour: the explorer walks the streets from district to district
   on their own and opens each one's panel, for visitors who would rather be
   shown round than drive. The route maths is pure and unit-tested; the
   driver only produces the same kind of intent the keyboard does. */

import { WORLD, locations } from '../data/locations.js';

const RAD = Math.PI / 180;
const INNER = WORLD.plazaRadius + 5;        // just outside the plaza, on an avenue
const GATE = WORLD.districtRadius - 17;     // where an avenue meets its district
const ARC_STEP = 12;                        // degrees between waypoints along the ring

export const polar = (deg, r) => ({ x: Math.sin(deg * RAD) * r, z: -Math.cos(deg * RAD) * r });
export const bearingOf = (x, z) => (Math.atan2(x, -z) / RAD + 360) % 360;
const turn = (from, to) => ((to - from + 540) % 360) - 180; // shortest signed difference, degrees

const avenues = locations.filter(l => l.angle !== null).map(l => l.angle);
export function nearestAvenue(deg) {
  return avenues.reduce((best, a) => (Math.abs(turn(deg, a)) < Math.abs(turn(deg, best)) ? a : best), avenues[0]);
}

/* Pure: the waypoints from a ground position to `target` (a point inside the
   district `to`), keeping to the avenues and the ring boulevard. */
export function tourRoute(from, to, target) {
  const pts = [];
  const r = Math.hypot(from.x, from.z);
  const out = r > INNER + 4;                 // not in the plaza
  const here = out ? nearestAvenue(bearingOf(from.x, from.z)) : null;

  if (out && to.angle === here) {
    // already on the right avenue: straight there
  } else if (out) {
    if (r > GATE) pts.push(polar(here, GATE));
    if (to.angle === null) pts.push(polar(here, INNER));
    else {
      const sweep = turn(here, to.angle), steps = Math.max(1, Math.ceil(Math.abs(sweep) / ARC_STEP));
      for (let i = 0; i <= steps; i++) pts.push(polar(here + sweep * i / steps, WORLD.ringRadius));
      pts.push(polar(to.angle, GATE));
    }
  } else if (to.angle !== null) {
    pts.push(polar(to.angle, INNER), polar(to.angle, GATE));
  }
  pts.push({ x: target.x, z: target.z });
  return pts;
}

/* total length of a route from `from`, in metres */
export function routeLength(from, pts) {
  let d = 0, p = from;
  for (const q of pts) { d += Math.hypot(q.x - p.x, q.z - p.z); p = q; }
  return d;
}

/* Pure: a point `back` metres short of the end of the route, and the heading
   that faces the end from there. Where the explorer stands at a stop. */
export function standAt(from, pts, back) {
  const end = pts[pts.length - 1], prev = pts.length > 1 ? pts[pts.length - 2] : from;
  let dx = prev.x - end.x, dz = prev.z - end.z;
  const l = Math.hypot(dx, dz) || 1;
  dx /= l; dz /= l;
  const b = Math.min(back, l);
  return { x: end.x + dx * b, z: end.z + dz * b, heading: Math.atan2(-dx, -dz) };
}

const TOUR_SPEED = 1.45; // a brisk run: nobody wants to wait for the walk
const IDLE = { mx: 0, my: 0, sprint: false, jump: false };

/* stops: [{ location, target: { x, z, radius } }], in tour order.
   onArrive(stop, index) runs when the explorer reaches a stop;
   onChange(state) whenever the public state changes (null when the tour ends). */
export function createTour({ stops, teleport, onArrive, onChange, instant = false }) {
  let index = -1, phase = 'off', path = [], wp = 0, origin = null;
  let clock = 0, mark = null, stuck = 0;

  const stopDistance = s => Math.max(1.4, Math.min(2.6, s.target.radius * .5));
  const publish = () => onChange(phase === 'off' ? null : {
    index, total: stops.length, phase,
    name: stops[index].location.name, accent: stops[index].location.accent,
    next: index + 1 < stops.length ? stops[index + 1].location.name : null,
  });

  function arrive() {
    phase = 'arrived';
    publish();
    onArrive(stops[index], index);
  }
  function jump() {
    const s = stops[index];
    teleport(standAt(origin, path, stopDistance(s) * .8));
    arrive();
  }
  function head(i, pos) {
    index = i; phase = 'travel';
    origin = { x: pos.x, z: pos.z };
    path = tourRoute(origin, stops[i].location, stops[i].target);
    wp = 0; clock = 0; stuck = 0; mark = { ...origin };
    publish();
    if (instant) jump();
  }

  return {
    get active() { return phase !== 'off'; },
    get travelling() { return phase === 'travel'; },
    get index() { return index; },
    get last() { return index === stops.length - 1; },
    start(pos) { head(0, pos); },
    /* on to the next stop; returns false when there is none (the tour is over) */
    next(pos) {
      if (phase === 'off') return false;
      if (index + 1 >= stops.length) { this.stop(); return false; }
      head(index + 1, pos);
      return true;
    },
    /* skip the walk to the current stop */
    skip() { if (phase === 'travel') jump(); },
    stop() { if (phase === 'off') return; phase = 'off'; index = -1; publish(); },

    /* what to do this frame: an intent in camera space, like the keyboard gives */
    drive(dt, pos, cameraYaw) {
      if (phase !== 'travel') return IDLE;
      const s = stops[index];
      let target = path[wp], dx = target.x - pos.x, dz = target.z - pos.z, d = Math.hypot(dx, dz);
      const final = wp === path.length - 1;
      if (d < (final ? stopDistance(s) : 3.4)) {
        if (final) { arrive(); return IDLE; }
        target = path[++wp]; dx = target.x - pos.x; dz = target.z - pos.z; d = Math.hypot(dx, dz);
      }

      // something in the way that sliding along it does not solve: move on
      clock += dt;
      if (clock >= 1) {
        const moved = Math.hypot(pos.x - mark.x, pos.z - mark.z);
        stuck = moved < 1.6 ? stuck + 1 : 0;
        mark = { x: pos.x, z: pos.z }; clock = 0;
        if (stuck >= 2) { jump(); return IDLE; }
      }

      const wx = dx / (d || 1), wz = dz / (d || 1);
      const fx = -Math.sin(cameraYaw), fz = -Math.cos(cameraYaw), rx = Math.cos(cameraYaw), rz = -Math.sin(cameraYaw);
      const near = wp === path.length - 1 && d < 7;
      return { mx: wx * rx + wz * rz, my: wx * fx + wz * fz, sprint: !near, jump: false, boost: near ? 1 : TOUR_SPEED };
    },
  };
}
