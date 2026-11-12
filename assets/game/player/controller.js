/* Player movement: camera-relative walking and sprinting, jumping with
   gravity, ground detection, collision with the world, and the animation
   state that follows from all of it. */

import { resolve, clampToWorld } from '../systems/collision.js';
import { WORLD } from '../data/locations.js';

export const MOVE = { walk: 4.6, run: 9.2, accel: 11, turn: 12, jump: 8.6, gravity: 24, radius: .45 };

const shortest = a => Math.atan2(Math.sin(a), Math.cos(a));

/* Pure step, exported for tests: advances `s` ({ x, y, z, vx, vz, vy, heading, grounded })
   by dt given the wanted move (mx right, my forward, in camera space).
   `boost` scales the top speed; only the guided tour uses it. */
export function stepPlayer(s, { mx, my, sprint, jump, boost = 1 }, cameraYaw, dt, colliders) {
  const fx = -Math.sin(cameraYaw), fz = -Math.cos(cameraYaw); // camera forward on the ground
  const rx = Math.cos(cameraYaw), rz = -Math.sin(cameraYaw);  // camera right
  let wx = fx * my + rx * mx, wz = fz * my + rz * mx;
  const amount = Math.min(1, Math.hypot(wx, wz));
  if (amount > 1e-3) { const l = Math.hypot(wx, wz); wx /= l; wz /= l; }
  const top = (sprint ? MOVE.run : MOVE.walk) * amount * boost;

  const k = Math.min(1, dt * MOVE.accel);
  s.vx += (wx * top - s.vx) * k;
  s.vz += (wz * top - s.vz) * k;

  if (amount > .05) s.heading += shortest(Math.atan2(wx, wz) - s.heading) * Math.min(1, dt * MOVE.turn);

  if (jump && s.grounded) { s.vy = MOVE.jump; s.grounded = false; }
  s.vy -= MOVE.gravity * dt;
  s.y += s.vy * dt;
  if (s.y <= 0) { s.y = 0; s.vy = 0; s.grounded = true; }

  s.x += s.vx * dt; s.z += s.vz * dt;
  resolve(s, MOVE.radius, colliders, s.y);
  clampToWorld(s, WORLD.radius);

  s.speed = Math.hypot(s.vx, s.vz);
  s.anim = !s.grounded ? 'jump' : s.speed > MOVE.walk + 1 ? 'run' : s.speed > .5 ? 'walk' : 'idle';
  return s;
}

export function createController({ player, colliders }) {
  const s = { x: WORLD.spawn.x, y: 0, z: WORLD.spawn.z, vx: 0, vz: 0, vy: 0, heading: WORLD.spawn.facing, grounded: true, speed: 0, anim: 'idle' };
  const idle = { mx: 0, my: 0, sprint: false, jump: false };
  let hold = null; // a one-off animation (the wave) that plays until the player moves

  const sync = () => {
    player.object.position.set(s.x, s.y, s.z);
    player.object.rotation.y = s.heading;
  };
  sync();

  return {
    state: s,
    update(dt, cameraYaw, intent) {
      stepPlayer(s, intent || idle, cameraYaw, dt, colliders);
      if (hold && (s.anim !== 'idle' || (hold.until -= dt) <= 0)) hold = null;
      player.setState(hold ? hold.name : s.anim);
      player.update(dt);
      sync();
    },
    play(name, seconds) { hold = { name, until: seconds }; },
    /* put the player somewhere else, standing still */
    teleport({ x, z, heading }) {
      s.x = x; s.z = z; s.y = 0; s.vx = s.vz = s.vy = 0; s.grounded = true;
      if (Number.isFinite(heading)) s.heading = heading;
      sync();
    },
  };
}
