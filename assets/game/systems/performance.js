/* Watches the frame rate and asks for lower graphics when it stays poor.
   Only acts while the quality setting is "auto". */

export function createPerformance({ onSlow, threshold = 38, windowSeconds = 2.5 }) {
  let time = 0, frames = 0, bad = 0, warmup = 4, fps = 60;
  return {
    get fps() { return fps; },
    reset() { time = frames = bad = 0; warmup = 3; },
    frame(dt) {
      if (warmup > 0) { warmup -= dt; return; }
      time += dt; frames++;
      if (time < windowSeconds) return;
      fps = frames / time;
      time = frames = 0;
      bad = fps < threshold ? bad + 1 : 0;
      if (bad >= 2) { bad = 0; warmup = 3; onSlow(fps); }
    },
  };
}
