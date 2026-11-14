import { getStore } from "@netlify/blobs";
import { timingSafeEqual } from "node:crypto";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
const STATUSES = ["pending", "approved", "rejected", "delivered"];
const validId = (id) => /^[a-z0-9-]{5,60}$/.test(id || "");

function authed(req) {
  const pw = process.env.ADMIN_PASSWORD || "";
  const given = req.headers.get("x-admin-password") || "";
  if (pw.length < 8) return false;
  const a = Buffer.from(pw), b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async (req) => {
  if (!authed(req)) {
    await new Promise((r) => setTimeout(r, 800));
    return json({ ok: false, error: "Unauthorized" }, 401);
  }
  const orders = getStore("orders");
  const shots = getStore("screenshots");
  const url = new URL(req.url);

  if (req.method === "GET") {
    const action = url.searchParams.get("action");
    if (action === "list") {
      const { blobs } = await orders.list();
      const keys = blobs.map((b) => b.key).sort().reverse().slice(0, 200);
      const items = (await Promise.all(keys.map((k) => orders.get(k, { type: "json" })))).filter(Boolean);
      return json({ ok: true, orders: items });
    }
    if (action === "image") {
      const id = url.searchParams.get("id");
      if (!validId(id)) return json({ ok: false, error: "Bad id" }, 400);
      const order = await orders.get(id, { type: "json" });
      const data = await shots.get(id, { type: "arrayBuffer" });
      if (!order || !data) return json({ ok: false, error: "Not found" }, 404);
      return new Response(data, { headers: { "Content-Type": order.mime || "image/jpeg", "Cache-Control": "private, no-store" } });
    }
    return json({ ok: false, error: "Unknown action" }, 400);
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid request" }, 400); }
    if (!validId(body.id)) return json({ ok: false, error: "Bad id" }, 400);
    const order = await orders.get(body.id, { type: "json" });
    if (!order) return json({ ok: false, error: "Not found" }, 404);
    if (body.action === "status") {
      if (!STATUSES.includes(body.status)) return json({ ok: false, error: "Bad status" }, 400);
      order.status = body.status;
      order.updatedAt = new Date().toISOString();
      await orders.setJSON(order.id, order);
      return json({ ok: true, order });
    }
    if (body.action === "delete") {
      await shots.delete(order.id);
      await orders.delete(order.id);
      return json({ ok: true });
    }
    return json({ ok: false, error: "Unknown action" }, 400);
  }
  return json({ ok: false, error: "Method not allowed" }, 405);
};

export const config = { path: "/api/admin" };
