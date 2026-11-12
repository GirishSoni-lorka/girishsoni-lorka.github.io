/* The explorer. An animated GLB character with idle, walk, run and jump
   clips, plus a simple procedural stand-in used only if the model cannot be
   loaded.

   Replacing the character: put another GLB at assets/models/explorer.glb (or
   change MODEL_URL) and map its animation clip names in CLIPS. The model
   should face +Z; its size does not matter, it is scaled to HEIGHT. */

import * as THREE from '../three.js';

const MODEL_URL = new URL('../../models/explorer.glb', import.meta.url).href;
const CLIPS = { idle: 'Idle', walk: 'Walking', run: 'Running', jump: 'Jump', wave: 'Wave' };
const SPEED = { idle: 1, walk: 1.25, run: 1.15, jump: 1.2, wave: 1 };
const HEIGHT = 1.85;

export async function loadPlayer(onProgress = () => {}) {
  try {
    const { GLTFLoader } = await import('../../vendor/three/addons/GLTFLoader.js');
    const gltf = await new Promise((resolve, reject) => {
      new GLTFLoader().load(MODEL_URL, resolve, e => { if (e.total) onProgress(e.loaded / e.total); }, reject);
    });
    onProgress(1);
    return animatedPlayer(gltf);
  } catch (e) {
    console.warn('Character model unavailable, using the stand-in', e);
    onProgress(1);
    return standInPlayer();
  }
}

function animatedPlayer(gltf) {
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const scale = HEIGHT / (box.max.y - box.min.y || 1);
  model.scale.setScalar(scale);
  model.position.y = -box.min.y * scale;
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.frustumCulled = false; // skinned bounds do not follow the animation
  });

  const object = new THREE.Group();
  object.add(model);

  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const [state, name] of Object.entries(CLIPS)) {
    const clip = THREE.AnimationClip.findByName(gltf.animations, name);
    if (!clip) continue;
    const a = mixer.clipAction(clip);
    a.timeScale = SPEED[state];
    if (state === 'jump' || state === 'wave') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
    actions[state] = a;
  }
  let current = null;

  return {
    object,
    setState(state) {
      const next = actions[state] || actions.idle;
      if (!next || next === current) return;
      next.reset().fadeIn(.18).play();
      if (current) current.fadeOut(.18);
      current = next;
    },
    update(dt) { mixer.update(dt); },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(model); },
  };
}

/* a few primitives that walk, run and jump well enough to explore with */
function standInPlayer() {
  const object = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: '#ff5a1f', roughness: .5 });
  const dark = new THREE.MeshStandardMaterial({ color: '#262d32', roughness: .5 });
  const mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; object.add(m); return m; };
  mesh(new THREE.CapsuleGeometry(.3, .55, 6, 14), body, 0, 1.12, 0);
  mesh(new THREE.SphereGeometry(.24, 18, 14), dark, 0, 1.72, 0);
  mesh(new THREE.BoxGeometry(.3, .08, .06), new THREE.MeshBasicMaterial({ color: '#ece7dc' }), 0, 1.74, .22);
  const leg = new THREE.CapsuleGeometry(.1, .5, 4, 8);
  const legs = [mesh(leg, dark, -.15, .38, 0), mesh(leg, dark, .15, .38, 0)];
  let state = 'idle', phase = 0;
  return {
    object,
    setState(s) { state = s; },
    update(dt) {
      const rate = state === 'run' ? 13 : state === 'walk' ? 8 : 0;
      phase += dt * rate;
      const swing = rate ? Math.sin(phase) * (state === 'run' ? .8 : .5) : 0;
      legs[0].rotation.x = swing; legs[1].rotation.x = -swing;
      legs[0].position.z = Math.sin(swing) * .25; legs[1].position.z = -Math.sin(swing) * .25;
    },
    dispose() {},
  };
}
