/* Game Mode entry point. createGame() builds the world behind the loading
   screen, wires the systems together and returns a handle whose destroy()
   releases everything: GPU memory, listeners, audio and DOM. Nothing in this
   folder is loaded unless a visitor chooses Game Mode. */

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
import { createTour } from './systems/tour.js';
import { createAudio } from './systems/audio.js';
import { createHud } from './ui/hud.js';
import { createPanel } from './ui/panel.js';
import { createMenu } from './ui/menu.js';
import { createTouch } from './ui/touch.js';
import { createTourBar } from './ui/tourbar.js';
import { h } from './ui/dom.js';
import { WORLD, locations } from './data/locations.js';
import { profile } from './data/profile.js';
import { notice } from '../js/selector.js';

const withTimeout = (promise, ms) => Promise.race([promise, new Promise(r => setTimeout(r, ms))]);

export async function createGame({ loading, onExit, support, tour: tourFirst = false, isCancelled = () => false }) {
  const settings = loadSettings();
  const device = { lowPower: support.lowPower, touch: support.touch, cores: navigator.hardwareConcurrency || 4 };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let autoLevel = autoQuality(device); // what "auto" means right now; steps down if frames are slow
  const wanted = () => (settings.quality === 'auto' ? autoLevel : settings.quality);

  const store = createStore({ ...initialState, quality: wanted(), touch: support.touch, night: settings.night });
  const ui = h('div', { class: 'game__ui' });
  const root = h('div', { class: `game${settings.night ? ' is-night' : ''}` }, ui);
  document.body.appendChild(root);

  const parts = []; // things with destroy(), in creation order
  const listeners = [];
  const timers = new Set();
  const listen = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); listeners.push(() => target.removeEventListener(type, fn, opts)); };
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!destroyed) fn(); }, ms); timers.add(id); return id; };
  const audio = createAudio();
  let engine = null, player = null, destroyed = false;

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (engine) engine.stop();
    for (const id of timers) clearTimeout(id);
    for (const off of listeners) off();
    for (const p of parts.reverse()) p.destroy();
    audio.destroy();
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

    const world = await buildWorld(engine, store.get().quality, (p, label) => loading.progress(.47 + p * .48, label), cancelled, { night: settings.night });
    if (!world || cancelled()) return null;
    engine.scene.add(player.object);

    /* ---------- systems ---------- */
    const { canvas } = engine;
    const controller = createController({ player, colliders: world.colliders });
    const cam = createFollowCamera({ camera: engine.camera, colliders: world.colliders, settings, start: WORLD.spawn, still: reduce });
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
    /* bring the game in line with the settings object, and remember it */
    function applySettings() {
      saveSettings(settings);
      applyQuality(wanted());
      world.setNight(settings.night, reduce);
      settings.sound = audio.setEnabled(settings.sound);
      store.set({ night: settings.night, sound: settings.sound });
      root.classList.toggle('is-night', settings.night);
      if (phase() === 'paused') { world.setNight(settings.night, true); world.update(0, 0, controller.state); engine.render(); } // nothing else redraws while paused
    }
    const toggle = key => { settings[key] = !settings[key]; applySettings(); };

    function openPanel(panelRef) {
      if (!['playing', 'panel'].includes(phase())) return;
      panel.open(panelRef);
    }
    function pause() {
      if (!isPlaying()) return;
      store.set({ phase: nextPhase(phase(), 'pause') });
      input.unlock(); input.clear();
      audio.hold(true);
      menu.open();
    }
    /* capture: take the mouse again. Not after Esc, which has just released it,
       and not during the tour, where the mouse is needed for its buttons. */
    function resume(capture = true) {
      if (phase() !== 'paused') return;
      menu.close();
      store.set({ phase: nextPhase(phase(), 'resume') });
      audio.hold(false);
      canvas.focus({ preventScroll: true });
      if (capture && !store.get().touch && !tour.active) input.lock();
    }

    /* ---------- the guided tour ---------- */
    let arriving = 0;
    const tour = createTour({
      stops: locations.map(l => ({ location: l, target: interaction.get(l.id) })),
      instant: reduce, // no long automatic camera travel for visitors who asked for less motion
      teleport(p) {
        controller.teleport(p);
        cam.snap(controller.state, p.heading);
        root.classList.remove('is-warp'); void root.offsetWidth; root.classList.add('is-warp');
      },
      onArrive(stop) {
        navigation.update(1, controller.state, cam.yaw); // count the district as found now: a jump may open the panel before the next check
        clearTimeout(arriving);
        arriving = later(() => { if (tour.active && isPlaying()) openPanel(stop.target.panel); }, reduce ? 0 : 500);
      },
      onChange(state) { store.set({ tour: state }); },
    });
    function startTour() {
      if (tour.active || !['playing', 'panel', 'paused'].includes(phase())) return;
      if (phase() === 'paused') resume(false);
      if (panel.isOpen()) panel.close();
      input.unlock(); input.clear();
      tour.start(controller.state);
    }
    function endTour(message) {
      if (!tour.active) return;
      clearTimeout(arriving);
      tour.stop();
      if (message) hud.toast('Tour ended', message);
    }
    /* the tour's main button: skip the walk, go to the next stop, or finish */
    function tourNext() {
      if (!tour.active) return;
      if (tour.travelling) { tour.skip(); return; }
      clearTimeout(arriving);
      if (panel.isOpen()) panel.close();
      if (!tour.last) { tour.next(controller.state); return; }
      tour.stop();
      finale();
    }
    function finale() {
      openPanel({ type: 'complete' });
      audio.play('complete');
      controller.play('wave', 2.4);
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
        if (tour.active) { tourNext(); return; }
        const p = store.get().prompt;
        const it = p && interaction.get(p.id);
        if (it) openPanel(it.panel);
        return;
      }
      if (action === 'click') {
        const it = interaction.pick(payload, controller.state);
        if (it) openPanel(it.panel);
        else if (!store.get().touch && !tour.active) input.lock();
        return;
      }
      if (action === 'tour') { if (tour.active) endTour('You have the controls again.'); else startTour(); return; }
      if (action === 'night') toggle('night');
      else if (action === 'sound') toggle('sound');
    }

    const input = createInput({ canvas, isPlaying, onAction });
    parts.push(input);

    const panel = createPanel({
      parent: ui,
      onOpen: ref => { store.set({ phase: nextPhase(phase(), 'open'), panel: ref }); input.unlock(); input.clear(); audio.play('open'); },
      onClose: () => { store.set({ phase: nextPhase(phase(), 'close'), panel: null }); canvas.focus({ preventScroll: true }); audio.play('close'); },
    });
    const menu = createMenu({
      parent: ui, store, settings,
      onResume: () => resume(true),
      onExit,
      onSettings: applySettings,
      onTour: () => { if (tour.active) { endTour(); resume(true); } else startTour(); },
    });
    const hud = createHud({
      parent: ui, store, onPause: pause, onExit,
      onInteract: () => onAction('interact'),
      onTour: startTour,
      onNight: () => toggle('night'),
      onSound: () => toggle('sound'),
      onSummary: () => openPanel({ type: 'complete' }),
    });
    parts.push(panel, menu, hud);

    // the tour's controls: in the HUD while walking, at the foot of the panel at each stop
    const tourBar = createTourBar({ onNext: tourNext, onEnd: () => endTour() });
    const tourFoot = createTourBar({ onNext: tourNext, onEnd: () => endTour(), foot: true });
    hud.mount(tourBar.el);
    store.subscribe((s, prev) => {
      if (s.tour === prev.tour) return;
      root.classList.toggle('is-tour', Boolean(s.tour));
      tourBar.set(s.tour); tourFoot.set(s.tour);
      panel.setFooter(s.tour ? tourFoot.el : null);
    });

    const addTouch = () => { parts.push(createTouch({ parent: ui, canvas, input, store })); store.set({ touch: true }); };
    if (support.touch) addTouch();
    else listen(canvas, 'touchstart', addTouch, { once: true, passive: true });

    const navigation = createNavigation({
      store,
      onDiscover(loc, found, total) {
        hud.toast(`Discovered: ${loc.name}`, loc.hint, loc.accent);
        audio.play('discover');
        if (found < total || tour.active) return; // the tour has its own ending
        later(() => {
          hud.toast('All six districts discovered', 'The whole portfolio is open. The summary is on the left.');
          audio.play('complete');
          controller.play('wave', 2.4);
        }, 1800);
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
      let intent = playing ? input.intent() : null;
      let look = input.look();
      if (tour.active) {
        // touching the movement keys takes the controls back
        if (intent && (intent.mx || intent.my || intent.jump)) endTour('You have the controls again. Press T or use the menu to restart it.');
        else {
          if (playing) intent = tour.drive(dt, controller.state, cam.yaw);
          if (tour.travelling) { cam.trail(controller.state.heading, dt); look = null; }
        }
      }
      controller.update(dt, cam.yaw, intent);
      cam.update(dt, controller.state, playing ? look : null);
      world.update(t, dt, controller.state);
      audio.frame(dt, controller.state);
      if (playing) {
        const it = interaction.update(controller.state, t);
        if ((it ? it.id : null) !== (s.prompt ? s.prompt.id : null)) store.set({ prompt: it ? { id: it.id, text: it.prompt } : null });
        navigation.update(dt, controller.state, cam.yaw);
        hud.frame(controller.state, controller.state.heading);
        perf.frame(dt);
      }
      engine.render();
    });

    // no rendering, and no sound, while the tab is hidden
    listen(document, 'visibilitychange', () => {
      if (document.hidden) { engine.stop(); audio.hold(true); }
      else { perf.reset(); engine.start(); audio.hold(phase() === 'paused'); }
    });
    engine.onContextLost(() => {
      notice('The 3D view was closed by the browser to free up graphics memory. Showing the classic site instead.');
      onExit('classic');
    });

    /* ---------- hand over ---------- */
    loading.progress(.97, 'Warming up');
    cam.overview();
    cam.update(0, controller.state, null);
    world.update(0, 0, controller.state);
    engine.renderer.compile(engine.scene, engine.camera);
    await new Promise(r => setTimeout(r, 0));
    if (cancelled()) return null;

    store.set({ phase: nextPhase(phase(), 'ready') });
    engine.start();
    root.classList.add('is-live');

    loading.ready(withTour => {
      if (destroyed) return;
      loading.leave();
      store.set({ phase: nextPhase(phase(), 'start') });
      cam.enter(reduce ? .01 : 1.8);
      controller.play('wave', 2.4);
      perf.reset();
      canvas.focus({ preventScroll: true });
      if (settings.sound) { settings.sound = audio.setEnabled(true); store.set({ sound: settings.sound }); } // this click is the gesture browsers ask for
      if (withTour) later(startTour, reduce ? 50 : 1900); // once the camera has come down
      else {
        if (!store.get().touch) input.lock();
        later(() => hud.toast('Welcome to Spawn Plaza', profile.welcome), 900);
      }
    }, { tourFirst });

    const api = { destroy, store, controller, cam, openPanel, pause, resume, engine, tour, startTour, tourNext, endTour, settings };
    root.__game = api; // handy in the console and for automated checks
    return api;
  } catch (e) {
    destroy();
    throw e;
  }
}
