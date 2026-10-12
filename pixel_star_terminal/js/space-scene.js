import * as THREE from 'three';
import { TextureManager, chooseDefaultQuality } from './texture-manager.js';

const canvas = document.getElementById('spaceCanvas');
if (!canvas) throw new Error('PIXEL STAR: #spaceCanvas not found.');

const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const isMobile = () => matchMedia('(max-width: 700px)').matches;

const LOOK = Object.freeze({
  axialTiltDeg: 26.73,
  bodyRadius: 1.48,
  polarScale: 0.902,
  ringInnerRadius: 1.72,
  ringOuterRadius: 3.34,

  desktopFov: 21.4,
  mobileFov: 31.2,
  desktopCamera: Object.freeze([-3.95, 6.10, 10.10]),
  mobileCamera: Object.freeze([-5.40, 8.80, 13.60]),
  desktopRoot: Object.freeze([0.16, -0.02, -0.05]),
  mobileRoot: Object.freeze([0.10, -0.04, -0.04])
});

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x000000, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(LOOK.desktopFov, 1, 0.002, 260);
const textureManager = new TextureManager(renderer, { retries: 2 });

const root = new THREE.Group();
scene.add(root);

const saturnTilt = new THREE.Group();
saturnTilt.rotation.z = THREE.MathUtils.degToRad(LOOK.axialTiltDeg);
root.add(saturnTilt);

const ambient = new THREE.HemisphereLight(0xffead2, 0x030303, 0.075);
scene.add(ambient);

const sunLight = new THREE.DirectionalLight(0xffe2b7, 4.35);
sunLight.position.set(-8.8, 7.6, 10.6);
sunLight.target.position.set(0, 0, 0);
scene.add(sunLight, sunLight.target);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -5.6;
sunLight.shadow.camera.right = 5.6;
sunLight.shadow.camera.top = 5.6;
sunLight.shadow.camera.bottom = -5.6;
sunLight.shadow.camera.near = 0.1;
sunLight.shadow.camera.far = 35;
sunLight.shadow.bias = -0.00018;
sunLight.shadow.normalBias = 0.012;

const coldRim = new THREE.DirectionalLight(0x9fc7ff, 0.045);
coldRim.position.set(5.5, 0.6, -7.0);
scene.add(coldRim);

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function buildStarLayer({ seed, count, radiusMin, radiusMax, size, opacity, warmChance = 0.08 }) {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const radius = radiusMin + random() * (radiusMax - radiusMin);
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const i3 = i * 3;
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.cos(phi);
    positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const warm = random() < warmChance;
    const cool = !warm && random() < 0.20;
    const brightness = 0.30 + random() * 0.52;
    colors[i3] = brightness * (warm ? 1.0 : cool ? 0.78 : 0.90);
    colors[i3 + 1] = brightness * (warm ? 0.86 : cool ? 0.88 : 0.94);
    colors[i3 + 2] = brightness * (warm ? 0.70 : cool ? 1.0 : 1.0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

function gaussian(random) {
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function buildGalaxyBand({ seed, count, width, thickness, length, size, opacity }) {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const x = (random() * 2 - 1) * length;
    const y = gaussian(random) * thickness;
    const z = gaussian(random) * width + Math.sin(x * 0.075) * width * 0.28;
    const i3 = i * 3;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    const edgeFade = 1.0 - Math.min(1, Math.abs(x) / length);
    const bright = (0.28 + random() * 0.55) * (0.35 + 0.65 * edgeFade);
    const coolBias = 0.6 + random() * 0.4;
    colors[i3] = bright * 0.78;
    colors[i3 + 1] = bright * 0.84;
    colors[i3 + 2] = bright * (0.95 + 0.12 * coolBias);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

function buildCluster({ seed, count, spread, size, opacity }) {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    positions[i3] = gaussian(random) * spread;
    positions[i3 + 1] = gaussian(random) * spread * 0.32;
    positions[i3 + 2] = gaussian(random) * spread * 0.78;
    const bright = 0.35 + random() * 0.65;
    colors[i3] = bright * 0.92;
    colors[i3 + 1] = bright * 0.95;
    colors[i3 + 2] = bright;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

function buildForegroundDust({ seed, count, spreadX, spreadY, spreadZ, size, opacity }) {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    positions[i3] = (random() * 2 - 1) * spreadX;
    positions[i3 + 1] = (random() * 2 - 1) * spreadY;
    positions[i3 + 2] = -random() * spreadZ;
    const bright = 0.24 + random() * 0.24;
    colors[i3] = bright * 0.9;
    colors[i3 + 1] = bright * 0.93;
    colors[i3 + 2] = bright;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}


function buildReadableCluster({ seed, count, spreadX, spreadY, size, opacity, bright = false }) {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    positions[i3] = gaussian(random) * spreadX;
    positions[i3 + 1] = gaussian(random) * spreadY;
    positions[i3 + 2] = (random() - 0.5) * 1.6;
    const base = bright ? (0.78 + random() * 0.22) : (0.42 + random() * 0.42);
    const warm = random() < 0.25;
    const cool = !warm && random() < 0.35;
    colors[i3] = base * (warm ? 1.0 : cool ? 0.82 : 0.92);
    colors[i3 + 1] = base * (warm ? 0.90 : cool ? 0.90 : 0.96);
    colors[i3 + 2] = base * (warm ? 0.76 : cool ? 1.0 : 1.0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const pts = new THREE.Points(geometry, material);
  pts.frustumCulled = false;
  pts.renderOrder = -5;
  return pts;
}

function buildReadableGalaxyBand({ seed, count, length, width, thickness, size, opacity }) {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const x = (random() * 2 - 1) * length;
    const y = gaussian(random) * thickness + Math.sin(x * 0.18) * width * 0.12;
    const z = gaussian(random) * width * 0.28;
    const i3 = i * 3;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
    const edge = 1.0 - Math.min(1, Math.abs(x) / length);
    const base = (0.32 + random() * 0.42) * (0.55 + 0.45 * edge);
    colors[i3] = base * 0.82;
    colors[i3 + 1] = base * 0.88;
    colors[i3 + 2] = base * 1.0;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const pts = new THREE.Points(geometry, material);
  pts.frustumCulled = false;
  pts.renderOrder = -6;
  return pts;
}

const deepSpace = new THREE.Group();
const starLayers = [
  {
    mesh: buildStarLayer({
      seed: 7126,
      count: isMobile() ? 20 : 34,
      radiusMin: 105,
      radiusMax: 195,
      size: isMobile() ? 0.010 : 0.012,
      opacity: 0.30
    }),
    speedY: 0.000040,
    speedX: 0.000012,
    baseOpacity: 0.30,
    twinkleAmp: 0.025,
    phase: 0.3
  },
  {
    mesh: buildStarLayer({
      seed: 9131,
      count: isMobile() ? 12 : 20,
      radiusMin: 68,
      radiusMax: 118,
      size: isMobile() ? 0.014 : 0.017,
      opacity: 0.38,
      warmChance: 0.11
    }),
    speedY: -0.000080,
    speedX: 0.000024,
    baseOpacity: 0.38,
    twinkleAmp: 0.035,
    phase: 1.8
  },
  {
    mesh: buildStarLayer({
      seed: 2718,
      count: isMobile() ? 5 : 8,
      radiusMin: 42,
      radiusMax: 66,
      size: isMobile() ? 0.020 : 0.024,
      opacity: 0.44,
      warmChance: 0.14
    }),
    speedY: 0.000140,
    speedX: -0.000042,
    baseOpacity: 0.44,
    twinkleAmp: 0.030,
    phase: 3.1
  }
];
for (const layer of starLayers) deepSpace.add(layer.mesh);

const galaxyBand = buildGalaxyBand({
  seed: 51021,
  count: isMobile() ? 1100 : 2200,
  width: isMobile() ? 9.2 : 11.8,
  thickness: isMobile() ? 1.18 : 1.55,
  length: isMobile() ? 58 : 78,
  size: isMobile() ? 0.17 : 0.21,
  opacity: isMobile() ? 0.125 : 0.155
});
galaxyBand.position.set(-11.8, 6.8, -98);
galaxyBand.rotation.set(THREE.MathUtils.degToRad(18), THREE.MathUtils.degToRad(-9), THREE.MathUtils.degToRad(-12));
deepSpace.add(galaxyBand);

const clusterA = buildCluster({
  seed: 80211,
  count: isMobile() ? 170 : 300,
  spread: isMobile() ? 3.0 : 3.8,
  size: isMobile() ? 0.08 : 0.10,
  opacity: 0.42
});
clusterA.position.set(-8.8, 6.8, -88);
clusterA.rotation.z = THREE.MathUtils.degToRad(10);
deepSpace.add(clusterA);

const clusterB = buildCluster({
  seed: 60217,
  count: isMobile() ? 96 : 170,
  spread: isMobile() ? 2.2 : 2.8,
  size: isMobile() ? 0.07 : 0.085,
  opacity: 0.24
});
clusterB.position.set(13.2, -5.8, -96);
clusterB.rotation.z = THREE.MathUtils.degToRad(-18);
deepSpace.add(clusterB);

const leftFillCluster = buildCluster({
  seed: 44017,
  count: isMobile() ? 180 : 340,
  spread: isMobile() ? 3.1 : 3.9,
  size: isMobile() ? 0.10 : 0.125,
  opacity: 0.34
});
leftFillCluster.position.set(-16.5, 1.2, -82);
leftFillCluster.rotation.z = THREE.MathUtils.degToRad(-12);
deepSpace.add(leftFillCluster);

const leftAnchorStars = buildCluster({
  seed: 9907,
  count: isMobile() ? 18 : 28,
  spread: isMobile() ? 1.5 : 1.9,
  size: isMobile() ? 0.22 : 0.28,
  opacity: 0.82
});
leftAnchorStars.position.set(-14.4, 2.8, -66);
deepSpace.add(leftAnchorStars);

const leftBrightStars = buildCluster({
  seed: 55119,
  count: isMobile() ? 6 : 10,
  spread: isMobile() ? 0.85 : 1.05,
  size: isMobile() ? 0.34 : 0.42,
  opacity: 0.92
});
leftBrightStars.position.set(-10.2, 6.0, -58);
deepSpace.add(leftBrightStars);

const leftForegroundDust = buildForegroundDust({
  seed: 2112,
  count: isMobile() ? 12 : 22,
  spreadX: isMobile() ? 10 : 14,
  spreadY: isMobile() ? 14 : 18,
  spreadZ: isMobile() ? 10 : 12,
  size: isMobile() ? 0.12 : 0.14,
  opacity: 0.10
});
leftForegroundDust.position.set(-6.8, 1.0, -3.8);
scene.add(leftForegroundDust);

const foregroundDust = buildForegroundDust({
  seed: 9301,
  count: isMobile() ? 18 : 34,
  spreadX: isMobile() ? 24 : 32,
  spreadY: isMobile() ? 16 : 20,
  spreadZ: isMobile() ? 16 : 22,
  size: isMobile() ? 0.10 : 0.12,
  opacity: 0.070
});
foregroundDust.position.set(0, 0, 0);
scene.add(deepSpace);
scene.add(foregroundDust);

const cameraSpaceBG = new THREE.Group();
camera.add(cameraSpaceBG);

const leftGalaxyBand = buildReadableGalaxyBand({
  seed: 7771,
  count: isMobile() ? 520 : 980,
  length: isMobile() ? 10.0 : 13.0,
  width: isMobile() ? 3.8 : 4.8,
  thickness: isMobile() ? 1.2 : 1.55,
  size: isMobile() ? 1.7 : 2.0,
  opacity: isMobile() ? 0.28 : 0.34
});
leftGalaxyBand.position.set(-8.8, 2.8, -34);
leftGalaxyBand.rotation.z = THREE.MathUtils.degToRad(-24);
cameraSpaceBG.add(leftGalaxyBand);

const leftGalaxyBandSoft = buildReadableGalaxyBand({
  seed: 7772,
  count: isMobile() ? 420 : 860,
  length: isMobile() ? 11.0 : 15.5,
  width: isMobile() ? 4.2 : 5.8,
  thickness: isMobile() ? 1.6 : 2.0,
  size: isMobile() ? 1.2 : 1.45,
  opacity: isMobile() ? 0.16 : 0.20
});
leftGalaxyBandSoft.position.set(-7.2, 1.6, -36);
leftGalaxyBandSoft.rotation.z = THREE.MathUtils.degToRad(-21);
cameraSpaceBG.add(leftGalaxyBandSoft);

const leftVisibleCluster = buildReadableCluster({
  seed: 8881,
  count: isMobile() ? 120 : 210,
  spreadX: isMobile() ? 2.0 : 2.5,
  spreadY: isMobile() ? 1.5 : 1.9,
  size: isMobile() ? 1.8 : 2.1,
  opacity: isMobile() ? 0.34 : 0.40
});
leftVisibleCluster.position.set(-11.2, 5.0, -31);
cameraSpaceBG.add(leftVisibleCluster);

const leftVisibleCluster2 = buildReadableCluster({
  seed: 8882,
  count: isMobile() ? 90 : 160,
  spreadX: isMobile() ? 1.6 : 2.0,
  spreadY: isMobile() ? 1.2 : 1.4,
  size: isMobile() ? 1.5 : 1.9,
  opacity: isMobile() ? 0.26 : 0.30
});
leftVisibleCluster2.position.set(-13.6, -0.4, -29);
cameraSpaceBG.add(leftVisibleCluster2);

const leftReadableStars = buildReadableCluster({
  seed: 9991,
  count: isMobile() ? 9 : 14,
  spreadX: isMobile() ? 1.6 : 1.9,
  spreadY: isMobile() ? 1.2 : 1.4,
  size: isMobile() ? 3.0 : 3.8,
  opacity: isMobile() ? 0.84 : 0.90,
  bright: true
});
leftReadableStars.position.set(-9.9, 3.8, -27);
cameraSpaceBG.add(leftReadableStars);

function buildMeteorTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 16, 256, 16);
  g.addColorStop(0.0, 'rgba(255,255,255,0)');
  g.addColorStop(0.25, 'rgba(180,220,255,0.10)');
  g.addColorStop(0.72, 'rgba(220,235,255,0.55)');
  g.addColorStop(1.0, 'rgba(255,255,255,0.98)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 6, 256, 20);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function buildMeteor() {
  const material = new THREE.SpriteMaterial({
    map: buildMeteorTexture(),
    color: 0xd9ebff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4.4, 0.28, 1);
  sprite.visible = false;
  sprite.center.set(1, 0.5);
  return sprite;
}

const meteor = buildMeteor();
scene.add(meteor);
const meteorState = {
  active: false,
  t: 0,
  duration: 0.9,
  coolDown: 22 + Math.random() * 26,
  start: new THREE.Vector3(),
  end: new THREE.Vector3()
};

function spawnMeteor() {
  meteorState.active = true;
  meteorState.t = 0;
  meteorState.duration = 0.88 + Math.random() * 0.62;
  meteorState.coolDown = 12 + Math.random() * 18;

  const side = Math.random() < 0.82 ? -1 : 1;
  meteorState.start.set(side < 0 ? (-13 - Math.random() * 8) : (11 + Math.random() * 6), 6 + Math.random() * 7, -22 - Math.random() * 12);
  meteorState.end.set(meteorState.start.x - side * (8.5 + Math.random() * 5.0), meteorState.start.y - (2.8 + Math.random() * 3.6), meteorState.start.z - (2.4 + Math.random() * 2.6));

  meteor.position.copy(meteorState.start);
  meteor.material.opacity = 0;
  meteor.visible = true;
  meteor.material.rotation = Math.atan2(meteorState.end.y - meteorState.start.y, meteorState.end.x - meteorState.start.x);
}

function updateMeteor(delta) {
  if (motionPaused) return;
  if (!meteorState.active) {
    meteorState.coolDown -= delta;
    if (meteorState.coolDown <= 0) spawnMeteor();
    return;
  }

  meteorState.t += delta / meteorState.duration;
  const t = meteorState.t;
  if (t >= 1) {
    meteor.visible = false;
    meteor.material.opacity = 0;
    meteorState.active = false;
    return;
  }

  meteor.position.lerpVectors(meteorState.start, meteorState.end, t);
  const head = 1.0 - Math.abs(t - 0.48) / 0.48;
  meteor.material.opacity = Math.max(0, Math.pow(head, 1.6) * 0.82);
}

function buildRingGeometry(innerRadius, outerRadius, angularSegments = 768, radialSegments = 14) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let r = 0; r <= radialSegments; r += 1) {
    const radialT = r / radialSegments;
    const radius = THREE.MathUtils.lerp(innerRadius, outerRadius, radialT);
    for (let a = 0; a <= angularSegments; a += 1) {
      const angularT = a / angularSegments;
      const theta = angularT * Math.PI * 2;
      positions.push(Math.cos(theta) * radius, 0, Math.sin(theta) * radius);
      normals.push(0, 1, 0);
      uvs.push(radialT, 0.5);
    }
  }

  const row = angularSegments + 1;
  for (let r = 0; r < radialSegments; r += 1) {
    for (let a = 0; a < angularSegments; a += 1) {
      const i0 = r * row + a;
      const i1 = i0 + 1;
      const i2 = i0 + row;
      const i3 = i2 + 1;
      indices.push(i0, i2, i1, i1, i2, i3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

const saturnGeometry = new THREE.SphereGeometry(LOOK.bodyRadius, 192, 128);
const ringGeometry = buildRingGeometry(LOOK.ringInnerRadius, LOOK.ringOuterRadius);

function buildRingEdgeGeometry(radius, halfThickness = 0.022, segments = 768) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let a = 0; a <= segments; a += 1) {
    const theta = a / segments * Math.PI * 2;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    positions.push(c * radius, -halfThickness, s * radius);
    positions.push(c * radius, halfThickness, s * radius);
    normals.push(c, 0, s, c, 0, s);
  }

  for (let a = 0; a < segments; a += 1) {
    const i = a * 2;
    indices.push(i, i + 2, i + 1, i + 1, i + 2, i + 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

const ringOuterEdgeGeometry = buildRingEdgeGeometry(LOOK.ringOuterRadius, 0.050);
const ringInnerEdgeGeometry = buildRingEdgeGeometry(LOOK.ringInnerRadius, 0.034);

function buildRingParticles() {
  const random = mulberry32(4421);
  const count = isMobile() ? 140 : 280;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const r = THREE.MathUtils.lerp(LOOK.ringInnerRadius * 1.02, LOOK.ringOuterRadius * 0.995, Math.pow(random(), 0.92));
    const a = random() * Math.PI * 2;
    const i3 = i * 3;
    positions[i3] = Math.cos(a) * r;
    positions[i3 + 1] = 0.018 + (random() - 0.5) * 0.012;
    positions[i3 + 2] = Math.sin(a) * r;
    const b = 0.50 + random() * 0.34;
    colors[i3] = b;
    colors[i3 + 1] = b * 0.87;
    colors[i3 + 2] = b * 0.73;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: isMobile() ? 0.010 : 0.013,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 5;
  return points;
}

let saturnMesh = null;
let ringMesh = null;
let ringDepthMesh = null;
let ringHighlightMesh = null;
let ringOuterEdge = null;
let ringInnerEdge = null;
let ringParticles = null;
let atmosphereMesh = null;
let activeQuality = chooseDefaultQuality();

function buildAtmosphere() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0xf3d7aa) },
      strength: { value: 0.085 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float strength;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 4.0);
        float alpha = fresnel * strength;
        gl_FragColor = vec4(glowColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false
  });

  const mesh = new THREE.Mesh(saturnGeometry, material);
  mesh.scale.set(1.025, LOOK.polarScale * 1.025, 1.025);
  mesh.renderOrder = 6;
  return mesh;
}

function createSaturn(textureSet) {
  if (saturnMesh) saturnTilt.remove(saturnMesh);
  if (ringMesh) saturnTilt.remove(ringMesh);
  if (ringDepthMesh) saturnTilt.remove(ringDepthMesh);
  if (ringHighlightMesh) saturnTilt.remove(ringHighlightMesh);
  if (ringOuterEdge) saturnTilt.remove(ringOuterEdge);
  if (ringInnerEdge) saturnTilt.remove(ringInnerEdge);
  if (ringParticles) saturnTilt.remove(ringParticles);
  if (atmosphereMesh) saturnTilt.remove(atmosphereMesh);

  const saturnMaterial = new THREE.MeshStandardMaterial({
    map: textureSet.saturn,
    color: 0xfff7e8,
    roughness: 1.0,
    metalness: 0.0
  });

  saturnMesh = new THREE.Mesh(saturnGeometry, saturnMaterial);
  saturnMesh.scale.set(1, LOOK.polarScale, 1);
  saturnMesh.rotation.y = THREE.MathUtils.degToRad(10);
  saturnMesh.renderOrder = 0;
  saturnMesh.castShadow = true;
  saturnMesh.receiveShadow = true;
  saturnTilt.add(saturnMesh);

  const ringMaterial = new THREE.MeshBasicMaterial({
    map: textureSet.saturnRing,
    color: 0xffd8b7,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1.0,
    alphaTest: 0.018,
    depthTest: true,
    depthWrite: false,
    toneMapped: true
  });

  const depthMaterial = new THREE.MeshBasicMaterial({
    map: textureSet.saturnRing,
    side: THREE.DoubleSide,
    transparent: true,
    alphaTest: 0.042,
    depthTest: true,
    depthWrite: false,
    color: 0x1f110c,
    opacity: 1.0,
    toneMapped: false
  });

  const highlightMaterial = new THREE.MeshBasicMaterial({
    map: textureSet.saturnRing,
    color: 0xfff1de,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.34,
    alphaTest: 0.05,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });

  ringDepthMesh = new THREE.Mesh(ringGeometry, depthMaterial);
  ringDepthMesh.position.y = -0.065;
  ringDepthMesh.scale.set(1.014, 1, 1.014);
  ringDepthMesh.renderOrder = 1;
  saturnTilt.add(ringDepthMesh);

  ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
  ringMesh.position.y = 0.008;
  ringMesh.renderOrder = 2;
  ringMesh.castShadow = true;
  ringMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: textureSet.saturnRing,
    alphaTest: 0.035,
    side: THREE.DoubleSide
  });
  saturnTilt.add(ringMesh);

  ringHighlightMesh = new THREE.Mesh(ringGeometry, highlightMaterial);
  ringHighlightMesh.position.y = 0.028;
  ringHighlightMesh.scale.set(1.008, 1, 1.008);
  ringHighlightMesh.renderOrder = 3;
  saturnTilt.add(ringHighlightMesh);

  const edgeMaterial = new THREE.MeshBasicMaterial({
    color: 0x7d5743,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1.0,
    depthTest: true,
    depthWrite: false,
    toneMapped: false
  });
  ringOuterEdge = new THREE.Mesh(ringOuterEdgeGeometry, edgeMaterial);
  ringInnerEdge = new THREE.Mesh(ringInnerEdgeGeometry, edgeMaterial.clone());
  ringOuterEdge.renderOrder = 4;
  ringInnerEdge.renderOrder = 4;
  saturnTilt.add(ringOuterEdge, ringInnerEdge);

  ringParticles = buildRingParticles();
  saturnTilt.add(ringParticles);

  atmosphereMesh = buildAtmosphere();
  saturnTilt.add(atmosphereMesh);

  document.documentElement.dataset.textureQuality = textureSet.quality;
  document.documentElement.dataset.ringSource = textureSet.ringSource || 'real';
  document.documentElement.dataset.spaceScene = 'ready';
}

async function loadQuality(quality) {
  document.documentElement.dataset.spaceScene = 'loading';
  const set = await textureManager.loadSet(quality);
  activeQuality = set.quality;
  localStorage.setItem('pixelStarTextureQuality', activeQuality);
  createSaturn(set);
  return activeQuality;
}

function applyResponsiveLayout() {
  const mobile = isMobile();
  const dprCap = mobile ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);

  if (mobile) {
    camera.fov = LOOK.mobileFov;
    camera.position.set(...LOOK.mobileCamera);
    root.position.set(...LOOK.mobileRoot);
  } else {
    camera.fov = LOOK.desktopFov;
    camera.position.set(...LOOK.desktopCamera);
    root.position.set(...LOOK.desktopRoot);
  }

  camera.updateProjectionMatrix();
  const targetYOffset = mobile ? -0.08 : -0.03;
  camera.lookAt(root.position.x, root.position.y + targetYOffset, root.position.z);
}

applyResponsiveLayout();
window.addEventListener('resize', applyResponsiveLayout, { passive: true });

let motionPaused = prefersReducedMotion.matches || document.body.classList.contains('motion-paused');
window.addEventListener('pixelstar:motion', event => {
  motionPaused = Boolean(event.detail?.paused) || prefersReducedMotion.matches;
});
prefersReducedMotion.addEventListener('change', event => {
  motionPaused = event.matches || document.body.classList.contains('motion-paused');
});

const clock = new THREE.Clock();
const SATURN_ROTATION_SECONDS = 120;
const RING_PARTICLE_ROTATION_SECONDS = 210;
let elapsedMotion = 0;

function updateDeepSpace(delta) {
  elapsedMotion += delta;

  for (const layer of starLayers) {
    layer.mesh.rotation.y += delta * layer.speedY;
    layer.mesh.rotation.x += delta * layer.speedX;
    layer.mesh.material.opacity = layer.baseOpacity + Math.sin(elapsedMotion * 0.33 + layer.phase) * layer.twinkleAmp;
  }

  galaxyBand.rotation.z += delta * 0.0007;
  galaxyBand.rotation.y += delta * 0.00035;
  galaxyBand.material.opacity = (isMobile() ? 0.125 : 0.155) + Math.sin(elapsedMotion * 0.08) * 0.010;

  clusterA.rotation.y += delta * 0.0009;
  clusterB.rotation.y -= delta * 0.0007;
  leftFillCluster.rotation.y += delta * 0.00055;
  leftAnchorStars.rotation.y -= delta * 0.00025;
  leftBrightStars.rotation.y += delta * 0.00018;
  clusterA.material.opacity = 0.42 + Math.sin(elapsedMotion * 0.12 + 0.8) * 0.032;
  clusterB.material.opacity = 0.24 + Math.sin(elapsedMotion * 0.10 + 2.0) * 0.020;
  leftFillCluster.material.opacity = 0.34 + Math.sin(elapsedMotion * 0.09 + 1.6) * 0.026;
  leftAnchorStars.material.opacity = 0.82 + Math.sin(elapsedMotion * 0.18 + 0.6) * 0.040;
  leftBrightStars.material.opacity = 0.92 + Math.sin(elapsedMotion * 0.20 + 1.4) * 0.035;

  leftGalaxyBand.rotation.z = THREE.MathUtils.degToRad(-24) + Math.sin(elapsedMotion * 0.020) * 0.015;
  leftGalaxyBand.material.opacity = (isMobile() ? 0.28 : 0.34) + Math.sin(elapsedMotion * 0.07) * 0.018;
  leftGalaxyBandSoft.rotation.z = THREE.MathUtils.degToRad(-21) - Math.sin(elapsedMotion * 0.016) * 0.012;
  leftGalaxyBandSoft.material.opacity = (isMobile() ? 0.16 : 0.20) + Math.sin(elapsedMotion * 0.06 + 0.9) * 0.012;
  leftVisibleCluster.rotation.z += delta * 0.0015;
  leftVisibleCluster2.rotation.z -= delta * 0.0011;
  leftVisibleCluster.material.opacity = (isMobile() ? 0.34 : 0.40) + Math.sin(elapsedMotion * 0.10 + 0.7) * 0.026;
  leftVisibleCluster2.material.opacity = (isMobile() ? 0.26 : 0.30) + Math.sin(elapsedMotion * 0.12 + 2.1) * 0.020;
  leftReadableStars.material.opacity = (isMobile() ? 0.84 : 0.90) + Math.sin(elapsedMotion * 0.18 + 1.4) * 0.038;

  foregroundDust.rotation.y += delta * 0.0048;
  foregroundDust.rotation.x -= delta * 0.0018;
  foregroundDust.position.x = Math.sin(elapsedMotion * 0.025) * 0.12;
  foregroundDust.position.y = Math.cos(elapsedMotion * 0.021) * 0.10;
  leftForegroundDust.rotation.y -= delta * 0.0056;
  leftForegroundDust.rotation.x += delta * 0.0014;
  leftForegroundDust.position.x = -7.2 + Math.sin(elapsedMotion * 0.034) * 0.18;
  leftForegroundDust.position.y = 0.8 + Math.cos(elapsedMotion * 0.026) * 0.16;
}

function render() {
  const delta = Math.min(clock.getDelta(), 0.05);
  if (!motionPaused) {
    if (saturnMesh) saturnMesh.rotation.y += delta * Math.PI * 2 / SATURN_ROTATION_SECONDS;
    if (ringParticles) ringParticles.rotation.y += delta * Math.PI * 2 / RING_PARTICLE_ROTATION_SECONDS;
    updateDeepSpace(delta);
    updateMeteor(delta);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

loadQuality(activeQuality).catch(error => {
  console.error('[PIXEL STAR] Failed to boot space scene.', error);
  document.documentElement.dataset.spaceScene = 'error';
});
