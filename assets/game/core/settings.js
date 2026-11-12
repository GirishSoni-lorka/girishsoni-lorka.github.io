/* Player settings (persisted) and the graphics presets they select. */

const KEY = 'gs-game-settings';

export const QUALITY = {
  low:    { label: 'Low',    pixelRatio: 1,    shadows: 0,    far: 260, fog: [70, 250],  clouds: false },
  medium: { label: 'Medium', pixelRatio: 1.5,  shadows: 1024, far: 420, fog: [110, 400], clouds: true },
  high:   { label: 'High',   pixelRatio: 2,    shadows: 2048, far: 520, fog: [130, 500], clouds: true },
};
export const QUALITY_ORDER = ['low', 'medium', 'high'];

export const defaults = { quality: 'auto', sensitivity: 1, invertY: false };

export function sanitize(raw) {
  const s = { ...defaults, ...(raw && typeof raw === 'object' ? raw : {}) };
  if (s.quality !== 'auto' && !QUALITY[s.quality]) s.quality = defaults.quality;
  s.sensitivity = Number.isFinite(+s.sensitivity) ? Math.min(2.5, Math.max(.3, +s.sensitivity)) : defaults.sensitivity;
  s.invertY = Boolean(s.invertY);
  return { quality: s.quality, sensitivity: s.sensitivity, invertY: s.invertY };
}

export function loadSettings() {
  try { return sanitize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return { ...defaults }; }
}

export function saveSettings(settings) {
  try { localStorage.setItem(KEY, JSON.stringify(sanitize(settings))); } catch (e) { /* not persisted this visit */ }
}

/* the preset "auto" resolves to on this device */
export function autoQuality({ lowPower, touch, cores = 4 }) {
  if (lowPower) return 'low';
  if (touch) return 'medium';
  return cores >= 8 ? 'high' : 'medium';
}

export function resolveQuality(setting, device) {
  return setting === 'auto' ? autoQuality(device) : setting;
}

/* one step down, or null when already at the lowest */
export function lowerQuality(level) {
  const i = QUALITY_ORDER.indexOf(level);
  return i > 0 ? QUALITY_ORDER[i - 1] : null;
}
