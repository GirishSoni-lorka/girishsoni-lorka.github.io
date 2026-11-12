/* Game Mode launcher. This small file is all the classic site ever loads of
   the game: the 3D engine, the world and the character are fetched only when
   a visitor actually chooses Game Mode. */

let support = null;

/* WebGL 2 is required. A context that only exists with a "major performance
   caveat" (software rendering) is allowed in, but starts on low graphics. */
export function detectSupport() {
  if (support) return support;
  let webgl = false, lowPower = false;
  try {
    const fast = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (fast) webgl = true;
    else if (document.createElement('canvas').getContext('webgl2')) { webgl = true; lowPower = true; }
  } catch (e) { /* no WebGL */ }
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 8;
  if (cores <= 4 && memory <= 4) lowPower = true;
  support = { webgl, lowPower, touch: coarse };
  return support;
}

/* Returns at once with a handle. `ready` rejects if the game cannot start;
   `destroy()` is safe at any point, including while it is still loading. */
export function launchGame({ onExit }) {
  let dead = false, game = null, loading = null;

  const ready = (async () => {
    const s = detectSupport();
    if (!s.webgl) throw Object.assign(new Error('WebGL 2 is not available'), { code: 'unsupported' });

    const { createLoading } = await import('../game/ui/loading.js');
    if (dead) return;
    loading = await createLoading({ onExit });
    if (dead) { loading.destroy(); return; }

    loading.progress(.06, 'Loading the engine');
    const { createGame } = await import('../game/index.js');
    if (dead) return;
    const g = await createGame({ loading, onExit, support: s, isCancelled: () => dead });
    if (dead) { if (g) g.destroy(); return; }
    game = g;
  })();

  ready.catch(() => { if (loading) loading.destroy(); });

  return {
    ready,
    destroy() {
      dead = true;
      if (game) { game.destroy(); game = null; }
      if (loading) { loading.destroy(); loading = null; }
    },
  };
}
