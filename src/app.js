/* 生命樹 3D：場景、夥伴、省思流程、歷史軌跡、Google 雲端硬碟同步。
   由 tree-3d.html 以 <script type="module"> 載入；three.js 由 vendor/ 自己託管。 */
import * as THREE from '../vendor/three/build/three.module.min.js';
import { OrbitControls } from '../vendor/three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from '../vendor/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from '../vendor/three/examples/jsm/environments/RoomEnvironment.js';

/* ───────── 小工具 ───────── */
const $ = s => document.querySelector(s);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp, sstep = THREE.MathUtils.smoothstep;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const D = (v = 0) => ({ v, t: v, vel: 0 });
/* smoothDamp：所有成長都經過它，先慢、再快、再慢，沒有瞬間跳變 */
function sd(o, dt, st = 1.1) {
  const om = 2 / st, x = om * dt, e = 1 / (1 + x + .48 * x * x + .235 * x * x * x);
  const ch = o.v - o.t, tmp = (o.vel + om * ch) * dt;
  o.vel = (o.vel - om * tmp) * e; o.v = o.t + (ch + tmp) * e; return o.v;
}
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const IDS = FRUITS.map(f => f.id);
const GLOW = RULES.visual.glow;

const NOISE = `float h31(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = .5, r = 0.; for (int i = 0; i < 5; i++) { r += a * n3(p); p = p * 2.03 + vec3(1.7); a *= .5; } return r; }
`;

/* ───────── Renderer ───────── */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
const FOG = new THREE.Color('#1c3464');
scene.fog = new THREE.FogExp2(FOG, 0.028);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
camera.position.set(7, 2.6, 9);
scene.add(camera);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.22;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .06; controls.enablePan = false;
controls.minPolarAngle = 0.95; controls.maxPolarAngle = 1.5;
controls.autoRotate = !REDUCED; controls.autoRotateSpeed = 0.32; controls.rotateSpeed = .5;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.8, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ───────── 天空、星、月 ───────── */
const MOON_DIR = V3(-0.55, 0.42, -0.72).normalize();
const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 32), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color('#050916') }, mid: { value: new THREE.Color('#0e1c40') }, hor: { value: FOG.clone() }, glow: { value: new THREE.Color('#5a6fb5') }, moon: { value: MOON_DIR }, t: { value: 0 } },
  vertexShader: `varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `varying vec3 d; uniform vec3 top, mid, hor, glow, moon; uniform float t;
    ${NOISE}
    void main(){ vec3 n = normalize(d); float h = clamp(n.y, -1., 1.);
      vec3 c = mix(hor, mid, smoothstep(0., .28, h)); c = mix(c, top, smoothstep(.2, .85, h));
      c = mix(c, hor, smoothstep(0., -.08, h));
      // 銀河：一條斜跨天頂的光帶，裡面有塵埃的明暗
      vec3 A = normalize(vec3(.42, .46, -.78)); float bd = dot(n, A), band = exp(-bd * bd / .05), up = smoothstep(.03, .4, h);
      float dust = fbm(n * 5. + 3.), lane = smoothstep(.38, .62, fbm(n * 9. + vec3(8.)));
      c += (vec3(.30, .38, .72) * (.25 + dust) * .30 + vec3(.62, .40, .66) * pow(dust, 3.) * .5) * band * up * (1. - lane * .6);
      c += vec3(.9, .95, 1.) * pow(h31(floor(n * 520.)), 70.) * (.35 + band * 2.2) * up;
      // 薄雲：很慢地飄，朝月亮的那一面被照亮
      vec2 cp = n.xz / (n.y + .32); float cl = fbm(vec3(cp * 1.5 + vec2(t * .007, t * .003), t * .004));
      cl = smoothstep(.48, .8, cl) * smoothstep(.0, .14, h) * (1. - smoothstep(.4, .78, h));
      float m = max(dot(n, moon), 0.);
      c = mix(c, mix(vec3(.07, .11, .24), vec3(.50, .56, .82), pow(m, 3.) * .9 + .1), cl * .6);
      c += glow * (pow(m, 5.) * .12 + pow(m, 60.) * .45);
      gl_FragColor = vec4(c, 1.); }`
}));
scene.add(sky);

function radialTex(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([p, col]) => gr.addColorStop(p, col));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const TEX_HALO = radialTex([[0, 'rgba(255,255,255,1)'], [.18, 'rgba(255,255,255,.55)'], [.45, 'rgba(255,255,255,.16)'], [1, 'rgba(255,255,255,0)']]);
const TEX_MOON = (() => {   // 月面：月海的暗斑與幾個坑
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), R = rng(9);
  g.save(); g.beginPath(); g.arc(128, 128, 118, 0, 6.283); g.clip();
  const gr = g.createRadialGradient(100, 96, 10, 128, 128, 122); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.75, '#f1ecdd'); gr.addColorStop(1, '#cfc8b6'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.filter = 'blur(7px)';
  [[92, 84, 34, 26], [140, 70, 26, 20], [158, 122, 30, 36], [104, 150, 24, 18], [70, 128, 16, 22], [136, 172, 20, 14]].forEach(([x, y, a, b]) => { g.fillStyle = 'rgba(120,124,140,.42)'; g.beginPath(); g.ellipse(x, y, a, b, R() * 3, 0, 6.283); g.fill(); });
  g.filter = 'blur(1.2px)';
  for (let i = 0; i < 26; i++) { const x = 30 + R() * 196, y = 30 + R() * 196, r = 2 + R() * 6; g.fillStyle = 'rgba(110,112,128,.3)'; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x + r * .25, y + r * .25, r * .7, 0, 6.283); g.fill(); }
  g.restore(); g.filter = 'none';
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const TEX_SHADOW = radialTex([[0, 'rgba(0,0,0,.62)'], [.5, 'rgba(0,0,0,.3)'], [1, 'rgba(0,0,0,0)']]);

const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_MOON, color: new THREE.Color(1.55, 1.48, 1.3), fog: false, depthWrite: false, transparent: true }));
const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_HALO, color: '#8fa4e8', fog: false, depthWrite: false, transparent: true, opacity: .5, blending: THREE.AdditiveBlending }));
moonHalo.position.copy(MOON_DIR).multiplyScalar(262); moonHalo.scale.setScalar(120); scene.add(moonHalo);
moon.position.copy(MOON_DIR).multiplyScalar(260); moon.scale.setScalar(26); scene.add(moon);

{ // 星
  const R = rng(7), n = 1400, pos = new Float32Array(n * 3), ph = new Float32Array(n), sz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = R() * 2 - 1, a = R() * Math.PI * 2, y = Math.abs(u) * .97 + .03, r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r * 280, y * 280, Math.sin(a) * r * 280], i * 3); ph[i] = R() * 6.28; sz[i] = .8 + Math.pow(R(), 4) * 2.6;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1)); g.setAttribute('sz', new THREE.BufferAttribute(sz, 1));
  var starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, pr: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float ph, sz; uniform float t, pr; varying float a, big; varying vec3 col;
      void main(){ a = .55 + .45 * sin(t * (.6 + fract(ph) * 1.4) + ph); a *= smoothstep(0., 40., position.y);
        big = step(2.5, sz); float k = fract(ph * 7.31);
        col = k < .2 ? vec3(1., .82, .62) : k < .45 ? vec3(.72, .82, 1.) : vec3(.95, .97, 1.);     // 有暖色的、偏藍的、白的
        gl_PointSize = sz * pr * mix(1., 4., big); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying float a, big; varying vec3 col;
      void main(){ vec2 q = gl_PointCoord - .5; float d = length(q), f = smoothstep(.5, .1, d);
        if (big > .5) f = smoothstep(.16, .02, d) + (exp(-abs(q.x) * 70.) + exp(-abs(q.y) * 70.)) * smoothstep(.5, .05, d) * .7;   // 亮星帶十字星芒
        gl_FragColor = vec4(col * 1.35, a * f); }`
  });
  scene.add(new THREE.Points(g, starMat));
}

const meteor = (() => {
  const c = document.createElement('canvas'); c.width = 128; c.height = 16; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.85, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gr; g.fillRect(0, 6, 128, 4); g.filter = 'blur(2px)'; g.fillRect(0, 5, 128, 6);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.6, 1.7, 2.), transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  m.matrixAutoUpdate = false; m.visible = false; m.frustumCulled = false; scene.add(m);
  return { m, t: 1, next: 6, p: V3(0, 0, 0), v: V3(0, 0, 0) };
})();
function stepMeteor(dt) {
  const M = meteor;
  if (M.t >= 1) {
    M.next -= dt; if (M.next > 0 || REDUCED) return;
    const a = Math.random() * 6.283, y = .35 + Math.random() * .4, r = Math.sqrt(1 - y * y), dirSign = Math.random() < .5 ? 1 : -1;
    M.p.set(Math.cos(a) * r, y, Math.sin(a) * r).multiplyScalar(250);
    M.v.set(-Math.sin(a) * dirSign, -.35 - Math.random() * .3, Math.cos(a) * dirSign).normalize().multiplyScalar(150);
    M.t = 0; M.next = 9 + Math.random() * 16; M.m.visible = true;
  }
  M.t += dt / .85; M.p.addScaledVector(M.v, dt);
  const x = M.v.clone().normalize(), z = M.p.clone().normalize().negate(), yv = z.clone().cross(x).normalize();
  M.m.matrix.makeBasis(x.multiplyScalar(34), yv.multiplyScalar(1.6), z).setPosition(M.p); M.m.matrixWorldNeedsUpdate = true;
  M.m.material.opacity = Math.sin(Math.min(M.t, 1) * Math.PI); if (M.t >= 1) M.m.visible = false;
}

/* ───────── 光 ───────── */
scene.add(new THREE.HemisphereLight('#5f7fc8', '#1c2a22', 0.62));
const moonLight = new THREE.DirectionalLight('#b9cdff', 1.7); moonLight.position.copy(MOON_DIR).multiplyScalar(30); scene.add(moonLight);
const fill = new THREE.DirectionalLight('#ffd9a8', 0.35); fill.position.set(6, 4, 8); scene.add(fill);
const baseLight = new THREE.PointLight('#ffd89a', 0, 14, 1.6); baseLight.position.set(0, .7, 0); scene.add(baseLight);
const crownLight = new THREE.PointLight('#ffe6b8', 0, 22, 1.5); scene.add(crownLight);

const grassU = { uTime: { value: 0 } };
/* ───────── 地面 ───────── */
const hillY = r => -1.5 * (1 - Math.exp(-r * r / 34));
{
  const pts = []; for (let k = 60; k >= 0; k--) { const r = 220 * Math.pow(k / 60, 2.4); pts.push(new THREE.Vector2(r, hillY(r))); }
  const g = new THREE.LatheGeometry(pts, 72);
  const col = [], p = g.attributes.position, near = new THREE.Color('#2f6248'), mid = new THREE.Color('#1b3a3a'), far = new THREE.Color('#0f1c33'), c = new THREE.Color(), R = rng(3);
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getZ(i));
    c.copy(near).lerp(mid, sstep(r, 1, 8)).lerp(far, sstep(r, 6, 26)); c.multiplyScalar(.9 + R() * .2); col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const gm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  gm.onBeforeCompile = sh => {   // 地面：苔與土的斑駁
    sh.vertexShader = 'varying vec3 vGP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGP = position;');
    sh.fragmentShader = 'varying vec3 vGP;\n' + NOISE + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float gA = fbm(vec3(vGP.xz * .45, 1.)), gB = n3(vec3(vGP.xz * 3.2, 4.));
      diffuseColor.rgb *= .62 + .7 * gA; diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.25, 1.05, .7), smoothstep(.55, .8, gB) * .35);`);
  };
  scene.add(new THREE.Mesh(g, gm));
  // 草：一片片有弧度的葉片，成叢生長，隨風擺動
  const R2 = rng(11), n = 15000, blade = new THREE.PlaneGeometry(.05, 1, 1, 4); blade.translate(0, .5, 0);
  { const p = blade.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - Math.pow(y, 1.6) * .96)); } }
  const grassMat = new THREE.MeshStandardMaterial({ roughness: .8, side: THREE.DoubleSide, emissive: '#1b5a3a', emissiveIntensity: .16 });
  grassMat.onBeforeCompile = sh => {
    sh.uniforms.uTime = grassU.uTime;
    sh.vertexShader = 'uniform float uTime; varying float vH;\n' + sh.vertexShader.replace('#include <project_vertex>', `
      vec4 mvPosition = vec4(transformed, 1.); vH = position.y;
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
        vec2 ip = instanceMatrix[3].xz; float k = position.y * position.y * length(instanceMatrix[1].xyz);
        float gust = sin(uTime * .9 + ip.x * .55 + ip.y * .35) * .6 + sin(uTime * 2.1 + ip.x * 1.7 - ip.y * 1.1) * .25;
        mvPosition.x += (gust * .32 + fract(ip.x * 7.3) * .3 - .1) * k; mvPosition.z += (gust * .14 + fract(ip.y * 5.1) * .3 - .15) * k; mvPosition.y -= abs(gust) * .06 * k;
      #endif
      mvPosition = modelViewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = 'varying float vH;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(.28, 1.3, vH); diffuseColor.rgb += vec3(.03, .05, .0) * vH * vH;');
  };
  const grass = new THREE.InstancedMesh(blade, grassMat, n), o = new THREE.Object3D(), gc = new THREE.Color();
  const clumps = []; for (let i = 0; i < 520; i++) { const r = .6 + Math.pow(R2(), .75) * 13, a = R2() * 6.283; clumps.push([Math.cos(a) * r, Math.sin(a) * r, .6 + R2() * .8]); }
  for (let i = 0; i < n; i++) {
    let x, z, hgt;
    if (i < n * .7) { const c = clumps[Math.floor(R2() * clumps.length)], rr = Math.sqrt(-2 * Math.log(R2() + 1e-6)) * .22, a = R2() * 6.283; x = c[0] + Math.cos(a) * rr; z = c[1] + Math.sin(a) * rr; hgt = (.16 + R2() * .22) * c[2] * Math.exp(-rr * rr * 2.2); }
    else { const r = .5 + Math.pow(R2(), .6) * 20, a = R2() * 6.283; x = Math.cos(a) * r; z = Math.sin(a) * r; hgt = .07 + R2() * .11; }
    const r = Math.hypot(x, z); if (r < .45) { x *= .6 / (r + 1e-4); z *= .6 / (r + 1e-4); }
    o.position.set(x, hillY(Math.hypot(x, z)) - .01, z); o.rotation.set((R2() - .5) * .5, R2() * 6.283, (R2() - .5) * .5);
    o.scale.set(.7 + R2() * .8, Math.max(hgt, .05), 1); o.updateMatrix(); grass.setMatrixAt(i, o.matrix);
    grass.setColorAt(i, gc.setHSL(.30 + R2() * .13, .5 + R2() * .25, .16 + R2() * .14));
  }
  grass.frustumCulled = false; scene.add(grass);
  // 小野花與石頭
  const fsShape = new THREE.Shape(); for (let k = 0; k <= 50; k++) { const a = k / 50 * 6.283, r = .05 * (.4 + .6 * Math.pow(Math.abs(Math.cos(a * 2.5)), .6)); fsShape[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  const fGeo = new THREE.ShapeGeometry(fsShape, 1); fGeo.rotateX(-Math.PI / 2);
  const NF = 260, heads = new THREE.InstancedMesh(fGeo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .6, emissive: '#8f93b8', emissiveIntensity: .55 }), NF);
  const stemG = new THREE.CylinderGeometry(.004, .006, 1, 4); stemG.translate(0, .5, 0);
  const stems = new THREE.InstancedMesh(stemG, new THREE.MeshStandardMaterial({ color: '#2f6a44', roughness: 1 }), NF);
  const FC = ['#ffffff', '#fff3b8', '#e6d4ff', '#ffd9e4', '#cfe6ff'];
  for (let i = 0; i < NF; i++) {
    const c = clumps[Math.floor(R2() * 60)], rr = R2() * 1.1, a = R2() * 6.283, x = c[0] + Math.cos(a) * rr, z = c[1] + Math.sin(a) * rr, y = hillY(Math.hypot(x, z)), hh = .12 + R2() * .16;
    o.rotation.set(0, 0, 0); o.position.set(x, y, z); o.scale.set(1, hh, 1); o.updateMatrix(); stems.setMatrixAt(i, o.matrix);
    o.position.y = y + hh; o.rotation.set((R2() - .5) * .7, R2() * 6.283, (R2() - .5) * .7); o.scale.setScalar(.7 + R2() * .8); o.updateMatrix(); heads.setMatrixAt(i, o.matrix);
    heads.setColorAt(i, gc.set(FC[Math.floor(R2() * FC.length)]));
  }
  scene.add(heads, stems);
  const rock = new THREE.IcosahedronGeometry(1, 1), rocks = new THREE.InstancedMesh(rock, new THREE.MeshStandardMaterial({ color: '#56617a', roughness: .95, flatShading: true }), 46);
  for (let i = 0; i < 46; i++) { const r = 1.6 + R2() * 11, a = R2() * 6.283, sc = .05 + Math.pow(R2(), 2.5) * .28; o.position.set(Math.cos(a) * r, hillY(r) + sc * .15, Math.sin(a) * r); o.rotation.set(R2() * 3, R2() * 6, R2() * 3); o.scale.set(sc * (1 + R2() * .6), sc * .6, sc); o.updateMatrix(); rocks.setMatrixAt(i, o.matrix); }
  scene.add(rocks);
}
function ridge(r, h, col, seed) {
  const R = rng(seed), n = 200, pos = [], idx = [], p = [R() * 6, R() * 6, R() * 6, R() * 6];
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2, y = h * (.42 + .28 * Math.sin(a * 3 + p[0]) + .16 * Math.sin(a * 7 + p[1]) + .09 * Math.sin(a * 13 + p[2]) + .05 * Math.sin(a * 29 + p[3]));
    pos.push(Math.cos(a) * r, -4, Math.sin(a) * r, Math.cos(a) * r, Math.max(y, .3) - 1.4, Math.sin(a) * r);
    if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, fog: false, side: THREE.DoubleSide })));
}
ridge(230, 30, '#172d5a', 41); ridge(170, 15, '#12244a', 42);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ map: TEX_SHADOW, transparent: true, depthWrite: false, opacity: .9 }));
shadow.rotation.x = -Math.PI / 2; shadow.position.y = .04; scene.add(shadow);
const baseHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_HALO, color: '#ffd68a', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
baseHalo.position.set(0, .2, 0); baseHalo.scale.setScalar(2.4); scene.add(baseHalo);
const waterRing = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 80), new THREE.MeshBasicMaterial({ color: new THREE.Color(.7, 1.3, 1.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
waterRing.rotation.x = -Math.PI / 2; waterRing.position.y = .08; scene.add(waterRing);
let ringT = -1;

/* ───────── 螢火 ───────── */
let fireMat;
{
  const R = rng(21), n = 90, pos = new Float32Array(n * 3), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) { const r = 1 + R() * 8, a = R() * 6.283; pos.set([Math.cos(a) * r, .3 + R() * 5, Math.sin(a) * r], i * 3); ph[i] = R() * 100; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  fireMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, sc: { value: 1 } },
    vertexShader: `attribute float ph; uniform float t, sc; varying float a;
      void main(){ vec3 p = position + vec3(sin(t * .23 + ph) * .9, sin(t * .37 + ph * 2.1) * .5, cos(t * .19 + ph * 1.7) * .9);
        a = .35 + .65 * pow(.5 + .5 * sin(t * 1.3 + ph * 5.), 2.);
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = sc * 46. / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float a; void main(){ float d = length(gl_PointCoord - .5); float f = smoothstep(.5, 0., d); gl_FragColor = vec4(vec3(1.6, 1.35, .7) * f * f, a * f); }`
  });
  const pts = new THREE.Points(g, fireMat); pts.frustumCulled = false; scene.add(pts);
}

/* ───────── 樹幹、枝條、根 ───────── */
function tube(curve, rFn, segs = 26, rad = 9) {
  const fr = curve.computeFrenetFrames(segs, false), pos = [], nor = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, p = curve.getPointAt(t), N = fr.normals[i], B = fr.binormals[i], r = rFn(t);
    for (let j = 0; j <= rad; j++) {
      const a = j / rad * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), nx = c * N.x + s * B.x, ny = c * N.y + s * B.y, nz = c * N.z + s * B.z;
      pos.push(p.x + r * nx, p.y + r * ny, p.z + r * nz); nor.push(nx, ny, nz);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return g;
}
const barkMat = new THREE.MeshStandardMaterial({ color: '#6b4f3c', roughness: .92, side: THREE.DoubleSide, emissive: '#2a1a10', emissiveIntensity: .35 });
const treeG = new THREE.Group(); scene.add(treeG);
const rootG = new THREE.Group(); scene.add(rootG);
const trunkCurve = new THREE.CatmullRomCurve3([V3(0, -.35, 0), V3(.06, .6, .03), V3(.2, 1.45, .08), V3(-.08, 2.3, -.05), V3(.04, 3.1, .02)]);
treeG.add(new THREE.Mesh(tube(trunkCurve, t => lerp(.4, .17, t) * (1 + .95 * Math.exp(-t * 8)), 32, 12), barkMat));

const roots = [];
{
  const R = rng(5);
  for (let k = 0; k < 7; k++) {
    const a = (k * 360 / 7 + 18 + R() * 16) * Math.PI / 180, w = (R() - .5) * .5, len = 1.9 + R() * .9;
    const P = (r, dy, bend) => V3(Math.cos(a + bend) * r, hillY(r) + dy, Math.sin(a + bend) * r);
    const cv = new THREE.CatmullRomCurve3([P(.12, .34, 0), P(.5, .1, w * .3), P(len * .5, .02, w * .7), P(len * .8, -.04, w), P(len, -.2, w * 1.2)]);
    const m = new THREE.Mesh(tube(cv, t => lerp(.17, .03, Math.pow(t, .7)), 18, 7), barkMat);
    m.scale.setScalar(.001); rootG.add(m); roots.push({ m, g: D(0) });
  }
}

/* 葉 */
function makeLeafGeo() {   // 沿中肋對折、葉尖微微下垂的葉片
  const NX = 4, NY = 7, Lh = .38, pos = [], uv = [], idx = [];
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
    const v = j / NY, u = i / NX * 2 - 1, w = .012 + .118 * Math.pow(Math.sin(Math.PI * Math.pow(v, .72)), .85) * (1 - .12 * v);
    pos.push(u * w + .02 * Math.sin(v * 3.1), v * Lh, Math.abs(u) * w * .6 - .13 * v * v + .012 * Math.sin(u * 6 + v * 9)); uv.push(u * .5 + .5, v);
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + NX + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const leafGeo0 = makeLeafGeo();
function leafMaterial(o, veins = true) {
  const m = new THREE.MeshStandardMaterial(o || { roughness: .9, envMapIntensity: .1, side: THREE.DoubleSide, emissive: '#124a30', emissiveIntensity: .3 });
  m.userData.u = { uTime: { value: 0 }, uGrow: { value: 0 } };
  m.customProgramCacheKey = () => 'leaf' + veins;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, m.userData.u);
    if (veins) sh.fragmentShader = 'varying vec2 vLUv; varying float vSeed;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float sv = abs(vLUv.x - .5) * 2., midrib = 1. - smoothstep(0., .1, sv);
      float side = smoothstep(.78, 1., sin((vLUv.y * 8. - sv * 1.6) * 6.2832) * .5 + .5) * (1. - vLUv.y * .6) * (1. - sv * .4);
      diffuseColor.rgb *= mix(.55, 1.2, vLUv.y) * (1. - .3 * smoothstep(.65, 1., sv));          // 葉基深、葉尖亮，葉緣略暗
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.9 + vec3(.03, .06, .0), max(midrib * .75, side * .35));   // 中肋與側脈
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.5, 1.25, .5), step(.9, vSeed) * .55);                // 少數偏黃的新葉`);
    sh.vertexShader = (veins ? 'varying vec2 vLUv; varying float vSeed;\n' : '') + 'attribute float aSeed; uniform float uTime, uGrow;\n' + sh.vertexShader.replace('#include <begin_vertex>', (veins ? 'vLUv = uv; vSeed = aSeed;\n' : '') +
      `float lg = smoothstep(aSeed * .8, aSeed * .8 + .2, uGrow);
       vec3 transformed = position * lg;
       transformed.x += sin(uTime * 1.5 + aSeed * 50.) * .16 * position.y;
       transformed.z += cos(uTime * 1.1 + aSeed * 31.) * .2 * position.y;`);
  };
  return m;
}

const blossomShape = new THREE.Shape();
for (let k = 0; k <= 60; k++) { const a = k / 60 * Math.PI * 2, r = .15 * (.42 + .58 * Math.pow(Math.abs(Math.cos(a * 2.5)), .7)); blossomShape[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r + .15); }
const blossomGeo0 = new THREE.ShapeGeometry(blossomShape, 1);
const tuftMat = leafMaterial();
{
  const R = rng(77), N = 110, geo = leafGeo0.clone(), seeds = new Float32Array(N), m = new THREE.InstancedMesh(geo, tuftMat, N), o = new THREE.Object3D(), lc = new THREE.Color(), c = trunkCurve.getPointAt(1);
  for (let j = 0; j < N; j++) {
    const rr = Math.cbrt(R()) * .7, th = R() * 6.283, ph = Math.acos(R() * 2 - 1);
    o.position.set(c.x + rr * Math.sin(ph) * Math.cos(th), c.y + rr * Math.cos(ph) * .7 + .15, c.z + rr * Math.sin(ph) * Math.sin(th));
    o.rotation.set((R() - .5) * 2.6, R() * 6.283, (R() - .5) * 2.6); o.scale.setScalar(.8 + R() * .7); o.updateMatrix(); m.setMatrixAt(j, o.matrix);
    seeds[j] = R(); m.setColorAt(j, lc.setHSL(.34 + R() * .1, .55, .16 + R() * .16));
  }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1)); m.frustumCulled = false; treeG.add(m);
}

/* ───────── 果子、花、花苞、種子的模型 ───────── */
const PROFILE = {
  apple: [[0, -.42], [.2, -.5], [.45, -.42], [.58, -.1], [.56, .22], [.4, .46], [.18, .5], [0, .38]],
  citrus: [[0, -.5], [.3, -.46], [.52, -.25], [.56, 0], [.52, .25], [.3, .45], [0, .48]],
  oval: [[0, -.6], [.22, -.52], [.38, -.25], [.42, 0], [.38, .25], [.22, .52], [0, .6]],
  fig: [[0, -.55], [.3, -.5], [.5, -.25], [.5, 0], [.36, .28], [.16, .5], [.07, .62], [0, .64]],
  persimmon: [[0, -.36], [.3, -.4], [.56, -.25], [.64, 0], [.56, .24], [.3, .36], [0, .3]],
  pear: [[0, -.6], [.28, -.58], [.5, -.36], [.5, -.08], [.34, .2], [.24, .42], [.16, .58], [0, .64]],
  plum: [[0, -.52], [.26, -.47], [.45, -.22], [.48, .02], [.42, .28], [.24, .46], [0, .44]],
  gourd: [[0, -.62], [.3, -.58], [.48, -.38], [.46, -.12], [.28, .06], [.3, .26], [.24, .44], [.1, .56], [0, .58]],
};
const TOP = { apple: .4, citrus: .47, oval: .6, fig: .63, persimmon: .3, pear: .63, plum: .44, gourd: .57, cluster: .5 };
const RIDGE = { gourd: [8, .035], persimmon: [4, .045], fig: [10, .018], citrus: [12, .008] };
function tint(g, hex) {
  const c = new THREE.Color(hex), dark = c.clone().multiplyScalar(.55), light = c.clone().lerp(new THREE.Color('#fff4cf'), .45);
  g.computeBoundingBox(); const y0 = g.boundingBox.min.y, y1 = g.boundingBox.max.y, p = g.attributes.position, col = [], t = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const u = (p.getY(i) - y0) / (y1 - y0); t.copy(dark).lerp(c, sstep(u, 0, .5)).lerp(light, sstep(u, .62, 1) * .4); col.push(t.r, t.g, t.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
}
function lathe(kind) {
  const cv = new THREE.CatmullRomCurve3(PROFILE[kind].map(([x, y]) => V3(x, y, 0)), false, 'centripetal');
  const pts = cv.getPoints(44).map(p => new THREE.Vector2(Math.max(p.x, 0), p.y)); pts[0].x = 0; pts[pts.length - 1].x = 0;
  const g = new THREE.LatheGeometry(pts, 40);
  if (RIDGE[kind]) {
    const [n, amp] = RIDGE[kind], p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), m = 1 + amp * Math.cos(n * Math.atan2(z, x)); p.setXYZ(i, x * m, p.getY(i), z * m); }
    g.computeVertexNormals();
  }
  return g;
}
const stemMat = new THREE.MeshStandardMaterial({ color: '#6d5137', roughness: .9 });
const greenMat = new THREE.MeshStandardMaterial({ color: '#4f9a5c', roughness: .6, side: THREE.DoubleSide, emissive: '#1f6a3c', emissiveIntensity: .3 });
const stemGeo = new THREE.CylinderGeometry(.022, .034, .26, 6); stemGeo.translate(0, .13, 0);
const smallLeaf = leafGeo0;
const sepalGeo = new THREE.SphereGeometry(.5, 10, 6); sepalGeo.scale(.5, .07, .26); sepalGeo.translate(.2, 0, 0);
const fruitGeo = {}, fruitMat = {};
const SKIN = {   // speck 斑點、stripe 縱向條紋、frost 果粉
  apple: { speck: .5, scale: 34, col: '#ffe9a8', stripe: .4, n: 6, frost: 0 },
  citrus: { speck: .4, scale: 70, col: '#b8791a', stripe: 0, n: 1, frost: 0 },
  oval: { speck: .12, scale: 40, col: '#e8f2ff', stripe: .1, n: 4, frost: .28 },
  fig: { speck: .35, scale: 36, col: '#f6dde0', stripe: .45, n: 8, frost: .2 },
  persimmon: { speck: .18, scale: 50, col: '#7a3a12', stripe: .15, n: 5, frost: .12 },
  pear: { speck: .6, scale: 48, col: '#6f5a22', stripe: .12, n: 5, frost: 0 },
  cluster: { speck: .08, scale: 40, col: '#ffffff', stripe: 0, n: 1, frost: .34 },
  plum: { speck: .18, scale: 44, col: '#f7eaff', stripe: .1, n: 4, frost: .28 },
  gourd: { speck: .25, scale: 40, col: '#7a6a16', stripe: .32, n: 6, frost: 0 },
};
function fruitMaterial(F, glow) {
  const k = SKIN[F.k], m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: F.k === 'citrus' ? .5 : .3, clearcoat: .75, clearcoatRoughness: .22, emissive: F.c, emissiveIntensity: glow });
  const u = { uSpeck: { value: k.speck }, uScale: { value: k.scale }, uSpeckCol: { value: new THREE.Color(k.col) }, uStripe: { value: k.stripe }, uStripeN: { value: k.n }, uFrost: { value: k.frost } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vOP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOP = position;');
    sh.fragmentShader = 'varying vec3 vOP; uniform float uSpeck, uScale, uStripe, uStripeN, uFrost; uniform vec3 uSpeckCol;\n' + NOISE + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float fN = n3(vOP * 7. + 2.), fM = n3(vOP * 30.);
        diffuseColor.rgb *= .84 + .32 * fN;                                             // 深淺不均的色塊
        float fS = n3(vec3(normalize(vOP.xz + 1e-4) * uStripeN, vOP.y * 1.3 + fN));
        diffuseColor.rgb *= 1. + uStripe * (fS - .5) * 1.4;                              // 條紋
        float fP = smoothstep(.80, .92, n3(vOP * uScale)) * uSpeck;
        diffuseColor.rgb = mix(diffuseColor.rgb, uSpeckCol, fP);                         // 斑點、毛孔
        float fF = uFrost * (.3 + .7 * fN) * smoothstep(-.7, .5, vOP.y * 1.3 + fM * .4);
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(diffuseColor.rgb * 1.5, vec3(.86, .9, 1.), .45), fF);                 // 果粉`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = clamp(roughnessFactor + fF * .9 + fP * .25 + fM * .08, 0., 1.);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float fR = pow(1. - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.2); totalEmissiveRadiance *= (.5 + 1.5 * fR) * (.8 + .4 * fN);');
  };
  return m;
}
function buildFruit(F, mat) {
  const g = new THREE.Group(), k = F.k, top = TOP[k];
  if (k === 'cluster') {
    const sg = fruitGeo.cluster || (fruitGeo.cluster = tint(new THREE.SphereGeometry(.19, 18, 14), F.c));
    const rows = [[.3, 5, .27], [.06, 5, .25], [-.17, 4, .17], [-.38, 2, .07], [.2, 1, 0], [-.54, 1, 0]];
    rows.forEach(([y, n, r], ri) => { for (let i = 0; i < n; i++) { const a = i / n * 6.283 + ri * .7; const m = new THREE.Mesh(sg, mat); m.position.set(Math.cos(a) * r, y, Math.sin(a) * r); m.rotation.y = a; g.add(m); } });
  } else {
    g.add(new THREE.Mesh(fruitGeo[k] || (fruitGeo[k] = tint(lathe(k), F.c)), mat));
  }
  const stem = new THREE.Mesh(stemGeo, stemMat); stem.position.y = top - .04; stem.rotation.z = .12; g.add(stem);
  const leaf = (rotY, tilt, s) => { const l = new THREE.Mesh(smallLeaf, greenMat); l.position.y = top + .06; l.rotation.set(0, rotY, 0); l.rotateZ(tilt); l.scale.setScalar(s); g.add(l); };
  if (k === 'persimmon' || k === 'citrus') for (let i = 0; i < (k === 'persimmon' ? 4 : 5); i++) { const s = new THREE.Mesh(sepalGeo, greenMat); s.position.y = top + (k === 'persimmon' ? .07 : .01); s.rotation.y = i / (k === 'persimmon' ? 4 : 5) * 6.283; s.scale.setScalar(k === 'persimmon' ? 1 : .45); g.add(s); }
  if (k === 'apple' || k === 'pear' || k === 'cluster' || k === 'plum') leaf(.4, -1.05, 1.15);
  if (k === 'oval') { leaf(0, -1.15, 1.2); leaf(Math.PI, -1.0, 1.0); }
  if (k === 'citrus') leaf(1.2, -1.2, 1.1);
  const BOT = { apple: -.46, pear: -.6, citrus: -.5, persimmon: -.38, plum: -.52, gourd: -.62 };
  if (BOT[k] !== undefined) { const e = new THREE.Mesh(dotGeo, stemMat); e.position.y = BOT[k] + .03; e.scale.set(.55, .3, .55); g.add(e); }   // 果臍
  g.userData.top = top + .22;
  return g;
}
const petalGeo = new THREE.SphereGeometry(.5, 14, 8); petalGeo.scale(.38, .05, .25); petalGeo.translate(.24, 0, 0);
const budGeo = new THREE.LatheGeometry([[0, 0], [.1, .03], [.17, .16], [.13, .33], [.04, .45], [0, .47]].map(p => new THREE.Vector2(...p)), 16);
const sepGeo = new THREE.ConeGeometry(.14, .17, 6, 1, true); sepGeo.rotateX(Math.PI); sepGeo.translate(0, .07, 0);
const dotGeo = new THREE.SphereGeometry(.075, 14, 10);
function buildFlower(F) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: F.fl, roughness: .55, emissive: F.fl, emissiveIntensity: .42, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) { const piv = new THREE.Group(); piv.rotation.y = i / 5 * 6.283; const p = new THREE.Mesh(petalGeo, m); p.rotation.z = .42; piv.add(p); g.add(piv); }
  const c = new THREE.Mesh(dotGeo, new THREE.MeshStandardMaterial({ color: '#ffd35c', emissive: '#ffc640', emissiveIntensity: 1.2 })); c.position.y = .06; c.scale.setScalar(1.25); g.add(c);
  return g;
}
function buildBud(F) {
  const col = new THREE.Color(F.fl).lerp(new THREE.Color(F.c), .35), g = new THREE.Group();
  g.add(new THREE.Mesh(budGeo, new THREE.MeshStandardMaterial({ color: col, roughness: .5, emissive: col, emissiveIntensity: .4 })));
  g.add(new THREE.Mesh(sepGeo, greenMat)); return g;
}
function buildSeed(F) {
  const col = new THREE.Color(F.fl).lerp(new THREE.Color('#ffffff'), .3);
  return new THREE.Mesh(dotGeo, new THREE.MeshStandardMaterial({ color: col, emissive: F.fl, emissiveIntensity: 1.1 }));
}
function haloSprite(hex) { return new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_HALO, color: hex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); }

/* ───────── 九條枝條 ───────── */
const HEIGHT_ORDER = [0, 5, 2, 7, 4, 1, 6, 3, 8];      // 相鄰角度的枝條錯開高度
const branches = FRUITS.map((F, i) => {
  const R = rng(100 + i * 17), a = F.angle * Math.PI / 180, dir = V3(Math.cos(a), 0, Math.sin(a)), side = V3(-Math.sin(a), 0, Math.cos(a)), up = V3(0, 1, 0);
  const u = HEIGHT_ORDER[i] / 8, P0 = trunkCurve.getPointAt(.5 + .48 * u), reach = lerp(3.1, 1.5, u), rise = lerp(.8, 2.3, u);
  const pt = (d, h, s = 0) => dir.clone().multiplyScalar(d * reach).addScaledVector(up, h * rise).addScaledVector(side, s);
  const main = new THREE.CatmullRomCurve3([V3(0, 0, 0), pt(.32, .22, (R() - .5) * .3), pt(.72, .68, (R() - .5) * .4), pt(1, 1)]);
  const G = new THREE.Group(); G.position.copy(P0); G.scale.setScalar(.001); treeG.add(G);
  const r0 = lerp(.16, .1, u);
  G.add(new THREE.Mesh(tube(main, t => lerp(r0, .03, Math.pow(t, .8)), 22, 8), barkMat));
  const anchors = [main.getPointAt(1)], centers = [main.getPointAt(1), main.getPointAt(.62), main.getPointAt(.84)];
  [[.5, 1], [.74, -1]].forEach(([t, sgn]) => {
    const s0 = main.getPointAt(t), end = s0.clone().addScaledVector(side, sgn * (.75 + R() * .3)).addScaledVector(dir, .45 + R() * .2).addScaledVector(up, .45 + R() * .35);
    const midp = s0.clone().lerp(end, .5).addScaledVector(up, .12).addScaledVector(side, sgn * .12);
    const cv = new THREE.CatmullRomCurve3([s0, midp, end]);
    G.add(new THREE.Mesh(tube(cv, t2 => lerp(.055, .02, t2), 12, 6), barkMat));
    anchors.push(end); centers.push(end, midp);
  });
  // 葉
  const N = 400, geo = leafGeo0.clone(), seeds = new Float32Array(N), mat = leafMaterial(), leaves = new THREE.InstancedMesh(geo, mat, N), o = new THREE.Object3D(), lc = new THREE.Color();
  for (let j = 0; j < N; j++) {
    const c = centers[Math.floor(R() * centers.length)], rr = Math.cbrt(R()) * .92, th = R() * 6.283, ph = Math.acos(R() * 2 - 1);
    o.position.set(c.x + rr * Math.sin(ph) * Math.cos(th), c.y + rr * Math.cos(ph) * .62 + .2, c.z + rr * Math.sin(ph) * Math.sin(th));
    o.rotation.set((R() - .5) * 2.6, R() * 6.283, (R() - .5) * 2.6); o.scale.setScalar(.7 + R() * .6); o.updateMatrix(); leaves.setMatrixAt(j, o.matrix);
    seeds[j] = R(); leaves.setColorAt(j, lc.setHSL(.31 + R() * .1, .6 + R() * .22, (.1 + R() * .16) * (.5 + .6 * rr / .92)));
  }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1)); leaves.frustumCulled = false; G.add(leaves);
  // 開花時，整條枝條綴滿小花；結果後留下幾朵
  const NB = 34, bgeo = blossomGeo0.clone(), bseeds = new Float32Array(NB), bmat = leafMaterial({ color: F.fl, emissive: F.fl, emissiveIntensity: .38, roughness: .6, side: THREE.DoubleSide }, false);
  const blossoms = new THREE.InstancedMesh(bgeo, bmat, NB);
  for (let j = 0; j < NB; j++) {
    const c = centers[Math.floor(R() * centers.length)], rr = .6 + R() * .4, th = R() * 6.283, ph = Math.acos(R() * 1.6 - .6);
    o.position.set(c.x + rr * Math.sin(ph) * Math.cos(th), c.y + rr * Math.cos(ph) * .62 + .2, c.z + rr * Math.sin(ph) * Math.sin(th));
    o.rotation.set((R() - .5) * 2.2, R() * 6.283, (R() - .5) * 2.2); o.scale.setScalar(.8 + R() * .7); o.updateMatrix(); blossoms.setMatrixAt(j, o.matrix); bseeds[j] = R();
  }
  bgeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(bseeds, 1)); blossoms.frustumCulled = false; G.add(blossoms);
  const light = new THREE.PointLight(F.c, 0, 3.6, 1.5); scene.add(light);
  // 三個位置：枝梢是主要的那一顆，兩個側枝在花苞／開花後才跟上
  const face = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().multiplyScalar(.75).add(V3(0, .66, 0)).normalize());
  const mat3 = fruitMat[F.id] = fruitMaterial(F, GLOW.fruit * .85);
  const slots = anchors.map((p, si) => {
    const an = new THREE.Object3D(); an.position.copy(p); G.add(an);
    const H = new THREE.Group(); scene.add(H);
    const k = si === 0 ? .5 : .4, fruit = buildFruit(F, mat3), flower = buildFlower(F), bud = buildBud(F), seed = buildSeed(F), halo = haloSprite(F.c);
    fruit.userData.k = k; fruit.position.y = -k * fruit.userData.top;
    flower.quaternion.copy(face); flower.userData.k = si === 0 ? .9 : .7; flower.position.y = .05;
    bud.quaternion.copy(face); bud.userData.k = si === 0 ? 1 : .8; seed.userData.k = 1.1;
    const obj = { seed, bud, flower, fruit }, s = {};
    for (const st in obj) { obj[st].scale.setScalar(.001); obj[st].visible = false; H.add(obj[st]); s[st] = D(0); }
    H.add(halo);
    return { an, H, obj, s, halo, glow: D(0), size: D(0), drop: D(0), min: si + 1, stage: 'dormant', timer: 0 };
  });
  return { F, i, G, dir, mat, bmat, light, slots, grow: D(0), leaf: D(0), bloom: D(0), sway: R() * 6.28 };
});

/* ───────── 選果子：九顆果子浮在鏡頭前 ───────── */
const PD = 3.2;
const pickG = new THREE.Group(); camera.add(pickG);
const dim = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: '#040814', transparent: true, opacity: 0, depthWrite: false, fog: false }));
dim.position.z = -(PD + .6); dim.visible = false; camera.add(dim);
const pickLight = new THREE.DirectionalLight('#fff3dc', 0); pickLight.position.set(-2.5, 3.5, 2); camera.add(pickLight);
pickLight.target.position.set(0, 0, -PD); camera.add(pickLight.target);
const picks = FRUITS.map((F, i) => {
  const H = new THREE.Group(), mat = fruitMaterial(F, .3), model = buildFruit(F, mat), halo = haloSprite(F.c);
  model.traverse(o => { o.userData.pick = i; });
  H.add(model); halo.position.z = -.4; halo.scale.setScalar(2.6); H.add(halo); H.visible = false; pickG.add(H);
  return { F, H, model, halo, mat, sc: D(0), px: D(0), py: D(0), sz: D(.2), ph: i * .7 };
});
const pk = { open: false, fade: D(0), sel: -1, hover: -1, lift: D(0), practice: '' };
const labelsEl = $('#labels'), cardEl = $('#card');
const labels = FRUITS.map((F, i) => {
  const b = document.createElement('button'); b.className = 'lab'; b.innerHTML = `<b>${F.zh}</b><span></span>`;
  b.addEventListener('click', () => selectPick(i)); labelsEl.appendChild(b); return b;
});

/* ───────── 夥伴：六種小動物 ───────── */
const ANIMALS = [
  { id: 'rabbit', zh: '小兔', c: '#e4dccd', c2: '#f3eee4' },
  { id: 'lamb', zh: '小羊', c: '#fbf5ea', c2: '#f4d5c0' },
  { id: 'bear', zh: '小熊', c: '#a9744b', c2: '#ecd3ad' },
  { id: 'fox', zh: '小狐狸', c: '#e9853c', c2: '#fff3df' },
  { id: 'deer', zh: '小鹿', c: '#c99560', c2: '#f7e7cd' },
  { id: 'cat', zh: '小貓', c: '#9ba5b8', c2: '#e3e6ee' },
];
const A_SPH = new THREE.SphereGeometry(1, 22, 16), A_CONE = new THREE.ConeGeometry(1, 1, 14), A_CYL = new THREE.CylinderGeometry(1, 1, 1, 8);
const A_DARK = new THREE.MeshStandardMaterial({ color: '#2a2030', roughness: .35 }), A_WHITE = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: .6 });
const A_PINK = new THREE.MeshStandardMaterial({ color: '#f7a9b8', roughness: .8, emissive: '#f7a9b8', emissiveIntensity: .15 });
/* 小羊：圓滾滾的羊毛身體、桃色小臉、大眼睛、捲捲瀏海、垂耳、小蹄子、粉紅緞帶與鈴鐺 */
const LAMB = {
  wool: new THREE.MeshStandardMaterial({ color: '#fbf5ea', roughness: 1, emissive: '#fff1dc', emissiveIntensity: .14 }),
  face: new THREE.MeshStandardMaterial({ color: '#f4d5c0', roughness: .7, emissive: '#f4d5c0', emissiveIntensity: .08 }),
  hoof: new THREE.MeshStandardMaterial({ color: '#6b5242', roughness: .55 }),
  ribbon: new THREE.MeshStandardMaterial({ color: '#ff8fb0', roughness: .45, emissive: '#ff8fb0', emissiveIntensity: .22 }),
  bell: new THREE.MeshStandardMaterial({ color: '#f5cf5a', roughness: .22, metalness: .75, emissive: '#c9952a', emissiveIntensity: .3 }),
};
const fib = (n, i) => { const y = 1 - (i + .5) / n * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996; return [Math.cos(a) * r, y, Math.sin(a) * r]; };
function buildLamb() {
  const L = LAMB, P = (parent, geo, m, sc, pos, rot) => { const o = new THREE.Mesh(geo, m); o.scale.set(...(sc.length ? sc : [sc, sc, sc])); o.position.set(...pos); if (rot) o.rotation.set(...rot); parent.add(o); return o; };
  const G = (parent, pos) => { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); return g; };
  const root = new THREE.Group(), torso = G(root, [0, .38, 0]), head = G(torso, [0, .4, .04]);
  // 身體：一團雲
  P(torso, A_SPH, L.wool, [.25, .26, .23], [0, 0, 0]);
  for (let i = 0; i < 38; i++) { const [x, y, z] = fib(38, i); if (y < -.8) continue; P(torso, A_SPH, L.wool, .08 + ((i * 37) % 11) / 300, [x * .25, y * .25 + .01, z * .22]); }
  // 粉紅緞帶、蝴蝶結與小鈴鐺
  const collar = P(torso, new THREE.TorusGeometry(1, .17, 10, 32), L.ribbon, [.17, .17, .17], [0, .3, .05], [Math.PI / 2 + .2, 0, 0]);
  [-1, 1].forEach(sx => P(torso, A_SPH, L.ribbon, [.06, .04, .026], [sx * .055, .3, .235], [0, 0, sx * .45]));
  P(torso, A_SPH, L.ribbon, .025, [0, .297, .245]);
  P(torso, A_SPH, L.bell, .04, [0, .245, .25]); P(torso, A_SPH, A_DARK, [.013, .007, .007], [0, .225, .286]);
  // 頭：羊毛帽 + 桃色小臉
  P(head, A_SPH, L.wool, [.2, .19, .19], [0, .03, -.04]);
  for (let i = 0; i < 18; i++) { const [x, y, z] = fib(18, i); if (z > .25 && y < .45) continue; P(head, A_SPH, L.wool, .075 + (i % 3) * .01, [x * .2, y * .19 + .04, z * .18 - .05]); }
  P(head, A_SPH, L.face, [.19, .175, .16], [0, -.03, .07]);
  for (let k = -2; k <= 2; k++) P(head, A_SPH, L.wool, .072 - Math.abs(k) * .007, [k * .062, .13 - k * k * .012, .15 - Math.abs(k) * .018]);   // 捲捲瀏海
  // 大眼睛（各兩個亮點）、腮紅、小鼻子
  const eyes = [-1, 1].map(sx => {
    const e = P(head, A_SPH, A_DARK, [.038, .048, .02], [sx * .082, -.01, .208]); e.userData.sy = .048;
    P(head, A_SPH, A_WHITE, .015, [sx * .082 - .012, .008, .225]); P(head, A_SPH, A_WHITE, .007, [sx * .082 + .011, -.024, .225]); return e; });
  [-1, 1].forEach(sx => P(head, A_SPH, A_PINK, [.04, .024, .01], [sx * .128, -.07, .19], [0, sx * .55, 0]));
  P(head, A_SPH, A_PINK, [.028, .019, .014], [0, -.068, .222]);
  P(head, new THREE.TorusGeometry(1, .28, 6, 16, Math.PI), A_DARK, [.016, .016, .016], [-.015, -.095, .214], [0, 0, Math.PI]);
  P(head, new THREE.TorusGeometry(1, .28, 6, 16, Math.PI), A_DARK, [.016, .016, .016], [.015, -.095, .214], [0, 0, Math.PI]);
  // 垂下來的耳朵
  const ears = [-1, 1].map(sx => { const e = G(head, [sx * .17, .03, .01]); e.rotation.z = -sx * 1.25; e.rotation.y = sx * .25;
    P(e, A_SPH, L.face, [.05, .1, .032], [0, .085, 0]); P(e, A_SPH, A_PINK, [.03, .068, .014], [0, .085, .022]); return e; });
  // 手、腳、尾巴
  const arm = sx => { const g = G(torso, [sx * .25, .11, .03]); P(g, A_SPH, L.wool, [.072, .095, .072], [0, -.06, 0]); P(g, A_SPH, L.hoof, [.048, .04, .048], [0, -.15, 0]); return g; };
  const leg = sx => { const g = G(root, [sx * .11, .16, 0]); P(g, A_CYL, L.face, [.045, .11, .045], [0, -.05, .01]); P(g, A_SPH, L.hoof, [.058, .045, .068], [0, -.12, .025]); return g; };
  const armL = arm(-1), armR = arm(1), legL = leg(-1), legR = leg(1), tail = G(torso, [0, -.04, -.24]);
  P(tail, A_SPH, L.wool, .068, [0, 0, -.02]); P(tail, A_SPH, L.wool, .045, [.035, .04, -.035]); P(tail, A_SPH, L.wool, .045, [-.035, .035, -.03]);
  return { root, torso, head, armL, armR, legL, legR, tail, ears, eyes, torsoY: .38, seed: Math.random() * 10 };
}
function buildAnimal(type) {
  if (type === 'lamb') return buildLamb();
  const A = ANIMALS.find(a => a.id === type);
  const mat = new THREE.MeshStandardMaterial({ color: A.c, roughness: .88, emissive: A.c, emissiveIntensity: .05 });
  const mat2 = new THREE.MeshStandardMaterial({ color: A.c2, roughness: .88, emissive: A.c2, emissiveIntensity: .05 });
  const P = (parent, geo, m, sc, pos, rot) => { const o = new THREE.Mesh(geo, m); o.scale.set(...(sc.length ? sc : [sc, sc, sc])); o.position.set(...pos); if (rot) o.rotation.set(...rot); parent.add(o); return o; };
  const G = (parent, pos) => { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); return g; };
  const root = new THREE.Group(), torso = G(root, [0, .4, 0]), head = G(torso, [0, .44, .02]);
  const faceMat = type === 'lamb' ? mat2 : mat;
  // 身體
  if (type === 'lamb') {
    P(torso, A_SPH, mat2, [.2, .24, .19], [0, 0, 0]);
    const R = rng(31); for (let i = 0; i < 22; i++) { const th = R() * 6.283, ph = Math.acos(R() * 1.7 - .85); P(torso, A_SPH, mat, .1 + R() * .04, [.24 * Math.sin(ph) * Math.cos(th), .26 * Math.cos(ph) + .01, .21 * Math.sin(ph) * Math.sin(th)]); }
    for (let i = 0; i < 5; i++) P(head, A_SPH, mat, .09, [Math.cos(i * 1.256) * .1, .2 + (i % 2) * .02, Math.sin(i * 1.256) * .09 - .02]);
  } else {
    P(torso, A_SPH, mat, [.27, .3, .24], [0, 0, 0]); P(torso, A_SPH, mat2, [.19, .21, .1], [0, -.03, .165]);
  }
  P(head, A_SPH, faceMat, [.27, .25, .25], [0, 0, 0]);
  // 臉
  const eyes = [-1, 1].map(sx => { const e = P(head, A_SPH, A_DARK, [.033, .04, .02], [sx * .105, .02, .228]); e.userData.sy = .04; P(head, A_SPH, A_WHITE, .011, [sx * .096, .036, .246]); return e; });
  [-1, 1].forEach(sx => P(head, A_SPH, A_PINK, [.045, .03, .012], [sx * .165, -.05, .195], [0, sx * .5, 0]));
  const muzz = { rabbit: [.085, .06, .05], lamb: [.09, .07, .06], bear: [.11, .085, .08], fox: [.09, .065, .13], deer: [.09, .07, .1], cat: [.085, .055, .05] }[type];
  P(head, A_SPH, type === 'lamb' ? mat2 : mat2, muzz, [0, -.055, .2 + muzz[2] * .35]);
  P(head, A_SPH, type === 'rabbit' || type === 'cat' ? A_PINK : A_DARK, [.028, .02, .018], [0, -.03, .2 + muzz[2] * 1.25]);
  // 耳朵（各自的樞紐，方便擺動）
  const ears = [];
  [-1, 1].forEach(sx => {
    let e;
    if (type === 'rabbit') { e = G(head, [sx * .09, .2, 0]); e.rotation.z = -sx * .14; P(e, A_SPH, mat, [.055, .2, .04], [0, .18, 0]); P(e, A_SPH, A_PINK, [.03, .15, .02], [0, .18, .026]); }
    else if (type === 'lamb') { e = G(head, [sx * .25, .06, 0]); e.rotation.z = -sx * .45; P(e, A_SPH, mat2, [.1, .04, .055], [sx * .06, 0, 0]); }
    else if (type === 'bear') { e = G(head, [sx * .185, .19, 0]); P(e, A_SPH, mat, [.085, .085, .05], [0, 0, 0]); P(e, A_SPH, mat2, [.05, .05, .03], [0, 0, .03]); }
    else if (type === 'fox') { e = G(head, [sx * .15, .2, 0]); e.rotation.z = -sx * .22; P(e, A_CONE, mat, [.085, .2, .055], [0, .08, 0]); P(e, A_CONE, A_DARK, [.045, .12, .03], [0, .08, .025]); }
    else if (type === 'deer') { e = G(head, [sx * .2, .15, 0]); e.rotation.z = -sx * 1.0; P(e, A_SPH, mat, [.05, .12, .03], [0, .1, 0]); P(e, A_SPH, A_PINK, [.028, .08, .015], [0, .1, .02]);
      const an = G(head, [sx * .085, .23, -.02]); an.rotation.z = -sx * .25; P(an, A_CYL, mat2, [.014, .17, .014], [0, .085, 0]); P(an, A_CYL, mat2, [.012, .08, .012], [sx * .03, .12, 0], [0, 0, -sx * .9]); P(an, A_CYL, mat2, [.011, .06, .011], [-sx * .02, .07, .02], [.7, 0, sx * .5]); }
    else { e = G(head, [sx * .15, .2, 0]); e.rotation.z = -sx * .3; P(e, A_CONE, mat, [.085, .14, .05], [0, .05, 0]); P(e, A_CONE, A_PINK, [.045, .08, .025], [0, .045, .025]); }
    ears.push(e);
  });
  if (type === 'deer') { const R = rng(5); for (let i = 0; i < 7; i++) { const a = 2.2 + R() * 1.9; P(torso, A_SPH, mat2, [.028, .028, .012], [Math.cos(a) * .2 * (R() < .5 ? 1 : -1) * .6, .05 + R() * .16, -.2 - R() * .03], [0, 0, 0]); } }
  // 手、腳、尾巴
  const arm = sx => { const g = G(torso, [sx * .25, .14, .02]); P(g, A_SPH, mat, [.065, .14, .065], [0, -.12, 0]); return g; };
  const leg = sx => { const g = G(root, [sx * .12, .17, 0]); P(g, A_SPH, type === 'fox' || type === 'deer' ? new THREE.MeshStandardMaterial({ color: '#4a3226', roughness: .9 }) : mat, [.09, .1, .13], [0, -.09, .03]); return g; };
  const armL = arm(-1), armR = arm(1), legL = leg(-1), legR = leg(1), tail = G(torso, [0, -.12, -.22]);
  if (type === 'fox') { P(tail, A_SPH, mat, [.11, .11, .22], [0, .08, -.14], [-.6, 0, 0]); P(tail, A_SPH, mat2, [.08, .08, .1], [0, .2, -.27], [-.6, 0, 0]); }
  else if (type === 'cat') { const cv = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0, .05, -.14), V3(.03, .2, -.2), V3(.08, .36, -.15)]); tail.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 14, .034, 8), mat)); P(tail, A_SPH, mat, .036, [.08, .36, -.15]); }
  else P(tail, A_SPH, type === 'deer' || type === 'rabbit' ? mat2 : mat, type === 'rabbit' ? .075 : .055, [0, 0, -.03]);
  return { root, torso, head, armL, armR, legL, legR, tail, ears, eyes, torsoY: .4, seed: Math.random() * 10 };
}
function poseAnimal(m, p, t) {
  const sw = Math.sin(p.phase) * p.walk;
  m.torso.position.y = m.torsoY + Math.sin(t * 2.1 + m.seed) * .008 - p.crouch * .13 + Math.abs(Math.cos(p.phase)) * .03 * p.walk;
  m.torso.rotation.x = p.crouch * .55 + p.pour * .12;
  m.head.rotation.x = -p.look * .55 + p.crouch * .15; m.head.rotation.z = Math.sin(t * .8 + m.seed) * .05 * (1 - p.walk);
  m.legL.rotation.x = sw * .8; m.legR.rotation.x = -sw * .8;
  m.armL.rotation.x = -sw * .7 - p.arms * 1.2 - p.crouch * .4; m.armR.rotation.x = sw * .7 - p.arms * 1.2 - p.crouch * .4 - p.pour * 1.3;
  m.armL.rotation.z = -.28 + p.arms * .3; m.armR.rotation.z = .28 - p.arms * .3;
  if (p.wave) { m.armR.rotation.x = 0; m.armR.rotation.z = 2.3 + Math.sin(t * 9) * .35; }
  m.ears.forEach((e, i) => { e.rotation.x = Math.sin(t * 2.3 + i * 1.7 + m.seed) * .05 - Math.abs(sw) * .12 - p.look * .2; });
  m.tail.rotation.y = Math.sin(t * 3.2 + m.seed) * .28;
  const bl = ((t + m.seed) % 3.7) < .12 ? .12 : 1; m.eyes.forEach(e => { e.scale.y = e.userData.sy * bl; });
}

/* 角色選擇：六隻小動物站在鏡頭前 */
const cp = { open: false, fade: D(0), sel: -1, hover: -1 };
const cpicks = ANIMALS.map((A, i) => { const m = buildAnimal(A.id); m.root.traverse(o => { o.userData.cpick = i; }); m.root.visible = false; pickG.add(m.root); return { A, m, sc: D(0) }; });
const clabels = ANIMALS.map((A, i) => { const b = document.createElement('button'); b.className = 'lab'; b.innerHTML = `<b>${A.zh}</b>`; b.addEventListener('click', () => selectChar(i)); $('#clabels').appendChild(b); return b; });
function openChar() {
  if (actor.busy || pk.open) return;
  cp.open = true; cp.sel = actor.type ? ANIMALS.findIndex(a => a.id === actor.type) : -1; cp.fade.t = 1; controls.enabled = false; controls.autoRotate = false;
  $('#cpicker').classList.add('open'); $('#cpicker').setAttribute('aria-hidden', 'false'); $('#hud').classList.add('hide');
  $('#btnCClose').style.display = actor.type ? '' : 'none'; $('#btnCGo').classList.toggle('show', cp.sel >= 0);
  clabels.forEach((b, j) => { b.classList.toggle('sel', j === cp.sel); b.classList.toggle('dim', cp.sel >= 0 && j !== cp.sel); });
}
function closeChar() {
  cp.open = false; cp.fade.t = 0; cp.hover = -1; controls.enabled = true; controls.autoRotate = !REDUCED; canvas.style.cursor = '';
  $('#cpicker').classList.remove('open'); $('#cpicker').setAttribute('aria-hidden', 'true'); $('#hud').classList.remove('hide');
}
function selectChar(i) {
  if (!cp.open) return; cp.sel = i; $('#btnCGo').classList.add('show');
  clabels.forEach((b, j) => { b.classList.toggle('sel', j === i); b.classList.toggle('dim', j !== i); });
}
function confirmChar() {
  if (cp.sel < 0) return; const A = ANIMALS[cp.sel]; setActor(A.id); closeChar(); caption(`${A.zh}來了。之後由牠陪你照顧這棵樹。`);
}

/* 住在樹下的那一隻 */
const HOME_TH = 1.15, TAU = Math.PI * 2;
const angDiff = d => { d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI; return d; };
const polar = (r, th, dy = 0) => V3(Math.cos(th) * r, hillY(r) + dy, Math.sin(th) * r);
const actor = { type: null, m: null, r: 2, th: HOME_TH, h: 0, busy: false, seq: null, face: null, phase: 0, hop: 0, plant: 0, soil: V3(0, 0, 0),
  pose: { walk: D(0), crouch: D(0), arms: D(0), pour: D(0), look: D(0) }, zoom: D(0) };
const homeOf = () => [1.5 + 1.5 * T.S.v, HOME_TH];
const ACTOR_SCALE = .82;
// 澆水壺與水
const can = new THREE.Group();
{
  const cm = new THREE.MeshStandardMaterial({ color: '#7ecdc4', roughness: .4, metalness: .3, emissive: '#2f8f88', emissiveIntensity: .3 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(.065, .075, .12, 14), cm); b.position.y = -.02; can.add(b);
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(.012, .022, .17, 8), cm); sp.position.set(0, -.13, -.03); sp.rotation.x = .25; can.add(sp);
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(.03, .014, .03, 10), cm); rose.position.set(0, -.215, -.052); rose.rotation.x = .25; can.add(rose);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(.055, .012, 6, 14, Math.PI), cm); hd.position.set(0, .0, .07); hd.rotation.set(0, Math.PI / 2, -Math.PI / 2); can.add(hd);
  can.position.set(0, -.27, .02); can.visible = false;
}
const NW = 44, waterPos = new Float32Array(NW * 3), waterGeo = new THREE.BufferGeometry(); waterGeo.setAttribute('position', new THREE.BufferAttribute(waterPos, 3));
const water = new THREE.Points(waterGeo, new THREE.PointsMaterial({ map: TEX_HALO, color: new THREE.Color(.9, 1.5, 2.), size: .09, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
water.frustumCulled = false; scene.add(water);
const handOrb = haloSprite('#ffffff'); handOrb.visible = false; handOrb.scale.setScalar(.75); scene.add(handOrb);
function setActor(type) {
  if (actor.m) { actor.m.armR.remove(can); scene.remove(actor.m.root); }
  actor.type = type; actor.m = buildAnimal(type); actor.m.root.scale.setScalar(ACTOR_SCALE); actor.m.armR.add(can); scene.add(actor.m.root);
  [actor.r, actor.th] = homeOf(); const p = polar(actor.r, actor.th); actor.h = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
  if (!NOSAVE) try { localStorage.setItem('tol_char', type); } catch (e) {}
}
function handPos() { const p = polar(actor.r, actor.th); return p.add(V3(Math.sin(actor.h) * .3, .5, Math.cos(actor.h) * .3).multiplyScalar(ACTOR_SCALE)); }
/* 選完果子之後：接住那道光 → 走到樹下 → 蹲下種進土裡 → 澆水 → 光沿著樹往上 → 抬頭看 → 走回去 */
function tend(F, b, ang, from, grow) {
  const A = actor, rp = () => .8 + .95 * T.S.v, soilAt = () => polar(Math.max(rp() - .45, .15), ang, .05), steps = [];
  if (F) steps.push({ dur: 2.0, enter() { A.pose.arms.t = 1; orb.material.color.set(F.c); orb.visible = true; const to = handPos();
    fly = { t: 0, from, to, mid: from.clone().lerp(to, .5).add(V3(0, 1.2, 0)), done() { orb.visible = false; handOrb.material.color.set(F.c); handOrb.material.opacity = .95; handOrb.visible = true; } }; } });
  steps.push({ enter() { A.zoom.t = 1; }, walkTo: () => [rp(), ang] });
  if (F) steps.push({ dur: 2.0, enter() { A.face = 'center'; A.soil.copy(soilAt()); }, update(u) { A.pose.crouch.t = u < .8 ? 1 : 0; A.plant = sstep(u, .2, .75); if (u > .8) A.pose.arms.t = 0; }, exit() { handOrb.visible = false; A.plant = 0; } });
  steps.push({ dur: 3.4, enter() { A.face = 'center'; A.fired = false; A.soil.copy(soilAt()); }, update(u) {
    A.pose.pour.t = u < .86 ? 1 : 0;
    if (u > .45 && !A.fired) {
      A.fired = true; A.zoom.t = 0;
      if (F) { const to = b.grow.v > .2 && T.S.v > .2 ? b.slots[0].an.getWorldPosition(V3(0, 0, 0)) : V3(0, .35, 0);
        orb.material.color.set(F.c); orb.visible = true; fly = { t: 0, from: A.soil.clone(), to, mid: V3(0, to.y * .75, 0), done: grow }; }
      else grow();
    } } });
  steps.push({ dur: 2.8, update(u) { A.pose.look.t = u < .9 ? 1 : 0; A.hop = u > .25 && u < .6 ? Math.abs(Math.sin((u - .25) / .35 * TAU)) * .09 : 0; }, exit() { A.hop = 0; A.face = null; } });
  steps.push({ walkTo: homeOf });
  A.seq = { steps, i: 0, t: 0, started: false }; A.busy = true; $('#hud').classList.add('busy');
}
function updateActor(dt, t) {
  const A = actor, zoom = sd(A.zoom, dt, 1.0); if (!A.m) return zoom;
  let moving = false, faceT = null;
  const walk = (r2, th2) => {
    const sp = 1.45 * dt, dth = angDiff(th2 - A.th), ath = clamp(dth, -sp / Math.max(A.r, .7), sp / Math.max(A.r, .7)), dr = clamp(r2 - A.r, -sp * .7, sp * .7);
    const p0 = polar(A.r, A.th); A.th += ath; A.r += dr; const p1 = polar(A.r, A.th), dx = p1.x - p0.x, dz = p1.z - p0.z;
    if (Math.hypot(dx, dz) > 1e-5) faceT = Math.atan2(dx, dz);
    return Math.abs(angDiff(th2 - A.th)) < .003 && Math.abs(r2 - A.r) < .003;
  };
  const q = A.seq;
  if (q) {
    const st = q.steps[q.i]; if (!q.started) { q.started = true; q.t = 0; st.enter && st.enter(); }
    q.t += dt; let done;
    if (st.walkTo) { const [r2, th2] = st.walkTo(); done = walk(r2, th2); moving = !done; }
    else { st.update && st.update(Math.min(q.t / st.dur, 1)); done = q.t >= st.dur; }
    if (done) { st.exit && st.exit(); q.i++; q.started = false; if (q.i >= q.steps.length) { A.seq = null; A.busy = false; A.face = null; $('#hud').classList.remove('busy'); } }
  } else { const [r2, th2] = homeOf(); if (Math.abs(r2 - A.r) > .04) moving = !walk(r2, th2); }
  const pos = polar(A.r, A.th), P = A.pose;
  if (faceT === null) faceT = A.face === 'center' ? Math.atan2(-pos.x, -pos.z) : Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z);
  A.h += angDiff(faceT - A.h) * (1 - Math.exp(-dt * 7));
  P.walk.t = moving ? 1 : 0; if (moving) A.phase += dt * 11;
  const pour = sd(P.pour, dt, .35);
  A.m.root.position.copy(pos); A.m.root.position.y += A.hop; A.m.root.rotation.y = A.h;
  poseAnimal(A.m, { walk: sd(P.walk, dt, .18), crouch: sd(P.crouch, dt, .3), arms: sd(P.arms, dt, .3), pour, look: sd(P.look, dt, .4), phase: A.phase }, t);
  can.visible = pour > .03; can.scale.setScalar(Math.max(sstep(pour, 0, .5), .001));
  // 手上的光，蹲下時送進土裡
  if (handOrb.visible) { handOrb.position.copy(handPos()).lerp(A.soil, A.plant); handOrb.material.opacity = .95 * (1 - sstep(A.plant, .75, 1) * .8); }
  // 水
  const wOn = sstep(pour, .75, 1); water.material.opacity = wOn * .9;
  if (wOn > .01) {
    A.m.root.updateMatrixWorld(true); const s0 = can.localToWorld(V3(0, -.235, -.055)), e = A.soil;
    for (let i = 0; i < NW; i++) { const u = (t * 1.5 + i / NW + (i * .37) % 1 * .1) % 1, j = i * 12.9898;
      waterPos[i * 3] = lerp(s0.x, e.x, u) + Math.sin(j) * .05 * u; waterPos[i * 3 + 1] = lerp(s0.y, e.y, u * u) + .04 * Math.sin(u * Math.PI); waterPos[i * 3 + 2] = lerp(s0.z, e.z, u) + Math.cos(j * 1.7) * .05 * u; }
    waterGeo.attributes.position.needsUpdate = true;
  }
  return zoom;
}

/* ───────── 狀態：全部交給 Growth Engine 算 ───────── */
let refls = [], states = {}, deleted = {}, counters = null, cursor = '', simDay = 0, vis = null;
const DEMO = /[?&]demo\b/.test(location.search);   // ?demo：示範模式，可以快轉時間，不存檔、不同步
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const SCALE_BY_TRUNK = [0, .4, .5, .6, .7, .8, .9, 1];
const DEMO_ORDER = ['love', 'peace', 'joy', 'patience', 'kindness', 'gentleness', 'faithfulness', 'goodness', 'self-control'];
const T = { S: D(0), seed: D(0), crown: D(0), camY: D(.8), camD: D(8), shift: D(0) };

const byDate = (a, b) => a.local_date < b.local_date ? -1 : a.local_date > b.local_date ? 1 : 0;
const fillStates = () => IDS.forEach(id => { if (!states[id]) states[id] = { state: 'dormant', state_changed_on: null }; });
function reset() {
  refls = []; states = {}; deleted = {}; cursor = DEMO ? Engine.addDays(todayStr(), -1) : todayStr(); simDay = 0;
  const r = Engine.recompute(states, refls, cursor, RULES, IDS); states = r.states; counters = r.counters; refresh();
}
/* 新增或更新某一天的紀錄（一天一筆；同一天再寫就是修改） */
function addRecord(date, focus, practice, d) {
  const last = refls.filter(r => r.local_date < date).pop();
  const rec = d ? { local_date: date, event_text: d.event.trim(), inner_reactions: d.feelings.slice(), inner_other: d.other.trim(), direction: d.direction, re_response: d.re.trim(),
      focus_fruit_id: focus || null, practice_text: focus ? practice : '', prev_practice_checkin: d.checkinFor ? d.checkin : null, checkin_for_date: d.checkinFor && d.checkin ? d.checkinFor : null }
    : { local_date: date, event_text: '（示範紀錄）', inner_reactions: ['平靜'], direction: 'unsure', focus_fruit_id: focus || null,
      practice_text: focus ? (practice || '練習停一下再回應') : '', prev_practice_checkin: last && last.focus_fruit_id ? 'done' : null, checkin_for_date: last ? last.local_date : null, demo: true };
  rec.updated_at = new Date().toISOString();
  const k = refls.findIndex(r => r.local_date === date);
  if (k >= 0) refls[k] = rec; else { refls.push(rec); refls.sort(byDate); }
  delete deleted[date];
  const r = Engine.recompute(states, refls, date, RULES, IDS); states = r.states; counters = r.counters; cursor = date;
}
/* ── 讀回的資料一律先驗證（雲端硬碟的 JSON 可能被手動改過或損毀；本機資料也一樣） ── */
const okDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
const str = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
const pick = (v, list) => list.includes(v) ? v : null;
const isDemoRec = r => !!r && typeof r === 'object' && (r.demo === true || r.event_text === '（示範紀錄）');
let removedDemo = 0;
function cleanRecord(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r) || !okDate(r.local_date) || isDemoRec(r)) return null;
  const focus = pick(r.focus_fruit_id, IDS), t = typeof r.updated_at === 'string' ? Date.parse(r.updated_at) : NaN;
  return {
    local_date: r.local_date,
    event_text: str(r.event_text, 2000),
    inner_reactions: Array.isArray(r.inner_reactions) ? r.inner_reactions.filter(x => typeof x === 'string').slice(0, 30).map(x => x.slice(0, 40)) : [],
    inner_other: str(r.inner_other, 200),
    direction: pick(r.direction, ['life', 'knowledge', 'mixed', 'unsure']),
    re_response: str(r.re_response, 2000),
    focus_fruit_id: focus,
    practice_text: focus ? str(r.practice_text, 300) : '',
    prev_practice_checkin: pick(r.prev_practice_checkin, ['done', 'partly', 'not_yet']),
    checkin_for_date: okDate(r.checkin_for_date) ? r.checkin_for_date : null,
    updated_at: Number.isFinite(t) ? new Date(t).toISOString() : r.local_date + 'T12:00:00.000Z',
  };
}
function cleanRefls(list) {
  if (!Array.isArray(list)) return [];
  const m = new Map(); for (const r of list.slice(0, 20000)) { const c = cleanRecord(r); if (c) m.set(c.local_date, c); }
  return [...m.values()].sort(byDate);
}
function cleanDeleted(o) {
  const out = {}; if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
  for (const k of Object.keys(o)) { const v = Number(o[k]); if (okDate(k) && Number.isFinite(v) && v > 0) out[k] = v; }
  return out;
}
function cleanStates(o) {
  const out = {}; IDS.forEach(id => { const x = o && typeof o === 'object' ? o[id] : null;
    out[id] = x && STATES.includes(x.state) ? { state: x.state, state_changed_on: okDate(x.state_changed_on) ? x.state_changed_on : null } : { state: 'dormant', state_changed_on: null }; });
  return out;
}
const SAVE_KEY = 'tol3d_v1', NOSAVE = DEMO || /[?&]nosave\b/.test(location.search);   // ?nosave：不讀也不寫，測試用
function save() { if (NOSAVE) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 2, refls, states, deleted, cursor, simDay })); } catch (e) {} }
function load() {
  if (NOSAVE) return false;
  try { const o = JSON.parse(localStorage.getItem(SAVE_KEY)); if (!o || !Array.isArray(o.refls) || !o.cursor) return false;
    removedDemo = (Array.isArray(o.refls) ? o.refls : []).filter(isDemoRec).length; refls = cleanRefls(o.refls); states = cleanStates(o.states); deleted = cleanDeleted(o.deleted); cursor = todayStr(); simDay = Number(o.simDay) || 0;   // 舊版紀錄沒有時間的，cleanRecord 會補上
    counters = Engine.computeCounters(refls, RULES, IDS); refresh(); return true; } catch (e) { return false; }
}
/* 上一次想實踐、還沒回報過的那一筆（skip：正在寫的那一天，不算在內） */
function pendingCheckin(skip) {
  const rs = refls.filter(r => !skip || r.local_date < skip);
  const done = new Set(rs.map(r => r.checkin_for_date).filter(Boolean));
  for (let i = rs.length - 1; i >= 0; i--) { const r = rs[i]; if (r.focus_fruit_id && r.practice_text) return done.has(r.local_date) ? null : r; }
  return null;
}
function advance(days) {
  if (!DEMO && !NOSAVE) return;   // 示範資料只能出現在示範模式，絕不寫進真正的紀錄
  for (let d = 0; d < days; d++) {
    const date = Engine.addDays(cursor, 1); simDay++;
    if ([0, 2, 4, 5].includes(simDay % 7)) {
      const pool = Math.min(9, 2 + Math.floor(simDay / 14));
      addRecord(date, DEMO_ORDER[refls.length % pool], '示範的實踐計畫');
    } else cursor = date;
  }
  refresh();
}
/* 把一份「樹的視覺狀態」畫到場景上（今天的，或歷史上的某一天） */
function applyVis(v) {
  T.S.t = SCALE_BY_TRUNK[v.trunk]; T.seed.t = v.seed_glow ? 1 : 0;
  roots.forEach((r, k) => { r.g.t = k < v.roots ? 1 : 0; });
  let glowSum = 0;
  branches.forEach(b => {
    const f = v.fruits[b.F.id], rk = Engine.rank(f.state);
    b.grow.t = rk >= 1 ? [.62, .76, .9, 1][rk - 1] : (v.skeleton ? .3 : 0);
    b.leaf.t = rk >= 1 ? .3 + .7 * f.leaves / RULES.leaves_max : 0; b.bloom.t = rk === 3 ? 1 : rk === 4 ? .22 : 0;
    glowSum += rk >= 1 ? GLOW[f.state] : 0;
    b.slots.forEach((s, si) => {
      const st = rk >= s.min ? f.state : 'dormant';
      clearTimeout(s.timer); s.timer = setTimeout(() => { s.stage = st; }, si * 900);
    });
  });
  T.crown.t = glowSum / (9 * GLOW.fruit);
  visShown = v;
}
let visShown = null;
function refresh() {
  if (!DEMO) cursor = todayStr();
  vis = Engine.treeVisual(counters, states, refls, cursor, RULES, IDS);
  if (!hist.open || hist.sel < 0) applyVis(vis);
  // 圖例
  $('#legend').innerHTML = FRUITS.map(F => { const st = states[F.id].state; return `<li class="${st !== 'dormant' ? 'on' : ''}" style="--c:${F.c}"><i></i><b>${F.zh}</b><span>${st === 'dormant' ? '' : STAGE_ZH[st]}</span></li>`; }).join('');
  labels.forEach((b, i) => { const st = states[FRUITS[i].id].state; b.lastChild.textContent = st === 'dormant' ? '還沒選過' : `樹上：${STAGE_ZH[st]}`; });
  $('#btnReflect').textContent = !DEMO && refls.some(r => r.local_date === cursor) ? '修改今天的省思' : '今天的省思';
  save();
}

/* ───────── 文字提示 ───────── */
const capEl = $('#caption'); let capTimer = 0;
function caption(text, ms = 7000) { clearTimeout(capTimer); capEl.textContent = text; capEl.classList.add('show'); if (ms) capTimer = setTimeout(() => capEl.classList.remove('show'), ms); }
const STAGE_LINE = { seed: F => `「${F.zh}」的枝條上，落下了一顆種子`, bud: F => `「${F.zh}」冒出了花苞`, flower: F => `「${F.zh}」開花了`, fruit: F => `「${F.zh}」結出了果實` };

/* ───────── 省思步驟：一次只問一件事 ───────── */
let draft = null;
const flow = { open: false, i: 0, steps: [] };
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FLOW = {
  checkin: { title: d => `上次你想試試「${d.checkinText}」，後來如何？`, sub: '可以不回答。答「還沒有」也完全沒關係。',
    body: d => `<div class="fopts">${[['done', '做到了'], ['partly', '做了一部分'], ['not_yet', '還沒有']].map(([v, l]) => `<button data-v="${v}" aria-pressed="${d.checkin === v}">${l}</button>`).join('')}</div>`,
    bind(d, el) { el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { d.checkin = d.checkin === b.dataset.v ? null : b.dataset.v; renderFlow(); })); } },
  event: { title: () => '今天發生了什麼事？', sub: d => d.editing ? '今天已經寫過了。這次寫的會更新今天的紀錄。' : '一件讓你有感覺的小事就好。',
    body: d => `<textarea id="fEvent" rows="4" maxlength="600" placeholder="例如：開會時被打斷，我整個下午都悶悶的。" aria-label="今天發生的事">${esc(d.event)}</textarea>`,
    bind(d, el) { const t = el.querySelector('textarea'); t.addEventListener('input', () => { d.event = t.value; $('#fNext').disabled = !t.value.trim(); }); },
    ok: d => !!d.event.trim() },
  feelings: { title: () => '那個當下，你心裡有什麼？', sub: '可以選好幾個。不舒服的感受不是退步，只是被看見了。',
    body: d => `<div class="fchips">${FEELINGS.map(f => `<button aria-pressed="${d.feelings.includes(f)}">${f}</button>`).join('')}</div><input type="text" id="fOther" style="margin-top:10px" maxlength="40" placeholder="其他（自己寫）" aria-label="其他感受" value="${esc(d.other)}">`,
    bind(d, el) { el.querySelectorAll('.fchips button').forEach(b => b.addEventListener('click', () => { const f = b.textContent, k = d.feelings.indexOf(f); k >= 0 ? d.feelings.splice(k, 1) : d.feelings.push(f); b.setAttribute('aria-pressed', k < 0); }));
      const o = el.querySelector('#fOther'); o.addEventListener('input', () => { d.other = o.value; }); } },
  direction: { title: () => '回頭看，那時的反應比較靠近哪一邊？', sub: '誠實就好。這一題沒有對錯，也不會影響樹的生長。',
    body: d => `<div class="fopts">${[['life', '生命樹', '從被愛、被接納出發'], ['knowledge', '分別善惡樹', '靠自己判斷對錯、證明自己'], ['mixed', '兩者都有', ''], ['unsure', '不確定', '']].map(([v, l, n]) => `<button data-v="${v}" aria-pressed="${d.direction === v}">${l}${n ? `<small>${n}</small>` : ''}</button>`).join('')}</div>`,
    bind(d, el) { el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { d.direction = d.direction === b.dataset.v ? null : b.dataset.v; renderFlow(); })); } },
  re: { title: () => '如果再來一次，你想怎麼回應？', sub: '可以不寫。',
    body: d => `<textarea id="fRe" rows="3" maxlength="600" placeholder="不用完美，一句話也可以。" aria-label="重新回應">${esc(d.re)}</textarea>`,
    bind(d, el) { const t = el.querySelector('textarea'); t.addEventListener('input', () => { d.re = t.value; }); } },
};
function renderFlow() {
  const id = flow.steps[flow.i], S = FLOW[id], last = flow.i === flow.steps.length - 1;
  $('#fDots').innerHTML = [...flow.steps, 'fruit'].map((_, k) => `<i class="${k <= flow.i ? 'on' : ''}"></i>`).join('');
  $('#fTitle').textContent = S.title(draft); $('#fSub').textContent = typeof S.sub === 'function' ? S.sub(draft) : S.sub;
  $('.fnote').textContent = Cloud.connected() ? '寫下的內容存在這台裝置，也會同步到你的 Google 雲端硬碟。' : '寫下的內容只存在這台裝置的瀏覽器裡。'; $('#fBody').innerHTML = S.body(draft); S.bind(draft, $('#fBody'));
  $('#fBack').style.visibility = flow.i ? 'visible' : 'hidden'; $('#fNext').textContent = last ? '選今天的果子' : '下一步'; $('#fNext').disabled = S.ok ? !S.ok(draft) : false;
}
function openFlow() {
  if (actor.busy || cp.open || pk.open || hist.open) return; if (!actor.type) return openChar();
  if (!draft) {
    const day = DEMO ? Engine.addDays(cursor, 1) : todayStr(), ex = refls.find(r => r.local_date === day);
    const ck = ex && ex.checkin_for_date ? refls.find(r => r.local_date === ex.checkin_for_date) : pendingCheckin(day);
    draft = { editing: !!ex, checkin: ex ? ex.prev_practice_checkin || null : null, checkinFor: ck ? ck.local_date : null, checkinText: ck ? ck.practice_text : '',
      event: ex ? ex.event_text || '' : '', feelings: ex ? [...(ex.inner_reactions || [])] : [], other: ex ? ex.inner_other || '' : '', direction: ex ? ex.direction || null : null, re: ex ? ex.re_response || '' : '' };
  }
  flow.steps = (draft.checkinFor ? ['checkin'] : []).concat(['event', 'feelings', 'direction', 're']); flow.i = Math.min(flow.i, flow.steps.length - 1); flow.open = true;
  renderFlow(); $('#flow').classList.add('open'); $('#flow').setAttribute('aria-hidden', 'false'); $('#hud').classList.add('hide'); controls.autoRotate = false;
  const f = $('#fBody').querySelector('textarea'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 500);
}
function closeFlow(keepHud) {
  flow.open = false; $('#flow').classList.remove('open'); $('#flow').setAttribute('aria-hidden', 'true'); if (!keepHud) { $('#hud').classList.remove('hide'); controls.autoRotate = !REDUCED; }
}
$('#fNext').addEventListener('click', () => {
  if ($('#fNext').disabled) return;
  if (flow.i < flow.steps.length - 1) { flow.i++; renderFlow(); const f = $('#fBody').querySelector('textarea'); if (f) f.focus({ preventScroll: true }); }
  else { closeFlow(true); openPicker(); }
});
$('#fBack').addEventListener('click', () => { if (flow.i > 0) { flow.i--; renderFlow(); } });
$('#fClose').addEventListener('click', () => { closeFlow(); if (draft && draft.event.trim()) caption('寫到一半的內容先替你留著。', 5000); });

/* ───────── 選擇流程 ───────── */
function openPicker() {
  if (actor.busy || cp.open) return; if (!actor.type) return openChar();
  pk.open = true; pk.sel = -1; pk.fade.t = 1; controls.enabled = false; controls.autoRotate = false;
  $('#picker').classList.add('open'); $('#picker').setAttribute('aria-hidden', 'false'); $('#hud').classList.add('hide'); $('#card').classList.remove('show'); $('#btnSkip').style.opacity = 1;
  labels.forEach(b => b.classList.remove('sel', 'dim')); $('#picker').classList.remove('has-sel');
  // 柔和的提示：依剛才選的感受對照表（不經過 AI）、以及上次選的那一種；都不預先選取
  const hints = draft ? Engine.hintsFor(draft.feelings, HINTS) : [], lastF = [...refls].reverse().find(r => r.focus_fruit_id);
  labels.forEach((b, i) => { const id = FRUITS[i].id; b.style.setProperty('--c', FRUITS[i].c); b.classList.toggle('hint', hints.includes(id)); b.classList.toggle('last', !!lastF && lastF.focus_fruit_id === id); });
  const shown = draft ? draft.feelings.filter(f => (HINTS[f] || []).length).slice(0, 2) : [];
  $('#pkSub').textContent = hints.length ? `你剛才寫下的感受是「${shown.join('、')}」，或許可以看看 ${hints.map(id => FRUITS.find(f => f.id === id).zh).join('、')}` : '只選一種就好。轉一轉、看一看，再決定。';
}
function closePicker() {
  pk.open = false; pk.fade.t = 0; pk.hover = -1; controls.enabled = true; controls.autoRotate = !REDUCED; canvas.style.cursor = '';
  $('#picker').classList.remove('open'); $('#picker').setAttribute('aria-hidden', 'true'); $('#hud').classList.remove('hide'); $('#card').classList.remove('show');
}
function selectPick(i) {
  if (!pk.open) return; pk.sel = i; const F = FRUITS[i];
  labels.forEach((b, j) => { b.classList.toggle('sel', j === i); b.classList.toggle('dim', j !== i); });
  $('#card').style.setProperty('--c', F.c); $('#cName').textContent = F.zh; $('#cEn').textContent = F.en; $('#cDesc').textContent = F.desc;
  { const st = states[F.id].state; $('#cTree').textContent = st === 'dormant' ? `這會是你樹上的第一顆「${F.zh}」種子` : `在你的樹上：${STAGE_ZH[st]}　·　${F.refs[0]}`; $('#cOwn').value = ''; }
  $('#cQ').textContent = F.q[Math.floor(Math.random() * F.q.length)];
  pk.practice = F.p[0];
  $('#cChips').innerHTML = F.p.map((p, j) => `<button aria-pressed="${j === 0}">${p}</button>`).join('');
  [...$('#cChips').children].forEach(c => c.addEventListener('click', () => { pk.practice = c.textContent; [...$('#cChips').children].forEach(x => x.setAttribute('aria-pressed', x === c)); }));
  $('#card').classList.add('show'); $('#picker').classList.add('has-sel'); $('#btnSkip').style.opacity = 0;
}
function deselectPick() { pk.sel = -1; $('#card').classList.remove('show'); $('#picker').classList.remove('has-sel'); labels.forEach(b => b.classList.remove('sel', 'dim')); $('#btnSkip').style.opacity = 1; }
$('#btnBackPick').addEventListener('click', deselectPick);
const orb = haloSprite('#ffffff'); orb.visible = false; scene.add(orb);
let fly = null, camTurn = null;
function confirmPick(focusIdx) {
  if (actor.busy) return;
  const date = DEMO ? Engine.addDays(cursor, 1) : todayStr(); if (DEMO) simDay += 1;
  const F = focusIdx >= 0 ? FRUITS[focusIdx] : null, b = F ? branches[focusIdx] : null, before = F ? states[F.id].state : null;
  const from = F ? picks[focusIdx].H.getWorldPosition(V3(0, 0, 0)) : null, practice = $('#cOwn').value.trim() || pk.practice, d = draft;
  draft = null; flow.i = 0;
  closePicker();
  const grow = () => {
    addRecord(date, F ? F.id : null, F ? practice : '', d); refresh(); Cloud.queue();
    if (vis.returning) ringT = 0;   // 隔了一段時間再回來：根部一圈水光
    if (!F) return caption('沒有選也沒關係，今天的省思一樣讓根長得更深。');
    const after = states[F.id].state;
    caption(after !== before && STAGE_LINE[after] ? STAGE_LINE[after](F) : `今天，把心放在「${F.zh}」`);
  };
  // 鏡頭慢慢轉到看得見那條枝條、也看得見夥伴的角度
  const off = camera.position.clone().sub(controls.target), a0 = Math.atan2(off.z, off.x), ang = F ? F.angle * Math.PI / 180 : a0 - .6;
  controls.autoRotate = false; camTurn = { t: 0, a0, da: angDiff(ang + 1.2 - a0) };
  if (!actor.m) { grow(); return; }
  caption(F ? `${ANIMALS.find(a => a.id === actor.type).zh}接住了「${F.zh}」的光` : `${ANIMALS.find(a => a.id === actor.type).zh}提著水壺走向樹下`, 6000);
  tend(F, b, ang, from, grow);
}

$('#btnReflect').addEventListener('click', () => { Cloud.warm(); openFlow(); });
$('#btnClose').addEventListener('click', () => { closePicker(); if (draft) openFlow(); });   // 關掉選果子 → 回到上一題，內容都還在
$('#btnSkip').addEventListener('click', () => { Cloud.warm(); confirmPick(-1); });
$('#btnGo').addEventListener('click', () => { if (pk.sel >= 0) { Cloud.warm(); confirmPick(pk.sel); } });
document.querySelectorAll('[data-adv]').forEach(b => b.addEventListener('click', () => { if (actor.busy) return; const n = +b.dataset.adv; advance(n); caption(n === 7 ? '一週過去了' : '一個月過去了', 5000); }));
$('#btnRest').addEventListener('click', () => { if (actor.busy) return; cursor = Engine.addDays(cursor, 14); simDay += 14; save(); caption('兩週沒有來。樹還在，什麼都沒有少。'); });
$('#btnChar').addEventListener('click', openChar);
$('#btnCClose').addEventListener('click', closeChar);
$('#btnCGo').addEventListener('click', confirmChar);
$('#btnReset').addEventListener('click', () => { if (actor.busy) return; draft = null; flow.i = 0; reset(); caption('樹還沒有種下。從今天的省思開始。', 0); });
addEventListener('keydown', e => { if (e.key !== 'Escape') return; if ($('#cloud').classList.contains('open')) closeCloud(); else if (hist.open) closeHist(); else if (pk.open) $('#btnClose').click(); else if (cp.open && actor.type) closeChar(); else if (flow.open) $('#fClose').click(); });

const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let downAt = null;
function pickAt(e) {
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(picks.map(p => p.model), true)[0]; return hit ? hit.object.userData.pick : -1;
}
canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
function cpickAt(e) {
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(cpicks.map(p => p.m.root), true)[0]; return hit ? hit.object.userData.cpick : -1;
}
canvas.addEventListener('pointermove', e => {
  if (pk.open) { pk.hover = pickAt(e); canvas.style.cursor = pk.hover >= 0 ? 'pointer' : ''; }
  else if (cp.open) { cp.hover = cpickAt(e); canvas.style.cursor = cp.hover >= 0 ? 'pointer' : ''; }
});
canvas.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return;
  if (pk.open) { const i = pickAt(e); if (i >= 0) selectPick(i); }
  else if (cp.open) { const i = cpickAt(e); if (i >= 0) selectChar(i); }
});

/* ───────── 畫面尺寸 ───────── */
let sizeKey = '';
function resize() {
  const w = Math.max(innerWidth, 1), h = Math.max(innerHeight, 1), pr = Math.min(devicePixelRatio || 1, 2); sizeKey = innerWidth + 'x' + innerHeight + '@' + devicePixelRatio;
  renderer.setPixelRatio(pr); starMat.uniforms.pr.value = pr; renderer.setSize(w, h, false); composer.setSize(w, h); composer.setPixelRatio(renderer.getPixelRatio());
  camera.aspect = w / h; camera.setViewOffset(w, h, 0, h * .06, w, h); camera.updateProjectionMatrix(); fireMat.uniforms.sc.value = h / 900 * renderer.getPixelRatio();
}
addEventListener('resize', resize); resize();

/* ───────── 每一幀 ───────── */
const clock = new THREE.Clock(), tmp = V3(0, 0, 0), STG = ['seed', 'bud', 'flower', 'fruit'];
const HALO_SIZE = { dormant: 0, seed: .9, bud: 1.2, flower: 1.7, fruit: 2.1 };
let now = 0;
function tick(dt, draw = true) {
  now += dt; const t = now;
  if (sizeKey !== innerWidth + 'x' + innerHeight + '@' + devicePixelRatio) resize();   // 也涵蓋載入時尺寸為 0、或換螢幕的情況
  if (innerWidth < 2 || innerHeight < 2) draw = false;
  starMat.uniforms.t.value = t; fireMat.uniforms.t.value = t; sky.material.uniforms.t.value = t; grassU.uTime.value = t; stepMeteor(dt);

  // 整棵樹
  const S = sd(T.S, dt, 2.2), Sv = Math.max(S, .001);
  treeG.scale.setScalar(Sv); rootG.scale.setScalar(.45 + .55 * S);
  roots.forEach(r => r.m.scale.setScalar(Math.max(sd(r.g, dt, 1.8), .001)));
  shadow.scale.setScalar(.6 + 3.6 * S); shadow.material.opacity = .9 * sstep(S, 0, .3);
  const sg = sd(T.seed, dt, 1.6);
  baseHalo.material.opacity = sg * (.55 - .3 * S) * (.9 + .1 * Math.sin(t * 1.3)); baseLight.intensity = sg * (5 + 2 * S);
  crownLight.position.set(0, 3.9 * Sv, 0); crownLight.intensity = sd(T.crown, dt, 2) * 4 * S;

  tuftMat.userData.u.uTime.value = t; tuftMat.userData.u.uGrow.value = sg;
  const fs = .5 + .5 * S;
  for (const b of branches) {
    const g = Math.max(sd(b.grow, dt, 2.0), .001); b.G.scale.setScalar(g);
    b.G.rotation.z = Math.sin(t * .55 + b.sway) * .012; b.G.rotation.x = Math.cos(t * .43 + b.sway) * .012;
    b.mat.userData.u.uTime.value = t; b.mat.userData.u.uGrow.value = sd(b.leaf, dt, 2.4);
    b.bmat.userData.u.uTime.value = t; b.bmat.userData.u.uGrow.value = sd(b.bloom, dt, 2.6);
    b.light.position.copy(b.slots[0].H.position); b.light.position.y -= .25 * fs; b.light.intensity = b.slots[0].glow.v * 4.5 * fs;
    const focus = vis && vis.focus === b.F.id ? RULES.visual.focus_boost * (1 + .12 * Math.sin(t * 1.7)) : 1;
    for (const s of b.slots) {
      s.an.getWorldPosition(s.H.position); s.H.scale.setScalar(fs);
      for (const st of STG) {
        const o = s.obj[st], v = sd(s.s[st], dt, 1.5); s.s[st].t = s.stage === st ? 1 : 0;
        o.visible = v > .01; if (o.visible) o.scale.setScalar(v * o.userData.k);
      }
      s.obj.fruit.rotation.z = Math.sin(t * .9 + b.sway) * .05;
      s.glow.t = s.stage === 'dormant' ? 0 : GLOW[s.stage]; s.size.t = HALO_SIZE[s.stage]; s.drop.t = s.stage === 'fruit' ? 1 : 0;
      s.halo.material.opacity = Math.min(sd(s.glow, dt, 1.6) * .6 * focus, 1);
      s.halo.scale.setScalar(Math.max(sd(s.size, dt, 1.6), .001) * (s.min === 1 ? 1 : .8));
      s.halo.position.y = lerp(.12, -.42, sd(s.drop, dt, 1.6));
    }
  }

  // 回來時，根部的水光
  if (ringT >= 0) { ringT += dt / 5; const e = 1 - Math.pow(1 - Math.min(ringT, 1), 3); waterRing.scale.setScalar(.4 + 4.4 * e); waterRing.material.opacity = .55 * Math.sin(Math.min(ringT, 1) * Math.PI); if (ringT >= 1) { ringT = -1; waterRing.material.opacity = 0; } }

  // 飛向樹的那道光
  if (fly) {
    fly.t += dt / 1.9; const u = Math.min(fly.t, 1), e = u * u * (3 - 2 * u), a = 1 - e;
    orb.position.set(0, 0, 0).addScaledVector(fly.from, a * a).addScaledVector(fly.mid, 2 * a * e).addScaledVector(fly.to, e * e);
    orb.scale.setScalar(lerp(1.6, .7, e)); orb.material.opacity = Math.min(u * 6, 1) * (1 - sstep(u, .85, 1) * .6);
    if (u >= 1) { const f = fly; fly = null; f.done(); orb.userData.fade = 1; }
  } else if (orb.visible) { orb.userData.fade -= dt / 1.2; orb.material.opacity = Math.max(orb.userData.fade, 0) * .4; orb.scale.multiplyScalar(1 + dt * .8); if (orb.userData.fade <= 0) orb.visible = false; }

  // 鏡頭
  const portrait = Math.max(1, .82 / camera.aspect);
  const zoom = updateActor(dt, t);   // 夥伴在樹下忙的時候，鏡頭靠近一點、低一點
  const shv = sd(T.shift, dt, .6), wide = innerWidth > 720;
  T.camY.t = lerp(.5 + 2.5 * T.S.t, .5 + .9 * T.S.t, zoom); T.camD.t = (6.5 + 7.2 * T.S.t) * portrait * lerp(1, .58, zoom) * lerp(1, wide ? 1.06 : 1.5, shv);
  { const ox = wide ? Math.min(400, innerWidth) * .5 * shv : 0, oy = innerHeight * (.06 + (wide ? 0 : .27 * shv));
    if (camera.view && (Math.abs(camera.view.offsetX - ox) > .3 || Math.abs(camera.view.offsetY - oy) > .3)) { camera.setViewOffset(Math.max(innerWidth, 1), Math.max(innerHeight, 1), ox, oy, Math.max(innerWidth, 1), Math.max(innerHeight, 1)); camera.updateProjectionMatrix(); } }
  controls.target.y = sd(T.camY, dt, 1.6); const wantD = sd(T.camD, dt, 1.6);
  const off = tmp.copy(camera.position).sub(controls.target);
  if (camTurn) {
    camTurn.t += dt / 3.2; const u = Math.min(camTurn.t, 1), e = u * u * (3 - 2 * u), ang = camTurn.a0 + camTurn.da * e, r = Math.hypot(off.x, off.z);
    off.x = Math.cos(ang) * r; off.z = Math.sin(ang) * r;
    if (u >= 1) { camTurn = null; setTimeout(() => { if (!pk.open) controls.autoRotate = !REDUCED; }, 6000); }
  }
  off.setLength(lerp(off.length(), wantD, 1 - Math.exp(-dt * 1.4)));
  camera.position.copy(controls.target).add(off);
  controls.minDistance = wantD * .6; controls.maxDistance = wantD * 1.5;
  controls.update();

  // 選果子的那一層
  const pf = sd(pk.fade, dt, .5);
  const cf = sd(cp.fade, dt, .5), pm = Math.max(pf, cf);
  const showPick = pf > .004; dim.visible = pm > .004; dim.material.opacity = pm * .96; pickLight.intensity = Math.max(pf * 2.6, cf * 1.5);
  if (cf > .004) {
    const H = 2 * PD * Math.tan(camera.fov * Math.PI / 360), W = H * camera.aspect, usable = H * .6, cc = camera.aspect < .75 ? 2 : 3, cr = 6 / cc, cell = Math.min(W * .9 / cc, usable / cr), cy = H * .5 - H * .19 - usable / 2;
    cpicks.forEach((p, i) => {
      const row = Math.floor(i / cc), col = i % cc, x = (col - (cc - 1) / 2) * cell, y = cy + ((cr - 1) / 2 - row) * cell, on = cp.sel === i;
      p.sc.t = cf * (on ? 1.15 : cp.sel >= 0 ? .85 : cp.hover === i ? 1.08 : 1);
      const r = p.m.root; r.visible = true; r.scale.setScalar(Math.max(sd(p.sc, dt, .35), .001) * cell * .52);
      r.position.set(x, y - cell * .22 + (on ? Math.abs(Math.sin(t * 5)) * cell * .03 : 0), -PD); r.rotation.set(.08, Math.sin(t * .7 + i * 1.3) * (on ? .2 : .4), 0);
      poseAnimal(p.m, { walk: 0, crouch: 0, arms: 0, pour: 0, look: 0, phase: 0, wave: on }, t);
      tmp.set(x, y - cell * .27, -PD); camera.localToWorld(tmp).project(camera);
      clabels[i].style.transform = `translate(calc(${((tmp.x + 1) / 2 * innerWidth).toFixed(1)}px - 50%), ${((1 - tmp.y) / 2 * innerHeight).toFixed(1)}px)`;
    });
  } else cpicks.forEach(p => { p.m.root.visible = false; });
  if (showPick) {
    const H = 2 * PD * Math.tan(camera.fov * Math.PI / 360), W = H * camera.aspect;
    const lift = sd(pk.lift, dt, .6); pk.lift.t = pk.sel >= 0 ? 1 : 0;
    const cols = camera.aspect > 1.25 ? 5 : 3, rowsN = Math.ceil(9 / cols);
    const topM = .15, botM = lerp(.12, cardEl.offsetHeight / innerHeight + .05, lift), usable = H * (1 - topM - botM);
    const cell = Math.min(W * .9 / cols, usable / rowsN), cy = H * (.5 - topM) - usable / 2;
    picks.forEach((p, i) => {
      const row = Math.floor(i / cols), inRow = Math.min(cols, 9 - row * cols), col = i - row * cols;
      const x = (col - (inRow - 1) / 2) * cell, y = cy + ((rowsN - 1) / 2 - row) * cell + cell * .16;
      // 選定後：只留下那一顆，放大停在卡片上方；其他的退場
      const on = pk.sel === i; p.px.t = on ? 0 : x; p.py.t = on ? cy : y; p.sz.t = on ? clamp(usable * .6, H * .05, H * .17) : cell * .43;
      if (!p.H.visible) { p.px.v = p.px.t; p.py.v = p.py.t; p.sz.v = p.sz.t; }
      p.H.visible = true; p.H.position.set(sd(p.px, dt, .4), sd(p.py, dt, .4) + Math.sin(t * 1.1 + p.ph) * cell * .025, -PD);
      p.sc.t = pf * (on ? 1 : pk.sel >= 0 ? 0 : pk.hover === i ? 1.1 : 1);
      p.H.scale.setScalar(Math.max(sd(p.sc, dt, .35), .001) * sd(p.sz, dt, .4));
      p.model.rotation.y = REDUCED ? .5 : t * (pk.sel === i ? .9 : .45) + p.ph; p.model.rotation.z = Math.sin(t * .8 + p.ph) * .06;
      p.halo.material.opacity = pf * (pk.sel === i ? .5 : pk.sel >= 0 ? .08 : pk.hover === i ? .36 : .2);
      p.mat.emissiveIntensity = pk.sel === i ? .5 : pk.sel >= 0 ? .12 : .3;
      tmp.set(x, y - cell * .3, -PD); camera.localToWorld(tmp).project(camera);
      labels[i].style.transform = `translate(calc(${((tmp.x + 1) / 2 * innerWidth).toFixed(1)}px - 50%), ${((1 - tmp.y) / 2 * innerHeight).toFixed(1)}px)`;
    });
  } else picks.forEach(p => { p.H.visible = false; });

  if (draw) composer.render();
}
function frame() { tick(Math.min(clock.getDelta(), .05)); requestAnimationFrame(frame); }

/* ───────── 歷史軌跡：每一天的紀錄，與那一天的樹 ───────── */
const WK = '日一二三四五六', DIR_ZH = { life: '生命樹', knowledge: '分別善惡樹', mixed: '兩者都有', unsure: '不確定' }, CK_ZH = { done: '做到了', partly: '做了一部分', not_yet: '還沒有' };
const fruitOf = id => FRUITS.find(f => f.id === id);
/* 依日期重播全部紀錄：得到每一天結束時的果子狀態與整棵樹的樣子 */
function replay(rs) {
  const list = [...rs].sort(byDate), out = []; let st = {};
  list.forEach((r, i) => {
    const upto = list.slice(0, i + 1), x = Engine.recompute(st, upto, r.local_date, RULES, IDS), prev = st; st = x.states;
    const changed = IDS.filter(id => (prev[id] ? prev[id].state : 'dormant') !== st[id].state && st[id].state !== 'dormant');
    out.push({ date: r.local_date, rec: r, states: st, changed, vis: Engine.treeVisual(x.counters, st, upto, r.local_date, RULES, IDS) });
  });
  return out;
}
const hist = { open: false, snaps: [], sel: -1, confirm: false, play: 0 };
function openHist() {
  if (actor.busy || pk.open || cp.open || flow.open) return;
  hist.snaps = replay(refls); hist.open = true; hist.sel = -1; hist.confirm = false; renderHist();
  $('#hist header p').textContent = DEMO ? '這是示範資料，不會被儲存。點一天，樹會回到那一天的樣子。' : '點一天，樹會回到那一天的樣子。';
  $('#hist').classList.add('open'); $('#hist').setAttribute('aria-hidden', 'false'); $('#hud').classList.add('hide');
  controls.autoRotate = false; T.shift.t = 1; setTimeout(() => $('#hClose').focus({ preventScroll: true }), 300);
}
function closeHist() {
  stopPlay(); hist.open = false; hist.sel = -1;
  $('#hist').classList.remove('open'); $('#hist').setAttribute('aria-hidden', 'true'); $('#hud').classList.remove('hide');
  T.shift.t = 0; controls.autoRotate = !REDUCED; applyVis(vis);
}
function showDay(i, scroll) {
  hist.sel = i; hist.confirm = false; applyVis(i >= 0 ? hist.snaps[i].vis : vis); renderHist();
  if (scroll && i >= 0) { const el = $('#hList').querySelector(`[data-i="${i}"]`); if (el) el.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' }); }
}
function stopPlay() { clearTimeout(hist.play); hist.play = 0; $('#hPlay').textContent = '從第一天播放'; }
function playHist() {
  if (hist.play) return stopPlay();
  const end = hist.snaps.length - 1; let i = 0;
  const step = () => { showDay(i, true); if (i >= end) { stopPlay(); return; } i++; hist.play = setTimeout(step, 1800); };
  hist.play = 1; $('#hPlay').textContent = '停止'; step();
}
function dayDetail(s, i) {
  const r = s.rec, F = r.focus_fruit_id && fruitOf(r.focus_fruit_id), feel = [...(r.inner_reactions || []), ...(r.inner_other ? [r.inner_other] : [])];
  const blk = (k, v) => `<div><span class="k">${k}</span>${v}</div>`, on = IDS.filter(id => s.states[id].state !== 'dormant');
  let h = '<div class="hdet">';
  if (r.prev_practice_checkin) { const src = refls.find(x => x.local_date === r.checkin_for_date); h += blk('上次的實踐', `<p>${src && src.practice_text ? `「${esc(src.practice_text)}」　` : ''}${CK_ZH[r.prev_practice_checkin] || ''}</p>`); }
  h += blk('今天發生的事', `<p>${esc(r.event_text || '')}</p>`);
  if (feel.length) h += blk('當下的感受', `<div class="htags">${feel.map(f => `<span>${esc(f)}</span>`).join('')}</div>`);
  if (r.direction) h += blk('那時比較靠近', `<p>${DIR_ZH[r.direction] || ''}</p>`);
  if (r.re_response) h += blk('如果再來一次', `<p>${esc(r.re_response)}</p>`);
  h += blk('今天的果子', `<p>${F ? F.zh + (r.practice_text ? `　·　明天想試試：${esc(r.practice_text)}` : '') : '沒有選果子'}</p>`);
  h += blk('那一天的樹', on.length ? `<div class="hstages">${on.map(id => { const f = fruitOf(id); return `<span style="--c:${f.c}"><i></i>${f.zh} ${STAGE_ZH[s.states[id].state]}</span>`; }).join('')}</div>` : '<p>果子還沒有長出來，樹正在往下長根。</p>');
  if (!hist.confirm) h += `<button class="hdel" data-del>刪除這一天的紀錄</button>`;
  else {
    const drops = Engine.previewDelete(states, refls, s.date, RULES, IDS);
    const msg = drops.length ? `刪除後，${drops.map(x => `「${fruitOf(x.id).zh}」會回到${x.to === 'dormant' ? '還沒選過的樣子' : STAGE_ZH[x.to]}`).join('，')}。` : '刪除這一天不會讓任何果子退回。';
    h += `<div class="hconfirm" role="alert"><span>${msg}刪除後無法復原${Cloud.connected() ? '，雲端硬碟裡的紀錄也會一起更新' : ''}。</span><div><button class="danger" data-delok>確定刪除</button><button data-delno>取消</button></div></div>`;
  }
  return h + '</div>';
}
function renderHist() {
  const L = $('#hList'), S = hist.snaps;
  if (!S.length) { L.innerHTML = '<div class="hempty">還沒有紀錄。<br>寫下第一次省思之後，這裡會留下每一天，<br>也能看見樹在那一天的樣子。</div>'; $('#hPlay').disabled = true; $('#hFrom').textContent = ''; return; }
  $('#hPlay').disabled = S.length < 2;
  { const [y, m, d] = S[0].date.split('-'); $('#hFrom').textContent = `從 ${+y} 年 ${+m} 月 ${+d} 日開始`; }
  let h = '', month = '';
  for (let i = S.length - 1; i >= 0; i--) {
    const s = S[i], r = s.rec, [y, m, d] = s.date.split('-'), F = r.focus_fruit_id && fruitOf(r.focus_fruit_id), wd = WK[new Date(+y, m - 1, +d).getDay()];
    if (y + m !== month) { month = y + m; h += `<div class="hmonth">${+y} 年 ${+m} 月</div>`; }
    const ch = s.changed.map(id => `${fruitOf(id).zh}${STAGE_ZH[s.states[id].state]}`).join('、');
    h += `<button class="hday" data-i="${i}" aria-expanded="${i === hist.sel}"><span class="hdate"><b>${+d}</b><span>週${wd}</span></span>
      <span class="hmain"><span class="hfruit" style="--c:${F ? F.c : 'transparent'}">${F ? `<i></i>${F.zh}` : '沒有選果子'}${ch ? `<em>· ${ch}</em>` : ''}</span><span class="hev">${esc(r.event_text || '')}</span></span></button>`;
    if (i === hist.sel) h += dayDetail(s, i);
  }
  L.innerHTML = h;
  L.querySelectorAll('.hday').forEach(b => b.addEventListener('click', () => { stopPlay(); const i = +b.dataset.i; showDay(hist.sel === i ? -1 : i); }));
  const q = sel => L.querySelector(sel);
  if (q('[data-del]')) q('[data-del]').addEventListener('click', () => { hist.confirm = true; renderHist(); });
  if (q('[data-delno]')) q('[data-delno]').addEventListener('click', () => { hist.confirm = false; renderHist(); });
  if (q('[data-delok]')) q('[data-delok]').addEventListener('click', () => deleteDay(hist.snaps[hist.sel].date));
}
function deleteDay(date) {
  refls = refls.filter(r => r.local_date !== date); deleted[date] = Date.now();
  const r = Engine.recompute(states, refls, todayStr(), RULES, IDS); states = r.states; counters = r.counters;
  hist.snaps = replay(refls); hist.sel = -1; hist.confirm = false; refresh(); applyVis(vis); renderHist(); Cloud.queue();
  caption('那一天的紀錄已經刪除。', 5000);
}
/* 從其他裝置合併回來之後，依日期重算果子狀態 */
function rebuild() {
  const sn = replay(refls); states = sn.length ? { ...sn[sn.length - 1].states } : {}; fillStates();
  const r = Engine.recompute(states, refls, todayStr(), RULES, IDS); states = r.states; counters = r.counters;
  refresh(); if (hist.open) { hist.snaps = replay(refls); hist.sel = -1; renderHist(); applyVis(vis); }
}
$('#btnHist').addEventListener('click', openHist);
$('#hClose').addEventListener('click', closeHist);
$('#hPlay').addEventListener('click', playHist);

/* ───────── Google 雲端硬碟：只用 drive.file 權限，只碰這個網站自己建立的檔案 ───────── */
const Cloud = (() => {
  let CID = (window.TOL_CONFIG && window.TOL_CONFIG.googleClientId) || '';
  const SCOPE = 'https://www.googleapis.com/auth/drive.file', KEY = 'tol_cloud', API = 'https://www.googleapis.com';
  let st = {}; if (!NOSAVE) try { st = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  let token = null, exp = 0, tc = null, gis = null, busy = false, again = false, timer = 0, status = st.connected ? 'reauth' : 'off', lastErr = '', onTok = null, onErr = null;
  const persist = () => { if (!NOSAVE) try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const enabled = () => !!CID && !DEMO, valid = () => !!token && Date.now() < exp - 60e3;
  /* LINE / FB / IG 等 App 內建瀏覽器：沒有 Google 登入狀態也沒有密碼金鑰，驗證容易卡住，有些甚至直接被 Google 擋下 */
  const ua = navigator.userAgent, isLine = /Line\//i.test(ua), inApp = isLine || /FBAN|FBAV|Instagram|MicroMessenger|; wv\)/i.test(ua);
  const extUrl = () => { try { const u = new URL(location.href); if (isLine) u.searchParams.set('openExternalBrowser', '1'); return u.href; } catch (e) { return location.href; } };
  function loadGis() {
    if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
    if (!gis) gis = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
      sc.onload = res; sc.onerror = () => { gis = null; rej(new Error('無法載入 Google 登入元件，請確認網路連線。')); }; document.head.appendChild(sc); });
    return gis;
  }
  function auth(prompt) {
    return loadGis().then(() => new Promise((res, rej) => {
      if (!tc) tc = google.accounts.oauth2.initTokenClient({ client_id: CID, scope: SCOPE, callback: r => onTok && onTok(r), error_callback: e => onErr && onErr(e) });
      onTok = r => { if (r.error) return rej(new Error(r.error === 'access_denied' ? '沒有取得授權。' : (r.error_description || r.error)));
        if (google.accounts.oauth2.hasGrantedAllScopes && !google.accounts.oauth2.hasGrantedAllScopes(r, SCOPE)) return rej(new Error('需要勾選「查看、編輯、建立及刪除這個應用程式所使用的檔案」才能同步。'));
        token = r.access_token; exp = Date.now() + (+r.expires_in || 3600) * 1000; res(); };
      onErr = e => rej(new Error(e && e.type === 'popup_closed' ? '登入視窗被關閉了。' : '無法開啟 Google 登入視窗，可能被瀏覽器擋下了。'));
      /* 帶上次登入的 email，Google 就不必再問「選擇帳戶」，也比較不容易觸發額外驗證 */
      const hint = st.user && st.user.email;
      tc.requestAccessToken(hint ? { prompt, hint } : { prompt });
    }));
  }
  async function api(path, o = {}) {
    const r = await fetch(API + path, { ...o, headers: { Authorization: 'Bearer ' + token, ...(o.headers || {}) } });
    if (r.status === 401) { token = null; throw Object.assign(new Error('Google 授權已過期，請再確認一次。'), { reauth: true }); }
    if (!r.ok) { let m = ''; try { m = (await r.json()).error.message; } catch (e) {} throw Object.assign(new Error(m || 'Google 雲端硬碟回應錯誤（' + r.status + '）'), { status: r.status }); }
    return r.status === 204 ? null : r.json();
  }
  const find = kind => api('/drive/v3/files?spaces=drive&pageSize=5&fields=files(id,webViewLink)&q=' + encodeURIComponent(`appProperties has { key='tol' and value='${kind}' } and trashed=false`)).then(x => (x.files || [])[0] || null);
  function create(meta, body, type) {
    const b = 'tol' + Math.random().toString(36).slice(2);
    return api('/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b },
      body: `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: ${type}\r\n\r\n${body}\r\n--${b}--` });
  }
  const put = (id, body, type) => api(`/upload/drive/v3/files/${id}?uploadType=media&fields=id,webViewLink,trashed`, { method: 'PATCH', headers: { 'Content-Type': type }, body });
  function setStatus(x) {
    status = x; const dot = $('#cloudDot'), lab = $('#cloudLabel'), btn = $('#btnCloud');
    btn.querySelectorAll('img,.ava').forEach(e => e.remove());
    if (st.connected && enabled()) { lab.textContent = firstName() + ({ reauth: '・待確認', error: '・同步失敗', sync: '・同步中' }[x] || ''); btn.insertBefore(avatar(20), lab); } else lab.textContent = '用 Google 登入';
    dot.className = 'dot' + ({ ok: ' ok', idle: ' ok', sync: ' sync', reauth: ' warn', error: ' warn' }[x] || '');
    btn.setAttribute('aria-label', st.connected ? `Google 帳號 ${st.user ? st.user.email : ''}：` + ({ ok: '已同步', idle: '已登入', sync: '同步中', reauth: '需要再確認一次', error: '同步沒有成功' }[x] || '') : '用 Google 帳號登入');
    if ($('#cloud').classList.contains('open')) render();
  }
  async function sync(interactive) {
    if (!enabled()) return;
    if (busy) { again = true; return; }
    if (!valid() && !interactive) {
      setStatus(st.connected ? 'reauth' : 'off');
      if (st.connected && st.dirty) setTimeout(() => hooks.note('已存在這台裝置，但還沒同步到 Google 雲端硬碟。請點右上角的帳號，確認後就會同步。', 14000), 7500);
      return;
    }
    busy = true; setStatus('sync');
    try {
      if (!valid()) await auth(st.connected ? '' : 'consent');
      if (!st.user) { const a = await api('/drive/v3/about?fields=user(displayName,emailAddress,photoLink)'); st.user = { name: a.user.displayName || '', email: a.user.emailAddress || '', photo: a.user.photoLink || '' }; }
      // 1. 讀回雲端的完整資料，和這台裝置的合併
      if (!st.dataId) { const f = await find('data'); if (f) st.dataId = f.id; }
      let remote = null;
      if (st.dataId) try { remote = await api(`/drive/v3/files/${st.dataId}?alt=media`); } catch (e) { if (e.status === 404) st.dataId = null; else throw e; }
      const m = hooks.merge(remote);
      // 2. 資料夾
      if (!st.folderId) { const f = await find('folder');
        st.folderId = f ? f.id : (await api('/drive/v3/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '生命樹 Tree of Life', mimeType: 'application/vnd.google-apps.folder', appProperties: { tol: 'folder' } }) })).id; }
      // 3. 完整資料（還原用）
      const json = JSON.stringify(hooks.payload());
      if (st.dataId) { const pd = await put(st.dataId, json, 'application/json'); if (pd && pd.trashed) st.dataId = null; }
      if (!st.dataId) st.dataId = (await create({ name: 'tree-of-life-data.json', mimeType: 'application/json', parents: [st.folderId], appProperties: { tol: 'data' },
        description: '生命樹 App 用來還原紀錄的完整資料，請不要手動修改。' }, json, 'application/json')).id;
      // 4. 試算表（每天一列，給人看的）
      const csv = hooks.csv(); let sh = null;
      if (!st.sheetId) { const f = await find('sheet'); if (f) { st.sheetId = f.id; st.sheetLink = f.webViewLink; } }
      if (st.sheetId) {
        try { sh = await put(st.sheetId, csv, 'text/csv'); } catch (e) {
          if (e.reauth || e.status !== 404) throw e;   // 只有「找不到」才重建；其他錯誤保留原檔、回報錯誤
          st.sheetId = null; }
        if (sh && sh.trashed) { st.sheetId = null; sh = null; }   // 使用者把試算表丟進垃圾桶了：另建一份新的
      }
      if (!st.sheetId) { sh = await create({ name: '生命樹省思紀錄', mimeType: 'application/vnd.google-apps.spreadsheet', parents: [st.folderId], appProperties: { tol: 'sheet' } }, csv, 'text/csv; charset=UTF-8'); st.sheetId = sh.id; }
      if (sh && sh.webViewLink) st.sheetLink = sh.webViewLink;
      const first = !st.connected; st.connected = true; st.lastSync = Date.now(); st.dirty = false; persist(); lastErr = ''; setStatus('ok');
      if (m.added) hooks.note(`歡迎回來，${firstName()}。從你的雲端硬碟帶回了 ${m.added} 天的紀錄。`); else if (first) hooks.note(`已登入，${firstName()}。之後每次省思都會存進你的 Google 雲端硬碟。`);
      if (first) setTimeout(hooks.close, 900);
    } catch (e) {
      lastErr = (e && e.message) || String(e); setStatus(!st.connected ? 'off' : (e.reauth || !valid()) ? 'reauth' : 'error');
      if (!interactive && st.connected) setTimeout(() => hooks.note(e.reauth || !valid() ? '已存在這台裝置，但還沒同步到 Google 雲端硬碟。請點右上角的帳號，確認後就會同步。' : '同步到 Google 雲端硬碟沒有成功：' + lastErr, 14000), 7500);
    } finally { busy = false; if (again) { again = false; queue(); } }
  }
  function queue() { if (!enabled() || !st.connected) return; st.dirty = true; persist(); clearTimeout(timer); timer = setTimeout(() => sync(false), 1200); }
  /* 在使用者按下按鈕的當下先取得授權，之後自動同步時就不需要再跳視窗 */
  let declined = false;
  function warm() {
    if (!enabled() || !st.connected || valid() || declined) return;
    if (!(window.google && google.accounts && google.accounts.oauth2)) { loadGis().catch(() => {}); return; }
    auth('').then(() => { if (st.dirty) queue(); else setStatus('idle'); }).catch(e => { declined = true; lastErr = e.message; });
  }
  const firstName = () => { const u = st.user || {}; return (u.name || u.email || '已登入').split(/\s+/)[0]; };
  function avatar(px) {
    const u = st.user || {};
    if (u.photo) { const i = document.createElement('img'); i.src = u.photo; i.alt = ''; i.width = i.height = px; i.referrerPolicy = 'no-referrer'; i.onerror = () => i.replaceWith(initial()); return i; }
    return initial();
    function initial() { const sp = document.createElement('span'); sp.className = 'ava'; sp.textContent = ((u.name || u.email || '?').trim()[0] || '?').toUpperCase(); sp.setAttribute('aria-hidden', 'true'); return sp; }
  }
  /* 登出：這台裝置上的紀錄一併清除（都在使用者自己的雲端硬碟裡），換別人登入時不會看到 */
  let confirmOut = false;
  async function signOut(force) {
    if (st.dirty && !force) { confirmOut = true; render(); return; }
    clearTimeout(timer); confirmOut = false; disconnect(); hooks.clearLocal(); hooks.note('已登出。這台裝置上的紀錄已經清除，下次登入時會從你的雲端硬碟帶回來。');
  }
  function disconnect() {
    try { if (token && window.google) google.accounts.oauth2.revoke(token, () => {}); } catch (e) {}
    token = null; exp = 0; st = {}; persist(); lastErr = ''; setStatus('off');
  }
  function render() {
    const B = $('#clBody'), when = st.lastSync ? new Date(st.lastSync).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '還沒有';
    $('#clTitle').textContent = st.connected && CID && !DEMO ? '你的 Google 帳號' : '用 Google 帳號登入';
    if (DEMO) { B.innerHTML = '<p>示範模式不會存檔，也不會同步到雲端硬碟。</p>'; return; }
    if (!CID) { B.innerHTML = '<p>Google 登入還沒有開放。</p><p class="muted">網站管理者需要先在 Google Cloud 建立 OAuth 用戶端 ID，填進 config.js 的 googleClientId。在那之前，紀錄只會存在這台裝置。</p>'; return; }
    if (!st.connected) {
      B.innerHTML = `<p>登入之後，你的省思紀錄會存進<b>你自己的</b> Google 雲端硬碟，換手機、換電腦都接得上。</p>
        <ul><li>會在你的雲端硬碟建立資料夾「生命樹 Tree of Life」，裡面有一份每天一列的試算表。</li><li>紀錄不會存在這個網站的伺服器；每個人的紀錄都只在自己的帳號裡。</li><li>這個網站只能看到它自己建立的那幾個檔案，看不到你雲端硬碟的其他內容。</li></ul>
        <p class="muted">登入即表示你了解我們如何處理資料，請見<a href="privacy.html" target="_blank" rel="noopener" style="color:inherit">隱私權政策</a>。</p>
        ${inApp ? `<div class="cwarn" role="alert"><p>你現在是在 App 內建的瀏覽器裡，Google 登入常常會卡住。建議改用 Safari 或 Chrome 開啟再登入。</p><div class="row">${isLine ? `<a href="${esc(extUrl())}" id="clExt">用手機瀏覽器開啟</a>` : ''}<button id="clCopy">複製網址</button></div></div>` : ''}
        ${lastErr ? `<p class="cerr">${esc(lastErr)}</p>` : ''}
        <p class="muted">登入時如果 Google 出現「掃描行動條碼」，請按 ✕ 關閉，再選「試試其他方式」或「使用密碼」就可以繼續。</p>
        <button class="gbtn" id="clGo" ${status === 'sync' ? 'disabled' : ''}>${status === 'sync' ? '登入中…' : '用 Google 帳號登入'}</button>
        <button class="ghost" id="clLater">先不用，只存在這台裝置</button>`;
      const cp = $('#clCopy'); if (cp) cp.addEventListener('click', () => { const done = () => { cp.textContent = '已複製，請貼到瀏覽器'; }; try { navigator.clipboard.writeText(location.href).then(done, () => { cp.textContent = location.href; }); } catch (e) { cp.textContent = location.href; } });
      $('#clGo').addEventListener('click', () => sync(true)); $('#clLater').addEventListener('click', hooks.close); return;
    }
    const line = { sync: '同步中…', ok: `已同步　·　${when}`, idle: `已連結。上次同步：${when}`, reauth: `需要再確認一次 Google 帳號才能同步。上次同步：${when}`, error: `這次同步沒有成功。上次同步：${when}` }[status] || '';
    B.innerHTML = `<div class="who"><span id="clAva"></span><div><b>${esc(st.user ? st.user.name || st.user.email : '已登入')}</b><span class="muted">${esc(st.user && st.user.name ? st.user.email : '')}</span></div></div>
      <p>${line}</p>${lastErr && status !== 'ok' && status !== 'sync' ? `<p class="cerr">${esc(lastErr)}</p>` : ''}
      <div class="row"><button id="clSync" ${status === 'sync' ? 'disabled' : ''}>${status === 'reauth' ? '確認並同步' : '立即同步'}</button>
        ${st.sheetLink && ['https://docs.google.com/', 'https://drive.google.com/'].some(p => st.sheetLink.startsWith(p)) ? `<a href="${esc(st.sheetLink)}" target="_blank" rel="noopener">在雲端硬碟開啟紀錄</a>` : ''}<button id="clOff">登出</button></div>
      ${confirmOut ? `<div class="cwarn" role="alert"><p>有些紀錄還沒有存進雲端硬碟。登出會清除這台裝置上的紀錄，還沒同步的部分會遺失。</p><div class="row"><button id="clSyncOut">先同步再登出</button><button id="clForce">直接登出</button></div></div>` : ''}
      <p class="muted">紀錄存在你雲端硬碟的資料夾「生命樹 Tree of Life」。登出會清除這台裝置上的紀錄，雲端硬碟裡的檔案會留著。</p>`;
    $('#clSync').addEventListener('click', () => { declined = false; sync(true); });
    $('#clAva').replaceWith(avatar(40));
    $('#clOff').addEventListener('click', () => signOut(false));
    if (confirmOut) { $('#clForce').addEventListener('click', () => signOut(true)); $('#clSyncOut').addEventListener('click', async () => { confirmOut = false; await sync(true); if (!st.dirty) signOut(true); else render(); }); }
  }
  const hooks = { merge: () => ({ added: 0 }), payload: () => ({}), csv: () => '', note: () => {}, close: () => {}, clearLocal: () => {} };
  return { hooks, sync, queue, warm, render, setStatus, enabled, expireToken: () => { token = null; exp = 0; setStatus('reauth'); },
    reauthNow: () => { if (enabled() && st.connected && st.dirty && !valid()) { declined = false; sync(true); } }, isDirty: () => !!st.dirty, prompted: () => !!st.prompted, markPrompted: () => { st.prompted = true; persist(); }, connected: () => !!st.connected && enabled(),
    preload: () => { if (enabled()) loadGis().catch(() => {}); }, configure: cid => { CID = cid; tc = null; } };
})();
/* 合併規則：同一天以最後更新的那一筆為準；刪除也帶時間，比紀錄新才算數 */
Cloud.hooks.merge = remote => {
  if (!remote || typeof remote !== 'object' || !Array.isArray(remote.refls)) return { added: 0 };
  const L = new Map(refls.map(r => [r.local_date, r])), R = new Map(cleanRefls(remote.refls).map(r => [r.local_date, r])), del = cleanDeleted(remote.deleted);
  for (const k in deleted) del[k] = Math.max(del[k] || 0, deleted[k]);
  const out = []; let added = 0, changed = false;
  for (const dt of new Set([...L.keys(), ...R.keys()])) {
    const a = L.get(dt), b = R.get(dt), r = a && b ? ((b.updated_at || '') > (a.updated_at || '') ? b : a) : (a || b), ts = r.updated_at ? Date.parse(r.updated_at) : 0;
    if (del[dt] && del[dt] >= ts) { if (a) changed = true; continue; }
    if (r !== a) { changed = true; if (!a) added++; }
    out.push(r);
  }
  deleted = del;
  if (!actor.type && ANIMALS.some(a => a.id === remote.character)) setActor(remote.character);
  if (changed) { refls = out.sort(byDate); rebuild(); } else save();
  return { added, changed };
};
Cloud.hooks.payload = () => ({ app: 'tree-of-life', version: 1, updated_at: new Date().toISOString(), character: actor.type, refls, deleted });
Cloud.hooks.csv = () => {
  const q = v => { let x = String(v == null ? '' : v); if (/^[=+\-@]/.test(x)) x = "'" + x; return '"' + x.replace(/"/g, '""') + '"'; };   // 避免被試算表當成公式
  const head = ['日期', '今天發生的事', '當下的感受', '那時比較靠近', '如果再來一次', '今天的果子', '明天想試試', '上次的實踐', '最後更新'];
  const rows = [...refls].sort(byDate).reverse().map(r => { const F = r.focus_fruit_id && fruitOf(r.focus_fruit_id);
    return [r.local_date, r.event_text, [...(r.inner_reactions || []), ...(r.inner_other ? [r.inner_other] : [])].join('、'), DIR_ZH[r.direction] || '', r.re_response || '',
      F ? F.zh : '', F ? r.practice_text || '' : '', r.prev_practice_checkin ? CK_ZH[r.prev_practice_checkin] : '', r.updated_at ? new Date(r.updated_at).toLocaleString('zh-TW', { hour12: false }) : '']; });
  return [head, ...rows].map(r => r.map(q).join(',')).join('\r\n');
};
Cloud.hooks.note = (t, ms) => caption(t, ms || 6000);
Cloud.hooks.close = () => closeCloud();
Cloud.hooks.clearLocal = () => {
  if (hist.open) closeHist(); draft = null; flow.i = 0;
  if (actor.m) { actor.m.armR.remove(can); scene.remove(actor.m.root); } actor.type = null; actor.m = null;
  try { localStorage.removeItem('tol_char'); } catch (e) {}
  reset(); save();
};
function openCloud() { if (actor.busy) return; Cloud.preload(); Cloud.render(); $('#cloud').classList.add('open'); $('#cloud').setAttribute('aria-hidden', 'false'); setTimeout(() => $('#clClose').focus({ preventScroll: true }), 200); }
function closeCloud() { $('#cloud').classList.remove('open'); $('#cloud').setAttribute('aria-hidden', 'true'); if (!actor.type && !actor.busy) setTimeout(openChar, 500); }
$('#btnCloud').addEventListener('click', () => { openCloud(); Cloud.reauthNow(); });   // 有還沒同步的變更時，點一下就直接重新授權（這一下是使用者點的，瀏覽器才允許跳出視窗）
$('#clClose').addEventListener('click', closeCloud);
$('#cloud').addEventListener('click', e => { if (e.target === $('#cloud')) closeCloud(); });

/* 測試用：在過去幾天放進紀錄（只在 ?nosave 下使用） */
function seedPast(n) {
  if (!NOSAVE) return;   // 測試用，只在 ?nosave 或 ?demo 下才能用
  const ev = ['開會時被打斷，整個下午都悶悶的。', '和家人一起吃晚餐，聊得很開心。', '排隊排很久，差點對店員發脾氣。', '朋友傳訊息說謝謝我上週的幫忙。', '專案進度落後，晚上睡不太著。', '早上散步，看見陽光照在樹上。', '答應的事又拖了一天。'];
  const fe = [['焦慮'], ['平靜', '感恩'], ['不耐煩', '生氣'], ['感恩'], ['焦慮', '疲憊'], ['平靜'], ['自責']];
  for (let k = n; k >= 1; k--) {
    if (k % 3 === 2) continue;
    const date = Engine.addDays(todayStr(), -k), i = (n - k) % 7, f = DEMO_ORDER[(n - k) % 5], ck = pendingCheckin(date);
    addRecord(date, f, fruitOf(f).p[(n - k) % 3], { event: ev[i], feelings: fe[i], other: '', direction: ['life', 'knowledge', 'mixed', 'unsure'][k % 4], re: k % 2 ? '先停一下，再回應。' : '', checkin: ck ? (k % 4 ? 'done' : 'partly') : null, checkinFor: ck ? ck.local_date : null });
  }
  rebuild();
}

$('#demo').hidden = !DEMO;
$('#btnDemo').textContent = DEMO ? '離開示範' : '看示範';
$('#btnDemo').addEventListener('click', () => { if (actor.busy) return; location.href = location.pathname + (DEMO ? '' : '?demo'); });
const restored = load(); if (!restored) reset();
Cloud.setStatus(Cloud.connected() ? 'reauth' : 'off');
if (removedDemo) { Cloud.queue(); setTimeout(() => caption(`已清除 ${removedDemo} 筆舊的示範資料。`, 8000), 600); } if (Cloud.connected()) Cloud.preload();
// 第一次來（有開放 Google 登入、還沒登入過）：先邀請登入，可以略過；只問一次
if (Cloud.enabled() && !Cloud.connected() && !Cloud.prompted()) setTimeout(() => { Cloud.markPrompted(); openCloud(); }, 900);
{ let saved = null; try { saved = DEMO ? (localStorage.getItem('tol_char') || 'lamb') : NOSAVE ? 'rabbit' : localStorage.getItem('tol_char'); } catch (e) {} if (ANIMALS.some(a => a.id === saved)) setActor(saved); else if (!(Cloud.enabled() && !Cloud.connected() && !Cloud.prompted())) setTimeout(openChar, 1200); }
if (DEMO) { cursor = Engine.addDays(todayStr(), -43); advance(42); caption('這是持續省思六週後的樹。可以用下面的按鈕快轉時間，或試寫一次省思。', 9000); }
else if (!restored || !refls.length) caption('樹還沒有種下。從今天的省思開始。', 0);
frame();
window.__tol = { skip(sec) { for (let k = 0; k < sec * 30; k++) tick(1 / 30, false); tick(1 / 30); }, advance, reset, seedPast, openHist, closeHist, showDay, cloud: Cloud, openCloud, get deleted() { return deleted; }, openFlow, get draft() { return draft; }, get refls() { return refls; }, openChar, selectChar, confirmChar, actor, openPicker, selectPick, confirmPick, get vis() { return vis; }, get states() { return states; } };
