// Concept C · everything below the hero. The hero's own script (scene.js) is not touched.
// 01 Atelier ongles: big 3D lacquer samples around the real Avant/Après of the hand.
// 02 Habille-moi: Avant/Après per outfit; each garment floats as a 3D fabric swatch in its real colour.
// 03 L'accord: an interface of animated links between outfit, detected colours and proposed manicures.
// No live AI anywhere: selectors only switch between genuine, pre-generated app results.
import { THREE, calm, clamp, lerp, span, easeOut, easeInOut, damp, studio, rrect, run, t } from "kit";

const DEMO = (window.GLISART_BASE || "") + "assets/demo/";
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const no3d = new URLSearchParams(location.search).has("2d");

// ── Before / after engine (from V1) ──────────────────────────────────────────────────────────────────────────────────
function setPos(cmp, v) {
  cmp.style.setProperty("--pos", v); $("input", cmp).value = v;
  $(".tagl.a", cmp).style.opacity = v < 22 ? 0 : 1; $(".tagl.b", cmp).style.opacity = v > 78 ? 0 : 1;
}
function glide(cmp, from, to, ms) {
  if (calm) return setPos(cmp, to);
  const t0 = performance.now(), id = (cmp._anim = (cmp._anim || 0) + 1);
  (function step(t) {
    if (cmp._anim !== id) return;                       // the visitor took over
    const k = Math.min(1, (t - t0) / ms);
    setPos(cmp, from + (to - from) * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}
$$("[data-compare]").forEach((cmp) => {
  const input = $("input", cmp);
  setPos(cmp, +input.value);
  input.addEventListener("input", () => { cmp._anim = (cmp._anim || 0) + 1; setPos(cmp, +input.value); });
});
function swap(cmp, before, after, altAfter, altBefore) {
  const src = (img, n) => { img.srcset = `${DEMO}${n}-480.webp 480w, ${DEMO}${n}.webp 896w`; img.src = `${DEMO}${n}.webp`; };
  const a = $(".after", cmp), b = $(".before", cmp), pre = new Image();
  pre.onload = pre.onerror = () => {
    cmp.classList.add("swapping");
    setTimeout(() => {
      src(a, after); a.alt = altAfter;
      if (before) { src(b, before); if (altBefore) b.alt = altBefore; }
      cmp.classList.remove("swapping");
      glide(cmp, 100, 38, 1200);
    }, calm ? 0 : 280);
  };
  pre.src = `${DEMO}${after}.webp`;
}

// ── Small shared helpers ─────────────────────────────────────────────────────────────────────────────────────────────
const ptr = { x: 0, y: 0 };
if (!calm && matchMedia("(hover: hover) and (pointer: fine)").matches) {
  addEventListener("pointermove", (e) => { ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
}
function renderer(canvas) {
  if (no3d) return null;
  try {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setClearColor(0, 0); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
    return r;
  } catch (e) { return null; }
}
// start a section's scene only when it is about to be seen (the hero is never slowed down by what is below)
function near(el, fn) {
  const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: "700px 0px" });
  io.observe(el);
}
function sized(r, canvas, camera, fn) {
  const apply = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth <= 900 ? 1.5 : 2)); r.setSize(w, h, false);
    camera.aspect = w / h; fn(w, h); camera.updateProjectionMatrix();
  };
  new ResizeObserver(apply).observe(canvas); apply();
}
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { rootMargin: "0px 0px -8% 0px" });
  $$(".rv, .graph").forEach((el) => io.observe(el));
} else $$(".rv, .graph").forEach((el) => el.classList.add("in"));

// ── 01 · Atelier ongles ──────────────────────────────────────────────────────────────────────────────────────────────
const FIN = [
  { name: "Bordeaux magnétique", real: "after_nails", text: "Exactement votre demande : un œil-de-chat profond et lumineux.", alt: "Résultat réel : Bordeaux magnétique sur la même main, image modifiée par IA" },
  { name: "Terracotta chaud", real: "after_nails2", text: "Un autre essai réel, sur la même main.", alt: "Résultat réel : Terracotta chaud sur la même main, image modifiée par IA" },
  { name: "Chrome", text: "Un miroir liquide : la lumière y glisse sans s’arrêter." },
  { name: "Mat", text: "Un velours sans reflet, qui absorbe la lumière." },
  { name: "Nacré", text: "Un voile irisé, qui change avec l’angle." },
];
{
  const sec = $("#atelier"), cmp = $("#labcmp"), btns = $$(".finishes .pill", sec);
  let sel = 0, shownReal = "after_nails", scene3d = null;
  function pick(i) {
    sel = i; const f = FIN[i];
    btns.forEach((b) => b.setAttribute("aria-pressed", +b.dataset.f === i));
    $("#fin-name").textContent = t(f.name); $("#fin-text").textContent = t(f.text);
    const kind = $("#fin-kind");
    kind.textContent = t(f.real ? "Résultat réel de l’application" : "Matière d’atelier · aperçu 3D, pas un résultat de l’application");
    kind.classList.toggle("real", !!f.real);
    if (f.real && f.real !== shownReal) { shownReal = f.real; swap(cmp, null, f.real, t(f.alt)); }   // only genuine results change the photo
    if (scene3d) scene3d.select(i);
  }
  btns.forEach((b) => b.addEventListener("click", () => pick(+b.dataset.f)));

  near(sec, () => {
    const canvas = $("#labgl"), r = renderer(canvas);
    if (!r) { sec.classList.add("flat"); return; }
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
    camera.position.set(0, 0, 10);
    studio(r, scene, 1.3);
    scene.add(new THREE.AmbientLight(0x9088a0, .4));
    const key = new THREE.SpotLight(0xfff2ea, 70, 30, .6, .8, 1.3); key.position.set(-3, 5, 8); scene.add(key);
    const geo = new THREE.SphereGeometry(1, 72, 48); geo.scale(.34, .52, .115);
    const M = (o) => new THREE.MeshPhysicalMaterial({ transparent: true, ...o });
    const mats = [
      M({ color: 0x6a1b2e, metalness: .55, roughness: .22, clearcoat: 1, clearcoatRoughness: .04, anisotropy: 1, anisotropyRotation: 1.1, envMapIntensity: 1.9 }),
      M({ color: 0x8a3b1e, metalness: .1, roughness: .28, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.5 }),
      M({ color: 0xdadae2, metalness: 1, roughness: .05, envMapIntensity: 2.2 }),
      M({ color: 0x3a2a33, metalness: 0, roughness: .92, envMapIntensity: .5 }),
      M({ color: 0xd7b6c7, metalness: .3, roughness: .2, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1, envMapIntensity: 1.6 }),
    ];
    const nails = mats.map((m, i) => { const n = new THREE.Mesh(geo, m); n.userData = { i, lift: 0 }; scene.add(n); return n; });
    const STEP = Math.PI * 2 / 5;
    let rot = 0, goal = 0, R = 3.1, drop = .9, y0 = -.3, k0 = 1, t0 = 0, sx = 0, sy = 0, dirty = true, lastSig = "", beat = 0;
    sized(r, canvas, camera, (w, h) => {
      dirty = true;
      const phone = innerWidth <= 900;
      R = phone ? Math.min(1.5, 1.05 * (w / h) * 1.9) : Math.min(3.3, (w / h) * 1.72);
      drop = phone ? .55 : 1.2; y0 = phone ? -1.15 : -.28; k0 = phone ? .62 : .8;
    });
    scene3d = { select(i) { let d = -i * STEP - goal; d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; goal += d; nails[i].userData.pulse = 1; } };
    scene3d.select(sel);
    run(canvas.parentElement, (dt, now) => {
      if (!t0) t0 = now; const t = calm ? 99 : now - t0;
      sx += (ptr.x - sx) * damp(dt, 4); sy += (ptr.y - sy) * damp(dt, 4);
      rot += (goal - rot) * damp(dt, 3.2);
      nails.forEach((n) => {
        const u = n.userData, a = u.i * STEP + rot + sx * .12, front = Math.cos(a);
        u.lift += ((u.i === sel ? 1 : 0) - u.lift) * damp(dt, 5); u.pulse = (u.pulse || 0) * Math.exp(-dt * 2.4);
        n.position.set(Math.sin(a) * R, y0 - front * drop + u.lift * .12 + (calm ? 0 : Math.sin(now * .7 + u.i * 1.3) * .03), front * R * .92);
        n.material.opacity = clamp((front + .12) / .5) * easeOut(span(t, .2 + u.i * .08, 1.6));   // samples behind the photo fade away
        n.visible = n.material.opacity > .01;
        n.rotation.set(-.22 + sy * .35, Math.sin(a) * -.45 + sx * .5 + (calm ? 0 : Math.sin(now * .55 + u.i * 1.7) * (.35 + u.lift * .3)) + u.pulse * 3, .06); // sways, never edge-on
        n.scale.setScalar(k0 * (1 + u.lift * .18 + u.pulse * .12));
      });
      scene.environmentRotation.y = sx * -.6 + rot * .3;
      // draw only when something changed (the scene is still most of the time); one safety frame per second
      const sig = rot.toFixed(4) + sel + nails.map((n) => n.userData.lift.toFixed(3) + (n.userData.pulse || 0).toFixed(3)).join("");
      beat += dt;
      if (sig === lastSig && !dirty && beat < 1) return;
      lastSig = sig; dirty = false; beat = 0;
      r.render(scene, camera);
    });
  });
}

// ── 02 · Habille-moi ─────────────────────────────────────────────────────────────────────────────────────────────────
const LOOKS = {
  sweater: { name: "Pull chocolat & jupe plissée", q: "Le chocolat répond au prune de vos ongles.", before: "her2", after: "after_sweater",
    altB: "Avant : photo d’origine", alt: "Résultat réel : pull chocolat et jupe plissée crème, image modifiée par IA",
    pieces: [["Pull fin", "chocolat", "#4A2C1F"], ["Jupe plissée", "crème", "#EFE3BF"], ["Bottines", "marron", "#3B2418"]] },
  suit: { name: "Tailleur noir", q: "Une silhouette nette pour un rendez-vous important.", before: "her", after: "after_suit",
    altB: "Avant : photo d’origine, pull kaki et jean clair", alt: "Résultat réel : tailleur noir, image modifiée par IA",
    pieces: [["Blazer ajusté", "noir", "#1A1A1A"], ["Chemisier en soie", "ivoire", "#F3EAD7"], ["Pantalon droit", "noir", "#1F1F1F"], ["Escarpins", "noir", "#111111"]] },
  him: { name: "Blazer gris chiné", q: "Élégant sans cravate, pour un dîner.", before: "him", after: "after_him",
    altB: "Avant : photo d’origine, surchemise noire et jean clair", alt: "Résultat réel : blazer gris chiné, chemise blanche et jean brut, image modifiée par IA",
    pieces: [["Blazer", "gris chiné", "#7D7F82"], ["Chemise", "blanc", "#F4F4F2"], ["Jean", "brut", "#26324A"], ["Derbies", "marron", "#4A2B1A"]] },
};
{
  const sec = $("#studio"), stage = $("#studio-stage"), cmp = $("#studiocmp"), list = $("#pieces"), btns = $$(".looks .pill", sec);
  let cur = "sweater", scene3d = null;
  function fill(k) {
    const L = LOOKS[k];
    $("#look-name").textContent = t(L.name); $("#look-q").textContent = t(L.q);
    list.replaceChildren(...L.pieces.map(([n, c, hex]) => {
      const li = document.createElement("li"), dot = document.createElement("i"), sm = document.createElement("small");
      dot.className = "dot"; dot.style.setProperty("--c", hex); sm.textContent = t(c);
      li.append(dot, t(n) + " ", sm); return li;
    }));
  }
  function choose(k) {
    if (k === cur) return; cur = k; const L = LOOKS[k];
    btns.forEach((b) => b.setAttribute("aria-pressed", b.dataset.k === k));
    swap(cmp, L.before, L.after, t(L.alt), t(L.altB));
    if (scene3d) scene3d.change(k, () => fill(k)); else fill(k);
  }
  btns.forEach((b) => b.addEventListener("click", () => choose(b.dataset.k)));
  fill(cur);

  near(sec, () => {
    const canvas = $("#studiogl"), r = renderer(canvas);
    if (!r) { sec.classList.add("flat"); return; }
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
    studio(r, scene, 1);
    scene.add(new THREE.AmbientLight(0xffffff, .55));
    const key = new THREE.DirectionalLight(0xfff2ea, 2.2); key.position.set(-3, 4, 6); scene.add(key);
    // a swatch of cloth: a thin rounded tile with a fabric sheen, in the garment's real colour
    const geo = new THREE.ExtrudeGeometry(rrect(.86, 1.08, .09), { depth: .05, bevelEnabled: true, bevelThickness: .014, bevelSize: .014, bevelSegments: 3, curveSegments: 10 });
    geo.center();
    const tiles = [0, 1, 2, 3].map((i) => {
      const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ roughness: .78, metalness: 0, sheen: 1, sheenRoughness: .45, transparent: true, envMapIntensity: .7 }));
      m.userData = { i, home: new THREE.Vector3(), on: false }; scene.add(m); return m;
    });
    const paint = (k) => tiles.forEach((m, i) => {
      const p = LOOKS[k].pieces[i]; m.userData.on = !!p;
      if (p) { m.material.color.set(p[2]); m.material.sheenColor = new THREE.Color(p[2]).lerp(new THREE.Color(0xffffff), .35); }
    });
    paint(cur);
    let W = 1, H = 1, phone = false, phase = 1, dir = 1, pending = null, sx = 0, sy = 0, t0 = 0, swing = 0, colW = 1, count = LOOKS[cur].pieces.length, dirty = true, lastSig = "", beat = 0;
    sized(r, canvas, camera, (w, h) => {
      dirty = true; W = w; H = h; phone = innerWidth <= 900; stage.classList.toggle("pinned", !phone);
      camera.position.set(0, 0, phone ? Math.max(3.1, 4.6 / (2 * Math.tan(Math.PI / 12) * (w / h))) : 10);
      const half = Math.tan(Math.PI / 12) * camera.position.z * (w / h);            // half the visible width at z = 0
      colW = half * .5;
      tiles.forEach((m, i) => phone ? m.userData.home.set(0, 0, 0) :
         m.userData.home.set(half * .34 + (i % 2) * .62, 1.42 - i * .93, i % 2 ? .5 : -.3));
    });
    scene3d = { change(k, mid) { pending = { k, mid }; dir = -1; stage.classList.add("changing"); swing = 1; } };
    const v = new THREE.Vector3();
    run(canvas.parentElement, (dt, now) => {
      if (!t0) t0 = now; const t = calm ? 99 : now - t0;
      sx += (ptr.x - sx) * damp(dt, 4); sy += (ptr.y - sy) * damp(dt, 4);
      // outfit change: the swatches leave, are re-dyed out of sight, then come back in
      phase = clamp(phase + dir * dt * (calm ? 99 : 2.4));
      if (dir < 0 && phase === 0 && pending) { paint(pending.k); count = LOOKS[pending.k].pieces.length; pending.mid(); pending = null; dir = 1; stage.classList.remove("changing"); }
      swing *= Math.exp(-dt * 1.6);
      // draw only when something changed (the scene is still most of the time); one safety frame per second
      const sig = phase.toFixed(4) + swing.toFixed(3) + cur + count;
      beat += dt;
      if (sig === lastSig && !dirty && beat < 1) return;
      lastSig = sig; dirty = false; beat = 0;
      camera.position.x = sx * .3 + Math.sin(swing * Math.PI) * .5; camera.position.y = sy * -.18; camera.lookAt(0, 0, 0);
      const labels = stage.classList.contains("pinned") ? list.children : [];
      tiles.forEach((m, i) => {
        const u = m.userData, h = u.home, a = easeInOut(clamp(phase * 1.5 - i * .12)) * easeOut(span(t, .2 + i * .12, 1.5 + i * .12));
        m.visible = u.on && a > .01;
        m.position.set(h.x + (phone ? (i - (count - 1) / 2) * colW : 0) + lerp(3.2, 0, a) + sx * -.12 * (1 + h.z),   // phone: one swatch above each label
           h.y + (calm ? 0 : Math.sin(now * .6 + i * 1.4) * .05) + sy * .08, h.z + lerp(-2.5, 0, a));
        m.rotation.set(sy * -.25 + (calm ? 0 : Math.sin(now * .4 + i) * .04), (phone ? -.22 : -.42) + sx * .35 + lerp(1.6, 0, a), (i % 2 ? .06 : -.05));
        m.material.opacity = a;
        const li = labels[i];
        if (li && u.on) { v.set(.62, 0, 0).applyQuaternion(m.quaternion).add(m.position).project(camera); li.style.transform = `translate(${((v.x * .5 + .5) * W).toFixed(1)}px, ${((-v.y * .5 + .5) * H - 17).toFixed(1)}px)`; }
      });
      scene.environmentRotation.y = sx * -.5;
      r.render(scene, camera);
    });
  });
}

// ── 03 · L’accord: links drawn between the real elements, in two directions ──────────────────────────────────────────
{
  const graph = $("#graph"), plane = $(".plane", graph), svg = $(".wires", graph), NS = "http://www.w3.org/2000/svg";
  let mode = "a", pinned = null;
  const visible = (sel) => $$(sel, plane).filter((n) => !n.closest("[hidden]"));
  const node = (n) => visible(`[data-n="${n}"]`)[0];
  function box(el) {                                         // layout position inside the plane (independent of the 3D tilt)
    let x = 0, y = 0, e = el;
    while (e && e !== plane) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }
  function wire(from, to, cls) {
    const a = box(from), b = box(to), stacked = b.y > a.y + a.h - 4;
    let d;
    if (stacked && to.classList.contains("prop")) {       // phone: run down a rail on the left, then turn into the proposal
      const x1 = a.x + a.w / 2, y1 = a.y + a.h, rail = Math.max(1, b.x - 15), y2 = b.y + b.h / 2;
      d = `M${x1},${y1} C${x1},${y1 + 46} ${rail},${y1 + 12} ${rail},${y1 + 62} L${rail},${y2 - 14} Q${rail},${y2} ${b.x},${y2}`;
    }
    else if (stacked) { const x1 = a.x + a.w / 2, y1 = a.y + a.h, x2 = b.x + b.w / 2, y2 = b.y, m = (y1 + y2) / 2; d = `M${x1},${y1} C${x1},${m} ${x2},${m} ${x2},${y2}`; }
    else { const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2, m = (x1 + x2) / 2; d = `M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}`; }
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d); p.setAttribute("pathLength", "1"); p.setAttribute("class", cls);
    svg.append(p);
  }
  function draw() {
    svg.replaceChildren();
    const src = node("src"); if (!src) return;
    const img = $("img", src);
    ["c0", "c1", "c2"].forEach((c) => wire(img, node(c), "w-" + c));
    if (mode === "a") visible(".prop").forEach((p) => p.dataset.link.split(" ").forEach((c) => wire(node(c), p, `w-${c} w-${p.dataset.n}`)));
    else ["c0", "c1", "c2"].forEach((c) => wire(node(c), $("img", node("out")), "w-" + c));
  }
  function focus(p) {
    graph.classList.toggle("focus", !!p);
    $$(".on", graph).forEach((e) => e.classList.remove("on"));
    if (!p) return;
    p.classList.add("on");
    const links = p.dataset.link.split(" ");
    links.forEach((c) => { node(c).classList.add("on"); $$(`.wires .w-${c}`, graph).forEach((w) => { if (w.classList.contains("w-" + p.dataset.n) || !/w-p/.test(w.getAttribute("class"))) w.classList.add("on"); }); });
  }
  $$(".prop", graph).forEach((p) => {
    p.addEventListener("pointerenter", () => { if (!pinned) focus(p); });
    p.addEventListener("pointerleave", () => { if (!pinned) focus(null); });
    p.addEventListener("focus", () => { if (!pinned) focus(p); });
    p.addEventListener("blur", () => { if (!pinned) focus(null); });
    p.addEventListener("click", () => { pinned = pinned === p ? null : p; focus(pinned); p.setAttribute("aria-pressed", pinned === p); });
  });
  $$(".modes .pill").forEach((b) => b.addEventListener("click", () => {
    mode = b.dataset.mode; pinned = null; focus(null);
    $$(".modes .pill").forEach((x) => x.setAttribute("aria-pressed", x === b));
    $$("[data-m]", plane).forEach((n) => { n.hidden = n.dataset.m !== mode; });
    graph.classList.remove("in"); draw();
    requestAnimationFrame(() => requestAnimationFrame(() => graph.classList.add("in")));
  }));
  new ResizeObserver(draw).observe(plane);
  $$("img", plane).forEach((i) => i.addEventListener("load", draw));
  draw();
  // the whole plane (and the salon card) lean slightly toward the pointer
  const tilt = [plane, $("#fiche")];
  if (!calm) addEventListener("pointermove", () => tilt.forEach((el) => { el.style.setProperty("--tx", ptr.x.toFixed(3)); el.style.setProperty("--ty", ptr.y.toFixed(3)); }), { passive: true });
}
