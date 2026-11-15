// Server-side price check: the website never decides what a customer pays.
// Built-in products come from public/products-data.js (bundled via netlify.toml included_files);
// admin edits (prices, sale prices, stock, hidden, custom products) come from the "catalog" blob store.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let cache;
export function loadBuiltins() {
  if (cache !== undefined) return cache;
  const here = (() => { try { return path.dirname(fileURLToPath(import.meta.url)); } catch { return ""; } })();
  const cands = [
    process.env.LAMBDA_TASK_ROOT && path.join(process.env.LAMBDA_TASK_ROOT, "public/products-data.js"),
    path.join(process.cwd(), "public/products-data.js"),
    here && path.join(here, "../../public/products-data.js"),
    here && path.join(here, "../public/products-data.js"),
    "/var/task/public/products-data.js",
  ].filter(Boolean);
  for (const f of cands) {
    try {
      const w = {};
      new Function("window", fs.readFileSync(f, "utf8"))(w);
      if (Array.isArray(w.CS_PRODUCTS) && w.CS_PRODUCTS.length) return (cache = w.CS_PRODUCTS);
    } catch { /* try next */ }
  }
  console.error("pricing: products-data.js not found; server price check is OFF");
  return (cache = null);
}

const plansOf = (a) => a.map((x) => [String(x[0]), Number(x[1]), Number(x[2]) || 0, x[3] === 0 || x[3] === false ? 0 : 1]);
export const eff = (pl) => { const p = Number(pl[1]), s = Number(pl[2]) || 0; return s > 0 && s < p ? s : p; };

// Same merge rules as public/catalog-client.js
export function buildCatalog(builtins, overrides = {}, custom = {}) {
  const map = new Map();
  for (const b of builtins) map.set(b.id, { id: b.id, name: b.name, plans: plansOf(b.plans) });
  for (const c of Object.values(custom || {})) if (c && !map.has(Number(c.id))) map.set(Number(c.id), { id: Number(c.id), name: c.name, plans: plansOf(c.plans || []) });
  for (const [id, p] of map) {
    const o = (overrides || {})[id];
    p.inStock = true; p.hidden = false;
    if (!o) continue;
    if (Array.isArray(o.plans) && o.plans.length) p.plans = plansOf(o.plans);
    else if (Array.isArray(o.prices)) p.plans = p.plans.map((pl, i) => [pl[0], o.prices[i] != null && isFinite(o.prices[i]) ? Number(o.prices[i]) : pl[1], 0, pl[3]]);
    if (o.name) p.name = o.name;
    p.inStock = o.inStock !== false;
    p.hidden = o.hidden === true;
  }
  return map;
}

export function findCoupon(coupons, code) {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return null;
  return (coupons || []).find((x) => x && x.active !== false && String(x.code).toUpperCase() === c) || null;
}

export function priceCart(catalog, items, coupons, code) {
  if (!Array.isArray(items) || !items.length || items.length > 30) return { ok: false, error: "Your cart is empty or invalid" };
  const lines = []; let sub = 0;
  for (const it of items) {
    const id = Number(it && it.id), qty = Math.floor(Number(it && it.qty));
    const p = catalog.get(id);
    if (!p || p.hidden) return { ok: false, error: "A product in your cart is no longer available" };
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) return { ok: false, error: "Invalid quantity" };
    const pl = p.plans.find((x) => x[0] === String(it.plan));
    if (!pl) return { ok: false, error: p.name + ": that plan no longer exists. Please refresh your cart." };
    if (!p.inStock || pl[3] === 0) return { ok: false, status: 409, error: p.name + " (" + pl[0] + ") is out of stock" };
    const unit = eff(pl);
    lines.push({ id, name: p.name, plan: pl[0], qty, unit });
    sub += unit * qty;
  }
  let percent = 0, couponCode = "";
  if (code) {
    const c = findCoupon(coupons, code);
    if (!c) return { ok: false, error: "This coupon is not valid any more" };
    percent = Math.min(90, Math.max(1, Math.round(Number(c.percent)))); couponCode = String(c.code).toUpperCase();
  }
  const discount = Math.round(sub * percent / 100);
  return { ok: true, lines, subtotal: sub, discount, total: sub - discount, coupon: couponCode, percent };
}
