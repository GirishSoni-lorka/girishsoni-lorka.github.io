/* A very small observable store, and the game's phase machine.
   No dependencies and no DOM, so both are unit-tested under Node. */

export function createStore(initial) {
  let state = { ...initial };
  const subs = new Set();
  return {
    get: () => state,
    /* shallow merge; subscribers only run when a value really changed, so it
       is safe to call from the render loop every frame */
    set(patch) {
      let changed = false;
      for (const k in patch) if (!Object.is(state[k], patch[k])) { changed = true; break; }
      if (!changed) return false;
      const prev = state;
      state = { ...state, ...patch };
      for (const fn of [...subs]) fn(state, prev);
      return true;
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    clear() { subs.clear(); },
  };
}

/* Phases: loading -> intro -> playing <-> (paused | panel) */
const TRANSITIONS = {
  loading: { ready: 'intro' },
  intro: { start: 'playing' },
  playing: { pause: 'paused', open: 'panel' },
  paused: { resume: 'playing' },
  panel: { close: 'playing', open: 'panel' },
};

export function nextPhase(phase, event) {
  return (TRANSITIONS[phase] && TRANSITIONS[phase][event]) || phase;
}

export const initialState = {
  phase: 'loading',
  location: 'plaza',       // id of the district the player is standing in, or null
  discovered: ['plaza'],   // ids, in the order they were found
  objective: null,         // { id, name, distance, bearing } or null when all are found
  prompt: null,            // { id, text } for the interactable in reach
  panel: null,             // { type, id } of the open information panel
  quality: 'medium',       // the preset in effect: low | medium | high
  touch: false,
  locked: false,           // pointer lock is active
  night: false,            // the city is in its night look
  sound: false,
  tour: null,              // the guided tour: { index, total, phase, name, accent, next } or null
};

/* mark a district as found; returns the same array when nothing changed */
export function discover(discovered, id) {
  return discovered.includes(id) ? discovered : [...discovered, id];
}
