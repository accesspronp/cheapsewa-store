import { getStore } from "@netlify/blobs";
import { json, adminOk, adminConfigured, safe, validId, STAGES, ekey, hashPw } from "../lib/lib.mjs";

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
    if (b.action === "setProduct") {
      const pid = Number(b.productId);
      if (!Number.isInteger(pid) || pid < 0) return json({ ok: false, error: "Bad product" }, 400);
      const store = getStore("catalog"), ov = (await store.get("overrides", { type: "json" })) || {};
      const next = { ...(ov[pid] || {}), inStock: b.inStock !== false };
      if (Array.isArray(b.plans)) {
        const plans = b.plans.slice(0, 12).map((p) => [String((p && p.label) || "").trim().slice(0, 30), Math.round(Number(p && p.price))]);
        if (!plans.length || plans.some((p) => !p[0] || !Number.isFinite(p[1]) || p[1] < 0 || p[1] > 1000000)) return json({ ok: false, error: "Every plan needs a name and a valid price" }, 400);
        next.plans = plans; delete next.prices;
      } else if (Array.isArray(b.prices)) {
        const prices = b.prices.slice(0, 12).map((x) => Math.round(Number(x)));
        if (prices.some((x) => !Number.isFinite(x) || x < 0 || x > 1000000)) return json({ ok: false, error: "Invalid price" }, 400);
        next.prices = prices;
      }
      if (typeof b.name === "string") { const n = b.name.trim().slice(0, 60); if (n) next.name = n; else delete next.name; }
      if (typeof b.desc === "string") { const d = b.desc.trim().slice(0, 220); if (d) next.desc = d; else delete next.desc; }
      ov[pid] = next;
      await store.setJSON("overrides", ov);
      return json({ ok: true, override: next });
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
