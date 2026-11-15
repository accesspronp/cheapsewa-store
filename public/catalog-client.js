window.CS_READY = Promise.race([
  fetch("/api/catalog").then(r => r.json()).then(j => {
    (window.CS_PRODUCTS || []).forEach(p => {
      const o = j.overrides && j.overrides[p.id];
      if (!o) return;
      if (Array.isArray(o.plans) && o.plans.length) p.plans = o.plans.map(x => [String(x[0]), Number(x[1])]);
      else if (Array.isArray(o.prices)) p.plans = p.plans.map((pl, i) => [pl[0], o.prices[i] != null && isFinite(o.prices[i]) ? Number(o.prices[i]) : pl[1]]);
      if (o.name) p.name = o.name;
      if (o.desc) p.desc = o.desc;
      if (o.img) p.img = o.img;
      p.inStock = o.inStock !== false;
    });
    window.CS_TEXTS = j.texts || {};
  }).catch(() => {}),
  new Promise(r => setTimeout(r, 2500))
]).then(() => {
  const run = () => document.querySelectorAll("[data-cms]").forEach(e => { const v = (window.CS_TEXTS || {})[e.dataset.cms]; if (v) e.textContent = v; });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
});
