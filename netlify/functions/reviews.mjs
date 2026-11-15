import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { json, safe, clean, ekey, userFrom } from "../lib/lib.mjs";

// Reviews are stored per product: store "reviews", key "p<productId>" -> array of reviews.
// Public output never includes the customer's email.
const pid = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 && n < 100000 ? n : 0; };
const shortName = (n) => clean(n, 60) || "Customer";   // full name as on the account
const pub = (r) => ({ id: r.id, name: r.name, rating: r.rating, text: r.text, createdAt: r.createdAt });
const summary = (list) => ({ count: list.length, avg: list.length ? Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10 : 0 });

export default safe(async (req) => {
  const store = getStore("reviews");

  if (req.method === "GET") {
    const id = pid(new URL(req.url).searchParams.get("product"));
    if (!id) return json({ ok: false, error: "Bad product" }, 400);
    const list = ((await store.get("p" + id, { type: "json" })) || []).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return json({ ok: true, ...summary(list), reviews: list.slice(0, 100).map(pub) });
  }

  if (req.method === "POST") {
    const user = await userFrom(req);
    if (!user) return json({ ok: false, error: "Please sign in to write a review." }, 401);
    let b; try { b = await req.json(); } catch { return json({ ok: false, error: "Invalid request" }, 400); }
    const id = pid(b.product), rating = Math.round(Number(b.rating)), text = clean(b.text, 500);
    if (!id) return json({ ok: false, error: "Bad product" }, 400);
    if (!(rating >= 1 && rating <= 5)) return json({ ok: false, error: "Choose a star rating from 1 to 5." }, 400);
    if (text.length < 5) return json({ ok: false, error: "Please write at least 5 characters." }, 400);
    const list = (await store.get("p" + id, { type: "json" })) || [];
    const who = ekey(user.email), now = new Date().toISOString();
    const mine = list.find((r) => r.by === who);
    if (mine) { mine.rating = rating; mine.text = text; mine.name = shortName(user.name); mine.editedAt = now; }   // one review per customer per product (re-posting edits it)
    else list.push({ id: randomBytes(6).toString("hex"), by: who, name: shortName(user.name), rating, text, createdAt: now });
    await store.setJSON("p" + id, list.slice(-500));
    return json({ ok: true, edited: !!mine });
  }
  return json({ ok: false, error: "Method not allowed" }, 405);
});
export const config = { path: "/api/reviews" };
