/* Daylight: a gradient sky, a warm sun with a shadow that follows the player,
   soft sky fill, distance haze and a few drifting clouds. */

import * as THREE from '../three.js';
import { QUALITY } from '../core/settings.js';
import { seeded } from '../core/poster.js';

const SUN_DIR = new THREE.Vector3(.55, .78, .32).normalize();
const HAZE = new THREE.Color('#cfe3ee');

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color('#3f86cf') },
      mid: { value: new THREE.Color('#9cc8e6') },
      horizon: { value: HAZE.clone() },
      sun: { value: SUN_DIR.clone() },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 sun; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.22, h));
        c = mix(c, top, smoothstep(0.18, 0.85, h));
        float s = max(dot(d, sun), 0.0);
        c += vec3(1.0, 0.86, 0.62) * (pow(s, 600.0) * 2.5 + pow(s, 9.0) * 0.16);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function createLighting({ scene, renderer }, quality) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), skyMaterial());
  sky.frustumCulled = false;
  scene.add(sky);

  // reflections for glass and metal come from the sky itself
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(sky.geometry, sky.material);
  envScene.add(envSky);
  scene.environment = pmrem.fromScene(envScene, 0, 1, 2000).texture;
  scene.environmentIntensity = .55;
  pmrem.dispose();

  scene.fog = new THREE.Fog(HAZE, 100, 400);

  const hemi = new THREE.HemisphereLight('#dcecff', '#8d9a7a', 1.15);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight('#fff1d8', 2.6);
  sun.shadow.camera.left = -46; sun.shadow.camera.right = 46;
  sun.shadow.camera.top = 46; sun.shadow.camera.bottom = -46;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 260;
  sun.shadow.bias = -.0005; sun.shadow.normalBias = .05;
  scene.add(sun, sun.target);

  // clouds: a handful of soft blobs, one instanced mesh
  const rnd = seeded('clouds');
  const blobs = [];
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, r = 120 + rnd() * 380, y = 150 + rnd() * 70, s = 22 + rnd() * 26;
    const cx = Math.sin(a) * r, cz = Math.cos(a) * r;
    for (let k = 0; k < 4; k++) blobs.push([cx + (k - 1.5) * s * .62 + rnd() * 8, y + rnd() * 5, cz + rnd() * 14, s * (.6 + rnd() * .5)]);
  }
  const clouds = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 2),
    new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false, transparent: true, opacity: .9, toneMapped: false }),
    blobs.length,
  );
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  blobs.forEach((b, i) => { p.set(b[0], b[1], b[2]); sc.set(b[3], b[3] * .34, b[3] * .7); clouds.setMatrixAt(i, m.compose(p, q, sc)); });
  clouds.frustumCulled = false;
  scene.add(clouds);

  function setQuality(level) {
    const preset = QUALITY[level];
    scene.fog.near = preset.fog[0]; scene.fog.far = preset.fog[1];
    clouds.visible = preset.clouds;
    const on = preset.shadows > 0;
    if (sun.castShadow !== on || sun.shadow.mapSize.x !== preset.shadows) {
      sun.castShadow = on;
      if (on) sun.shadow.mapSize.set(preset.shadows, preset.shadows);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
  }
  setQuality(quality);

  return {
    setQuality,
    /* keep the shadow frustum centred on the player, snapped to whole texels
       so shadow edges do not swim as the player walks */
    update(target, t) {
      const snap = 92 / (sun.shadow.mapSize.x || 1024) * 4;
      const x = Math.round(target.x / snap) * snap, z = Math.round(target.z / snap) * snap;
      sun.target.position.set(x, 0, z);
      sun.position.set(x + SUN_DIR.x * 130, SUN_DIR.y * 130, z + SUN_DIR.z * 130);
      clouds.rotation.y = t * .004;
    },
  };
}
