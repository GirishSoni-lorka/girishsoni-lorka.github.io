/* Third-person follow camera: orbits the player with the mouse, eases after
   them, pulls in when a building is in the way, and flies between the
   overview shot and the gameplay shot. */

import * as THREE from '../three.js';
import { cameraDistance } from '../systems/collision.js';

const PLAY = { dist: 7.2, pitch: .3 };
const OVERVIEW = { dist: 54, pitch: .62 };
const PITCH_MIN = -.2, PITCH_MAX = 1.25;

export function createFollowCamera({ camera, colliders, settings, start, still = false }) {
  const focus = new THREE.Vector3(start.x, 1.5, start.z);
  const dir = new THREE.Vector3();
  let yaw = start.facing + Math.PI; // behind the player
  let pitch = OVERVIEW.pitch, dist = OVERVIEW.dist, wanted = OVERVIEW.dist;
  let fly = null; // { from, to, t, seconds }
  let orbiting = true;

  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  return {
    get yaw() { return yaw; },
    /* point the camera: used by the automated checks */
    setView(y, p = pitch) { yaw = y; pitch = p; },
    /* the opening: a slow turn high above the plaza */
    overview() { orbiting = true; pitch = OVERVIEW.pitch; dist = wanted = OVERVIEW.dist; },
    /* swoop down behind the player */
    /* swing round behind a player who is moving on their own (the guided tour) */
    trail(heading, dt) {
      if (fly || orbiting) return;
      const behind = heading + Math.PI;
      yaw += Math.atan2(Math.sin(behind - yaw), Math.cos(behind - yaw)) * Math.min(1, dt * 2.4);
      pitch += (.36 - pitch) * Math.min(1, dt * 2);
      wanted = PLAY.dist;
    },
    /* cut straight to a player who has just been moved */
    snap(target, heading) {
      fly = null; orbiting = false;
      focus.set(target.x, target.y + 1.5, target.z);
      if (Number.isFinite(heading)) yaw = heading + Math.PI;
      pitch = .36; dist = wanted = PLAY.dist;
    },
    enter(seconds = 1.8) {
      orbiting = false;
      const back = start.facing + Math.PI;
      const turn = Math.atan2(Math.sin(back - yaw), Math.cos(back - yaw));
      fly = { from: { yaw, pitch, dist }, to: { yaw: yaw + turn, pitch: PLAY.pitch, dist: PLAY.dist }, t: 0, seconds };
    },
    update(dt, target, look) {
      if (fly) {
        fly.t = Math.min(1, fly.t + dt / fly.seconds);
        const k = ease(fly.t);
        yaw = fly.from.yaw + (fly.to.yaw - fly.from.yaw) * k;
        pitch = fly.from.pitch + (fly.to.pitch - fly.from.pitch) * k;
        dist = wanted = fly.from.dist + (fly.to.dist - fly.from.dist) * k;
        if (fly.t >= 1) fly = null;
      } else if (orbiting) {
        if (!still) yaw += dt * .07;
      } else if (look) {
        const s = .0024 * settings.sensitivity;
        yaw -= look.dx * s;
        pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, pitch + look.dy * s * (settings.invertY ? -1 : 1)));
        wanted = PLAY.dist;
      }

      focus.x += (target.x - focus.x) * Math.min(1, dt * 14);
      focus.z += (target.z - focus.z) * Math.min(1, dt * 14);
      focus.y += (target.y + 1.5 - focus.y) * Math.min(1, dt * 9);

      dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));

      // camera collision: come in at once, drift back out slowly
      const free = wanted > 14 ? wanted : cameraDistance(focus, dir, wanted, colliders);
      dist = free < dist ? free : dist + (free - dist) * Math.min(1, dt * 3.5);

      camera.position.set(focus.x + dir.x * dist, Math.max(.35, focus.y + dir.y * dist), focus.z + dir.z * dist);
      camera.lookAt(focus);
    },
  };
}
