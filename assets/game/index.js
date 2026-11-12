/* Game Mode entry point. createGame() builds the world behind the loading
   screen, wires the systems together and returns a handle whose destroy()
   releases everything: GPU memory, listeners and DOM. Nothing in this folder
   is loaded unless a visitor chooses Game Mode. */

import { createStore, initialState, nextPhase } from './core/store.js';
import { loadSettings, saveSettings, autoQuality, lowerQuality } from './core/settings.js';
import { createEngine } from './core/engine.js';
import { buildWorld } from './world/world.js';
import { loadPlayer } from './player/player.js';
import { createController } from './player/controller.js';
import { createFollowCamera } from './player/camera.js';
import { createInput } from './systems/input.js';
import { createInteraction } from './systems/interaction.js';
import { createNavigation } from './systems/navigation.js';
import { createPerformance } from './systems/performance.js';
import { createHud } from './ui/hud.js';
import { createPanel } from './ui/panel.js';
import { createMenu } from './ui/menu.js';
import { createTouch } from './ui/touch.js';
import { h } from './ui/dom.js';
import { WORLD } from './data/locations.js';
import { profile } from './data/profile.js';
import { notice } from '../js/selector.js';

const withTimeout = (promise, ms) => Promise.race([promise, new Promise(r => setTimeout(r, ms))]);

export async function createGame({ loading, onExit, support, isCancelled = () => false }) {
  const settings = loadSettings();
  const device = { lowPower: support.lowPower, touch: support.touch, cores: navigator.hardwareConcurrency || 4 };
  let autoLevel = autoQuality(device); // what "auto" means right now; steps down if frames are slow
  const wanted = () => (settings.quality === 'auto' ? autoLevel : settings.quality);

  const store = createStore({ ...initialState, quality: wanted(), touch: support.touch });
  const ui = h('div', { class: 'game__ui' });
  const root = h('div', { class: 'game' }, ui);
  document.body.appendChild(root);

  const parts = []; // things with destroy(), in creation order
  const listeners = [];
  const listen = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); listeners.push(() => target.removeEventListener(type, fn, opts)); };
  let engine = null, player = null, destroyed = false;

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (engine) engine.stop();
    for (const off of listeners) off();
    for (const p of parts.reverse()) p.destroy();
    if (player) player.dispose();
    if (engine) engine.dispose();
    store.clear();
    root.__game = null;
    root.remove();
  }
  const cancelled = () => { if (!destroyed && isCancelled()) destroy(); return destroyed; };

  try {
    engine = createEngine({ container: root, quality: store.get().quality });

    loading.progress(.2, 'Loading the explorer');
    player = await loadPlayer(p => loading.progress(.2 + p * .25));
    if (cancelled()) return null;

    // signs are drawn to canvases, so the fonts must be ready first
    if (document.fonts) await withTimeout(Promise.all([document.fonts.load('800 64px Archivo'), document.fonts.load('500 32px "Martian Mono"')]).catch(() => {}), 2500);

    const world = await buildWorld(engine, store.get().quality, (p, label) => loading.progress(.47 + p * .48, label), cancelled);
    if (!world || cancelled()) return null;
    engine.scene.add(player.object);

    /* ---------- systems ---------- */
    const { canvas } = engine;
    const controller = createController({ player, colliders: world.colliders });
    const cam = createFollowCamera({ camera: engine.camera, colliders: world.colliders, settings, start: WORLD.spawn });
    const interaction = createInteraction({ scene: engine.scene, camera: engine.camera, canvas, interactables: world.interactables, clickTargets: world.clickTargets });
    const phase = () => store.get().phase;
    const isPlaying = () => phase() === 'playing';

    function applyQuality(level) {
      if (level === store.get().quality) return;
      engine.setQuality(level);
      world.lighting.setQuality(level);
      store.set({ quality: level });
      engine.render();
    }

    function openPanel(panelRef) {
      if (!['playing', 'panel'].includes(phase())) return;
      panel.open(panelRef);
    }
    function pause() {
      if (!isPlaying()) return;
      store.set({ phase: nextPhase(phase(), 'pause') });
      input.unlock(); input.clear();
      menu.open();
    }
    /* capture: take the mouse again. Not after Esc, which has just released it. */
    function resume(capture = true) {
      if (phase() !== 'paused') return;
      menu.close();
      store.set({ phase: nextPhase(phase(), 'resume') });
      canvas.focus({ preventScroll: true });
      if (capture && !store.get().touch) input.lock();
    }

    let lastEscape = 0;
    function onAction(action, payload) {
      if (action === 'lock') { store.set({ locked: payload }); return; }
      if (action === 'escape') {
        // releasing pointer lock and the Esc key can both report the same press
        const now = performance.now();
        if (now - lastEscape < 300) return;
        lastEscape = now;
        if (phase() === 'panel') panel.close();
        else if (phase() === 'playing') pause();
        else if (phase() === 'paused') resume(false);
        return;
      }
      if (action === 'interact') {
        const p = store.get().prompt;
        const it = p && interaction.get(p.id);
        if (it) openPanel(it.panel);
        return;
      }
      if (action === 'click') {
        const it = interaction.pick(payload, controller.state);
        if (it) openPanel(it.panel);
        else if (!store.get().touch) input.lock();
      }
    }

    const input = createInput({ canvas, isPlaying, onAction });
    parts.push(input);

    const panel = createPanel({
      parent: ui,
      onOpen: ref => { store.set({ phase: nextPhase(phase(), 'open'), panel: ref }); input.unlock(); input.clear(); },
      onClose: () => { store.set({ phase: nextPhase(phase(), 'close'), panel: null }); canvas.focus({ preventScroll: true }); },
    });
    const menu = createMenu({
      parent: ui, store, settings,
      onResume: () => resume(true),
      onExit,
      onSettings: () => { saveSettings(settings); applyQuality(wanted()); },
    });
    const hud = createHud({ parent: ui, store, onPause: pause, onExit, onInteract: () => onAction('interact') });
    parts.push(panel, menu, hud);

    const addTouch = () => { parts.push(createTouch({ parent: ui, canvas, input, store })); store.set({ touch: true }); };
    if (support.touch) addTouch();
    else listen(canvas, 'touchstart', addTouch, { once: true, passive: true });

    const navigation = createNavigation({
      store,
      onDiscover(loc, found, total) {
        hud.toast(`Discovered: ${loc.name}`, loc.hint, loc.accent);
        if (found === total) setTimeout(() => { if (!destroyed) hud.toast('All six districts discovered', 'The whole portfolio is open. Explore freely.'); }, 1800);
      },
    });
    const perf = createPerformance({
      onSlow() {
        const lower = lowerQuality(store.get().quality);
        if (settings.quality !== 'auto' || !lower) return;
        autoLevel = lower;
        applyQuality(lower);
        hud.toast('Graphics lowered', 'For a smoother frame rate. You can change this in Menu, Settings.');
      },
    });

    /* ---------- frame ---------- */
    engine.setFrame((dt, t) => {
      const s = store.get();
      if (s.phase === 'paused') return; // the last frame stays on screen; nothing is drawn
      const playing = s.phase === 'playing';
      const look = input.look();
      controller.update(dt, cam.yaw, playing ? input.intent() : null);
      cam.update(dt, controller.state, playing ? look : null);
      world.update(t, dt, controller.state);
      if (playing) {
        const it = interaction.update(controller.state, t);
        if ((it ? it.id : null) !== (s.prompt ? s.prompt.id : null)) store.set({ prompt: it ? { id: it.id, text: it.prompt } : null });
        navigation.update(dt, controller.state, cam.yaw);
        hud.frame(controller.state, controller.state.heading);
        perf.frame(dt);
      }
      engine.render();
    });

    // no rendering at all while the tab is hidden
    listen(document, 'visibilitychange', () => { if (document.hidden) engine.stop(); else { perf.reset(); engine.start(); } });
    engine.onContextLost(() => {
      notice('The 3D view was closed by the browser to free up graphics memory. Showing the classic site instead.');
      onExit('classic');
    });

    /* ---------- hand over ---------- */
    loading.progress(.97, 'Warming up');
    cam.overview();
    cam.update(0, controller.state, null);
    engine.renderer.compile(engine.scene, engine.camera);
    await new Promise(r => setTimeout(r, 0));
    if (cancelled()) return null;

    store.set({ phase: nextPhase(phase(), 'ready') });
    engine.start();
    root.classList.add('is-live');

    loading.ready(() => {
      if (destroyed) return;
      loading.leave();
      store.set({ phase: nextPhase(phase(), 'start') });
      cam.enter();
      controller.play('wave', 2.4);
      perf.reset();
      canvas.focus({ preventScroll: true });
      if (!store.get().touch) input.lock();
      setTimeout(() => { if (!destroyed) hud.toast('Welcome to Spawn Plaza', profile.welcome); }, 900);
    });

    const api = { destroy, store, controller, cam, openPanel, pause, resume, engine };
    root.__game = api; // handy in the console and for automated checks
    return api;
  } catch (e) {
    destroy();
    throw e;
  }
}
