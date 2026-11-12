/* Renderer, scene, camera and the frame loop. Owns every GPU resource and
   releases all of it in dispose(). */

import * as THREE from '../three.js';
import { QUALITY } from './settings.js';

export function createEngine({ container, quality }) {
  const renderer = new THREE.WebGLRenderer({ antialias: quality !== 'low', powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // soft enough at this scale, and far cheaper than PCFSoft on weak GPUs

  const canvas = renderer.domElement;
  canvas.className = 'game__canvas';
  canvas.setAttribute('aria-label', '3D world. Use W A S D to move and the mouse to look around.');
  canvas.tabIndex = 0;
  container.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, .3, 1400);
  let level = quality;

  function resize() {
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY[level].pixelRatio));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  let raf = 0, last = 0, onFrame = null, running = false;
  const tick = now => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(.05, (now - last) / 1000 || 0);
    last = now;
    onFrame(dt, now / 1000);
  };

  let lost = null;
  const onLost = e => { e.preventDefault(); if (lost) lost(); };
  canvas.addEventListener('webglcontextlost', onLost);

  return {
    renderer, scene, camera, canvas,
    setFrame(fn) { onFrame = fn; },
    start() { if (running || !onFrame) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick); },
    stop() { running = false; cancelAnimationFrame(raf); },
    render() { renderer.render(scene, camera); },
    setQuality(q) { level = q; resize(); },
    onContextLost(fn) { lost = fn; },
    dispose() {
      this.stop();
      lost = null;
      removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', onLost);
      const seen = new Set();
      const drop = m => {
        if (!m || seen.has(m)) return;
        seen.add(m);
        for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); }
        m.dispose();
      };
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (Array.isArray(o.material)) o.material.forEach(drop); else drop(o.material);
        if (o.isLight && o.shadow && o.shadow.map) o.shadow.map.dispose();
        if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose();
      });
      if (scene.environment) scene.environment.dispose();
      scene.clear();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
