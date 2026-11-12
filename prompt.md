# Project: Interactive 3D Open-World Developer Portfolio

## 1. Project Objective

Transform my existing developer portfolio into a premium, interactive 3D open-world game experience while preserving the entire existing portfolio.

The website must offer two selectable experiences:

1. **Classic Mode:** The original portfolio with all existing UI, sections, animations, transitions, styling and functionality preserved.
2. **Game Mode:** A fully interactive 3D open-world portfolio where visitors control a character, explore the environment and discover my professional profile, skills, projects and contact information.

This is an enhancement of an existing production website, NOT a fresh portfolio rewrite.

## 2. Critical Rules — Read Before Coding

- Inspect the complete existing repository before changing anything.
- Identify the framework, build system, routing, deployment configuration, existing animations and current GitHub Pages setup.
- Preserve the existing design and functionality.
- Never delete or replace the existing Classic Mode.
- Do not unnecessarily upgrade dependencies or rewrite the application architecture.
- Do not change the production domain or GitHub Pages hosting.
- Do not introduce mandatory backend services.
- Do not break existing URLs, routes, SEO metadata or project links.
- Keep the 3D experience isolated from the original portfolio wherever practical.
- Use reusable components and clean architecture.
- Do not introduce placeholder functionality that appears finished but does nothing.

Before implementation, create:
- PROJECT_ANALYSIS.md
- IMPLEMENTATION_PLAN.md
- PROGRESS.md

Update PROGRESS.md after every completed milestone.

## 3. Technology Stack

Use the existing stack wherever possible.

Preferred 3D stack:

- Three.js
- React Three Fiber (if the existing application uses React)
- @react-three/drei
- @react-three/rapier for physics, only if needed
- GSAP for cinematic transitions, if compatible with existing animations
- Zustand for isolated game state, if needed
- GLTF / GLB for 3D models
- WebGL with graceful fallback handling

Do not introduce another frontend framework.

If the existing application is not React-based, adapt the Three.js architecture to the existing framework rather than rewriting it.

## 4. Experience Selection Screen

Create a premium experience selector.

Display two options:

### Classic Experience
- Opens the original portfolio.
- Preserves the existing design and interactions.
- No changes to its visual identity.

### Game Experience
- Opens the interactive 3D world.
- Shows an attractive game-style loading screen.
- Displays loading progress when assets are loading.
- Includes a short introduction and control instructions.

Add an easily accessible experience-switching button in both modes.

Switching modes must not reload the entire website unnecessarily.

Remember the visitor's last selected mode using localStorage, but always provide a way to switch back.

## 5. Game World — Open World Environment

Create a beautiful, stylized, premium 3D environment.

Visual direction:

- Futuristic open-world city.
- Modern architecture.
- Beautiful roads and pathways.
- Buildings, trees, lights and environmental objects.
- Daylight with optional atmospheric lighting effects.
- Realistic shadows where performance permits.
- High-quality materials and lighting.
- A coherent visual identity rather than random sci-fi objects.

The environment should feel like a polished indie game, not a basic Three.js demo.

Start with a manageable world. Build a modular environment that can expand later.

### World layout

Create separate exploration areas:

1. Spawn Plaza — Introduction and profile.
2. Developer Headquarters — About me and professional experience.
3. Technology Zone — Technical skills.
4. Project Garage — Portfolio projects.
5. Achievement Center — Certifications and accomplishments.
6. Mission Control — Contact and social links.

Each area must have a clear visual identity and a discoverable entrance or landmark.

Avoid making the world unnecessarily huge.

## 6. Player Character & Controls

Create a third-person character controller.

Required desktop controls:

- W / A / S / D: Character movement.
- Mouse: Camera rotation.
- Shift: Sprint.
- Space: Jump, if supported by the movement system.
- E: Interact with nearby objects.
- ESC: Pause or open the game menu.

Requirements:

- Smooth character movement.
- Third-person follow camera.
- Camera collision handling.
- Ground detection.
- Basic collision with buildings and environment objects.
- Prevent walking through important structures.
- Smooth camera transitions.
- Character animation states: idle, walking, running and jumping.
- Camera sensitivity settings.

Use an optimized animated GLB character model.

If no suitable model exists, create a temporary simple character with a clear replacement path. Do not spend excessive development time creating a character model from scratch.

The character must remain visually consistent throughout the experience.

## 7. Interactive Portfolio Locations

Every major portfolio section must be discoverable through the 3D world.

### A. Spawn Plaza — About Me

When the player enters the starting area:

- Display a welcome message.
- Introduce me as Girish Soni.
- Full Stack Senior Laravel Developer.
- Show a short professional introduction.
- Provide an interaction to open the detailed About section.

### B. Developer Headquarters — Experience

Create a building with an interactive information display.

Include:

- Professional experience.
- Company information.
- Employment timeline.
- Key responsibilities.
- Major achievements.

All information must come from the existing portfolio content. Do not invent employment history or achievements.

### C. Technology Zone — Skills

Create interactive 3D displays for:

- PHP
- Laravel
- React
- Next.js
- JavaScript
- Python
- MySQL
- Redis
- Docker
- AWS
- AI / LLM integration
- Prompt Engineering

Organize technologies into sensible categories.

Clicking or interacting with an item should open a clean information panel containing the relevant details.

Do not represent every technology as a floating random logo.

### D. Project Garage — Projects

Create an attractive interactive project showcase.

Each project should have:

- Project name.
- Description.
- Technologies used.
- Preview image.
- GitHub repository URL, if available.
- Live demo URL, if available.

Clicking a project should open a professional project details panel.

Extract project information from the existing portfolio. Do not invent URLs or project details.

Build the project data using a reusable configuration or data structure so new projects can be added without modifying the 3D scene implementation.

### E. Achievement Center

Display available:

- Certifications.
- Education.
- Achievements.
- Professional milestones.

Use existing verified information only.

### F. Mission Control — Contact

Create an interactive contact location.

Include:

- Email.
- LinkedIn.
- GitHub.
- Existing contact methods.

Allow visitors to open external profiles and send an email.

External links must work correctly.

## 8. UI / UX Design

The experience must look like a professionally designed game.

Create an in-game HUD containing:

- Player information.
- Current location.
- Interaction hints.
- Small navigation/minimap if practical.
- Experience switching control.
- Pause/menu control.

Interaction panels should use a clean modern design.

Important:
- The UI must not obstruct gameplay.
- Text must be readable.
- Avoid excessive neon effects.
- Use consistent typography.
- Support keyboard and mouse navigation.
- Provide an obvious way to exit Game Mode.

Create a proper pause menu with:
- Resume.
- Controls.
- Settings.
- Return to Classic Mode.

## 9. World Navigation & Interaction

Implement:

- Proximity-based interaction detection.
- Visual interaction indicators.
- Clickable landmarks.
- Location discovery.
- Smooth transitions between portfolio information panels.
- A simple navigation system or objective tracker.

For example:

When the player approaches Developer Headquarters, display:

"Press E to Explore Developer Headquarters"

Pressing E opens the experience information panel.

When the player approaches Project Garage, display:

"Press E to Explore Projects"

Avoid showing all portfolio information simultaneously.

The player should discover information naturally through exploration.

## 10. Responsive Design

Desktop is the primary target.

However, the experience must work on mobile devices.

Mobile controls should include:

- Virtual joystick.
- Camera touch controls.
- Interaction button.
- Sprint button where appropriate.
- Pause button.

Detect device capabilities and adjust graphics quality.

If a device cannot run the 3D experience properly, provide a graceful alternative to Classic Mode.

Never force visitors into a broken WebGL experience.

## 11. Performance Optimization

This is a production website, not a local-only game demo.

Performance requirements:

- Lazy-load Game Mode.
- Lazy-load 3D assets.
- Optimize GLB/GLTF files.
- Compress textures.
- Use instancing for repeated objects.
- Use LOD where appropriate.
- Use frustum culling.
- Avoid unnecessary React state updates inside the render loop.
- Avoid excessive draw calls.
- Limit shadow-casting objects.
- Dispose of GPU resources correctly when switching modes.
- Pause rendering when the tab is hidden.
- Provide low, medium and high graphics settings.
- Provide a loading progress indicator.
- Prevent unnecessary memory leaks.

Do not load the entire 3D environment when a visitor selects Classic Mode.

Target a smooth 60 FPS on capable desktop hardware, with graceful degradation on weaker hardware.

## 12. GitHub Pages Compatibility — Extremely Important

The existing website is hosted on GitHub Pages.

It must continue using the same hosting and deployment process.

Requirements:

- Keep the project compatible with static hosting.
- Do not introduce server-side rendering requirements.
- Do not introduce mandatory backend APIs.
- Configure Vite's base path correctly for the existing deployment URL.
- Ensure all assets use deployment-safe paths.
- Ensure GLB, GLTF, textures, fonts and other assets load correctly from GitHub Pages.
- Check case-sensitive asset paths.
- Preserve the existing custom domain configuration, if configured.
- Preserve the CNAME file.
- Preserve the existing GitHub Actions workflow unless a necessary, documented adjustment is required.
- Test the production build, not just the development server.
- Ensure direct page refreshes and existing navigation continue working.

If the website uses HashRouter or another existing routing approach, preserve its compatibility.

Never assume the root URL is the deployment path.

## 13. Suggested Project Structure

Adapt this structure to the existing project. Do not force unnecessary file movement.

src/
  components/
    experience-selector/
    classic/
    game/
      GameCanvas
      GameHUD
      GameMenu
      GameLoadingScreen
      GameControls
      InteractionPrompt
      InformationPanel

  game/
    world/
      World
      Environment
      Lighting
      Roads
      Buildings
      Locations

    player/
      Player
      PlayerController
      ThirdPersonCamera
      PlayerAnimations

    locations/
      SpawnPlaza
      DeveloperHeadquarters
      TechnologyZone
      ProjectGarage
      AchievementCenter
      MissionControl

    systems/
      InteractionSystem
      CollisionSystem
      NavigationSystem
      PerformanceManager

  data/
    portfolio/
      profile
      experience
      skills
      projects
      achievements
      contact

  store/
    gameStore
    settingsStore

  hooks/
  utils/

public/
  models/
  textures/
  environment/
  audio/

This is a suggested organization, not a mandatory rewrite.

## 14. Development Milestones

Implement in the following order.

### Milestone 1 — Existing Website Audit
- Inspect the repository.
- Identify framework and dependencies.
- Understand existing animations and routes.
- Verify GitHub Pages configuration.
- Document risks and implementation plan.

Do not modify existing functionality in this milestone.

### Milestone 2 — Experience Switching
- Create Classic / Game selector.
- Preserve the original portfolio.
- Implement isolated Game Mode loading.
- Implement switching in both directions.

### Milestone 3 — 3D Foundation
- Set up Three.js / React Three Fiber.
- Create the Game Canvas.
- Create the initial environment.
- Implement camera and basic lighting.
- Add loading states.

### Milestone 4 — Player Controller
- Add character model.
- Implement WASD movement.
- Implement third-person camera.
- Add basic collision.
- Add character animations.

### Milestone 5 — Open World
- Build the six exploration areas.
- Add buildings and pathways.
- Add landmarks.
- Add navigation and discovery.

### Milestone 6 — Portfolio Integration
- Connect existing profile data.
- Add experience panels.
- Add skill displays.
- Add project showcase.
- Add achievements and contact interactions.

### Milestone 7 — Game UI
- Add HUD.
- Add interaction prompts.
- Add pause menu.
- Add settings.
- Add mobile controls.

### Milestone 8 — Optimization
- Optimize assets.
- Implement graphics settings.
- Test memory usage.
- Test low-end devices.
- Add graceful fallbacks.

### Milestone 9 — Production & Deployment
- Run the existing test suite.
- Run production build.
- Test GitHub Pages deployment paths.
- Verify asset loading.
- Verify all existing Classic Mode functionality.
- Verify mode switching.
- Verify mobile and desktop behavior.

Do not deploy automatically without explicit approval.

## 15. Testing & Acceptance Criteria

The implementation is complete only when:

1. The existing portfolio still works exactly as before.
2. Classic Mode preserves existing animations and functionality.
3. Visitors can switch between Classic and Game Mode.
4. Game Mode loads without breaking the original application.
5. The player can move around the world using WASD.
6. Camera controls work correctly.
7. Character collisions work with important structures.
8. All six locations are discoverable.
9. Interactive portfolio information is accurate.
10. Project links open correctly.
11. Mobile controls are usable.
12. Game Mode can gracefully fall back on unsupported devices.
13. The production build succeeds.
14. GitHub Pages assets resolve correctly.
15. Existing custom domain and deployment configuration remain intact.

Create tests for important state transitions, mode switching, data rendering and routing.

## 16. Working Rules for Claude Code

- Work milestone by milestone.
- Before modifying a file, understand its current purpose.
- Do not overwrite existing files blindly.
- Keep changes scoped and reviewable.
- Do not silently remove functionality to make the build pass.
- Do not use fake data where real portfolio data is available.
- Document missing assets and external dependencies.
- Update PROGRESS.md after each milestone.
- Run relevant tests after each major change.
- If a milestone has blockers, document them instead of hiding them.
- Do not proceed with destructive changes without explaining their impact.

At the end of each milestone, report:

1. What was implemented.
2. Files created or modified.
3. Dependencies added.
4. Tests executed and results.
5. Performance considerations.
6. Remaining tasks.
7. Any risks to GitHub Pages compatibility.

## Final Goal

Deliver a premium, polished, playable 3D open-world developer portfolio while keeping the existing Classic Mode fully functional.

The result should feel like a small, professionally designed open-world game that happens to be a developer portfolio.

It should demonstrate my creativity, frontend engineering, 3D development and technical capabilities.

**Preserve the existing website. Enhance it. Do not destroy it to build the new experience.**