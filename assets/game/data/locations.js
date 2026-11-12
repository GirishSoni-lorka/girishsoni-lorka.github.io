/* The six districts. Pure data (no 3D imports), shared by the world builder,
   the navigation system, the minimap and the tests.

   Coordinates are metres on the ground plane: +x is east, +z is south.
   `angle` is the compass bearing from the plaza, in degrees. */

export const WORLD = {
  radius: 120,       // the player cannot walk past this
  ringRadius: 56,    // centre line of the ring boulevard
  ringWidth: 9,
  avenueWidth: 7,
  plazaRadius: 21,
  districtRadius: 80, // distance of each district from the plaza
  spawn: { x: 0, z: 13, facing: Math.PI }, // facing north, towards the monument
};

const at = angle => {
  const a = angle * Math.PI / 180;
  return { x: Math.round(Math.sin(a) * WORLD.districtRadius * 10) / 10, z: Math.round(-Math.cos(a) * WORLD.districtRadius * 10) / 10 };
};

export const locations = [
  {
    id: 'plaza', name: 'Spawn Plaza', topic: 'Introduction', angle: null, x: 0, z: 0, radius: 22,
    accent: '#ff5a1f', panel: 'about', prompt: 'Meet Girish Soni',
    hint: 'Start here: who I am and how I work.',
  },
  {
    id: 'hq', name: 'Developer Headquarters', topic: 'Experience', angle: 0, ...at(0), radius: 25,
    accent: '#e8703a', panel: 'experience', prompt: 'Explore Developer Headquarters',
    hint: 'Four years, two teams: the employment timeline.',
  },
  {
    id: 'tech', name: 'Technology Zone', topic: 'Skills', angle: 72, ...at(72), radius: 27,
    accent: '#2f9fb0', panel: 'skills', prompt: 'Explore the Technology Zone',
    hint: 'Twelve technologies in four groups. Walk up to any display.',
  },
  {
    id: 'garage', name: 'Project Garage', topic: 'Projects', angle: 144, ...at(144), radius: 27,
    accent: '#d59a1f', panel: 'projects', prompt: 'Explore Projects',
    hint: 'Eight production systems, one bay each.',
  },
  {
    id: 'achievements', name: 'Achievement Center', topic: 'Education and recognition', angle: 216, ...at(216), radius: 24,
    accent: '#8a72d6', panel: 'achievements', prompt: 'Explore the Achievement Center',
    hint: 'Education, recognition and milestones.',
  },
  {
    id: 'mission', name: 'Mission Control', topic: 'Contact', angle: 288, ...at(288), radius: 24,
    accent: '#3f7fe0', panel: 'contact', prompt: 'Open Mission Control',
    hint: 'Email, LinkedIn, GitHub and the résumé.',
  },
];

export const findLocation = id => locations.find(l => l.id === id);

/* which district a ground point is in, or null when out on the streets */
export function locationAt(x, z) {
  let best = null, bestD = Infinity;
  for (const l of locations) {
    const d = Math.hypot(x - l.x, z - l.z);
    if (d <= l.radius && d < bestD) { best = l; bestD = d; }
  }
  return best;
}

/* the next district to visit: the first undiscovered one, in tour order */
export function nextObjective(discovered) {
  return locations.find(l => !discovered.includes(l.id)) || null;
}
