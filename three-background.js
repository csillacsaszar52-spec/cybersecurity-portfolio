import * as THREE from 'three';

const mount = document.querySelector('#three-hero');

if (mount && window.WebGLRenderingContext) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 8.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const constellation = new THREE.Group();
  constellation.rotation.set(-0.12, 0.32, 0.08);
  scene.add(constellation);

  const shellGeometry = new THREE.IcosahedronGeometry(2.35, 2);
  const shellMaterial = new THREE.MeshBasicMaterial({
    color: 0x52e5d0,
    wireframe: true,
    transparent: true,
    opacity: 0.13,
  });
  const shell = new THREE.Mesh(shellGeometry, shellMaterial);
  constellation.add(shell);

  const coreGeometry = new THREE.IcosahedronGeometry(1.05, 1);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0x79a8ff,
    wireframe: true,
    transparent: true,
    opacity: 0.2,
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  constellation.add(core);

  const positions = shellGeometry.attributes.position;
  const unique = [];
  const seen = new Set();

  for (let index = 0; index < positions.count; index += 1) {
    const point = new THREE.Vector3().fromBufferAttribute(positions, index);
    const key = `${point.x.toFixed(2)}:${point.y.toFixed(2)}:${point.z.toFixed(2)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(point);
    }
  }

  const nodeGeometry = new THREE.BufferGeometry().setFromPoints(unique);
  const nodeMaterial = new THREE.PointsMaterial({
    color: 0x9ff8eb,
    size: 0.055,
    transparent: true,
    opacity: 0.82,
    sizeAttenuation: true,
  });
  constellation.add(new THREE.Points(nodeGeometry, nodeMaterial));

  const ringMaterial = new THREE.LineBasicMaterial({
    color: 0x79a8ff,
    transparent: true,
    opacity: 0.13,
  });

  [2.8, 3.25].forEach((radius, index) => {
    const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(96));
    const ring = new THREE.LineLoop(geometry, ringMaterial);
    ring.rotation.x = index ? 1.17 : 0.92;
    ring.rotation.y = index ? -0.35 : 0.44;
    constellation.add(ring);
  });

  const pointer = { x: 0, y: 0 };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true;
  let frameId;

  const resize = () => {
    const { width, height } = mount.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  const render = (time = 0) => {
    if (!reducedMotion) {
      constellation.rotation.y += 0.0014;
      constellation.rotation.x += (pointer.y * 0.11 - constellation.rotation.x) * 0.018;
      camera.position.x += (pointer.x * 0.42 - camera.position.x) * 0.018;
      core.rotation.y = -time * 0.00022;
      core.rotation.x = time * 0.00012;
    }
    renderer.render(scene, camera);
    if (visible && !reducedMotion) frameId = requestAnimationFrame(render);
  };

  window.addEventListener('pointermove', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    cancelAnimationFrame(frameId);
    if (visible) render();
  });

  window.addEventListener('resize', resize, { passive: true });
  resize();
  render();
  observer.observe(mount);
}
