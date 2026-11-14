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
      const prices = (Array.isArray(b.prices) ? b.prices : []).slice(0, 12).map((x) => Math.round(Number(x)));
      if (prices.some((x) => !Number.isFinite(x) || x < 0 || x > 1000000)) return json({ ok: false, error: "Invalid price" }, 400);
      const store = getStore("catalog"), ov = (await store.get("overrides", { type: "json" })) || {};
      ov[pid] = { prices, inStock: b.inStock !== false };
      await store.setJSON("overrides", ov);
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
