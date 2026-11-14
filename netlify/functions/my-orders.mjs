import { getStore } from "@netlify/blobs";
import { json, ekey, userFrom, validId, safe } from "../lib/lib.mjs";

const pub = (o) => ({ id: o.id, createdAt: o.createdAt, product: o.product, plan: o.plan, amount: o.amount, method: o.method, status: o.status, history: o.history || [], note: o.note || "" });

export default safe(async (req) => {
  const orders = getStore("orders");
  const user = await userFrom(req);
  if (user) {
    const ids = (await getStore("userorders").get(ekey(user.email), { type: "json" })) || [];
    const items = (await Promise.all(ids.slice(-50).map((i) => orders.get(i, { type: "json" })))).filter(Boolean).reverse();
    return json({ ok: true, orders: items.map(pub) });
  }
  const url = new URL(req.url), id = url.searchParams.get("id"), phone = (url.searchParams.get("phone") || "").replace(/[^\d+]/g, "");
  if (validId(id) && phone) {
    const o = await orders.get(id, { type: "json" });
    if (o && o.phone === phone) return json({ ok: true, orders: [pub(o)] });
  }
  return json({ ok: false, error: "Order not found. Check the Order ID and phone number." }, 404);
});
export const config = { path: "/api/my-orders" };
