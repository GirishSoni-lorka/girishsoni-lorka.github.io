# Implementation plan — Game Mode

See `PROJECT_ANALYSIS.md` for the audit this plan is based on.

## Principles

1. Classic and AI Agents modes keep working exactly as before.
2. No build step, no backend, no new framework. Static files only.
3. Game Mode is isolated in `assets/game/` and loaded on demand.
4. All portfolio copy comes from one data folder, sourced from the existing pages and résumé.

## Architecture

```
assets/
  js/
    mode.js          (edited)  three modes: agents | classic | game
    main.js          (edited)  orchestration; pauses classic motion while the game runs
    selector.js      (new)     experience selector (opened by ?mode=choose)
    game-launcher.js (new)     capability check + lazy import of the game
  css/
    selector.css     (new)     selector + game-mode page lock
  game/                        (new, lazy)
    index.js                   createGame(): wires everything, owns teardown
    game.css                   all in-game UI styles (injected on first launch)
    core/      store.js settings.js engine.js assets.js
    data/      profile.js experience.js skills.js projects.js achievements.js contact.js locations.js
    world/     world.js lighting.js roads.js buildings.js props.js builders.js
    locations/ spawnPlaza.js developerHeadquarters.js technologyZone.js projectGarage.js
               achievementCenter.js missionControl.js
    player/    player.js controller.js camera.js
    systems/   input.js collision.js interaction.js navigation.js performance.js tour.js audio.js
    ui/        loading.js hud.js minimap.js prompt.js panel.js menu.js touch.js content.js tourbar.js
  models/explorer.glb          animated character (CC0)
  vendor/three/                Three.js r170 module build + GLTFLoader
tests/                         node:test suite (no dependencies)
```

Mapping from the brief's suggested structure: `components/game/*` → `assets/game/ui/*`, `store/*` →
`assets/game/core/store.js` and `settings.js`, `public/models` → `assets/models`.

## Key decisions

- **Three modes.** The pill switch gains a Game option. `gs-mode` stores `agents`, `classic` or `game`.
- **Default and selector.** First-time visitors get Classic. Returning visitors go straight to their last
  mode and change it with the switch (or, in the game, the HUD and pause menu). The full-screen selector
  opens only from a `?mode=choose` link; `?mode=game`, `?mode=tour` and `?mode=agents` open a mode directly.
- **Deep links are sacred.** Any URL with a hash, and `projects.html`, always render the page.
- **State.** One small observable store. The render loop only writes to it when a value actually changes.
- **Collision.** The world is flat, so collision is 2D (circles and rotated boxes with a height) resolved in
  XZ, plus gravity for jumping. The same colliders drive camera collision. No physics engine needed.
- **Character.** `explorer.glb` (RobotExpressive, CC0) with Idle / Walking / Running / Jump clips. If it fails
  to load, a simple procedural character is used. To replace it, swap the file and edit the clip map in
  `player/player.js`.
- **World.** A compact city about 240 m across: a central plaza, five districts on a ring boulevard,
  instanced trees, lamps and background skyline. Each location is one module exporting `build(ctx)`.
- **Quality.** Low / medium / high presets (pixel ratio, shadows, view distance, prop density), auto-selected
  from device hints, lowered automatically if the frame rate stays poor.

## Milestones

1. **Audit** — this document, `PROJECT_ANALYSIS.md`, `PROGRESS.md`.
2. **Experience switching** — three-mode switch, selector, launcher, page lock, classic motion pause.
3. **3D foundation** — engine, loop, sky, light, ground, loading screen with real progress.
4. **Player** — character, WASD, sprint, jump, follow camera with collision, animation states.
5. **Open world** — roads, six locations, landmarks, trees, lamps, skyline, world bounds.
6. **Portfolio integration** — data modules, panels for every location, skills and projects.
7. **Game UI** — HUD, minimap, objective tracker, prompts, pause menu, settings, touch controls.
8. **Optimisation** — instancing, shadow budget, quality presets, auto-degrade, hidden-tab pause, disposal.
9. **Production checks** — tests, sub-path serving test, browser run-through of every mode. No deployment
   without explicit approval.

## Testing

- `node --test tests/` — mode persistence and routing rules, store transitions, collision maths, data
  integrity (every location has content, links are well-formed, nothing confidential), and a static check
  that every relative import and asset path exists with exact case.
- Headless Chrome run (system browser) against a static server mounted on a sub-path, covering: selector,
  each mode, switching both ways, movement, interaction, panels, pause menu, mobile viewport.
