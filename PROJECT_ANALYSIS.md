# Project analysis — girish.lorka.in

Audit of the repository as it stood at commit `fe2981e`, before Game Mode work began.

## What the site is

| Area | Finding |
| --- | --- |
| Framework | None. Hand-written HTML, CSS and native ES modules. **No React, no Vite, no bundler, no `package.json`.** |
| Build system | None. The files in git are the files that are served. |
| Hosting | GitHub Pages, published straight from the `main` branch. No GitHub Actions workflow exists. |
| Domain | Custom domain `girish.lorka.in` via the root `CNAME` file, so the site is served from `/`. |
| Routing | Two static pages: `index.html` and `projects.html`, plus in-page anchors (`#work`, `#journey`, `#contact`, `projects.html#proj-*`). No client-side router. |
| Runtime dependencies | GSAP 3.15.0 and Lenis 1.3.26 from jsDelivr (SRI-pinned, `defer`). Google Fonts: Archivo and Martian Mono. |
| Tests | None existed. |

## Files

| File | Purpose |
| --- | --- |
| `index.html`, `projects.html` | All portfolio content and SEO metadata (canonical, Open Graph, JSON-LD). |
| `assets/css/site.css` | Classic design: tokens (`--ground`, `--bone`, `--signal` orange), layout, x-ray styles. |
| `assets/css/agents.css` | The mode switch and everything specific to AI Agents mode. |
| `assets/js/main.js` | Boots the motion system on one GSAP ticker and orchestrates experience modes. |
| `assets/js/mode.js` | Mode persistence (`localStorage` key `gs-mode`) and the pill switch. |
| `assets/js/field.js`, `signal.js`, `xray.js`, `scenes.js`, `geo.js` | Classic motion: WebGL particle field, the signal line, the x-ray scanner. |
| `assets/js/agents.js` | AI Agents mode, loaded on demand with `import()`. |
| `assets/resume.pdf` | Résumé (compiled PDF). |

## Existing experience modes

The site already has two modes behind a switch: **AI Agents** (default for new visitors) and **Classic**.
An inline script in each page's `<head>` reads `gs-mode` and adds `mode-agents ag-pending` before first paint so
AI Agents visitors never see a flash of finished content. Both modes share the motion system; only Lenis smooth
scrolling is Classic-only.

Game Mode therefore becomes a **third** mode. Neither existing mode is removed.

## Consequences for the brief

The brief assumes a React/Vite project. This one is not, and the brief says to adapt rather than rewrite, so:

- **Three.js is used directly** (no React Three Fiber, drei, rapier or Zustand). Small hand-written equivalents
  cover what those libraries would do: a pub/sub store, a 2D collision system, a GLTF-driven character.
- **No build step is introduced.** Three.js r170 is vendored as an ES module in `assets/vendor/three/` and loaded
  with `import()` only when Game Mode starts. "Production build" means the committed files themselves.
- **"Vite base path" does not apply.** Instead every game asset URL is resolved with `new URL(..., import.meta.url)`,
  so it works from `/`, from a project sub-path (`/repo/`), or from any local folder.
- **GSAP** stays owned by the classic motion system. The game runs its own `requestAnimationFrame` loop so the
  two never share a ticker.

## Portfolio content available (single source of truth for Game Mode)

Taken from `index.html`, `projects.html` and `assets/resume.pdf`:

- Profile: name, title, intro, availability, location (Jodhpur, Rajasthan, India).
- Experience: Web Techno Software (Aug 2022 – Aug 2024), Maxaix (Aug 2024 – present), with résumé bullet points.
- Skills: Backend, Frontend, Database, Cloud, DevOps, Realtime, AI, Tools groups from the résumé.
- Projects: eight write-ups with descriptions, feature lists and stacks.
- Education: MCA (2022 – 2024) and BCA (2019 – 2022), Lachoo Memorial College, Jodhpur.
- Achievement: "Out of the Box Performance Recognition".
- Contact: email, phone, LinkedIn, GitHub, résumé PDF.

### Not available — documented rather than invented

- **Certifications:** none are listed anywhere. The Achievement Center says so instead of inventing any.
- **Project preview images:** the site has none. Game Mode draws a generated poster per project from its data.
- **Per-project GitHub / live-demo URLs:** none are published (client work). The data model has optional
  `github` and `live` fields; the panel shows links only when they are filled in.
- **Prompt Engineering** is requested in the brief but not mentioned in the existing content; its panel describes
  it only through the verified AI Enterprise Chatbot work (retrieval, query rewriting, grounded answers).

## Risks

| Risk | Mitigation |
| --- | --- |
| Breaking Classic or AI Agents mode | Game code lives in `assets/game/` and is never imported unless Game Mode is chosen. Changes to existing files are small and additive. |
| Client confidentiality | Project #01 stays "Enterprise HRMS"; all game copy is taken from the published pages. |
| Deep links (`index.html#work`, `projects.html#proj-kaifit`) | Game Mode and the selector never auto-open on `projects.html` or when the URL has a hash. |
| Large downloads for Classic visitors | Three.js (~690 KB) and the character (~460 KB) are fetched only after Game Mode is selected. |
| No WebGL / weak devices | Capability check before launch; Game card disabled with an explanation; automatic quality drop; runtime failure returns the visitor to Classic. |
| GitHub Pages runs Jekyll | No vendored file or folder starts with `_`, so nothing is skipped. No `.nojekyll` change needed. |
| Case-sensitive paths on Pages | All new file names are lower-case; imports were checked against the file system by the test suite. |
