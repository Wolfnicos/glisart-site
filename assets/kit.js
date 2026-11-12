// Glisart V3 · shared kit for the three hero concepts. Only plumbing lives here; each concept owns its scene and layout.
import * as THREE from "three";
export { THREE };

export const root = document.documentElement;
// The approved experience is the still one (what the owner sees and signed off): no arrival flight, no scroll camera.
// It is served to every visitor, whatever their system motion setting.
export const calm = true;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const span = (t, a, b) => clamp((t - a) / (b - a));
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOut = (t) => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const damp = (dt, rate) => 1 - Math.exp(-dt * rate);
root.classList.add("js");
// Text set from scripts: French is the source; a translated page provides window.GLISART_T (French → that language).
export const t = (s) => (window.GLISART_T && window.GLISART_T[s]) || s;

// Renderer, or null → the page falls back to its 2D composition (also reachable with ?2d for testing).
export function boot(canvas) {
  const stage = canvas.parentElement;
  const phone = () => stage.clientWidth <= 800;
  const lite = phone() || (navigator.hardwareConcurrency || 8) <= 4;
  let renderer = null;
  if (!new URLSearchParams(location.search).has("2d")) {
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); } catch (e) { renderer = null; }
  }
  if (!renderer) { root.classList.add("no-webgl", "ready"); root.dataset.mode = "2d"; return null; }
  root.classList.add("webgl"); root.dataset.mode = "3d";
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); root.classList.remove("webgl"); root.classList.add("no-webgl"); root.dataset.mode = "2d"; });
  return { renderer, stage, phone, lite };
}

// Procedural studio (no HDR file): dark room, soft strips, one bordeaux bounce. Gives chrome and glass something to reflect.
export function studio(renderer, scene, warm = 1) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x030304);
  const strip = (w, h, x, y, z, hex, k, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m);
  };
  strip(1.6, 9, -7, 1, 4, 0xfff4ea, 9, Math.PI / 2.6);
  strip(1.0, 9, 7.5, 0, 2, 0xdfe6ff, 5, -Math.PI / 2.4);
  strip(10, 1.2, 0, 7, 3, 0xffffff, 6, 0, Math.PI / 2.2);
  strip(6, 3, 3, -3, 8, 0x72263c, 3.4 * warm, Math.PI);
  strip(5, 7, -5, 2, 9, 0xf4f1ee, 2.4, Math.PI * .85);
  strip(16, 10, 0, 1, 13, 0x8d8d98, 1.1, Math.PI);
  strip(4, 4, -6, -4, -6, 0x72263c, 2.2 * warm, 0);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(env, .035).texture;
  pm.dispose();
}

// Real Glisart photos (originals from the app, never altered). `done` fires when every requested texture is in.
export function photos(renderer, names, done) {
  const loader = new THREE.TextureLoader(), out = {};
  let left = names.length, opened = false;
  const open = () => { if (!opened) { opened = true; done(); } };
  const one = () => { if (--left <= 0) open(); };
  setTimeout(open, 5000);                                  // never wait forever for a slow or lost file
  for (const n of names) {
    const url = (window.GLISART_BASE || "") + "assets/demo/" + n + ".webp";
    const t = loader.load(url, one, undefined, () => {      // a lost request is retried once, then the page goes on
      loader.load(url + "?retry", (again) => { t.image = again.image; t.needsUpdate = true; one(); }, undefined, one);
    });
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    out[n] = t;
  }
  return out;
}

export function rrect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// Photo material: before ↔ after with a travelling light edge (uMix 0 = Avant, 1 = Après). The picture itself is
// sampled as is; only the rounded mask, the edge light and a rim highlight are added.
export function photoMat(before, after, aspect, { flip = 0, rad = .035, side = THREE.FrontSide } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side,
    uniforms: {
      tA: { value: before }, tB: { value: after }, uMix: { value: 1 }, uAspect: { value: aspect }, uRad: { value: rad },
      uAlpha: { value: 1 }, uHover: { value: 0 }, uFlip: { value: flip }, uDim: { value: 1 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `
      uniform sampler2D tA, tB; uniform float uMix, uAspect, uRad, uAlpha, uHover, uFlip, uDim; varying vec2 vUv;
      void main(){
        vec2 uv = vUv; if (uFlip > .5) uv.x = 1. - uv.x;
        float e = uv.x + (uv.y - .5) * .14, edge = mix(-.12, 1.12, uMix);
        float m = smoothstep(edge - .012, edge + .012, e);
        vec3 col = mix(texture2D(tB, uv).rgb, texture2D(tA, uv).rgb, m);
        float live = step(.002, uMix) * step(uMix, .998);
        col += (1. - smoothstep(0., .01, abs(e - edge))) * live * vec3(1., .9, .94);
        col += (1. - smoothstep(0., .09, abs(e - edge))) * live * vec3(.45, .12, .2) * .5;
        vec2 p = (vUv - .5) * vec2(uAspect, 1.), b = vec2(uAspect, 1.) * .5 - uRad;
        float d = length(max(abs(p) - b, 0.)) - uRad;
        col += smoothstep(-.028, 0., d) * (.1 + .25 * uHover);
        gl_FragColor = vec4(col * uDim, (1. - smoothstep(-.004, .004, d)) * uAlpha);
        #include <colorspace_fragment>
      }`,
  });
}

let glassMat, chromeMat;
export const chrome = () => chromeMat || (chromeMat = new THREE.MeshPhysicalMaterial({ color: 0xe6e6ec, metalness: 1, roughness: .16, envMapIntensity: 1.6 }));
export const glass = () => glassMat || (glassMat = new THREE.MeshPhysicalMaterial({ color: 0xd6cfdc, metalness: .2, roughness: .06, transparent: true, opacity: .17, envMapIntensity: 2.2, depthWrite: false }));

// A "spatial window": the photo, a slab of digital glass behind it, a hairline chrome rim. Real geometry, three meshes.
export function panel(w, h, before, after) {
  const g = new THREE.Group(), R = .11;
  const mat = photoMat(before, after, w / h, { rad: R / h });
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(rrect(w + .22, h + .22, R + .1), { depth: .06, bevelEnabled: false, curveSegments: 10 }), glass());
  slab.position.z = -.1;
  const ring = rrect(w + .22, h + .22, R + .1);
  ring.holes.push(new THREE.Path(rrect(w + .18, h + .18, R + .08).getPoints(10).reverse()));
  const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: .03, bevelEnabled: false, curveSegments: 10 }), chrome());
  rim.position.z = -.045;
  g.add(slab, rim, photo);
  g.userData = { u: mat.uniforms, photo, mix: 1, target: 1, hover: 0, hoverT: 0 };
  return g;
}

// Pointer (smoothed = inertia) and scroll progress through the tall hero. Scrolling is only read, never blocked.
export function inputs(hero) {
  const s = { x: 0, y: 0, sx: 0, sy: 0, cx: -1, cy: -1, p: 0, ps: 0, active: 0, fine: matchMedia("(hover: hover) and (pointer: fine)").matches };
  addEventListener("pointermove", (e) => {
    s.cx = e.clientX; s.cy = e.clientY; s.active = performance.now();
    if (calm) return;
    s.x = (e.clientX / innerWidth) * 2 - 1; s.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  const read = () => { s.p = calm ? 0 : clamp(scrollY / Math.max(1, hero.offsetHeight - innerHeight)); };
  addEventListener("scroll", read, { passive: true }); read(); s.ps = s.p;
  s.update = (dt) => {
    const k = damp(dt, 4.5);
    s.sx += ((s.fine ? s.x : 0) - s.sx) * k; s.sy += ((s.fine ? s.y : 0) - s.sy) * k;
    s.ps += (s.p - s.ps) * damp(dt, 7);
  };
  return s;
}

export function onResize(kit, camera, fn) {
  const apply = () => {
    const w = kit.stage.clientWidth, h = kit.stage.clientHeight;
    kit.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, kit.lite ? 1.5 : 2));
    kit.renderer.setSize(w, h, false);
    if (camera) { camera.aspect = w / h; }
    fn(w, h, kit.phone());
    if (camera) camera.updateProjectionMatrix();
  };
  new ResizeObserver(apply).observe(kit.stage); apply();
}

// One loop per page. It sleeps when the tab is hidden or the hero has left the screen (no GPU work off-screen).
export function run(stage, fn) {
  let last = 0, seen = true, frames = 0;
  new IntersectionObserver((e) => { seen = e[0].isIntersecting; }).observe(stage);
  const tick = (now) => {
    requestAnimationFrame(tick);
    if (document.hidden || !seen) { last = now; return; }
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now;
    fn(dt, now / 1000); frames++;
  };
  requestAnimationFrame(tick);
  return { get frames() { return frames; } };
}

const v = new THREE.Vector3();
export function toScreen(obj, local, camera, w, h) {
  v.copy(local); obj.localToWorld(v); v.project(camera);
  return [(v.x * .5 + .5) * w, (-v.y * .5 + .5) * h, v.z];
}
