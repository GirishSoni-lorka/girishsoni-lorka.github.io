# Progress — Game Mode

| # | Milestone | Status |
| --- | --- | --- |
| 1 | Existing website audit | Done |
| 2 | Experience switching | Done |
| 3 | 3D foundation | Done |
| 4 | Player controller | Done |
| 5 | Open world | Done |
| 6 | Portfolio integration | Done |
| 7 | Game UI | Done |
| 8 | Optimisation | Done |
| 9 | Production checks | Done. Committed and pushed by the owner (`faf6863`). |
| 10 | Second round: default mode, share links, guided tour, night, sound, summary, smaller model | Done locally. **Not committed, not deployed** — waiting for approval. |

## How to check it yourself

```
node --test "tests/*.test.mjs"      # 89 unit tests, no install needed (Node 22.7+)
```

Serve the folder with any static server (XAMPP already does: `http://localhost/me/`, which is also a
sub-path test) and open `index.html`. A first visit opens Classic. Links that open something else:

| Address | Opens |
| --- | --- |
| `?mode=game` | Game Mode |
| `?mode=tour` | Game Mode with the guided tour as the main button |
| `?mode=agents` | AI Agents |
| `?mode=choose` | The three-way selector |

## Results

| Check | Result |
| --- | --- |
| Unit tests (`tests/`) | 89 / 89 pass |
| Browser run-through (headless Chrome, site served from `/portfolio/`, exact-case paths) | 155 / 155 pass (86 original, 69 for the second round) |
| Console errors in Classic, AI Agents, Game, mobile | None |
| Frame rate at 1920×1080 on a GeForce GT 730 (2014 entry-level card) | Low 79 fps, Medium 39 fps, High 31 fps |
| Draw calls / triangles, widest view | about 180 / 73,000 |
| Game Mode download, uncompressed | 1.28 MB in 50 files (Three.js 675 KB, character 283 KB) |
| Classic / AI Agents download of game code | 0 bytes of engine, world or model |
| Memory after 4 enter/leave cycles | Stable (about 12 MB JS heap); earlier game instances are collected |

The GT 730 is far below "capable desktop hardware". 60 fps on a modern GPU is expected from these numbers but
was not measured, because this machine has no such GPU.

## Milestone reports

### 1 — Audit
- **Implemented:** `PROJECT_ANALYSIS.md`, `IMPLEMENTATION_PLAN.md`. No functional change.
- **Finding that shaped everything:** the site is static HTML/CSS/ES modules with no build step and no React,
  and it already has two modes (AI Agents, Classic). Game became a third mode and Three.js is used directly.

### 2 — Experience switching
- **Implemented:** three-way switch, first-visit selector, lazy launcher, page lock while the game runs,
  pause (not teardown) of the classic motion system.
- **Created:** `assets/js/selector.js`, `assets/js/game-launcher.js`, `assets/css/selector.css`.
- **Modified:** `assets/js/mode.js` (third mode, `resolveStart`), `assets/js/main.js` (orchestration,
  `setPaused`), `index.html` and `projects.html` (one stylesheet link and the inline mode script).
- **Changed in round 2:** a first-time visitor now gets Classic directly (see milestone 10). The selector is
  kept, behind `?mode=choose`.

### 3 — 3D foundation
- **Created:** `assets/game/core/` (engine, store, settings, poster), `world/lighting.js`, `ui/loading.js`,
  `game.css`.
- **Dependencies:** Three.js r170 and its GLTFLoader, vendored in `assets/vendor/three/` (MIT, licence
  included). The two addon files had their `'three'` import rewritten to a relative path so no bundler or
  import map is needed.
- Loading progress is real: engine import, model bytes, then one step per district built.

### 4 — Player controller
- **Created:** `player/player.js`, `player/controller.js`, `player/camera.js`, `systems/input.js`,
  `systems/collision.js`.
- WASD/arrows, Shift sprint, Space jump, mouse look with pointer lock (drag as a fallback), camera collision,
  idle/walk/run/jump animation states, sensitivity and invert-Y settings.
- **Character:** `assets/models/explorer.glb` is RobotExpressive by Tomás Laulhé (CC0), from the Three.js
  examples. A procedural stand-in loads if the file fails. Replacement path is documented at the top of
  `player/player.js`.

### 5 — Open world
- **Created:** `world/` (roads, buildings, props, builders, world) and `locations/` (six builders).
- Central plaza, ring boulevard, five avenues, six districts each with its own landmark, accent colour,
  totem and sky beacon; 25 city blocks; instanced trees, lamps, benches and skyline.
- Discovery toasts, objective tracker with direction and distance, minimap.

### 6 — Portfolio integration
- **Created:** `assets/game/data/` (profile, experience, skills, projects, achievements, contact, locations)
  and `ui/content.js`, `ui/panel.js`.
- 26 interactables: one main point per district (6), 12 skill displays and 8 project bays.
- All copy is taken from `index.html`, `projects.html` and the résumé; tests compare it against the pages.

### 7 — Game UI
- **Created:** `ui/hud.js`, `ui/minimap.js`, `ui/prompt.js`, `ui/menu.js`, `ui/touch.js`, `ui/dom.js`.
- HUD, "Press E to …" prompt (also clickable), pause menu (Resume, Controls, Settings, Return to Classic
  Mode, AI Agents), touch stick, drag-look, interact/jump/sprint buttons.

### 8 — Optimisation
- Instancing for trees, lamps, benches, lane markings, clouds and skyline; one shadow light with a frustum
  that follows the player; low/medium/high presets plus Auto, which steps down when the frame rate stays
  under 38 fps; no rendering while paused or while the tab is hidden; full GPU disposal on exit.
- **LOD** was not added: the heaviest repeated objects are already instanced low-poly meshes and distance
  haze hides the far field, so it would not have paid for itself at this world size.
- **Texture compression** does not apply: there are no image textures. Every texture is a small canvas drawn
  at load time.

### 9 — Production checks
- See the results table. GitHub Pages specifics verified: `CNAME` unchanged, no workflow or build added, no
  root-absolute paths, every import and asset path exists with exact case, no file starts with `_`.

### 10 — Second round
- **Default mode:** a first visit opens Classic on every page. Before this work it was AI Agents; milestone 2
  had made it the selector. AI Agents and Game are one click away on the switch.
- **Share links:** `?mode=game`, `?mode=tour`, `?mode=agents`, `?mode=choose`. The link wins over the
  remembered mode, never opens the game on a deep link or on `projects.html`, and is removed from the address
  as soon as the visitor switches mode themselves. The pause menu has "Copy a link to this world".
- **Guided tour** (`systems/tour.js`, `ui/tourbar.js`): the explorer runs the streets to all six districts in
  order and opens each panel; "Next stop" is at the foot of the panel. "Skip the walk" jumps to the stop, and so
  does the tour itself if it is ever blocked for two seconds. Pressing a movement key takes the controls back.
  Starts from the loading screen, the HUD, the pause menu or the T key. In the browser run all five walks
  arrived on foot in 3 to 8 seconds each.
- **Summary panel:** when the tour ends, or all six districts are found, a "City explored" panel offers email,
  LinkedIn, the résumé and a way back to each district. Nothing is locked behind it.
- **Night** (N, HUD button or Settings): moonlight, stars, lit windows and a pool of light under every street
  lamp. The pools are additive discs, not real lights, so the cost is two extra draw calls.
- **Sound** (M, HUD button or Settings; off by default): wind, footsteps, jump and landing, and short notes
  for discoveries and panels. All generated with Web Audio: no audio files were added.
- **Character:** 464 KB to 290 KB by removing the nine unused animation clips and the unused face morph
  targets, then resampling and quantising. No decoder is needed. Checked by eye, idle and running.
- **Camera under the rotunda roof:** fixed with a camera-only collider. Highest camera position measured
  inside, at the steepest angle: 6.4 m under a 7.2 m ceiling.
- **Reduced motion:** with the system setting on, the opening camera move is cut, the overview does not turn
  and the tour jumps between stops instead of running.
- **Found and fixed on the way:** a panel reopened within a third of a second of closing stayed invisible.
- **GitHub Pages:** `_config.yml` excludes `tests/`, `prompt.md` and the three reports from the published
  site. This relies on the default Jekyll build (there is no `.nojekyll`); it is covered by a unit test but
  has not been checked on GitHub Pages itself.
- **Created:** `_config.yml`, `assets/game/systems/tour.js`, `systems/audio.js`, `ui/tourbar.js`,
  `tests/tour.test.mjs`. **Modified:** `mode.js`, `main.js`, `selector.js`, `game-launcher.js`, both pages'
  inline script, and most of `assets/game/` (index, lighting, props, buildings, HUD, menu, panel, loading,
  content, controller, camera, input, settings, store, CSS).

## Known gaps (documented, not hidden)

- **Certifications:** none exist in the source material; the Achievement Center says so.
- **Project preview images, repository and demo links:** none are published. Posters are generated from
  project data; `image`, `github` and `live` fields in `data/projects.js` light up when filled in.
- **Next.js and Prompt Engineering** have thin evidence in the existing content, so their panels are short
  and only restate what the résumé and the chatbot write-up support.
- **Real-device testing:** the owner checked the first version on an Android phone. The second round (tour,
  night, sound) was tested in Chrome's touch emulation only. iPhone Safari and Firefox were not run.
- **Sound** was checked for errors, not listened to: the test browser is headless.
- **Night performance** was measured once: 47 fps on High at 1440×860 on the GT 730.

## Risks to GitHub Pages compatibility

None found. The repository gains about 1.4 MB (engine, model, game code), all served as plain static files.
`_config.yml` keeps `tests/` and the `.md` files off the site; see milestone 10 for the one unverified point.
