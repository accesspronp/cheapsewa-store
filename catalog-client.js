/* Shared catalog helpers + cart storage. Loaded on every page after products-data.js */
(function () {
  var CS = window.CS = {};
  var PALETTE = ["#6740ed", "#0a66c2", "#e50914", "#16a879", "#f47521", "#12a9df", "#b66b42", "#2775d2"];

  CS.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  CS.money = function (n) { return "NPR " + Number(n).toLocaleString("en-IN"); };

  /* plan = [label, price, salePrice(0 = none), inStock(1/0)] */
  CS.eff = function (pl) { var p = Number(pl[1]), s = Number(pl[2]) || 0; return s > 0 && s < p ? s : p; };
  CS.onSale = function (pl) { return CS.eff(pl) < Number(pl[1]); };
  CS.pct = function (pl) { return Math.round((1 - CS.eff(pl) / Number(pl[1])) * 100); };
  CS.planOk = function (pl) { return pl[3] !== 0 && pl[3] !== false; };
  CS.prodOk = function (p) { return p.inStock !== false && p.plans.some(CS.planOk); };
  CS.cheapest = function (p) {
    var ok = p.plans.filter(CS.planOk), l = ok.length ? ok : p.plans;
    return l.reduce(function (a, b) { return CS.eff(b) < CS.eff(a) ? b : a; });
  };
  CS.find = function (id) { return (window.CS_PRODUCTS || []).filter(function (p) { return p.id === Number(id); })[0]; };

  /* Small blue pills shown on product boxes. Give a product its own list with  pills:["Sale","Cheap"]  in products-data.js to override. */
  CS.PILL_EXTRA = ["Special offer", "Cheap"];
  CS.pills = function (p) {
    if (Array.isArray(p.pills)) return p.pills.slice(0, 2);
    var ch = CS.cheapest(p);
    return [CS.onSale(ch) ? CS.pct(ch) + "% OFF" : "Sale", CS.PILL_EXTRA[Number(p.id) % CS.PILL_EXTRA.length]];
  };
  CS.pillHtml = function (p) { return '<span class="pill-stack">' + CS.pills(p).map(function (t) { return '<span class="blue-pill">' + CS.esc(t) + "</span>"; }).join("") + "</span>"; };

  /* Brand-coloured tile used when an image link is missing or blocked */
  CS.fb = function (p) {
    var c = (p && p.color) || "#6740ed", t = String((p && (p.symbol || p.name)) || "?").trim().slice(0, 2).toUpperCase();
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c + '"/><stop offset="1" stop-color="#1b1f3b"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/><text x="400" y="300" font-family="Arial,sans-serif" font-size="190" font-weight="800" fill="#fff" fill-opacity=".92" text-anchor="middle">' + CS.esc(t) + '</text></svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };
  CS.imgErr = function (el) { el.onerror = null; el.src = CS.fb(CS.find(el.getAttribute("data-pid"))); };
  CS.img = function (p, cls) {
    return '<img class="' + cls + '" src="' + CS.esc(p.img || CS.fb(p)) + '" alt="' + CS.esc(p.name) + '" data-pid="' + p.id + '" referrerpolicy="no-referrer" loading="lazy" onerror="CS.imgErr(this)">';
  };

  /* ---------- Cart (saved in this browser, shared by shop + product pages) ---------- */
  var KEY = "cs_cart_v2";
  CS.cart = {
    load: function () { try { var a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } },
    save: function (l) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} document.dispatchEvent(new Event("cs-cart")); },
    add: function (id, plan, qty) {
      var l = this.load(), it = l.filter(function (x) { return x.id === id && x.plan === plan; })[0];
      if (it) it.qty = Math.min(10, it.qty + (qty || 1)); else l.push({ id: id, plan: plan, qty: Math.min(10, qty || 1) });
      this.save(l);
    },
    count: function () { return this.load().reduce(function (s, x) { return s + x.qty; }, 0); }
  };

  /* ---------- Merge admin changes into the built-in catalog ---------- */
  function plansOf(arr) {
    return arr.map(function (x) { return [String(x[0]), Number(x[1]), Number(x[2]) || 0, x[3] === 0 || x[3] === false ? 0 : 1]; });
  }
  window.CS_READY = Promise.race([
    fetch("/api/catalog").then(function (r) { return r.json(); }).then(function (j) {
      var list = window.CS_PRODUCTS || [], ovs = j.overrides || {}, custom = j.custom || {};
      Object.keys(custom).forEach(function (k) {
        var c = custom[k];
        if (!c || list.some(function (p) { return p.id === Number(c.id); })) return;
        list.push({ id: Number(c.id), img: "", name: c.name, cat: c.cat, symbol: c.symbol || String(c.name || "?").charAt(0), desc: c.desc || "", plans: plansOf(c.plans || []), featured: Number(c.id), color: c.color || PALETTE[Number(c.id) % PALETTE.length] });
      });
      list.forEach(function (p) {
        var o = ovs[p.id];
        if (!o) return;
        if (Array.isArray(o.plans) && o.plans.length) p.plans = plansOf(o.plans);
        else if (Array.isArray(o.prices)) p.plans = p.plans.map(function (pl, i) { return [pl[0], o.prices[i] != null && isFinite(o.prices[i]) ? Number(o.prices[i]) : pl[1]]; });
        if (o.name) p.name = o.name;
        if (o.desc) p.desc = o.desc;
        if (o.img) p.img = o.img;
        if (o.cat) p.cat = o.cat;
        if (o.badge) p.badge = o.badge;
        p.inStock = o.inStock !== false;
        p.hidden = o.hidden === true;
      });
      for (var i = list.length - 1; i >= 0; i--) if (list[i].hidden) list.splice(i, 1); // removed products disappear from the shop
      window.CS_TEXTS = j.texts || {};
    }).catch(function () {}),
    new Promise(function (r) { setTimeout(r, 2500); })
  ]).then(function () {
    var run = function () { document.querySelectorAll("[data-cms]").forEach(function (e) { var v = (window.CS_TEXTS || {})[e.dataset.cms]; if (v) e.textContent = v; }); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  });
})();
