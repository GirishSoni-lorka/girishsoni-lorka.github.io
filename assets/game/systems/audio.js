/* Sound, made entirely with the Web Audio API: there are no audio files to
   download. Off until the visitor turns it on; the audio context is only
   created at that moment (browsers require a click first anyway). */

export function createAudio() {
  let ctx = null, master = null, noise = null, wind = null, on = false;
  let stride = 0, wasGrounded = true, held = false;

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // two seconds of white noise: the raw material for wind and footsteps
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // ambience: filtered noise whose colour drifts slowly, like air moving
    const src = ctx.createBufferSource();
    src.buffer = noise; src.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass'; low.frequency.value = 420; low.Q.value = .4;
    const level = ctx.createGain();
    level.gain.value = .11;
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = .07; depth.gain.value = 170;
    lfo.connect(depth).connect(low.frequency);
    src.connect(low).connect(level).connect(master);
    src.start(); lfo.start();
    wind = { src, lfo };
    return true;
  }

  const fade = to => { if (ctx) master.gain.setTargetAtTime(to, ctx.currentTime, .12); };

  /* a short burst of filtered noise */
  function thud(freq, gain, seconds, q = 1.2) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass'; band.frequency.value = freq; band.Q.value = q;
    const g = ctx.createGain(), t = ctx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(.001, t + seconds);
    src.connect(band).connect(g).connect(master);
    src.start(t, Math.random() * 1.5, seconds + .02);
  }
  /* a soft sine note */
  function note(freq, gain, seconds, delay = 0, slideTo = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + delay;
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + seconds);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + .015);
    g.gain.exponentialRampToValueAtTime(.0001, t + seconds);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + seconds + .05);
  }

  const SOUNDS = {
    step: () => thud(170 + Math.random() * 90, .5, .09),
    land: () => { thud(110, .8, .16, .8); note(95, .25, .14, 0, 55); },
    jump: () => note(260, .1, .16, 0, 420),
    open: () => note(620, .1, .12),
    close: () => note(440, .08, .1),
    discover: () => { note(659, .16, .5); note(988, .14, .7, .12); },
    complete: () => { note(523, .15, .5); note(659, .15, .5, .13); note(784, .15, .6, .26); note(1047, .16, 1, .39); },
  };

  return {
    get enabled() { return on; },
    /* must be called from a click or key press the first time */
    setEnabled(next) {
      on = Boolean(next);
      if (on && !ctx && !build()) { on = false; return false; }
      if (!ctx) return on;
      if (on && !held) ctx.resume();
      fade(on ? .55 : 0);
      return on;
    },
    play(name) { if (on && ctx && !held && SOUNDS[name]) SOUNDS[name](); },
    /* footsteps, jumping and landing follow the player's state */
    frame(dt, s) {
      if (!on || !ctx) { wasGrounded = s.grounded; return; }
      if (s.grounded && !wasGrounded) { SOUNDS.land(); stride = 0; }
      else if (!s.grounded && wasGrounded && s.vy > 0) SOUNDS.jump();
      wasGrounded = s.grounded;
      if (!s.grounded || s.speed < .6) { stride = 0; return; }
      stride += s.speed * dt;
      const length = s.anim === 'run' ? 2.3 : 1.35;
      if (stride >= length) { stride -= length; SOUNDS.step(); }
    },
    /* silent while the game is paused or the tab is hidden */
    hold(next) {
      held = next;
      if (!ctx) return;
      if (held) ctx.suspend(); else if (on) ctx.resume();
    },
    destroy() {
      if (!ctx) return;
      try { wind.src.stop(); wind.lfo.stop(); } catch (e) { /* already stopped */ }
      ctx.close();
      ctx = null;
    },
  };
}
