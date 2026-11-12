/* Proximity and click interaction. Every interactable gets a floating
   marker; the one in reach is highlighted and offered as the prompt. */

import * as THREE from '../three.js';

/* Pure: the closest interactable whose radius contains the point, or null. */
export function nearest(items, x, z) {
  let best = null, bestD = Infinity;
  for (const it of items) {
    const d = Math.hypot(it.x - x, it.z - z);
    if (d <= it.radius && d < bestD) { best = it; bestD = d; }
  }
  return best;
}

export function createInteraction({ scene, camera, canvas, interactables, clickTargets }) {
  const geo = new THREE.OctahedronGeometry(.3, 0);
  const idle = new THREE.MeshBasicMaterial({ color: '#ece7dc', toneMapped: false, transparent: true, opacity: .85 });
  const hot = new THREE.MeshBasicMaterial({ color: '#ff5a1f', toneMapped: false });
  const group = new THREE.Group();
  group.name = 'markers';
  const byId = new Map();
  for (const it of interactables) {
    const m = new THREE.Mesh(geo, idle);
    m.position.set(it.x, it.y, it.z);
    m.scale.setScalar(it.major ? 1.5 : 1);
    m.userData.interact = it.id;
    it.marker = m;
    byId.set(it.id, it);
    group.add(m);
  }
  scene.add(group);

  const ray = new THREE.Raycaster();
  ray.far = 70;
  const ndc = new THREE.Vector2();
  const targets = [...clickTargets, ...group.children];
  let focused = null;

  return {
    get: id => byId.get(id),
    /* returns the interactable in reach (or null) and animates the markers */
    update(pos, t) {
      const next = nearest(interactables, pos.x, pos.z);
      if (next !== focused) {
        if (focused) focused.marker.material = idle;
        if (next) next.marker.material = hot;
        focused = next;
      }
      for (const it of interactables) {
        const m = it.marker;
        const far = Math.abs(it.x - pos.x) > 70 || Math.abs(it.z - pos.z) > 70;
        m.visible = !far;
        if (far) continue;
        m.rotation.y = t * 1.4 + it.x;
        m.position.y = it.y + Math.sin(t * 2 + it.z) * .14;
        const s = (it.major ? 1.5 : 1) * (it === focused ? 1.35 : 1);
        m.scale.x += (s - m.scale.x) * .2; m.scale.y = m.scale.z = m.scale.x;
      }
      return focused;
    },
    /* the interactable under a mouse event, if it is close enough to walk to */
    pick(event, pos) {
      const r = canvas.getBoundingClientRect();
      ndc.set((event.clientX - r.left) / r.width * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(targets, false)[0];
      if (!hit) return null;
      const it = byId.get(hit.object.userData.interact);
      return it && Math.hypot(it.x - pos.x, it.z - pos.z) < 45 ? it : null;
    },
  };
}
