window.CS_READY = Promise.race([
  fetch("/api/catalog").then(r => r.json()).then(j => {
    (window.CS_PRODUCTS || []).forEach(p => {
      const o = j.overrides && j.overrides[p.id];
      if (!o) return;
      if (Array.isArray(o.prices)) p.plans = p.plans.map((pl, i) => [pl[0], o.prices[i] != null && isFinite(o.prices[i]) ? Number(o.prices[i]) : pl[1]]);
      p.inStock = o.inStock !== false;
    });
  }).catch(() => {}),
  new Promise(r => setTimeout(r, 2500))
]);
