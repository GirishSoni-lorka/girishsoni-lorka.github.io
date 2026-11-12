/* Assembles the city. Each step yields to the browser so the loading screen
   can paint real progress. To add a district: add it to data/locations.js,
   write a builder in locations/, and register it in BUILDERS. */

import { locations } from '../data/locations.js';
import { createContext } from './builders.js';
import { createLighting } from './lighting.js';
import { buildRoads } from './roads.js';
import { buildCity } from './buildings.js';
import { buildProps } from './props.js';
import { buildSpawnPlaza } from '../locations/spawnPlaza.js';
import { buildDeveloperHeadquarters } from '../locations/developerHeadquarters.js';
import { buildTechnologyZone } from '../locations/technologyZone.js';
import { buildProjectGarage } from '../locations/projectGarage.js';
import { buildAchievementCenter } from '../locations/achievementCenter.js';
import { buildMissionControl } from '../locations/missionControl.js';

const BUILDERS = {
  plaza: buildSpawnPlaza,
  hq: buildDeveloperHeadquarters,
  tech: buildTechnologyZone,
  garage: buildProjectGarage,
  achievements: buildAchievementCenter,
  mission: buildMissionControl,
};

const pause = () => new Promise(r => setTimeout(r, 0));

export async function buildWorld(engine, quality, onProgress = () => {}, isCancelled = () => false, { night = false } = {}) {
  const ctx = createContext(engine.scene);
  const steps = [
    ['Lighting the sky', () => { ctx.lighting = createLighting(engine, quality, night); }],
    ['Laying roads', () => buildRoads(ctx)],
    ...locations.map(l => [`Building ${l.name}`, () => BUILDERS[l.id](ctx, l)]),
    ['Raising the city', () => buildCity(ctx)],
    ['Planting trees', () => buildProps(ctx)],
  ];
  for (let i = 0; i < steps.length; i++) {
    if (isCancelled()) return null;
    onProgress(i / steps.length, steps[i][0]);
    await pause();
    steps[i][1]();
  }
  onProgress(1, 'Ready');
  let blend = -1; // the night blend the lamps and windows were last set to

  return {
    colliders: ctx.colliders,
    interactables: ctx.interactables,
    clickTargets: ctx.clickTargets,
    lighting: ctx.lighting,
    setNight(on, instant) { ctx.lighting.setNight(on, instant); },
    update(t, dt, focus) {
      const k = ctx.lighting.update(focus, t, dt);
      if (k !== blend) { blend = k; for (let i = 0; i < ctx.night.length; i++) ctx.night[i](k); }
      for (let i = 0; i < ctx.animated.length; i++) ctx.animated[i](t, dt);
    },
  };
}
