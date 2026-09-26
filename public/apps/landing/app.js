/* GUPAN landing — preloader 1..99 + count-up stats. */
"use strict";

/* ---------- preloader 1% → 99% ---------- */
(function preloader() {
  const loader = document.getElementById("loader");
  const pct = document.getElementById("loaderPct");
  const bar = document.getElementById("loaderBar");
  if (!loader || !pct || !bar) return;
  let p = 1;
  let pageLoaded = document.readyState === "complete";
  let finished = false;
  const started = Date.now();
  const paint = () => {
    pct.textContent = p + "%";
    bar.style.width = p + "%";
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    p = 100;
    paint();
    setTimeout(() => {
      loader.classList.add("done");
      setTimeout(() => loader.remove(), 500);
    }, 250);
  };
  window.addEventListener("load", () => { pageLoaded = true; });
  setTimeout(finish, 6000);
  const tick = () => {
    if (finished) return;
    if (p < 99) {
      p += 1;
      paint();
      setTimeout(tick, p < 60 ? 14 : p < 85 ? 28 : 60);
      return;
    }
    if (pageLoaded && Date.now() - started > 1000) {
      finish();
      return;
    }
    setTimeout(tick, 60);
  };
  paint();
  tick();
})();

/* ---------- count-up stats in แกนหลัง ---------- */
(function countUp() {
  const els = document.querySelectorAll("[data-count]");
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => { el.textContent = el.dataset.count; });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      io.unobserve(el);
      const target = Number(el.dataset.count);
      const t0 = Date.now();
      const dur = 1200;
      const step = () => {
        const k = Math.min(1, (Date.now() - t0) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      step();
    }
  }, { threshold: 0.4 });
  els.forEach((el) => io.observe(el));
})();

document.getElementById("year").textContent = new Date().getFullYear();
