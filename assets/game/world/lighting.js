/* The sky and the light: a gradient sky, a sun (or moon) with a shadow that
   follows the player, soft sky fill, distance haze, drifting clouds and, at
   night, stars. Day and night are two looks of the same rig; `night` is a
   0..1 blend that eases from one to the other. */

import * as THREE from '../three.js';
import { QUALITY } from '../core/settings.js';
import { seeded } from '../core/poster.js';

const SUN_DIR = new THREE.Vector3(.55, .78, .32).normalize();

const c = hex => new THREE.Color(hex);
const DAY = {
  top: c('#3f86cf'), mid: c('#9cc8e6'), horizon: c('#cfe3ee'), glare: c('#ffdb9e'),
  hemiSky: c('#dcecff'), hemiGround: c('#8d9a7a'), hemi: 1.15,
  sun: c('#fff1d8'), sunPower: 2.6, env: .55, cloud: c('#ffffff'), cloudAlpha: .9, exposure: 1.02,
};
const NIGHT = {
  top: c('#040817'), mid: c('#0b1630'), horizon: c('#1b2c4a'), glare: c('#c3d4ff'),
  hemiSky: c('#7f97d0'), hemiGround: c('#1a2230'), hemi: .42,
  sun: c('#a9c0ff'), sunPower: .62, env: .16, cloud: c('#27344f'), cloudAlpha: .5, exposure: 1.1,
};
const mix = (a, b, k) => a + (b - a) * k;

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: DAY.top.clone() },
      mid: { value: DAY.mid.clone() },
      horizon: { value: DAY.horizon.clone() },
      glare: { value: DAY.glare.clone() },
      sun: { value: SUN_DIR.clone() },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 glare; uniform vec3 sun; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.22, h));
        c = mix(c, top, smoothstep(0.18, 0.85, h));
        float s = max(dot(d, sun), 0.0);
        c += glare * (pow(s, 600.0) * 2.5 + pow(s, 9.0) * 0.16);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

function starField() {
  const rnd = seeded('stars');
  const N = 700, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = rnd() * Math.PI * 2, y = .06 + rnd() * .94, r = Math.sqrt(1 - y * y);
    pos[i * 3] = Math.cos(a) * r * 950; pos[i * 3 + 1] = y * 950; pos[i * 3 + 2] = Math.sin(a) * r * 950;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({
    color: '#e6ecff', size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false, toneMapped: false,
  }));
  stars.frustumCulled = false;
  stars.visible = false;
  return stars;
}

export function createLighting({ scene, renderer }, quality, startNight = false) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), skyMaterial());
  sky.frustumCulled = false;
  scene.add(sky);
  const u = sky.material.uniforms;

  // reflections for glass and metal come from the (day) sky itself; at night they are simply turned down
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(sky.geometry, sky.material));
  scene.environment = pmrem.fromScene(envScene, 0, 1, 2000).texture;
  pmrem.dispose();

  scene.fog = new THREE.Fog(DAY.horizon.clone(), 100, 400);

  const hemi = new THREE.HemisphereLight(DAY.hemiSky.clone(), DAY.hemiGround.clone(), DAY.hemi);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(DAY.sun.clone(), DAY.sunPower);
  sun.shadow.camera.left = -46; sun.shadow.camera.right = 46;
  sun.shadow.camera.top = 46; sun.shadow.camera.bottom = -46;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 260;
  sun.shadow.bias = -.0005; sun.shadow.normalBias = .05;
  scene.add(sun, sun.target);

  const stars = starField();
  scene.add(stars);

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

  /* ---------- day and night ---------- */
  let night = startNight ? 1 : 0, wanted = night;
  function apply(k) {
    u.top.value.lerpColors(DAY.top, NIGHT.top, k);
    u.mid.value.lerpColors(DAY.mid, NIGHT.mid, k);
    u.horizon.value.lerpColors(DAY.horizon, NIGHT.horizon, k);
    u.glare.value.lerpColors(DAY.glare, NIGHT.glare, k);
    scene.fog.color.copy(u.horizon.value);
    hemi.color.lerpColors(DAY.hemiSky, NIGHT.hemiSky, k);
    hemi.groundColor.lerpColors(DAY.hemiGround, NIGHT.hemiGround, k);
    hemi.intensity = mix(DAY.hemi, NIGHT.hemi, k);
    sun.color.lerpColors(DAY.sun, NIGHT.sun, k);
    sun.intensity = mix(DAY.sunPower, NIGHT.sunPower, k);
    scene.environmentIntensity = mix(DAY.env, NIGHT.env, k);
    renderer.toneMappingExposure = mix(DAY.exposure, NIGHT.exposure, k);
    clouds.material.color.lerpColors(DAY.cloud, NIGHT.cloud, k);
    clouds.material.opacity = mix(DAY.cloudAlpha, NIGHT.cloudAlpha, k);
    stars.visible = k > .02;
    stars.material.opacity = k * .9;
  }
  apply(night);

  return {
    setQuality,
    /* ease to night (true) or day (false); `instant` skips the transition */
    setNight(on, instant = false) {
      wanted = on ? 1 : 0;
      if (instant) { night = wanted; apply(night); }
    },
    /* Keeps the shadow frustum centred on the player, snapped to whole texels
       so shadow edges do not swim as the player walks. Returns the current
       night blend so the world can follow it (lamps, windows). */
    update(target, t, dt = 0) {
      if (night !== wanted) {
        const step = dt / 1.6;
        night = Math.abs(wanted - night) <= step ? wanted : night + Math.sign(wanted - night) * step;
        apply(night);
      }
      const snap = 92 / (sun.shadow.mapSize.x || 1024) * 4;
      const x = Math.round(target.x / snap) * snap, z = Math.round(target.z / snap) * snap;
      sun.target.position.set(x, 0, z);
      sun.position.set(x + SUN_DIR.x * 130, SUN_DIR.y * 130, z + SUN_DIR.z * 130);
      clouds.rotation.y = t * .004;
      return night;
    },
  };
}
