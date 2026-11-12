/* A small north-up map: roads, the six districts and the player. */

import { WORLD, locations } from '../data/locations.js';

export function createMinimap({ parent }) {
  const SIZE = 148;
  const canvas = document.createElement('canvas');
  canvas.className = 'gmap';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Map of the city');
  parent.appendChild(canvas);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = canvas.height = SIZE * dpr;
  const g = canvas.getContext('2d');
  const scale = (SIZE / 2 - 9) / WORLD.radius;
  const X = x => SIZE / 2 + x * scale, Y = z => SIZE / 2 + z * scale;

  // the static layer is drawn once
  const base = document.createElement('canvas');
  base.width = base.height = SIZE * dpr;
  const b = base.getContext('2d');
  b.scale(dpr, dpr);
  b.fillStyle = 'rgba(9,14,16,.78)';
  b.beginPath(); b.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, 7); b.fill();
  b.strokeStyle = 'rgba(236,231,220,.34)'; b.lineCap = 'round';
  b.lineWidth = WORLD.ringWidth * scale;
  b.beginPath(); b.arc(SIZE / 2, SIZE / 2, WORLD.ringRadius * scale, 0, 7); b.stroke();
  b.lineWidth = WORLD.avenueWidth * scale;
  for (const l of locations) {
    if (l.angle === null) continue;
    b.beginPath(); b.moveTo(X(0), Y(0)); b.lineTo(X(l.x * .8), Y(l.z * .8)); b.stroke();
  }
  b.strokeStyle = 'rgba(236,231,220,.22)'; b.lineWidth = 1;
  b.beginPath(); b.arc(SIZE / 2, SIZE / 2, WORLD.radius * scale, 0, 7); b.stroke();
  b.fillStyle = 'rgba(236,231,220,.6)'; b.font = '500 8px "Martian Mono", monospace'; b.textAlign = 'center';
  b.fillText('N', SIZE / 2, 9);

  let key = '';
  return {
    /* cheap to call every frame: redraws only when something visible moved */
    draw(pos, heading, discovered, objectiveId) {
      const k = `${Math.round(pos.x)},${Math.round(pos.z)},${Math.round(heading * 12)},${discovered.length},${objectiveId}`;
      if (k === key) return;
      key = k;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.drawImage(base, 0, 0);
      g.scale(dpr, dpr);
      for (const l of locations) {
        const found = discovered.includes(l.id);
        g.beginPath(); g.arc(X(l.x), Y(l.z), l.id === objectiveId ? 5.5 : 4.5, 0, 7);
        if (found) { g.fillStyle = l.accent; g.fill(); }
        else { g.fillStyle = 'rgba(9,14,16,.9)'; g.fill(); g.strokeStyle = l.accent; g.lineWidth = 1.6; g.stroke(); }
        if (l.id === objectiveId) { g.beginPath(); g.arc(X(l.x), Y(l.z), 8.5, 0, 7); g.strokeStyle = 'rgba(236,231,220,.7)'; g.lineWidth = 1; g.stroke(); }
      }
      // the player: an arrow pointing the way they face
      g.save();
      g.translate(X(pos.x), Y(pos.z));
      g.rotate(Math.PI - heading);
      g.fillStyle = '#fff'; g.strokeStyle = '#0a1012'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(0, -6.5); g.lineTo(4.6, 5); g.lineTo(0, 2.6); g.lineTo(-4.6, 5); g.closePath(); g.fill(); g.stroke();
      g.restore();
    },
    destroy() { canvas.remove(); },
  };
}
