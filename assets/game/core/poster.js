/* A generated poster for a project that has no preview image. Drawn with the
   2D canvas API from the project data, so the same drawing is used as the
   billboard texture in the Project Garage and as the image in the panel. */

export function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function wrapText(g, text, maxWidth) {
  const words = text.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && g.measureText(next).width > maxWidth) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export const POSTER_W = 600, POSTER_H = 760;

export function drawPoster(canvas, project, index) {
  const W = canvas.width = POSTER_W, H = canvas.height = POSTER_H;
  const g = canvas.getContext('2d');
  const rnd = seeded(project.id);
  const accent = project.accent || '#ff5a1f';

  g.fillStyle = '#0a1012'; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * .8, H * .1, 0, W * .8, H * .1, W * .9);
  glow.addColorStop(0, `${accent}44`); glow.addColorStop(1, `${accent}00`);
  g.fillStyle = glow; g.fillRect(0, 0, W, H);

  // a field of records, and one request finding its way through them
  const cols = 9, rows = 7, x0 = 60, y0 = 150, gx = (W - 120) / (cols - 1), gy = 300 / (rows - 1);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const on = rnd() > .45;
    g.fillStyle = on ? 'rgba(236,231,220,.5)' : 'rgba(236,231,220,.14)';
    g.beginPath(); g.arc(x0 + c * gx, y0 + r * gy, on ? 3.4 : 2.2, 0, 7); g.fill();
  }
  g.strokeStyle = accent; g.lineWidth = 4; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath();
  let row = Math.floor(rnd() * rows);
  g.moveTo(x0, y0 + row * gy);
  for (let c = 1; c < cols; c++) {
    if (rnd() > .5) row = Math.max(0, Math.min(rows - 1, row + (rnd() > .5 ? 1 : -1)));
    g.lineTo(x0 + c * gx, y0 + row * gy);
  }
  g.stroke();
  g.fillStyle = accent;
  g.beginPath(); g.arc(x0 + (cols - 1) * gx, y0 + row * gy, 11, 0, 7); g.fill();

  g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(236,231,220,.6)';
  g.font = "500 22px 'Martian Mono', ui-monospace, monospace";
  g.fillText(`PROJECT ${String(index + 1).padStart(2, '0')}`, 60, 92);
  g.textAlign = 'right';
  g.fillText(project.kind.toUpperCase().slice(0, 26), W - 60, 92);
  g.textAlign = 'left';

  g.fillStyle = '#ece7dc';
  g.font = '800 68px Archivo, system-ui, sans-serif';
  const lines = wrapText(g, project.name.toUpperCase(), W - 120).slice(0, 3);
  let y = H - 70 - (lines.length - 1) * 70;
  for (const l of lines) { g.fillText(l, 60, y); y += 70; }
  g.fillStyle = accent; g.fillRect(60, H - 44, 96, 6);
  return canvas;
}
