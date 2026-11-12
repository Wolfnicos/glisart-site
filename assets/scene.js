// Concept C · Immersive Digital Atelier — the visitor stands inside a curved ring of real results (a cyclorama).
// Drag (or arrows / keyboard) turns the ring with inertia; the facing result switches Avant / Après. In front, a small
// orbit of 3D lacquer samples (gloss, cat-eye, chrome, matte, pearl): materials of the atelier, not app results.
// Only the two lacquers that have a genuine result bring the matching hand photo to the front.
import { THREE, root, calm, clamp, lerp, span, easeOut, easeInOut, damp, boot, studio, photos, photoMat, chrome, inputs, onResize, run, t } from "kit";

const canvas = document.getElementById("scene"), stage = canvas.parentElement, hero = document.getElementById("hero");
const $ = (id) => document.getElementById(id);
const kit = boot(canvas);
if (kit) start();

function start() {
  const { renderer } = kit;
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(52, 1, .1, 60);
  studio(renderer, scene, 1.2);
  scene.add(new THREE.AmbientLight(0x9088a0, .45));
  const spot = new THREE.SpotLight(0xfff2ea, 40, 14, .5, .8, 1.2); spot.position.set(-1.5, 3.2, 0); spot.target.position.set(0, -1.3, -2.6); scene.add(spot, spot.target);

  const ITEMS = [
    ["her", "after_coat", "Habille-moi", "Manteau gris anthracite"],
    ["hand_a", "after_nails", "Atelier ongles", "Bordeaux magnétique"],
    ["her", "after_suit", "Habille-moi", "Tailleur noir"],
    ["him", "after_him", "Habille-moi", "Blazer gris chiné"],
    ["her2", "after_sweater", "Mes ongles, ma tenue", "Pull chocolat & jupe plissée"],
    ["hand_a", "after_nails2", "Atelier ongles", "Terracotta chaud"],
  ];
  let t0 = -1;
  const tex = photos(renderer, [...new Set(ITEMS.flatMap((s) => [s[0], s[1]]))], () => { t0 = performance.now() / 1000; root.classList.add("ready"); setTimeout(() => root.classList.add("settled"), 2400); });

  // ── The ring: curved photo walls (cylinder segments seen from inside) + a hairline chrome rail above and below ──
  const R = 5, PH = 3.0, PW = PH * .75, TH = PW / R, STEP = TH + .11, N = ITEMS.length;
  const ring = new THREE.Group(); ring.position.y = -.16; scene.add(ring);
  const walls = ITEMS.map((s, i) => {
    const mat = photoMat(tex[s[0]], tex[s[1]], .75, { flip: 1, rad: .03, side: THREE.BackSide });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, PH, 32, 1, true, Math.PI + i * STEP - TH / 2, TH), mat);
    m.userData = { i, u: mat.uniforms, mix: 1, target: 1 };
    ring.add(m); return m;
  });
  [-PH / 2 - .09].forEach((y) => {
    const rail = new THREE.Mesh(new THREE.TorusGeometry(R - .02, .012, 8, 200), chrome());
    rail.rotation.x = Math.PI / 2; rail.position.y = y; ring.add(rail);
  });
  // floor: concentric hairlines, like a measured studio floor
  const floor = new THREE.Group(); floor.position.y = -1.96; scene.add(floor);
  for (let r = 1; r <= 6; r++) {
    const c = new THREE.Mesh(new THREE.RingGeometry(r * .95 - .004, r * .95 + .004, 160), new THREE.MeshBasicMaterial({ color: 0xa7a4b3, transparent: true, opacity: .2 - r * .022, side: THREE.DoubleSide }));
    c.rotation.x = -Math.PI / 2; floor.add(c);
  }

  // ── Lacquer samples: nail-shaped solids with five physically different finishes ──
  const nailGeo = new THREE.SphereGeometry(1, 56, 40); nailGeo.scale(.2, .31, .07);
  const FINISH = [
    new THREE.MeshPhysicalMaterial({ color: 0x6a1b2e, metalness: .55, roughness: .22, clearcoat: 1, clearcoatRoughness: .04, anisotropy: 1, anisotropyRotation: 1.1, envMapIntensity: 1.9 }), // cat-eye: a stretched band of light
    new THREE.MeshPhysicalMaterial({ color: 0x8a3b1e, metalness: .1, roughness: .28, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.5 }),                                           // glossy
    new THREE.MeshPhysicalMaterial({ color: 0xdadae2, metalness: 1, roughness: .05, envMapIntensity: 2.2 }),                                                                                 // chrome
    new THREE.MeshPhysicalMaterial({ color: 0x3a2a33, metalness: 0, roughness: .92, envMapIntensity: .5 }),                                                                                  // matte
    new THREE.MeshPhysicalMaterial({ color: 0xd7b6c7, metalness: .3, roughness: .2, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1, envMapIntensity: 1.6 }),                              // pearl
  ];
  const lab = new THREE.Group(); scene.add(lab);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.05, .007, 8, 160), chrome()); halo.rotation.x = Math.PI / 2; lab.add(halo);
  const nails = FINISH.map((m, i) => { const n = new THREE.Mesh(nailGeo, m); n.userData = { i, lift: 0 }; lab.add(n); return n; });

  // ── State ──
  let angle = -2 * STEP, vel = 0, goalIdx = 2, dragging = false, labAngle = 0, labGoal = 0, picked = -1;
  const idx = () => clamp(Math.round(-angle / STEP), 0, N - 1);
  const labBtns = [...document.querySelectorAll(".lab button")];
  function describe() {
    const i = idx(), w = walls[i];
    $("kind").textContent = t(ITEMS[i][2]); $("name").textContent = t(ITEMS[i][3]);
    $("flip").setAttribute("aria-pressed", w.userData.target > .5);
    $("prev").disabled = i === 0; $("next").disabled = i === N - 1;
  }
  const go = (i) => { goalIdx = clamp(i, 0, N - 1); };
  const flip = () => { const w = walls[idx()].userData; w.target = w.target > .5 ? 0 : 1; w.pulse = 1; describe(); };
  $("prev").addEventListener("click", () => go(goalIdx - 1));
  $("next").addEventListener("click", () => go(goalIdx + 1));
  $("flip").addEventListener("click", flip);
  function pickNail(i) {
    picked = i; labGoal = -i * (Math.PI * 2 / 5); nails[i].userData.pulse = 1;
    labBtns.forEach((b) => b.setAttribute("aria-pressed", +b.dataset.s === i));
    const res = labBtns[i].dataset.result;             // only genuine results move the ring
    if (res) { const k = ITEMS.findIndex((s) => s[1] === res); go(k); walls[k].userData.target = 1; }
  }
  labBtns.forEach((b) => b.addEventListener("click", () => pickNail(+b.dataset.s)));

  // ── Drag to turn (horizontal only, so vertical scrolling stays free), click to act ──
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null, moved = 0, lastX = 0;
  canvas.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; lastX = e.clientX; moved = 0; });
  addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
    if (moved > 6 && Math.abs(e.clientX - down[0]) > Math.abs(e.clientY - down[1])) { dragging = true; root.classList.add("dragging"); }
    if (dragging) { const k = 2.4 / stage.clientWidth; angle = clamp(angle + dx * k, -(N - 1) * STEP - .2, .2); vel = dx * k * 60; }
  }, { passive: true });
  addEventListener("pointerup", (e) => {
    if (!down) return;
    if (dragging) { goalIdx = clamp(Math.round(-(angle + vel * .18) / STEP), 0, N - 1); }
    else if (moved < 6) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const n = ray.intersectObjects(nails, false)[0], w = ray.intersectObjects(walls, false)[0];
      if (n) pickNail(n.object.userData.i);
      else if (w) { if (w.object.userData.i === idx()) flip(); else go(w.object.userData.i); }
    }
    down = null; dragging = false; root.classList.remove("dragging");
  });
  addEventListener("pointercancel", () => { down = null; dragging = false; root.classList.remove("dragging"); });

  let phone = false, camZ = 1.5;
  onResize(kit, camera, (w, h, m) => { phone = m; camera.fov = m ? 60 : 47; camZ = m ? 2.2 : Math.max(1.25, 1.25 + (1.5 - w / h) * 2.4); });

  const io = inputs(hero);
  let shown = -1;
  const stats = run(stage, (dt, now) => {
    if (t0 < 0) return;
    const t = calm ? 99 : now - t0;
    io.update(dt);
    const p = easeInOut(io.ps), arrive = easeOut(span(t, .1, 2.6));

    if (!dragging) { angle += (-goalIdx * STEP - angle) * damp(dt, 4.2); }
    ring.rotation.y = angle + lerp(1.1, 0, arrive) + io.sx * -.05;
    if (idx() !== shown) { shown = idx(); describe(); }

    walls.forEach((w) => {
      const d = w.userData, off = Math.abs(d.i * STEP + angle);
      d.mix += (d.target - d.mix) * damp(dt, 5); d.pulse = (d.pulse || 0) * Math.exp(-dt * 3);
      d.u.uMix.value = d.mix; d.u.uHover.value = d.pulse + (off < .2 ? .25 : 0);
      d.u.uDim.value = lerp(1, .45, clamp(off / 1.4)); d.u.uAlpha.value = arrive * (1 - clamp((off - 1.9) / .5));
    });

    // camera: inside the ring; pointer looks around; scroll walks toward the facing result
    camera.position.set(io.sx * .25, .12 + io.sy * -.12, lerp(camZ, -1.7, p));
    camera.lookAt(io.sx * .7, lerp(phone ? -.05 : -.3, .15, p), -5);

    labAngle += (labGoal - labAngle) * damp(dt, 3.5);
    lab.position.set(0, phone ? -1.36 : -1.12, lerp(-2.6, -4.2, p));
    lab.scale.setScalar(easeOut(span(t, 1.4, 3)) * (phone ? .45 : .44) * (1 - p * .7));
    halo.rotation.z = calm ? 0 : now * .08;
    nails.forEach((n) => {
      const u = n.userData, a = labAngle + u.i * (Math.PI * 2 / 5) + (calm || picked >= 0 ? 0 : now * .12);
      u.pulse = (u.pulse || 0) * Math.exp(-dt * 2.6);
      u.lift += ((picked === u.i ? 1 : 0) - u.lift) * damp(dt, 5);
      n.position.set(Math.sin(a) * 1.05, .1 + u.lift * .22 + (calm ? 0 : Math.sin(now * .8 + u.i) * .02), Math.cos(a) * 1.05);
      n.rotation.set(-.25 + io.sy * .3, a * .5 + io.sx * .7 + (calm ? 0 : now * .25) + u.pulse * 2.5, .08);
      n.scale.setScalar(1 + u.lift * .3 + u.pulse * .15);
    });
    scene.environmentRotation.y = io.sx * -.6 + angle * .5;
    floor.rotation.y = angle * .5;

    stage.style.setProperty("--p", p.toFixed(4));
    renderer.render(scene, camera);
  });
  describe();
  window.__glisart = { stats, renderer, walls, nails, go, flip, pickNail, get index() { return idx(); } };
}
