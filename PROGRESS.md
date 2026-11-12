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
| 9 | Production checks | Done locally. **Not deployed, not committed** — waiting for approval. |

## How to check it yourself

```
node --test "tests/*.test.mjs"      # 73 unit tests, no install needed (Node 22.7+)
```

Serve the folder with any static server (XAMPP already does: `http://localhost/me/`, which is also a
sub-path test) and open `index.html`. Clear the `gs-mode` key in localStorage to see the first-visit selector.

## Results

| Check | Result |
| --- | --- |
| Unit tests (`tests/`) | 73 / 73 pass |
| Browser run-through (headless Chrome, site served from `/portfolio/`, exact-case paths) | 83 / 83 pass |
| Console errors in Classic, AI Agents, Game, mobile | None |
| Frame rate at 1920×1080 on a GeForce GT 730 (2014 entry-level card) | Low 79 fps, Medium 39 fps, High 31 fps |
| Draw calls / triangles, widest view | about 180 / 73,000 |
| Game Mode download, uncompressed | 1.45 MB in 47 files (Three.js 675 KB, character 453 KB) |
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
- **Behaviour change to note:** a first-time visitor on the plain home page now sees the selector instead of
  going straight into AI Agents. Deep links and `projects.html` behave exactly as before.

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

## Known gaps (documented, not hidden)

- **Certifications:** none exist in the source material; the Achievement Center says so.
- **Project preview images, repository and demo links:** none are published. Posters are generated from
  project data; `image`, `github` and `live` fields in `data/projects.js` light up when filled in.
- **Next.js and Prompt Engineering** have thin evidence in the existing content, so their panels are short
  and only restate what the résumé and the chatbot write-up support.
- **Real-device testing:** mobile was tested in Chrome's touch emulation only, not on a phone. Safari and
  Firefox were not run.
- **Camera under roofs:** collision is 2D with heights, so inside the Achievement Center rotunda a steep
  camera angle can clip the ceiling.
- **Audio:** none.

## Risks to GitHub Pages compatibility

None found. The one thing to keep in mind: the repository gains about 1.6 MB (engine, model, game code), all
served as plain static files, and `tests/` plus the three `.md` files will also be published unless excluded.
