// Glisart site: language switch (6 languages, French by default), glass sheen following the pointer, reveal on scroll.
// No cookies, no analytics, no third-party request. The chosen language is kept in localStorage (convenience only).
(function () {
  var root = document.documentElement;
  if (window.chrome && navigator.userAgentData) root.classList.add("chromium");

  // ── i18n: elements with data-i18n="key" get their text from window.I18N[lang][key] (index only) ──
  var LANGS = ["fr", "en", "ro", "de", "es", "it"];
  function pick() {
    var q = new URLSearchParams(location.search).get("lang");
    if (LANGS.indexOf(q) >= 0) return q;
    try { var s = localStorage.getItem("glisart-lang"); if (LANGS.indexOf(s) >= 0) return s; } catch (e) {}
    var n = (navigator.language || "fr").slice(0, 2);
    return LANGS.indexOf(n) >= 0 ? n : "fr";
  }
  function apply(lang) {
    var d = window.I18N && (window.I18N[lang] || window.I18N.fr);
    if (!d) return;
    root.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = d[el.getAttribute("data-i18n")];
      if (v != null) el.innerHTML = v; // dictionary is ours (static), never user input
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var v = d[el.getAttribute("data-i18n-alt")];
      if (v != null) el.setAttribute("alt", v);
    });
    if (d.meta_title) document.title = d.meta_title;
    var sel = document.getElementById("lang");
    if (sel) sel.value = lang;
  }
  var sel = document.getElementById("lang");
  if (sel && window.I18N) {
    apply(pick());
    sel.addEventListener("change", function () {
      try { localStorage.setItem("glisart-lang", sel.value); } catch (e) {}
      apply(sel.value);
    });
  }

  // ── Sheen: --mx/--my on each glass element ──
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.addEventListener("pointermove", function (e) {
      document.querySelectorAll(".glass").forEach(function (g) {
        var r = g.getBoundingClientRect();
        g.style.setProperty("--mx", (e.clientX - r.left) + "px");
        g.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    }, { passive: true });
  }

  // ── Reveal ──
  var els = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add("in"); });
})();
