import { randomBytes } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { sendMail, mailConfigured } from "../lib/mail.mjs";
import { json, adminOk, adminConfigured, safe, validId, STAGES, ekey, hashPw, clean } from "../lib/lib.mjs";
import { loadBuiltins } from "../lib/pricing.mjs";

const CATS = ["AI & Productivity", "Streaming", "Software", "Education", "Design"];
const COLORS = ["#6740ed", "#0a66c2", "#e50914", "#16a879", "#f47521", "#12a9df", "#b66b42", "#2775d2"];
// plan = [label, price, salePrice (0 = none), inStock (1/0)]
function parsePlans(arr) {
  if (!Array.isArray(arr)) return { error: "Plans missing" };
  const plans = arr.slice(0, 12).map((p) => [clean(p && p.label, 40), Math.round(Number(p && p.price)), Math.round(Number(p && p.sale)) || 0, p && p.inStock === false ? 0 : 1]);
  if (!plans.length || plans.some((p) => !p[0] || !Number.isFinite(p[1]) || p[1] < 0 || p[1] > 1000000)) return { error: "Every plan needs a name and a valid price" };
  if (plans.some((p) => p[2] < 0 || (p[2] > 0 && p[2] >= p[1]))) return { error: "A sale price must be lower than the normal price (or leave it empty)" };
  if (new Set(plans.map((p) => p[0].toLowerCase())).size !== plans.length) return { error: "Two plans have the same name" };
  return { plans };
}

export default safe(async (req) => {
  // Public health check (reveals nothing secret): is the password set on the server?
  if (req.method === "GET" && new URL(req.url).searchParams.get("action") === "ping")
    return json({ ok: true, configured: adminConfigured() });
  if (!adminOk(req)) { await new Promise((r) => setTimeout(r, 800)); return json({ ok: false, error: "Unauthorized" }, 401); }
  const orders = getStore("orders"), shots = getStore("screenshots"), url = new URL(req.url);

  if (req.method === "GET") {
    const a = url.searchParams.get("action");
    if (a === "list") {
      const { blobs } = await orders.list();
      const keys = blobs.map((b) => b.key).sort().reverse().slice(0, 200);
      return json({ ok: true, orders: (await Promise.all(keys.map((k) => orders.get(k, { type: "json" })))).filter(Boolean) });
    }
    if (a === "users") {
      const { blobs } = await getStore("users").list();
      const us = (await Promise.all(blobs.map((b) => getStore("users").get(b.key, { type: "json" })))).filter(Boolean)
        .map((u) => ({ name: u.name, email: u.email, phone: u.phone, createdAt: u.createdAt }));
      return json({ ok: true, users: us.sort((x, y) => y.createdAt.localeCompare(x.createdAt)) });
    }
    if (a === "reviews") {            // every review of every product, newest first (email shown only here, for moderation)
      const st = getStore("reviews"), { blobs } = await st.list(), out = [];
      for (const bl of blobs) {
        const pidn = Number(String(bl.key).slice(1)), list = (await st.get(bl.key, { type: "json" })) || [];
        for (const r of list) out.push({ product: pidn, id: r.id, name: r.name, email: r.by === "admin" ? "(added by admin)" : (() => { try { return Buffer.from(String(r.by), "base64url").toString(); } catch { return ""; } })(), custom: r.by === "admin", rating: r.rating, text: r.text, createdAt: r.createdAt });
      }
      return json({ ok: true, reviews: out.sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 500) });
    }
    if (a === "status") return json({ ok: true, priceCheck: !!loadBuiltins() });
    if (a === "coupons") return json({ ok: true, coupons: (await getStore("catalog").get("coupons", { type: "json" })) || [] });
    if (a === "image") {
      const id = url.searchParams.get("id");
      if (!validId(id)) return json({ ok: false, error: "Bad id" }, 400);
      const o = await orders.get(id, { type: "json" }), d = await shots.get(id, { type: "arrayBuffer" });
      if (!o || !d) return json({ ok: false, error: "Not found" }, 404);
      return new Response(d, { headers: { "Content-Type": o.mime || "image/jpeg", "Cache-Control": "private, no-store" } });
    }
    return json({ ok: false, error: "Unknown action" }, 400);
  }

  if (req.method === "POST") {
    let b; try { b = await req.json(); } catch { return json({ ok: false, error: "Invalid request" }, 400); }
    if (b.action === "mailtest") {
      if (!mailConfigured()) return json({ ok: false, error: "SMTP_USER and SMTP_PASS are not set in Netlify environment variables." }, 400);
      const to = String(b.to || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) return json({ ok: false, error: "Enter a valid email address" }, 400);
      try { await sendMail({ to, subject: "CheapSewa.Store test email", text: "Email sending works. Customers can now sign in with email codes." }); return json({ ok: true }); }
      catch (e) { return json({ ok: false, error: "Titan said: " + String((e && e.message) || e).slice(0, 180) }, 502); }
    }
    if (b.action === "addReview") {      // admin writes a review with any name, stars, text and date
      const pidn = Number(b.productId), name = clean(b.name, 60), text = clean(b.text, 500), rating = Math.round(Number(b.rating)), t = new Date(b.createdAt);
      if (!Number.isInteger(pidn) || pidn < 1 || pidn > 99999) return json({ ok: false, error: "Choose a product" }, 400);
      if (name.length < 2) return json({ ok: false, error: "Enter the reviewer's name" }, 400);
      if (!(rating >= 1 && rating <= 5)) return json({ ok: false, error: "Choose 1 to 5 stars" }, 400);
      if (text.length < 5) return json({ ok: false, error: "Write at least 5 characters" }, 400);
      if (isNaN(t.getTime()) || t.getTime() > Date.now() + 86400000 || t.getFullYear() < 2015) return json({ ok: false, error: "Date must be in the past" }, 400);
      const st = getStore("reviews"), list = (await st.get("p" + pidn, { type: "json" })) || [];
      list.push({ id: randomBytes(6).toString("hex"), by: "admin", name, rating, text, createdAt: t.toISOString() });
      await st.setJSON("p" + pidn, list.slice(-500));
      return json({ ok: true });
    }
    if (b.action === "deleteReview") {   // remove a bad comment
      const pidn = Number(b.productId), rid = String(b.reviewId || "");
      if (!Number.isInteger(pidn) || !/^[a-f0-9]{4,20}$/.test(rid)) return json({ ok: false, error: "Bad request" }, 400);
      const st = getStore("reviews"), list = (await st.get("p" + pidn, { type: "json" })) || [], left = list.filter((r) => r.id !== rid);
      if (left.length === list.length) return json({ ok: false, error: "Review not found (maybe already removed)" }, 404);
      await st.setJSON("p" + pidn, left);
      return json({ ok: true });
    }
    if (b.action === "setProduct") {
      const pid = Number(b.productId);
      if (!Number.isInteger(pid) || pid < 0) return json({ ok: false, error: "Bad product" }, 400);
      const store = getStore("catalog"), ov = (await store.get("overrides", { type: "json" })) || {};
      const next = { ...(ov[pid] || {}), inStock: b.inStock !== false };
      if (Array.isArray(b.plans)) {
        const r = parsePlans(b.plans);
        if (r.error) return json({ ok: false, error: r.error }, 400);
        next.plans = r.plans; delete next.prices;
      } else if (Array.isArray(b.prices)) {
        const prices = b.prices.slice(0, 12).map((x) => Math.round(Number(x)));
        if (prices.some((x) => !Number.isFinite(x) || x < 0 || x > 1000000)) return json({ ok: false, error: "Invalid price" }, 400);
        next.prices = prices;
      }
      if (typeof b.badge === "string") { const t = clean(b.badge, 24); if (t) next.badge = t; else delete next.badge; }
      if (typeof b.cat === "string" && CATS.includes(b.cat)) next.cat = b.cat;
      if (typeof b.hidden === "boolean") { if (b.hidden) next.hidden = true; else delete next.hidden; }
      if (typeof b.name === "string") { const n = b.name.trim().slice(0, 60); if (n) next.name = n; else delete next.name; }
      if (typeof b.desc === "string") { const d = b.desc.trim().slice(0, 220); if (d) next.desc = d; else delete next.desc; }
      ov[pid] = next;
      await store.setJSON("overrides", ov);
      return json({ ok: true, override: next });
    }
    if (b.action === "addProduct") {
      const name = clean(b.name, 60), desc = clean(b.desc, 220);
      if (!name) return json({ ok: false, error: "Give the product a name" }, 400);
      if (!CATS.includes(b.cat)) return json({ ok: false, error: "Pick a category" }, 400);
      const r = parsePlans(b.plans);
      if (r.error) return json({ ok: false, error: r.error }, 400);
      const store = getStore("catalog"), custom = (await store.get("custom", { type: "json" })) || {};
      const id = Math.max(100, ...Object.keys(custom).map(Number)) + 1;
      custom[id] = { id, name, cat: b.cat, desc: desc || "Digital subscription.", color: COLORS[id % COLORS.length], symbol: name.charAt(0).toUpperCase(), plans: r.plans };
      await store.setJSON("custom", custom);
      return json({ ok: true, product: custom[id] });
    }
    if (b.action === "deleteProduct") {
      const pid = Number(b.productId), store = getStore("catalog"), custom = (await store.get("custom", { type: "json" })) || {};
      if (!Number.isInteger(pid) || !custom[pid]) return json({ ok: false, error: "Only products you added can be deleted. Built-in products can be hidden instead." }, 400);
      delete custom[pid]; await store.setJSON("custom", custom);
      const ov = (await store.get("overrides", { type: "json" })) || {}; delete ov[pid]; await store.setJSON("overrides", ov);
      await getStore("productimg").delete("p" + pid);
      return json({ ok: true });
    }
    if (b.action === "setCoupons") {
      const list = (Array.isArray(b.coupons) ? b.coupons : []).slice(0, 30).map((c) => ({ code: clean(c && c.code, 20).toUpperCase().replace(/[^A-Z0-9_-]/g, ""), percent: Math.round(Number(c && c.percent)), active: !(c && c.active === false) }));
      if (list.some((c) => c.code.length < 3 || !(c.percent >= 1 && c.percent <= 90))) return json({ ok: false, error: "Each coupon needs a code (3-20 letters/numbers) and a discount from 1 to 90 %" }, 400);
      if (new Set(list.map((c) => c.code)).size !== list.length) return json({ ok: false, error: "Two coupons have the same code" }, 400);
      await getStore("catalog").setJSON("coupons", list);
      return json({ ok: true, coupons: list });
    }
    if (b.action === "setImage" || b.action === "resetImage") {
      const pid = Number(b.productId);
      if (!Number.isInteger(pid) || pid < 0) return json({ ok: false, error: "Bad product" }, 400);
      const store = getStore("catalog"), imgs = getStore("productimg"), ov = (await store.get("overrides", { type: "json" })) || {};
      const next = { ...(ov[pid] || {}) };
      if (b.action === "resetImage") { await imgs.delete("p" + pid); delete next.img; }
      else {
        const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ""));
        if (!m || m[2].length > 1200000) return json({ ok: false, error: "Image missing or too large" }, 400);
        const v = Date.now();
        await imgs.setJSON("p" + pid, { mime: m[1], b64: m[2], v });
        next.img = "/api/product-img?id=" + pid + "&v=" + v;
      }
      ov[pid] = next; await store.setJSON("overrides", ov);
      return json({ ok: true, img: next.img || "" });
    }
    if (b.action === "setTexts") {
      const ALLOWED = ["topbar", "heroBadge", "heroLede", "shopEyebrow", "shopTitle", "shopSub", "contactTitle", "contactSub"];
      const store = getStore("catalog"), out = {};
      for (const k of ALLOWED) { const v = String((b.texts && b.texts[k]) || "").trim().slice(0, 240); if (v) out[k] = v; }
      await store.setJSON("texts", out);
      return json({ ok: true });
    }
    if (b.action === "resetUser") {
      const email = String(b.email || "").toLowerCase().trim(), np = String(b.password || "");
      if (np.length < 8 || np.length > 100) return json({ ok: false, error: "Password must be 8 to 100 characters" }, 400);
      const us = getStore("users"), u = await us.get(ekey(email), { type: "json" });
      if (!u) return json({ ok: false, error: "Customer not found" }, 404);
      const { salt, hash } = hashPw(np); u.salt = salt; u.hash = hash;
      await us.setJSON(ekey(email), u);
      return json({ ok: true });
    }
    if (!validId(b.id)) return json({ ok: false, error: "Bad id" }, 400);
    const o = await orders.get(b.id, { type: "json" });
    if (!o) return json({ ok: false, error: "Not found" }, 404);
    if (b.action === "status") {
      if (!STAGES.includes(b.status)) return json({ ok: false, error: "Bad status" }, 400);
      const at = new Date().toISOString();
      o.history = o.history || [];
      if (o.status !== b.status) o.history.push({ status: b.status, at });
      o.status = b.status; o.updatedAt = at;
      if (typeof b.note === "string") o.note = b.note.replace(/[\u0000-\u0008<>]/g, "").slice(0, 1000);
      await orders.setJSON(o.id, o);
      return json({ ok: true, order: o });
    }
    if (b.action === "delete") { await shots.delete(o.id); await orders.delete(o.id); return json({ ok: true }); }
  }
  return json({ ok: false, error: "Unknown action" }, 400);
});
export const config = { path: "/api/admin" };
