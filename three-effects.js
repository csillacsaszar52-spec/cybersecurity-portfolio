import * as THREE from './assets/vendor/three.module.js';

const cyan = 0x52e5d0;
const blue = 0x79a8ff;
const alertRed = 0xdf6c70;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.matchMedia('(max-width: 620px)').matches;
const pointer = new THREE.Vector2();
let scrollProgress = 0;

window.addEventListener('pointermove', (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}, { passive: true });

window.addEventListener('scroll', () => {
  scrollProgress = window.scrollY / Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
}, { passive: true });

const makeRenderer = (mount) => {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !mobile, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1 : 1.5));
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);
  return renderer;
};

const addPacketPath = (group, y, z, color, offset, speed) => {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-8, y, z),
    new THREE.Vector3(-3, y + .35, z - .3),
    new THREE.Vector3(2, y - .2, z + .2),
    new THREE.Vector3(8, y + .1, z)
  ]);
  const path = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: .16 })
  );
  group.add(path);

  const packet = new THREE.Mesh(
    new THREE.BoxGeometry(.34, .08, .08),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9 })
  );
  packet.userData = { curve, offset, speed };
  group.add(packet);
  return packet;
};

const packetField = (scene) => {
  const group = new THREE.Group();
  const packets = [];
  const laneCount = mobile ? 5 : 9;
  for (let index = 0; index < laneCount; index += 1) {
    const y = (index - (laneCount - 1) / 2) * .62;
    const isAlert = index === laneCount - 2;
    packets.push(addPacketPath(group, y, (index % 3) * -.45, isAlert ? alertRed : index % 2 ? cyan : blue, index / laneCount, .035 + index * .002));
  }

  const nodeCount = mobile ? 28 : 64;
  const positions = new Float32Array(nodeCount * 3);
  for (let index = 0; index < nodeCount; index += 1) {
    positions[index * 3] = THREE.MathUtils.randFloatSpread(16);
    positions[index * 3 + 1] = THREE.MathUtils.randFloatSpread(6);
    positions[index * 3 + 2] = THREE.MathUtils.randFloatSpread(4);
  }
  const nodesGeometry = new THREE.BufferGeometry();
  nodesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.Points(nodesGeometry, new THREE.PointsMaterial({ color: cyan, size: .035, transparent: true, opacity: .45 })));
  scene.add(group);

  return (time) => {
    packets.forEach((packet) => {
      const phase = (time * packet.userData.speed + packet.userData.offset) % 1;
      packet.position.copy(packet.userData.curve.getPointAt(phase));
    });
    group.rotation.y += (pointer.x * .045 - group.rotation.y) * .025;
    group.rotation.x += (pointer.y * .03 - group.rotation.x) * .025;
    group.position.y = scrollProgress * -.7;
  };
};

const packetScan = (scene, mount) => {
  const group = new THREE.Group();
  const grid = new THREE.GridHelper(18, mobile ? 12 : 24, cyan, blue);
  grid.material.transparent = true;
  grid.material.opacity = .09;
  grid.rotation.x = Math.PI / 2;
  group.add(grid);

  const packetGeometry = new THREE.BoxGeometry(.4, .08, .08);
  const packets = Array.from({ length: mobile ? 5 : 11 }, (_, index) => {
    const mesh = new THREE.Mesh(packetGeometry, new THREE.MeshBasicMaterial({ color: index === 7 ? alertRed : cyan, transparent: true, opacity: .55 }));
    mesh.position.set(THREE.MathUtils.randFloatSpread(13), THREE.MathUtils.randFloatSpread(3), THREE.MathUtils.randFloatSpread(2));
    mesh.userData.speed = .008 + Math.random() * .009;
    group.add(mesh);
    return mesh;
  });
  scene.add(group);

  let hover = 0;
  const project = document.querySelector('.project-thumbnail');
  project?.addEventListener('pointerenter', () => { hover = 1; });
  project?.addEventListener('pointerleave', () => { hover = 0; });

  return (time) => {
    packets.forEach((packet, index) => {
      packet.position.x += packet.userData.speed * (hover ? 2.1 : 1);
      if (packet.position.x > 7) packet.position.x = -7;
      packet.position.y += Math.sin(time * .001 + index) * .0007;
    });
    group.rotation.z += ((pointer.x * .018) - group.rotation.z) * .02;
    mount.style.opacity = String(.72 + hover * .28);
  };
};

const signalRing = (scene) => {
  const group = new THREE.Group();
  const rings = [
    [2.6, cyan, .22],
    [3.5, blue, .13],
    [4.4, alertRed, .1]
  ].map(([radius, color, opacity]) => {
    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, radius, radius * .34, 0, Math.PI * 2).getPoints(100).map((point) => new THREE.Vector3(point.x, point.y, 0))),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    );
    group.add(ring);
    return ring;
  });
  scene.add(group);
  return (time) => {
    rings.forEach((ring, index) => {
      const pulse = 1 + Math.sin(time * .00045 + index * 1.8) * .035;
      ring.scale.setScalar(pulse);
      ring.rotation.z = pointer.x * .03 * (index + 1);
    });
    group.position.y = scrollProgress * .3;
  };
};

const factories = { 'packet-field': packetField, 'packet-scan': packetScan, 'signal-ring': signalRing };

document.querySelectorAll('[data-three-effect]').forEach((mount) => {
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
    camera.position.z = mount.dataset.threeEffect === 'packet-field' ? 9 : 10;
    const renderer = makeRenderer(mount);
    const update = factories[mount.dataset.threeEffect](scene, mount);
    let visible = true;
    let frame;

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const render = (time = 0) => {
      if (!visible) return;
      update(reducedMotion ? 0 : time);
      renderer.render(scene, camera);
      if (!reducedMotion) frame = requestAnimationFrame(render);
    };

    new ResizeObserver(resize).observe(mount);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible) render();
    }, { rootMargin: '100px' }).observe(mount);
    resize();
  } catch (error) {
    mount.hidden = true;
    console.warn('Three.js effect unavailable:', error);
  }
});
