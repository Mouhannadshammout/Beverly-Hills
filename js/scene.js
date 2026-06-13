/* ════════════════════════════════════════════════════════════
   BEVERLY HILLS ERBIL — procedural 3D masterplan world
   Layout modelled on the real project aerial:
   · curved highway hugging the west edge
   · a fan of white villa crescents along it
   · sculpted twin towers + terracotta tower in the centre
   · grand east lawn with a row of emerald glass towers
   Moody aerial grade with drifting volumetric clouds.
   ════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const FONT_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json';

/* fan geometry shared by villas / roads / highway */
const FAN_C = new THREE.Vector2(170, -30);     // fan centre
const FAN_A0 = THREE.MathUtils.degToRad(112);  // start angle (south)
const FAN_A1 = THREE.MathUtils.degToRad(208);  // end angle (north-west)

/* ── district data (shared with the UI layer) ─────────────── */
export const DISTRICTS = [
  {
    id: 'villas',
    name: 'The Crescent Villas',
    kicker: 'DISTRICT 01',
    desc: 'Six sweeping crescents of white garden villas following the green edge of the highway — each row opening onto its own private lane and garden belt.',
    facts: [['Typology', '4–6 BR villas'], ['Plots', '400 – 800 m²'], ['Feature', 'Private gardens'], ['Handover', 'Q4 2027']],
    anchor: [-140, 10, 80],
    view: { pos: [-360, 300, 330], target: [-110, 0, 50] },
  },
  {
    id: 'towers',
    name: 'The Twin Towers',
    kicker: 'DISTRICT 02',
    desc: 'The sculpted twin towers at the heart of the plan — joined at the podium, parting toward the sky — beside the terracotta residence tower and the glass pavilions.',
    facts: [['Typology', '1–4 BR + penthouses'], ['Residences', '640'], ['Height', 'Up to 34 floors'], ['Handover', 'Q2 2028']],
    anchor: [315, 150, -15],
    view: { pos: [150, 190, 220], target: [310, 60, -20] },
  },
  {
    id: 'garden-towers',
    name: 'The Garden Towers',
    kicker: 'DISTRICT 03',
    desc: 'A northern row of emerald glass towers facing the grand lawn — every residence with an uninterrupted view across the green.',
    facts: [['Typology', '1–3 BR apartments'], ['Residences', '1,160'], ['Towers', '6'], ['Handover', 'Q4 2028']],
    anchor: [560, 150, -290],
    view: { pos: [430, 260, -10], target: [560, 70, -290] },
  },
  {
    id: 'lawn',
    name: 'The Grand Lawn',
    kicker: 'DISTRICT 04',
    desc: 'The open heart of Beverly Hills — a vast event lawn and park threaded with walking loops, with the project name written in living hedge.',
    facts: [['Area', '28 acres'], ['Use', 'Events & sport'], ['Loop', '3.8 km soft track'], ['Trees', '4,000+ planted']],
    anchor: [540, 10, 90],
    view: { pos: [430, 360, 330], target: [540, 0, 60] },
  },
  {
    id: 'gate',
    name: 'The Grand Entrance',
    kicker: 'DISTRICT 05',
    desc: 'The gated southern arrival — a circular court behind the sculpted boundary wall, with the sales pavilion, retail arc and concierge gatehouse.',
    facts: [['Access', '120m Ring Road'], ['Retail', '24 boutiques'], ['Security', '24/7 gated'], ['Parking', '600 bays']],
    anchor: [245, 10, 295],
    view: { pos: [230, 230, 540], target: [245, 0, 280] },
  },
];

const HERO_POS = new THREE.Vector3(180, 1060, 270);
const HERO_TGT = new THREE.Vector3(180, 0, -30);
const EXPLORE_POS = new THREE.Vector3(170, 700, 470);
const EXPLORE_TGT = new THREE.Vector3(190, 0, -20);

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.mode = 'hero';            // hero | transition | explore
    this.mouse = new THREE.Vector2();
    this.pointer = new THREE.Vector2(-10, -10);
    this.hovered = null;
    this.selected = null;
    this.onDistrictHover = null;
    this.onDistrictSelect = null;
    this.zoneMeshes = [];
    this.cars = [];
    this.clouds = [];
    this._clock = new THREE.Clock();
    this._tmpV = new THREE.Vector3();
    this._raycaster = new THREE.Raycaster();
    this._downAt = new THREE.Vector2();
  }

  /* ── boot ───────────────────────────────────────────────── */
  async load(onProgress = () => {}) {
    onProgress(0.08);
    this._initRenderer();
    this._initAtmosphere();
    onProgress(0.2);

    const font = await new Promise((res, rej) =>
      new FontLoader().load(FONT_URL, res, undefined, rej));
    onProgress(0.5);

    this._buildGround();
    this._buildHighway();
    this._buildVillaFan();
    onProgress(0.68);
    this._buildCentre();
    this._buildLawn(font);
    this._buildTrees();
    onProgress(0.85);
    this._buildClouds();
    this._buildZones();
    onProgress(0.95);

    this._applyHeroCamera(0);
    this._bindEvents();
    this.renderer.setAnimationLoop(() => this._tick());
    onProgress(1);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;

    this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 1, 7000);
    this.camera.position.copy(HERO_POS);
    this._camTarget = HERO_TGT.clone();
  }

  _initAtmosphere() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a241e);
    this.scene.fog = new THREE.FogExp2(0x222e26, 0.00026);

    const hemi = new THREE.HemisphereLight(0x8fa4ad, 0x2c3a2e, 0.85);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xf3e7c6, 1.35);
    sun.position.set(380, 460, -180);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -900; sun.shadow.camera.right = 900;
    sun.shadow.camera.top = 900; sun.shadow.camera.bottom = -900;
    sun.shadow.camera.far = 2200;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);

    // soft fill from the south so shadow faces never go black
    const fill = new THREE.DirectionalLight(0xa8b8a8, 0.5);
    fill.position.set(-260, 320, 520);
    this.scene.add(fill);
  }

  /* ── helpers ────────────────────────────────────────────── */
  _mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 1, metalness: opts.metalness ?? 0, ...opts.extra });
  }

  /* flat ribbon mesh following a curve on the ground plane */
  _ribbon(points3, width, color, y, opts = {}) {
    const curve = new THREE.CatmullRomCurve3(points3.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.3);
    const N = opts.segments ?? 120;
    const pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const nx = -tan.z, nz = tan.x;
      pos.push(p.x + nx * width / 2, y, p.z + nz * width / 2);
      pos.push(p.x - nx * width / 2, y, p.z - nz * width / 2);
      if (i < N) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, this._mat(color, { roughness: opts.roughness ?? 0.95 }));
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return { mesh, curve };
  }

  /* arc ribbon around the fan centre */
  _fanArc(r, width, color, y, a0 = FAN_A0, a1 = FAN_A1) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const a = a0 + (a1 - a0) * (i / 24);
      pts.push([FAN_C.x + Math.cos(a) * r, FAN_C.y + Math.sin(a) * r]);
    }
    return this._ribbon(pts, width, color, y, { segments: 96 });
  }

  /* ── terrain ────────────────────────────────────────────── */
  _buildGround() {
    const desert = new THREE.Mesh(
      new THREE.CircleGeometry(3600, 64).rotateX(-Math.PI / 2),
      this._mat(0x6e6a4f));
    desert.receiveShadow = true;
    this.scene.add(desert);

    // surrounding dark farmland patches
    [[-850, 420, 700, 540, 0x2f5635], [-700, -480, 620, 460, 0x39663c], [950, 420, 620, 480, 0x35603a],
     [1050, -350, 560, 520, 0x2f5635], [120, 760, 900, 380, 0x39663c], [200, -800, 1000, 420, 0x315c37]]
      .forEach(([x, z, w, d, c]) => {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), this._mat(c));
        f.position.set(x, 0.3, z); f.receiveShadow = true;
        this.scene.add(f);
      });

    // the site plate — one large soft-cornered green ground
    const site = new THREE.Shape();
    site.moveTo(-340, -330);
    site.bezierCurveTo(-460, -120, -460, 180, -300, 360);
    site.bezierCurveTo(-100, 520, 420, 500, 660, 400);
    site.bezierCurveTo(820, 320, 820, -260, 680, -360);
    site.bezierCurveTo(420, -460, -180, -460, -340, -330);
    const siteGeo = new THREE.ShapeGeometry(site, 28); siteGeo.rotateX(-Math.PI / 2);
    const plate = new THREE.Mesh(siteGeo, this._mat(0x3f7a47));
    plate.position.y = 0.7; plate.receiveShadow = true;
    this.scene.add(plate);

    // east grand lawn — brighter green
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(420, 560, 1, 1).rotateX(-Math.PI / 2), this._mat(0x4d8c50));
    lawn.position.set(545, 1.0, -40); lawn.receiveShadow = true;
    this.scene.add(lawn);
  }

  /* ── the curved highway + service road ──────────────────── */
  _buildHighway() {
    const hwPts = [];
    const R = 492;
    for (let i = 0; i <= 20; i++) {
      const a = THREE.MathUtils.degToRad(100) + THREE.MathUtils.degToRad(118) * (i / 20);
      hwPts.push([FAN_C.x + Math.cos(a) * R, FAN_C.y + Math.sin(a) * R]);
    }
    // extend both ends outwards
    hwPts.unshift([330, 520], [560, 600]);
    hwPts.push([-240, -560], [-120, -760]);

    const hw = this._ribbon(hwPts, 42, 0x35393b, 1.1);
    this.highwayCurve = hw.curve;
    this._ribbon(hwPts, 3, 0x53683f, 1.25); // green median

    // inner perimeter service road
    this._fanArc(452, 13, 0x3c4143, 1.3, THREE.MathUtils.degToRad(106), THREE.MathUtils.degToRad(212));

    // moving traffic
    const palette = [0xd9d4c6, 0x22262a, 0x7e858c, 0x6e2a2a, 0x223c5c, 0xa08350];
    const carGeo = new THREE.BoxGeometry(8.5, 3.2, 4.2); carGeo.translate(0, 1.7, 0);
    for (let i = 0; i < 22; i++) {
      const mat = this._mat(palette[i % palette.length], { roughness: 0.4, metalness: 0.3 });
      const car = new THREE.Mesh(carGeo, mat);
      car.castShadow = true;
      this.scene.add(car);
      this.cars.push({
        mesh: car,
        t: Math.random(),
        lane: (i % 2 === 0 ? 1 : -1) * (6 + Math.random() * 8),
        speed: (0.014 + Math.random() * 0.018) * (i % 2 === 0 ? 1 : -1),
      });
    }
  }

  /* ── the villa fan (matches the project aerial) ─────────── */
  _buildVillaFan() {
    const rows = [
      { r: 430, inset: 0.00 }, { r: 392, inset: 0.015 }, { r: 354, inset: 0.03 },
      { r: 316, inset: 0.05 }, { r: 278, inset: 0.075 }, { r: 242, inset: 0.105 },
    ];
    // lanes between rows
    [411, 373, 335, 297, 260].forEach(r => this._fanArc(r, 7, 0x474c4e, 1.25));

    const matrices = [];
    const dummy = new THREE.Object3D();
    for (const row of rows) {
      const a0 = FAN_A0 + (FAN_A1 - FAN_A0) * row.inset;
      const a1 = FAN_A1 - (FAN_A1 - FAN_A0) * row.inset;
      const step = 21 / row.r; // ~21 units between villas
      for (let a = a0; a <= a1; a += step) {
        const x = FAN_C.x + Math.cos(a) * row.r;
        const z = FAN_C.y + Math.sin(a) * row.r;
        dummy.position.set(x, 0, z);
        dummy.rotation.y = Math.atan2(x - FAN_C.x, z - FAN_C.y); // face outward
        dummy.scale.setScalar(0.78 + Math.random() * 0.14);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
      }
    }

    const bodyGeo = new THREE.BoxGeometry(15, 8.5, 12); bodyGeo.translate(0, 4.8, 0);
    const roofGeo = new THREE.BoxGeometry(16.2, 1.2, 13.2); roofGeo.translate(0, 9.6, 0);
    const podGeo = new THREE.BoxGeometry(7, 5, 5.5); podGeo.translate(6.5, 3.1, 5.5);
    const bodyMat = this._mat(0xe9e3d1, { roughness: 0.85 });
    const roofMat = this._mat(0x252e28, { roughness: 0.9 });

    [[bodyGeo, bodyMat], [roofGeo, roofMat], [podGeo, bodyMat]].forEach(([geo, mat]) => {
      const im = new THREE.InstancedMesh(geo, mat, matrices.length);
      matrices.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = true; im.receiveShadow = true;
      this.scene.add(im);
    });

    // amenity strip inside the fan: pool + gardens
    const pool = new THREE.Mesh(new THREE.CapsuleGeometry(9, 42, 4, 12).rotateX(Math.PI / 2).rotateY(THREE.MathUtils.degToRad(60)),
      this._mat(0x2f7b94, { roughness: 0.2, extra: { emissive: 0x123c4c, emissiveIntensity: 0.4 } }));
    pool.scale.y = 0.06;
    pool.position.set(-38, 1.9, -52);
    this.scene.add(pool);
    const deck = new THREE.Mesh(new THREE.CapsuleGeometry(15, 50, 4, 12).rotateX(Math.PI / 2).rotateY(THREE.MathUtils.degToRad(60)),
      this._mat(0xb9ad8c));
    deck.scale.y = 0.04;
    deck.position.set(-38, 1.4, -52);
    this.scene.add(deck);
  }

  /* ── central cluster: twin towers, terracotta, entrance ─── */
  _windowTexture(base, line) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 128, 256);
    g.fillStyle = line;
    for (let y = 0; y < 256; y += 9) g.fillRect(0, y, 128, 2.6);
    g.fillStyle = 'rgba(255,255,255,0.16)';
    for (let x = 0; x < 128; x += 16) g.fillRect(x, 0, 2, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  _tower(x, z, w, d, h, tex, opts = {}) {
    const mat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.34, metalness: 0.42,
      emissive: opts.emissive ?? 0x0a1812, emissiveIntensity: 0.15,
    });
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    t.position.set(x, h / 2 + 1, z);
    if (opts.rotY) t.rotation.y = opts.rotY;
    t.castShadow = true; t.receiveShadow = true;
    this.scene.add(t);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 2.6, d * 0.86), this._mat(opts.crown ?? 0xcfd6cb, { roughness: 0.5 }));
    crown.position.set(x, h + 2.2, z);
    if (opts.rotY) crown.rotation.y = opts.rotY;
    crown.castShadow = true;
    this.scene.add(crown);
    return t;
  }

  _buildCentre() {
    const emerald = this._windowTexture('#2c6e52', 'rgba(8,34,24,0.55)');
    const teal = this._windowTexture('#2e6e72', 'rgba(8,30,32,0.5)');
    const terracotta = this._windowTexture('#a8674a', 'rgba(60,28,16,0.5)');
    const champagne = this._windowTexture('#9d8a64', 'rgba(52,42,24,0.5)');
    emerald.repeat.set(3, 10); teal.repeat.set(3, 9); terracotta.repeat.set(3, 11); champagne.repeat.set(3, 8);

    // the sculpted twin towers — joined podium, leaning apart
    const twinA = this._tower(288, -42, 34, 30, 128, champagne, { rotY: 0.18, crown: 0xb9ad8c });
    const twinB = this._tower(336, 6, 34, 30, 138, champagne, { rotY: -0.14, crown: 0xb9ad8c });
    twinA.geometry.applyMatrix4(new THREE.Matrix4().makeShear(0, 0, 0.04, 0, 0, 0));
    twinB.geometry.applyMatrix4(new THREE.Matrix4().makeShear(0, 0, -0.04, 0, 0, 0));
    const podium = new THREE.Mesh(new THREE.BoxGeometry(110, 12, 70), this._mat(0xded6c2, { roughness: 0.8 }));
    podium.position.set(312, 7, -16); podium.rotation.y = 0.12;
    podium.castShadow = true; podium.receiveShadow = true;
    this.scene.add(podium);

    // terracotta tower (north of twins)
    this._tower(300, -190, 38, 30, 152, terracotta, { crown: 0x8a5036, emissive: 0x230f08 });
    // glass slab south-east
    this._tower(420, 70, 52, 26, 104, teal, { rotY: -0.3 });
    // low serviced block
    this._tower(212, -120, 28, 24, 64, emerald);

    // grand entrance: circular court + gatehouse arc + sales pavilion
    const court = new THREE.Mesh(new THREE.RingGeometry(26, 40, 48).rotateX(-Math.PI / 2), this._mat(0x3c4143, { roughness: 0.95 }));
    court.position.set(245, 1.4, 295); this.scene.add(court);
    const courtGreen = new THREE.Mesh(new THREE.CircleGeometry(25, 40).rotateX(-Math.PI / 2), this._mat(0x4d8c50));
    courtGreen.position.set(245, 1.45, 295); this.scene.add(courtGreen);
    const gate = new THREE.Mesh(new THREE.TorusGeometry(56, 4.5, 8, 40, Math.PI * 0.9).rotateX(-Math.PI / 2), this._mat(0xd6cdb6, { roughness: 0.6 }));
    gate.position.set(245, 6, 332); gate.rotation.z = Math.PI * 0.05;
    gate.castShadow = true; this.scene.add(gate);
    const pavilion = new THREE.Mesh(new THREE.CylinderGeometry(16, 18, 10, 6), this._mat(0xcfc5aa, { roughness: 0.55, metalness: 0.2 }));
    pavilion.position.set(180, 6, 322); pavilion.castShadow = true; this.scene.add(pavilion);

    // boulevard from gate to the centre
    this._ribbon([[245, 320], [255, 180], [290, 60], [310, -80], [380, -240]], 13, 0x3c4143, 1.35);
  }

  /* ── grand lawn + garden tower row + hedge text ─────────── */
  _buildLawn(font) {
    // garden towers along the north edge of the lawn
    const emerald = this._windowTexture('#2c7258', 'rgba(8,34,24,0.55)');
    const emerald2 = this._windowTexture('#377e5e', 'rgba(8,34,24,0.5)');
    emerald.repeat.set(3, 10); emerald2.repeat.set(3, 8);
    [[430, -300, 120], [505, -315, 146], [580, -300, 132], [655, -315, 150], [725, -295, 112], [640, -180, 96]]
      .forEach(([x, z, h], i) => this._tower(x, z, 36, 30, h, i % 2 ? emerald : emerald2));

    // walking loop on the lawn
    this._ribbon([[400, 180], [520, 220], [650, 160], [690, 20], [620, -80], [480, -60], [410, 40], [400, 180]], 6, 0xb9ad8c, 1.3);

    // hedge lettering
    const geo = new TextGeometry('BEVERLY HILLS ERBIL', {
      font, size: 24, height: 5,
      curveSegments: 5, bevelEnabled: true,
      bevelThickness: 1, bevelSize: 0.7, bevelSegments: 2,
    });
    geo.computeBoundingBox();
    const w = geo.boundingBox.max.x - geo.boundingBox.min.x;
    geo.translate(-w / 2 - geo.boundingBox.min.x, 0, 0);
    geo.rotateX(-Math.PI / 2);
    const hedge = new THREE.Mesh(geo, this._mat(0x1d5c32, { roughness: 0.95 }));
    hedge.position.set(548, 1.3, 130);
    hedge.castShadow = true; hedge.receiveShadow = true;
    this.scene.add(hedge);
  }

  /* ── trees ──────────────────────────────────────────────── */
  _buildTrees() {
    const pts = [];
    // along the fan lanes + green belts between rows
    [421, 383, 345, 307, 270, 230].forEach((r) => {
      const n = Math.round(r * (FAN_A1 - FAN_A0) / 34);
      for (let i = 0; i <= n; i++) {
        const a = FAN_A0 + (FAN_A1 - FAN_A0) * (i / n) + (Math.random() - 0.5) * 0.02;
        pts.push([FAN_C.x + Math.cos(a) * (r + (Math.random() - 0.5) * 6), FAN_C.y + Math.sin(a) * (r + (Math.random() - 0.5) * 6), true]);
      }
    });
    // lawn scatter
    for (let i = 0; i < 130; i++) {
      const x = 360 + Math.random() * 380, z = -240 + Math.random() * 460;
      if (x > 380 && x < 720 && z > 90 && z < 175) continue; // hedge text zone
      pts.push([x, z, false]);
    }
    // centre cluster greenery
    for (let i = 0; i < 70; i++) pts.push([180 + Math.random() * 160, -220 + Math.random() * 480, false]);
    // outside the highway
    for (let i = 0; i < 90; i++) {
      const a = FAN_A0 + (FAN_A1 - FAN_A0) * Math.random();
      const r = 520 + Math.random() * 90;
      pts.push([FAN_C.x + Math.cos(a) * r, FAN_C.y + Math.sin(a) * r, false]);
    }

    const canopyGeo = new THREE.IcosahedronGeometry(5, 1);
    const trunkGeo = new THREE.CylinderGeometry(0.6, 0.9, 5.5, 5); trunkGeo.translate(0, 2.7, 0);
    const canopy = new THREE.InstancedMesh(canopyGeo, this._mat(0x2c6440), pts.length);
    const trunk = new THREE.InstancedMesh(trunkGeo, this._mat(0x4a3b28), pts.length);
    const dummy = new THREE.Object3D();
    const c1 = new THREE.Color(0x245434), c2 = new THREE.Color(0x47834a);
    const blossom = new THREE.Color(0xb06a86);
    const mix = new THREE.Color();

    pts.forEach(([x, z], i) => {
      const s = 0.65 + Math.random() * 0.8;
      dummy.position.set(x, 5.5 * s + 3 * s, z);
      dummy.scale.set(s, s * (0.85 + Math.random() * 0.5), s);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      canopy.setMatrixAt(i, dummy.matrix);
      // occasional blossom tree, like the render
      canopy.setColorAt(i, Math.random() < 0.06 ? blossom : mix.lerpColors(c1, c2, Math.random()));
      dummy.position.set(x, 0.5, z);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunk.setMatrixAt(i, dummy.matrix);
    });
    canopy.castShadow = true;
    this.scene.add(canopy, trunk);
  }

  /* ── volumetric cloud sprites ───────────────────────────── */
  _cloudTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const x = 40 + Math.random() * 176, y = 70 + Math.random() * 116;
      const r = 22 + Math.random() * 46;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.16)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 256);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  _buildClouds() {
    const tex = this._cloudTexture();
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, depthWrite: false,
        opacity: 0.45 + Math.random() * 0.3,
        color: 0xdfe5dd,
      });
      const size = 380 + Math.random() * 360;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * (0.5 + Math.random() * 0.4)).rotateX(-Math.PI / 2), mat);
      m.position.set(-1100 + Math.random() * 2400, 320 + Math.random() * 260, -700 + Math.random() * 1500);
      m.rotation.z = Math.random() * Math.PI;
      m.renderOrder = 10;
      this.scene.add(m);
      this.clouds.push({ mesh: m, vx: 5 + Math.random() * 9, vz: (Math.random() - 0.5) * 3 });
    }
  }

  /* ── interactive district zones ─────────────────────────── */
  _zoneMesh(district, geo) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xf2ead6, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = 3.4;
    m.userData.district = district.id;
    this.scene.add(m);
    this.zoneMeshes.push(m);
    return m;
  }

  _buildZones() {
    const byId = Object.fromEntries(DISTRICTS.map(d => [d.id, d]));

    // villa fan ring segment (shape space: y maps to world -z)
    const s = new THREE.Shape();
    s.absarc(0, 0, 446, -FAN_A0, -FAN_A1, true);
    s.absarc(0, 0, 222, -FAN_A1, -FAN_A0, false);
    s.closePath();
    const fanGeo = new THREE.ShapeGeometry(s, 40); fanGeo.rotateX(-Math.PI / 2);
    this._zoneMesh(byId.villas, fanGeo).position.set(FAN_C.x, 3.4, FAN_C.y);

    const twins = this._zoneMesh(byId.towers, new THREE.PlaneGeometry(220, 300).rotateX(-Math.PI / 2));
    twins.position.set(310, 3.5, -50);

    const row = this._zoneMesh(byId['garden-towers'], new THREE.PlaneGeometry(380, 130).rotateX(-Math.PI / 2));
    row.position.set(575, 3.6, -290);

    const lawn = this._zoneMesh(byId.lawn, new THREE.PlaneGeometry(370, 330).rotateX(-Math.PI / 2));
    lawn.position.set(555, 3.2, 50);

    const gate = this._zoneMesh(byId.gate, new THREE.CircleGeometry(78, 40).rotateX(-Math.PI / 2));
    gate.position.set(238, 3.45, 300);
  }

  /* ── events ─────────────────────────────────────────────── */
  _bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    window.addEventListener('mousemove', (e) => {
      this.mouse.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
      this.pointer.set(this.mouse.x, -this.mouse.y);
    });
    this.canvas.addEventListener('pointerdown', (e) => this._downAt.set(e.clientX, e.clientY));
    this.canvas.addEventListener('pointerup', (e) => {
      if (this.mode !== 'explore') return;
      if (this._downAt.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 6) return;
      if (this.hovered && this.onDistrictSelect) this.onDistrictSelect(this.hovered);
    });
  }

  /* portrait screens need the camera further back */
  get _distK() {
    const a = this.camera.aspect;
    return a < 1 ? Math.min(1.9, 1 + (1 - a) * 1.1) : 1;
  }

  /* ── hero idle camera ───────────────────────────────────── */
  _applyHeroCamera(time) {
    const k = this._distK;
    const p = HERO_POS.clone().sub(HERO_TGT).multiplyScalar(k).add(HERO_TGT);
    p.x += Math.sin(time * 0.16) * 30 + this.mouse.x * 34;
    p.z += Math.cos(time * 0.13) * 22 - this.mouse.y * 22;
    p.y += Math.sin(time * 0.2) * 12;
    this.camera.position.copy(p);
    this._camTarget.set(
      HERO_TGT.x + this.mouse.x * 18 + Math.sin(time * 0.1) * 10,
      0,
      HERO_TGT.z - this.mouse.y * 12 + Math.cos(time * 0.12) * 8);
    this.camera.lookAt(this._camTarget);
  }

  /* ── explore mode ───────────────────────────────────────── */
  enterExplore() {
    this.mode = 'transition';
    if (!this.controls) {
      this.controls = new OrbitControls(this.camera, this.canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.minDistance = 220;
      this.controls.maxDistance = 1700;
      this.controls.maxPolarAngle = 1.32;
      this.controls.enabled = false;
    }
    this.controls.target.copy(this._camTarget);
    const k = this._distK;
    const p = EXPLORE_POS.clone().sub(EXPLORE_TGT).multiplyScalar(k).add(EXPLORE_TGT);
    gsap.to(this.controls.target, { x: EXPLORE_TGT.x, y: 0, z: EXPLORE_TGT.z, duration: 2.0, ease: 'power3.inOut' });
    gsap.to(this.camera.position, {
      x: p.x, y: p.y, z: p.z, duration: 2.0, ease: 'power3.inOut',
      onUpdate: () => this.camera.lookAt(this.controls.target),
      onComplete: () => { this.controls.enabled = true; this.mode = 'explore'; },
    });
  }

  exitExplore() {
    this.mode = 'transition';
    if (this.controls) this.controls.enabled = false;
    this._clearHover();
    this.selected = null;
    this._syncZoneStyles();
    const k = this._distK;
    const p = HERO_POS.clone().sub(HERO_TGT).multiplyScalar(k).add(HERO_TGT);
    const tgt = this._camTarget;
    gsap.to(tgt, { x: HERO_TGT.x, y: 0, z: HERO_TGT.z, duration: 1.8, ease: 'power3.inOut' });
    gsap.to(this.camera.position, {
      x: p.x, y: p.y, z: p.z, duration: 1.8, ease: 'power3.inOut',
      onUpdate: () => this.camera.lookAt(tgt),
      onComplete: () => { this.mode = 'hero'; },
    });
  }

  focusDistrict(id) {
    const d = DISTRICTS.find(x => x.id === id);
    if (!d || !this.controls) return;
    this.selected = id;
    this._syncZoneStyles();
    const k = this._distK;
    const t = new THREE.Vector3(...d.view.target);
    const p = new THREE.Vector3(...d.view.pos).sub(t).multiplyScalar(k).add(t);
    gsap.to(this.camera.position, { x: p.x, y: p.y, z: p.z, duration: 1.7, ease: 'power3.inOut' });
    gsap.to(this.controls.target, { x: t.x, y: t.y, z: t.z, duration: 1.7, ease: 'power3.inOut' });
  }

  clearSelection() {
    this.selected = null;
    this._syncZoneStyles();
  }

  _clearHover() {
    if (this.hovered) {
      this.hovered = null;
      this._syncZoneStyles();
      if (this.onDistrictHover) this.onDistrictHover(null);
    }
  }

  _syncZoneStyles() {
    for (const z of this.zoneMeshes) {
      const id = z.userData.district;
      const target = id === this.selected ? 0.2 : id === this.hovered ? 0.12 : 0;
      gsap.to(z.material, { opacity: target, duration: 0.45, overwrite: 'auto' });
    }
  }

  _updateHover() {
    this._raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this._raycaster.intersectObjects(this.zoneMeshes, false);
    const id = hits.length ? hits[0].object.userData.district : null;
    if (id !== this.hovered) {
      this.hovered = id;
      this._syncZoneStyles();
      if (this.onDistrictHover) this.onDistrictHover(id);
    }
  }

  getLabelPositions() {
    const out = [];
    for (const d of DISTRICTS) {
      this._tmpV.set(d.anchor[0], d.anchor[1], d.anchor[2]).project(this.camera);
      out.push({
        id: d.id,
        x: (this._tmpV.x * 0.5 + 0.5) * window.innerWidth,
        y: (-this._tmpV.y * 0.5 + 0.5) * window.innerHeight,
        visible: this._tmpV.z < 1,
      });
    }
    return out;
  }

  /* ── frame loop ─────────────────────────────────────────── */
  _tick() {
    const dt = Math.min(this._clock.getDelta(), 0.05);
    const time = this._clock.elapsedTime;

    // cars follow the highway curve
    for (const c of this.cars) {
      c.t = (c.t + c.speed * dt + 1) % 1;
      const p = this.highwayCurve.getPointAt(c.t);
      const tan = this.highwayCurve.getTangentAt(c.t);
      c.mesh.position.set(p.x - tan.z * c.lane, 1.2, p.z + tan.x * c.lane);
      c.mesh.rotation.y = Math.atan2(tan.x, tan.z) + (c.speed < 0 ? Math.PI : 0);
    }

    // drifting clouds
    for (const cl of this.clouds) {
      cl.mesh.position.x += cl.vx * dt;
      cl.mesh.position.z += cl.vz * dt;
      if (cl.mesh.position.x > 1500) cl.mesh.position.x = -1500;
    }

    if (this.mode === 'explore') {
      this.controls.update();
      this._updateHover();
    } else if (this.mode === 'hero') {
      this._applyHeroCamera(time);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
