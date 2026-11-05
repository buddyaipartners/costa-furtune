/* ═══════════════════════════════════════════════════════════════
   COSTA FURTUNE CRESTVIEW · 3D SCENE
   Procedural tower · B+S+12 · 144 residences
   Three.js r169
   ─────────────────────────────────────────────────────────────── */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ── constants ─────────────────────────────────────────────── */
const FLOORS      = 12;
const FLOOR_H     = 3.05;
const STILT_H     = 3.65;
const TOWER_W     = 36;
const TOWER_D     = 18.5;
const BAYS        = 6;
const BAY_W       = TOWER_W / BAYS;
const SLAB_T      = 0.26;
const TOWER_TOP   = STILT_H + FLOORS * FLOOR_H;

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
const SPH = new THREE.IcosahedronGeometry(1, 1);

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/* ── time-of-day keys ──────────────────────────────────────── */
const TIMES = [
  { sunEl: 11, sunAz: 244, sun: 0xFFB26B, sunI: 2.5, hemiSky: 0x6F86A8, hemiGround: 0x2A2118, hemiI: 0.55, top: 0x1E3A5F, bot: 0xF2A46B, fog: 0x2A3242, night: 0.10, exp: 1.06 },
  { sunEl: 24, sunAz: 236, sun: 0xFFD0A0, sunI: 2.8, hemiSky: 0x8AA6C4, hemiGround: 0x2E2A22, hemiI: 0.60, top: 0x2C5787, bot: 0xDCC3A2, fog: 0x3B4A5A, night: 0.02, exp: 1.04 },
  { sunEl: 48, sunAz: 210, sun: 0xFFF3DE, sunI: 3.1, hemiSky: 0x9FC2E0, hemiGround: 0x353A30, hemiI: 0.66, top: 0x3E78AE, bot: 0xCFE2EE, fog: 0x5A7085, night: 0.00, exp: 1.02 },
  { sunEl: 66, sunAz: 180, sun: 0xFFFFFF, sunI: 3.2, hemiSky: 0xAFD0EA, hemiGround: 0x3A3F35, hemiI: 0.70, top: 0x4A88BE, bot: 0xD8E8F2, fog: 0x6A8095, night: 0.00, exp: 1.00 },
  { sunEl: 44, sunAz: 150, sun: 0xFFE6C2, sunI: 2.9, hemiSky: 0xA8C4DC, hemiGround: 0x3A352A, hemiI: 0.62, top: 0x4379A8, bot: 0xE4D2B6, fog: 0x5E6F7E, night: 0.00, exp: 1.03 },
  { sunEl: 21, sunAz: 128, sun: 0xFFBC80, sunI: 2.4, hemiSky: 0x8A9FBA, hemiGround: 0x322A20, hemiI: 0.52, top: 0x2E527C, bot: 0xE6A876, fog: 0x475364, night: 0.08, exp: 1.06 },
  { sunEl: 5,  sunAz: 112, sun: 0xFF7A42, sunI: 1.5, hemiSky: 0x546A8C, hemiGround: 0x241C16, hemiI: 0.38, top: 0x152A4A, bot: 0xC46B48, fog: 0x2A3143, night: 0.55, exp: 1.04 },
  { sunEl: -7, sunAz: 100, sun: 0x7E9BC8, sunI: 0.42, hemiSky: 0x24344F, hemiGround: 0x0A0D12, hemiI: 0.24, top: 0x03060C, bot: 0x0A1626, fog: 0x070C15, night: 1.00, exp: 0.96 }
];

/* ── camera keyframes ──────────────────────────────────────── */
const SHOTS = [
  { pos: [-28, 25, 88],  tgt: [0, 26, 0],   fov: 36 },
  { pos: [-74, 44, 80],  tgt: [-5, 24, 0],  fov: 40 },
  { pos: [46, 35, 64],   tgt: [7, 25, 0],   fov: 38 },
  { pos: [0, 54, 76],    tgt: [0, 28, 0],   fov: 34 },
  { pos: [34, 11, 50],   tgt: [28, 8, 18],  fov: 46 },
  { pos: [-8, 5, 54],    tgt: [0, 37, 0],   fov: 52 },
  { pos: [24, 39, 44],   tgt: [9, 30, 0],   fov: 34 },
  { pos: [0, 27, 94],    tgt: [0, 26, 0],   fov: 40 }
];

/* ── small texture factories ───────────────────────────────── */
function noiseCanvas(size, base, dots, alpha) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = base;
  x.fillRect(0, 0, size, size);
  for (let i = 0; i < dots; i++) {
    const r = Math.random() * 2 + 0.4;
    x.fillStyle = `rgba(255,255,255,${Math.random() * alpha})`;
    x.beginPath();
    x.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function paverCanvas() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const x = c.getContext('2d');
  x.fillStyle = '#7C7E7C';
  x.fillRect(0, 0, s, s);
  x.strokeStyle = 'rgba(30,34,38,.55)';
  x.lineWidth = 3;
  const step = 32;
  for (let i = 0; i <= s; i += step) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, s); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(s, i); x.stroke();
  }
  for (let i = 0; i < 1600; i++) {
    x.fillStyle = `rgba(${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},.035)`;
    x.fillRect(Math.random() * s, Math.random() * s, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function jaaliCanvas() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, s, s);
  x.strokeStyle = '#fff';
  x.lineWidth = 13;
  for (let i = -s; i < s * 2; i += 64) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + s, s); x.stroke();
    x.beginPath(); x.moveTo(i, s); x.lineTo(i + s, 0); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1.2);
  return t;
}

/* ── main ──────────────────────────────────────────────────── */
export async function initScene({ onProgress = () => {} } = {}) {
  const canvas = document.getElementById('scene');
  if (!canvas) return stub();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false
    });
    if (!renderer.getContext()) {
      document.body.classList.add('no-webgl');
      return stub();
    }
  } catch (err) {
    console.warn('[scene] WebGL unavailable', err);
    document.body.classList.add('no-webgl');
    return stub();
  }

  const mobile = matchMedia('(max-width: 900px)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 1.9);

  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2A3242, 110, 420);

  const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.5, 900);

  onProgress(0.08);

  /* ── environment ─────────────────────────────────────────── */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.06);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.34;

  /* ── sky ─────────────────────────────────────────────────── */
  const skyUniforms = {
    topColor:     { value: new THREE.Color(0x1E3A5F).convertSRGBToLinear() },
    bottomColor:  { value: new THREE.Color(0xF2A46B).convertSRGBToLinear() },
    sunColor:     { value: new THREE.Color(0xFFB26B).convertSRGBToLinear() },
    sunDirection: { value: new THREE.Vector3(0, 0.3, -1).normalize() },
    sunIntensity: { value: 1.0 },
    exponent:     { value: 0.72 }
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(460, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: skyUniforms,
      vertexShader: `
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor, bottomColor, sunColor;
        uniform vec3 sunDirection;
        uniform float sunIntensity, exponent;
        varying vec3 vDir;
        void main(){
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(bottomColor, topColor, pow(h, exponent));
          float d = max(dot(normalize(vDir), normalize(sunDirection)), 0.0);
          col += sunColor * pow(d, 380.0) * 2.2 * sunIntensity;
          col += sunColor * pow(d, 8.0) * 0.22 * sunIntensity;
          gl_FragColor = vec4(col, 1.0);
        }`
    })
  );
  sky.frustumCulled = false;
  scene.add(sky);

  /* stars */
  const starGeo = new THREE.BufferGeometry();
  const starCount = 700;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 380;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(Math.random() * 0.85 + 0.08);
    starPos[i * 3]     = Math.sin(ph) * Math.cos(th) * r;
    starPos[i * 3 + 1] = Math.cos(ph) * r;
    starPos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xBFD4F0, size: 1.5, sizeAttenuation: false,
    transparent: true, opacity: 0, depthWrite: false, fog: false
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  onProgress(0.18);

  /* ── lights ──────────────────────────────────────────────── */
  const hemi = new THREE.HemisphereLight(0x6F86A8, 0x2A2118, 0.55);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xFFB26B, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 320;
  const S = 95;
  sun.shadow.camera.left = -S;
  sun.shadow.camera.right = S;
  sun.shadow.camera.top = S;
  sun.shadow.camera.bottom = -S;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.035;
  sun.target.position.set(0, 20, 0);
  scene.add(sun, sun.target);

  const fill = new THREE.DirectionalLight(0x8FB4D8, 0.34);
  fill.position.set(70, 50, -60);
  scene.add(fill);

  const bounce = new THREE.HemisphereLight(0x2E4A3A, 0x0A0D10, 0.16);
  scene.add(bounce);

  /* ── materials ───────────────────────────────────────────── */
  const matConcrete = new THREE.MeshStandardMaterial({ color: 0xE9E2D3, roughness: 0.82, metalness: 0.02, envMapIntensity: 0.5 });
  const matConcrete2 = new THREE.MeshStandardMaterial({ color: 0xD3C9B6, roughness: 0.88, metalness: 0.02, envMapIntensity: 0.4 });
  const matConcreteDark = new THREE.MeshStandardMaterial({ color: 0x9C9485, roughness: 0.9, metalness: 0.02 });
  const matSlab = new THREE.MeshStandardMaterial({ color: 0xEFE9DC, roughness: 0.78, metalness: 0.02 });
  const matMetal = new THREE.MeshStandardMaterial({ color: 0xB8BEC4, roughness: 0.35, metalness: 0.85, envMapIntensity: 1.1 });
  const matGold = new THREE.MeshStandardMaterial({ color: 0xC9A227, roughness: 0.3, metalness: 0.95, envMapIntensity: 1.2 });

  const matGlass = new THREE.MeshStandardMaterial({
    color: 0x1A2D3C, roughness: 0.08, metalness: 0.75,
    envMapIntensity: 1.8
  });

  const winMats = [
    new THREE.MeshStandardMaterial({ color: 0x1A2D3C, roughness: 0.08, metalness: 0.72, envMapIntensity: 1.6, emissive: 0xFFC98A, emissiveIntensity: 0 }),
    new THREE.MeshStandardMaterial({ color: 0x1A2D3C, roughness: 0.08, metalness: 0.72, envMapIntensity: 1.6, emissive: 0xFFB765, emissiveIntensity: 0 }),
    new THREE.MeshStandardMaterial({ color: 0x1A2D3C, roughness: 0.08, metalness: 0.72, envMapIntensity: 1.6, emissive: 0xFFE2B0, emissiveIntensity: 0 })
  ];

  const matRailGlass = new THREE.MeshStandardMaterial({
    color: 0xAFC4D4, roughness: 0.06, metalness: 0.4,
    transparent: true, opacity: 0.18, side: THREE.DoubleSide,
    depthWrite: false, envMapIntensity: 1.2
  });

  const matGreen  = new THREE.MeshStandardMaterial({ color: 0x2C5637, roughness: 0.95 });
  const matGreen2 = new THREE.MeshStandardMaterial({ color: 0x3E6B44, roughness: 0.95 });
  const matTrunk  = new THREE.MeshStandardMaterial({ color: 0x4A3A2A, roughness: 1 });

  const matWater = new THREE.MeshPhysicalMaterial({
    color: 0x168C8C, roughness: 0.06, metalness: 0.55,
    transparent: true, opacity: 0.94, envMapIntensity: 1.6,
    emissive: 0x0A4444, emissiveIntensity: 0.4,
    clearcoat: 1, clearcoatRoughness: 0.05
  });

  const matWood = new THREE.MeshStandardMaterial({ color: 0x7A5236, roughness: 0.72 });

  const matEdge = new THREE.MeshBasicMaterial({
    color: 0xE4C978, transparent: true, opacity: 0, depthWrite: false
  });

  /* ── helpers ─────────────────────────────────────────────── */
  function addBox(parent, w, h, d, x, y, z, mat, shadow = true) {
    const m = new THREE.Mesh(BOX, mat);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function addCyl(parent, rt, rb, h, x, y, z, mat, seg = 10) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  onProgress(0.28);

  /* ── ground ──────────────────────────────────────────────── */
  const groundTex = noiseCanvas(512, '#1B2A20', 9000, 0.05);
  groundTex.repeat.set(26, 26);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(460, 72),
    new THREE.MeshStandardMaterial({ color: 0x2C3A2C, roughness: 1, map: groundTex, envMapIntensity: 0.15 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* lawn */
  const lawn = new THREE.Mesh(
    new THREE.CircleGeometry(58, 64),
    new THREE.MeshStandardMaterial({ color: 0x33512F, roughness: 1 })
  );
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = 0.02;
  lawn.receiveShadow = true;
  scene.add(lawn);

  /* road */
  const road = addBox(scene, 300, 0.12, 13, 0, 0.04, 74, new THREE.MeshStandardMaterial({ color: 0x191D22, roughness: 0.95 }), false);
  road.receiveShadow = true;
  for (let i = -140; i < 150; i += 9) {
    addBox(scene, 4.4, 0.03, 0.16, i, 0.12, 74, new THREE.MeshBasicMaterial({ color: 0xB9B29C }), false);
  }
  /* sidewalk */
  addBox(scene, 300, 0.16, 3.2, 0, 0.08, 66.2, new THREE.MeshStandardMaterial({ color: 0x6A6C69, roughness: 0.95 }), false);

  /* entrance drive */
  const paver = paverCanvas();
  paver.repeat.set(4, 26);
  const driveMat = new THREE.MeshStandardMaterial({ color: 0x9A9C98, roughness: 0.92, map: paver });
  const drive = addBox(scene, 13, 0.1, 48, 0, 0.08, 40, driveMat, false);
  drive.receiveShadow = true;

  /* forecourt */
  const forecourt = addBox(scene, 40, 0.08, 22, 0, 0.07, 26, driveMat, false);
  forecourt.receiveShadow = true;

  /* boundary wall */
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xBFB6A5, roughness: 0.9 });
  addBox(scene, 0.5, 1.8, 54, -19.5, 0.9, 38, wallMat);
  addBox(scene, 0.5, 1.8, 54, 19.5, 0.9, 38, wallMat);
  addBox(scene, 40, 1.8, 0.5, 0, 0.9, 64, wallMat);

  onProgress(0.38);

  /* ── tower ───────────────────────────────────────────────── */
  const tower = new THREE.Group();
  scene.add(tower);

  /* basement / plinth */
  addBox(tower, TOWER_W + 3, 0.9, TOWER_D + 3, 0, 0.45, 0, matConcrete2);

  /* stilt level */
  const stilt = new THREE.Group();
  tower.add(stilt);
  const stiltCols = [-15, -9, -3, 3, 9, 15];
  stiltCols.forEach((x) => {
    [-8.4, 8.4].forEach((z) => addBox(stilt, 0.62, STILT_H, 0.62, x, STILT_H / 2, z, matConcrete));
  });
  [-8.4, 8.4].forEach((z) => {
    addBox(stilt, TOWER_W, STILT_H, 0.45, 0, STILT_H / 2, z, matConcrete2);
  });
  addBox(stilt, 0.45, STILT_H, TOWER_D, -TOWER_W / 2, STILT_H / 2, 0, matConcrete2);
  addBox(stilt, 0.45, STILT_H, TOWER_D, TOWER_W / 2, STILT_H / 2, 0, matConcrete2);

  /* lobby */
  addBox(stilt, 9, 3.1, 0.25, 0, 1.55, 9.15, matGlass);
  addBox(stilt, 0.22, 3.1, 1.2, -4.5, 1.55, 9.55, matMetal);
  addBox(stilt, 0.22, 3.1, 1.2, 4.5, 1.55, 9.55, matMetal);
  const canopy = addBox(stilt, 13, 0.24, 3.4, 0, 3.42, 10.5, matConcrete);
  canopy.castShadow = true;
  addBox(stilt, 0.14, 2.9, 0.14, -6, 1.45, 12, matMetal);
  addBox(stilt, 0.14, 2.9, 0.14, 6, 1.45, 12, matMetal);

  /* shops */
  [-12.5, 12.5].forEach((x) => {
    addBox(stilt, 4.6, 3.1, 2.6, x, 1.55, 9.0, matGlass);
    addBox(stilt, 4.8, 0.28, 2.9, x, 3.2, 9.0, matConcrete2);
  });

  /* core */
  const coreH = TOWER_TOP;
  const coreGroup = new THREE.Group();
  coreGroup.position.y = 0;
  tower.add(coreGroup);
  const core = addBox(coreGroup, 8.4, coreH, 7.2, 0, coreH / 2, 0, matConcreteDark);
  core.castShadow = true;

  /* floors */
  const floorGroups = [];
  const edgeLines = [];

  for (let f = 0; f < FLOORS; f++) {
    const g = new THREE.Group();
    g.position.y = STILT_H + f * FLOOR_H;
    tower.add(g);
    floorGroups.push(g);

    /* slab */
    addBox(g, TOWER_W + 0.7, SLAB_T, TOWER_D + 0.9, 0, SLAB_T / 2, 0, matSlab);

    /* glowing edge lines (exploded view) */
    const yEdge = SLAB_T + 0.015;
    [
      [TOWER_W + 0.7, 0.035, 0.035, 0, yEdge, (TOWER_D + 0.9) / 2],
      [TOWER_W + 0.7, 0.035, 0.035, 0, yEdge, -(TOWER_D + 0.9) / 2],
      [0.035, 0.035, TOWER_D + 0.9, (TOWER_W + 0.7) / 2, yEdge, 0],
      [0.035, 0.035, TOWER_D + 0.9, -(TOWER_W + 0.7) / 2, yEdge, 0]
    ].forEach(([w, h, d, x, y, z]) => {
      const m = new THREE.Mesh(BOX, matEdge);
      m.scale.set(w, h, d);
      m.position.set(x, y, z);
      g.add(m);
      edgeLines.push(m);
    });

    /* front + back facades */
    [1, -1].forEach((side) => {
      const zWall = side * (TOWER_D / 2 - 0.15);
      const zBal  = side * (TOWER_D / 2 + 0.75);
      const zRail = side * (TOWER_D / 2 + 1.5);

      for (let b = 0; b < BAYS; b++) {
        const x = -TOWER_W / 2 + BAY_W / 2 + b * BAY_W;
        const mat = winMats[(f * 7 + b * 3 + (side > 0 ? 0 : 1)) % winMats.length];

        /* spandrel + lintel */
        addBox(g, BAY_W - 0.1, 0.86, 0.26, x, 0.43, zWall, matConcrete);
        addBox(g, BAY_W - 0.1, 0.34, 0.26, x, FLOOR_H - 0.17, zWall, matConcrete);

        /* window */
        addBox(g, BAY_W - 1.05, FLOOR_H - 1.2, 0.14, x, 0.86 + (FLOOR_H - 1.2) / 2, zWall + side * 0.02, mat);

        /* balcony slab */
        addBox(g, BAY_W - 0.55, 0.16, 1.55, x, 0.09, zBal, matSlab);
        /* glass railing */
        addBox(g, BAY_W - 0.6, 1.02, 0.035, x, 0.62, zRail, matRailGlass, false);
        /* rail cap */
        addBox(g, BAY_W - 0.55, 0.045, 0.09, x, 1.14, zRail, matMetal);
        /* side fins between balconies */
        addBox(g, 0.16, 1.15, 1.55, x - BAY_W / 2 + 0.08, 0.62, zBal, matConcrete2);
        /* planter */
        addBox(g, 1.15, 0.34, 0.34, x + (b % 2 ? 1.4 : -1.4), 0.24, zBal + side * 0.25, matConcrete2);
        const shrub = new THREE.Mesh(SPH, matGreen);
        shrub.scale.set(0.48, 0.34, 0.32);
        shrub.position.set(x + (b % 2 ? 1.4 : -1.4), 0.55, zBal + side * 0.25);
        shrub.castShadow = true;
        g.add(shrub);
      }

      /* vertical fins */
      for (let b = 0; b <= BAYS; b++) {
        const x = -TOWER_W / 2 + b * BAY_W;
        addBox(g, 0.2, FLOOR_H, 0.42, x, FLOOR_H / 2, zWall + side * 0.18, matConcrete2);
      }
    });

    /* side walls + jaali */
    [-1, 1].forEach((sx) => {
      addBox(g, 0.24, FLOOR_H, TOWER_D, sx * (TOWER_W / 2), FLOOR_H / 2, 0, matConcrete2);
      /* slit windows */
      [-6.2, 0, 6.2].forEach((z) => {
        addBox(g, 0.08, FLOOR_H - 1.3, 0.72, sx * (TOWER_W / 2 + 0.14), 1.5, z, winMats[(f + Math.abs(z)) % 3]);
      });
    });
  }

  /* jaali screens (outside the floor loop, full height) */
  const jaaliTex = jaaliCanvas();
  const jaaliMat = new THREE.MeshStandardMaterial({
    color: 0xE7E0D1, roughness: 0.85, metalness: 0.05,
    alphaMap: jaaliTex, transparent: true, alphaTest: 0.42,
    side: THREE.DoubleSide
  });
  [-1, 1].forEach((sx) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(9, TOWER_TOP - STILT_H - 0.4), jaaliMat);
    p.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    p.position.set(sx * (TOWER_W / 2 + 0.16), STILT_H + (TOWER_TOP - STILT_H) / 2, 0);
    p.castShadow = true;
    tower.add(p);
  });

  /* roof */
  const roof = new THREE.Group();
  roof.position.y = TOWER_TOP;
  tower.add(roof);

  addBox(roof, TOWER_W + 0.7, 0.3, TOWER_D + 0.9, 0, 0.15, 0, matSlab);
  /* parapet */
  addBox(roof, TOWER_W + 0.7, 1.15, 0.28, 0, 0.72, (TOWER_D + 0.9) / 2, matConcrete);
  addBox(roof, TOWER_W + 0.7, 1.15, 0.28, 0, 0.72, -(TOWER_D + 0.9) / 2, matConcrete);
  addBox(roof, 0.28, 1.15, TOWER_D + 0.9, (TOWER_W + 0.7) / 2, 0.72, 0, matConcrete);
  addBox(roof, 0.28, 1.15, TOWER_D + 0.9, -(TOWER_W + 0.7) / 2, 0.72, 0, matConcrete);
  /* rooftop pavilion */
  addBox(roof, 8.5, 0.22, 5.4, -8, 3.0, 0, matConcrete);
  addBox(roof, 0.18, 2.9, 0.18, -11.6, 1.55, 2.4, matMetal);
  addBox(roof, 0.18, 2.9, 0.18, -4.4, 1.55, 2.4, matMetal);
  addBox(roof, 0.18, 2.9, 0.18, -11.6, 1.55, -2.4, matMetal);
  addBox(roof, 0.18, 2.9, 0.18, -4.4, 1.55, -2.4, matMetal);
  /* water tank + lift overrun */
  addBox(roof, 3.2, 2.2, 3.2, 11, 1.35, 0, matConcrete2);
  addBox(roof, 5.2, 2.6, 4.6, 2, 1.55, 0, matConcrete2);
  /* roof plants */
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(SPH, i % 2 ? matGreen : matGreen2);
    s.scale.set(0.9, 0.65, 0.9);
    s.position.set(-15 + i * 4.6, 1.15, (i % 2 ? 1 : -1) * 6.6);
    s.castShadow = true;
    roof.add(s);
  }

  onProgress(0.58);

  /* ── clubhouse ───────────────────────────────────────────── */
  const club = new THREE.Group();
  club.position.set(52, 0, 6);
  scene.add(club);

  const clubW = 21, clubD = 15, clubFloor = 3.3, clubFloors = 4;

  addBox(club, clubW + 2, 0.7, clubD + 2, 0, 0.35, 0, matConcrete2);
  for (let f = 0; f < clubFloors; f++) {
    const y = 0.7 + f * clubFloor;
    addBox(club, clubW, 0.26, clubD, 0, y + 0.13, 0, matSlab);
    /* glass band */
    addBox(club, clubW - 1.6, clubFloor - 0.9, 0.2, 0, y + clubFloor / 2, clubD / 2 - 0.1, matGlass);
    addBox(club, clubW - 1.6, clubFloor - 0.9, 0.2, 0, y + clubFloor / 2, -clubD / 2 + 0.1, matGlass);
    /* cream piers */
    for (let i = 0; i <= 4; i++) {
      const x = -clubW / 2 + (clubW / 4) * i;
      addBox(club, 0.55, clubFloor, 0.6, x, y + clubFloor / 2, clubD / 2 + 0.1, matConcrete);
      addBox(club, 0.55, clubFloor, 0.6, x, y + clubFloor / 2, -clubD / 2 - 0.1, matConcrete);
    }
    /* side walls */
    addBox(club, 0.4, clubFloor, clubD, -clubW / 2, y + clubFloor / 2, 0, matConcrete);
    addBox(club, 0.4, clubFloor, clubD, clubW / 2, y + clubFloor / 2, 0, matConcrete);
  }
  /* club roof + pergola */
  addBox(club, clubW + 1, 0.3, clubD + 1, 0, 0.7 + clubFloors * clubFloor + 0.15, 0, matSlab);
  for (let i = 0; i < 8; i++) {
    addBox(club, 0.16, 0.16, clubD + 1, -clubW / 2 + 1.5 + i * 2.6, 0.7 + clubFloors * clubFloor + 1.1, 0, matWood);
  }
  /* warm interior panels */
  const clubGlow = new THREE.MeshStandardMaterial({
    color: 0x3A2A18, emissive: 0xFFB96B, emissiveIntensity: 0.2, roughness: 0.6
  });
  for (let f = 0; f < clubFloors; f++) {
    addBox(club, clubW - 5, 1.5, 0.12, 0, 0.7 + f * clubFloor + 1.7, clubD / 2 + 0.02, clubGlow, false);
  }

  onProgress(0.68);

  /* ── pool ────────────────────────────────────────────────── */
  const pool = new THREE.Group();
  pool.position.set(29, 0, 27);
  scene.add(pool);

  addBox(pool, 26, 0.18, 13, 0, 0.09, 0, matWood);
  /* water */
  const water = new THREE.Mesh(new THREE.PlaneGeometry(21, 8.6), matWater);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.2;
  pool.add(water);
  /* coping */
  addBox(pool, 22, 0.16, 0.5, 0, 0.2, 4.55, matConcrete);
  addBox(pool, 22, 0.16, 0.5, 0, 0.2, -4.55, matConcrete);
  addBox(pool, 0.5, 0.16, 9.6, 10.75, 0.2, 0, matConcrete);
  addBox(pool, 0.5, 0.16, 9.6, -10.75, 0.2, 0, matConcrete);

  /* loungers */
  for (let i = 0; i < 5; i++) {
    const x = -9 + i * 4.2;
    addBox(pool, 1.9, 0.12, 0.72, x, 0.42, -5.6, matWood);
    const back = addBox(pool, 0.72, 0.12, 0.9, x - 0.6, 0.72, -5.95, matWood);
    back.rotation.x = -0.55;
    addBox(pool, 1.75, 0.08, 0.6, x, 0.5, -5.6, matConcrete);
  }

  /* pool light */
  const poolLight = new THREE.PointLight(0x2FD8C8, 0.0, 26, 2);
  poolLight.position.set(29, 1.4, 27);
  scene.add(poolLight);

  onProgress(0.76);

  /* ── landscaping ─────────────────────────────────────────── */
  const treeCount = mobile ? 70 : 130;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 1, 6);
  const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const trunks = new THREE.InstancedMesh(trunkGeo, matTrunk, treeCount);
  const canopies = new THREE.InstancedMesh(canopyGeo, matGreen, treeCount);
  const canopies2 = new THREE.InstancedMesh(canopyGeo, matGreen2, treeCount);
  trunks.castShadow = canopies.castShadow = canopies2.castShadow = true;
  trunks.receiveShadow = canopies.receiveShadow = canopies2.receiveShadow = true;

  const dummy = new THREE.Object3D();
  let ti = 0;
  const rand = mulberry32(20240819);

  function tryTree(x, z, scale) {
    if (ti >= treeCount) return;
    /* keep the building, pool, club and drive clear */
    if (Math.abs(x) < 24 && Math.abs(z) < 16) return;
    if (x > 36 && x < 68 && z > -6 && z < 22) return;
    if (x > 14 && x < 46 && z > 16 && z < 40) return;
    if (Math.abs(x) < 9 && z > 12 && z < 66) return;

    const h = (5.5 + rand() * 4.5) * scale;
    dummy.position.set(x, h * 0.5, z);
    dummy.scale.set(1, h, 1);
    dummy.rotation.set(0, rand() * 6.28, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(ti, dummy.matrix);

    const cr = (1.6 + rand() * 1.3) * scale;
    dummy.position.set(x, h * 0.86, z);
    dummy.scale.set(cr, cr * (0.8 + rand() * 0.5), cr);
    dummy.rotation.set(rand(), rand() * 6.28, rand());
    dummy.updateMatrix();
    canopies.setMatrixAt(ti, dummy.matrix);

    dummy.position.set(x + (rand() - 0.5) * 1.4, h * 0.72, z + (rand() - 0.5) * 1.4);
    dummy.scale.set(cr * 0.72, cr * 0.62, cr * 0.72);
    dummy.updateMatrix();
    canopies2.setMatrixAt(ti, dummy.matrix);

    ti++;
  }

  for (let i = 0; i < 340; i++) {
    const x = (rand() - 0.5) * 190;
    const z = 12 + rand() * 92;
    tryTree(x, z, 0.8 + rand() * 0.55);
  }
  for (let i = 0; i < 120; i++) {
    const x = (rand() - 0.5) * 130;
    const z = -70 + rand() * 70;
    tryTree(x, z, 0.75 + rand() * 0.5);
  }
  /* hero trees near the entrance */
  [[-16, 18, 1.5], [17, 20, 1.35], [-24, 32, 1.4], [25, 36, 1.3], [-9, 58, 1.2], [11, 60, 1.25]]
    .forEach(([x, z, s]) => tryTree(x, z, s));

  trunks.count = canopies.count = canopies2.count = ti;
  scene.add(trunks, canopies, canopies2);

  /* street lamps */
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xFFE3B0, emissive: 0xFFC26B, emissiveIntensity: 0.4, roughness: 0.4
  });
  const lampPositions = [-34, -12, 12, 34];
  lampPositions.forEach((x) => {
    addCyl(scene, 0.09, 0.12, 5.2, x, 2.6, 63.5, matMetal, 6);
    const head = new THREE.Mesh(SPH, lampGlowMat);
    head.scale.setScalar(0.32);
    head.position.set(x, 5.2, 63.5);
    scene.add(head);
  });

  /* dust */
  const dustGeo = new THREE.BufferGeometry();
  const dustCount = mobile ? 180 : 340;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3]     = (Math.random() - 0.5) * 150;
    dustPos[i * 3 + 1] = Math.random() * 55;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 150;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xFFE2B8, size: 0.34, transparent: true, opacity: 0.26,
    depthWrite: false, blending: THREE.AdditiveBlending
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  onProgress(0.86);

  /* ── post ────────────────────────────────────────────────── */
  const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
  const rt = new THREE.WebGLRenderTarget(size.x * DPR, size.y * DPR, {
    samples: mobile ? 0 : 4,
    type: THREE.HalfFloatType
  });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(DPR);
  composer.setSize(size.x, size.y);

  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.20, 0.25, 0.88);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  onProgress(0.95);

  /* ── state ───────────────────────────────────────────────── */
  const state = {
    progress: 0,
    build: 0,
    explode: 0,
    night: 0.1,
    mouseX: 0,
    mouseY: 0,
    mx: 0,
    my: 0
  };

  const camPos = new THREE.Vector3(...SHOTS[0].pos);
  const camTgt = new THREE.Vector3(...SHOTS[0].tgt);
  const tmpPos = new THREE.Vector3();
  const tmpTgt = new THREE.Vector3();
  const tmpCol = new THREE.Color();

  /* colour scratch */
  const cA = new THREE.Color(), cB = new THREE.Color();

  function applyTime(p) {
    const i = clamp(Math.floor(p), 0, TIMES.length - 2);
    const t = smooth(clamp(p - i, 0, 1));
    const a = TIMES[i], b = TIMES[i + 1];

    const sunEl = THREE.MathUtils.lerp(a.sunEl, b.sunEl, t);
    const sunAz = THREE.MathUtils.lerp(a.sunAz, b.sunAz, t);
    const el = THREE.MathUtils.degToRad(sunEl);
    const az = THREE.MathUtils.degToRad(sunAz);
    const dir = new THREE.Vector3(
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az)
    ).normalize();

    sun.position.copy(dir).multiplyScalar(150);
    sun.position.y = Math.max(sun.position.y, 4);
    sun.target.position.set(0, 20, 0);

    sun.color.copy(cA.setHex(a.sun)).lerp(cB.setHex(b.sun), t);
    sun.intensity = THREE.MathUtils.lerp(a.sunI, b.sunI, t);

    hemi.color.copy(cA.setHex(a.hemiSky)).lerp(cB.setHex(b.hemiSky), t);
    hemi.groundColor.copy(cA.setHex(a.hemiGround)).lerp(cB.setHex(b.hemiGround), t);
    hemi.intensity = THREE.MathUtils.lerp(a.hemiI, b.hemiI, t);

    skyUniforms.topColor.value.copy(cA.setHex(a.top)).lerp(cB.setHex(b.top), t).convertSRGBToLinear();
    skyUniforms.bottomColor.value.copy(cA.setHex(a.bot)).lerp(cB.setHex(b.bot), t).convertSRGBToLinear();
    skyUniforms.sunColor.value.copy(cA.setHex(a.sun)).lerp(cB.setHex(b.sun), t).convertSRGBToLinear();
    skyUniforms.sunDirection.value.copy(dir);
    skyUniforms.sunIntensity.value = clamp(sunEl / 30, 0.08, 1.25);

    scene.fog.color.copy(cA.setHex(a.fog)).lerp(cB.setHex(b.fog), t);

    state.night = THREE.MathUtils.lerp(a.night, b.night, t);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(a.exp, b.exp, t);
  }

  function applyNight() {
    const n = state.night;
    const glow = Math.pow(n, 1.25);
    winMats.forEach((m, i) => {
      m.emissiveIntensity = glow * (1.35 + i * 0.18);
    });
    lampGlowMat.emissiveIntensity = 0.3 + glow * 3.4;
    clubGlow.emissiveIntensity = 0.15 + glow * 1.6;
    poolLight.intensity = glow * 18;
    matWater.emissiveIntensity = 0.25 + glow * 0.75;
    starMat.opacity = clamp((n - 0.45) / 0.55, 0, 1) * 0.9;
    bloom.strength = 0.18 + glow * 0.62;
    dustMat.opacity = 0.26 * (1 - glow * 0.55);
  }

  function applyCamera(p) {
    const i = clamp(Math.floor(p), 0, SHOTS.length - 2);
    const t = smooth(clamp(p - i, 0, 1));
    const a = SHOTS[i], b = SHOTS[i + 1];

    tmpPos.set(
      THREE.MathUtils.lerp(a.pos[0], b.pos[0], t),
      THREE.MathUtils.lerp(a.pos[1], b.pos[1], t),
      THREE.MathUtils.lerp(a.pos[2], b.pos[2], t)
    );
    tmpTgt.set(
      THREE.MathUtils.lerp(a.tgt[0], b.tgt[0], t),
      THREE.MathUtils.lerp(a.tgt[1], b.tgt[1], t),
      THREE.MathUtils.lerp(a.tgt[2], b.tgt[2], t)
    );

    /* mobile: pull back a little */
    if (mobile) {
      tmpPos.sub(tmpTgt).multiplyScalar(1.14).add(tmpTgt);
    }

    /* mouse parallax */
    const px = state.mx * (mobile ? 1.0 : 2.6);
    const py = state.my * (mobile ? 0.8 : 1.8);
    tmpPos.x += px;
    tmpPos.y += py;
    tmpTgt.x += px * 0.32;
    tmpTgt.y += py * 0.26;

    camPos.lerp(tmpPos, 0.12);
    camTgt.lerp(tmpTgt, 0.12);

    camera.position.copy(camPos);
    camera.lookAt(camTgt);

    const fov = THREE.MathUtils.lerp(a.fov, b.fov, t);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  function applyBuild() {
    const b = state.build;
    floorGroups.forEach((g, i) => {
      const start = i * 0.048;
      const p = easeOut(clamp((b - start) / 0.55, 0, 1));
      g.visible = p > 0.002;
      g.scale.y = 0.02 + 0.98 * p;
    });
    /* core rises with the build */
    const cp = easeOut(clamp(b / 0.85, 0, 1));
    coreGroup.scale.y = 0.02 + 0.98 * cp;
    coreGroup.visible = cp > 0.002;
    roof.visible = b > 0.82;
    roof.scale.y = 0.02 + 0.98 * easeOut(clamp((b - 0.82) / 0.18, 0, 1));
  }

  function applyExplode() {
    const e = state.explode;
    floorGroups.forEach((g, i) => {
      g.position.y = STILT_H + i * FLOOR_H + i * 2.15 * e;
    });
    roof.position.y = TOWER_TOP + FLOORS * 2.15 * e;
    matEdge.opacity = e * 0.75;
  }

  /* ── resize ──────────────────────────────────────────────── */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    if (w < 900) {
      camera.setViewOffset(w, h, 0, h * 0.16, w, h);
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  }
  resize();

  /* ── interaction ─────────────────────────────────────────── */
  window.addEventListener('pointermove', (e) => {
    state.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  window.addEventListener('resize', resize, { passive: true });

  /* ── loop ────────────────────────────────────────────────── */
  const clock = new THREE.Clock();
  let running = true;

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    /* damped mouse */
    state.mx += (state.mouseX - state.mx) * Math.min(1, dt * 2.2);
    state.my += (state.mouseY - state.my) * Math.min(1, dt * 2.2);

    applyCamera(state.progress);
    applyTime(state.progress);
    applyBuild();
    applyExplode();
    applyNight();

    /* ambient motion */
    water.position.y = 0.2 + Math.sin(t * 1.1) * 0.012;
    dust.rotation.y = t * 0.008;
    dust.position.y = Math.sin(t * 0.18) * 0.8;
    stars.rotation.y = t * 0.003;
    sky.rotation.y = t * 0.0016;

    composer.render();
    requestAnimationFrame(frame);
  }

  /* initial camera */
  camPos.set(...SHOTS[0].pos);
  camTgt.set(...SHOTS[0].tgt);
  applyTime(0);
  applyNight();
  applyBuild();

  if (!reduced) frame();
  else {
    applyCamera(0);
    composer.render();
    /* still respond to scroll, but without continuous animation */
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        applyCamera(state.progress);
        applyTime(state.progress);
        applyBuild();
        applyExplode();
        applyNight();
        composer.render();
        ticking = false;
      });
    }, { passive: true });
  }

  onProgress(1);

  return {
    setProgress(p) { state.progress = clamp(p, 0, SHOTS.length - 1); },
    setBuild(b) { state.build = clamp(b, 0, 1); },
    setExplode(e) { state.explode = clamp(e, 0, 1); },
    pause() { running = false; },
    resume() { if (!running) { running = true; frame(); } },
    renderOnce() { composer.render(); },
    resize,
    dispose() {
      running = false;
      window.removeEventListener('resize', resize);
      renderer.dispose();
      composer.dispose?.();
    },
    get ready() { return true; }
  };

  /* ── utils ───────────────────────────────────────────────── */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}

function stub() {
  return {
    setProgress() {}, setBuild() {}, setExplode() {}, resize() {}, dispose() {},
    ready: false
  };
}
