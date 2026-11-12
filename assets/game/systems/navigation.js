/* Where the player is, what they have found, and where to go next.
   Writes to the store a few times a second, and only when values change. */

import { locations, locationAt, nextObjective } from '../data/locations.js';
import { discover } from '../core/store.js';

/* Pure: distance (whole metres) and bearing relative to the view direction
   (degrees, 0 is straight ahead, positive is to the right), in steps of 5. */
export function guide(px, pz, cameraYaw, target) {
  const dx = target.x - px, dz = target.z - pz;
  const world = Math.atan2(dx, -dz);        // compass bearing of the target
  const view = Math.atan2(-Math.sin(cameraYaw), Math.cos(cameraYaw)); // compass bearing of the view
  const rel = Math.atan2(Math.sin(world - view), Math.cos(world - view)) * 180 / Math.PI;
  return { distance: Math.round(Math.hypot(dx, dz)), bearing: Math.round(rel / 5) * 5 };
}

export function createNavigation({ store, onDiscover }) {
  let clock = 0;
  return {
    update(dt, pos, cameraYaw) {
      clock -= dt;
      if (clock > 0) return;
      clock = .15;

      const state = store.get();
      const here = locationAt(pos.x, pos.z);
      let discovered = state.discovered;
      if (here) {
        const next = discover(discovered, here.id);
        if (next !== discovered) { discovered = next; onDiscover(here, next.length, locations.length); }
      }

      const goal = nextObjective(discovered);
      let objective = null;
      if (goal) {
        const g = guide(pos.x, pos.z, cameraYaw, goal);
        const prev = state.objective;
        objective = prev && prev.id === goal.id && prev.distance === g.distance && prev.bearing === g.bearing
          ? prev : { id: goal.id, name: goal.name, hint: goal.hint, ...g };
      }
      store.set({ location: here ? here.id : null, discovered, objective });
    },
  };
}
