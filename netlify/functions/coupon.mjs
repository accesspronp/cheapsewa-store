import { getStore } from "@netlify/blobs";
import { json, safe } from "../lib/lib.mjs";
import { findCoupon } from "../lib/pricing.mjs";

export default safe(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  let b; try { b = await req.json(); } catch { return json({ ok: false, error: "Invalid request" }, 400); }
  const coupons = (await getStore("catalog").get("coupons", { type: "json" })) || [];
  const c = findCoupon(coupons, String(b.code || "").slice(0, 30));
  if (!c) { await new Promise((r) => setTimeout(r, 500)); return json({ ok: false, error: "This coupon code is not valid" }, 404); }
  return json({ ok: true, code: String(c.code).toUpperCase(), percent: Math.min(90, Math.max(1, Math.round(Number(c.percent)))) });
});
export const config = { path: "/api/coupon" };
