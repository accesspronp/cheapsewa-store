import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { userFrom, ekey, safe } from "../lib/lib.mjs";
import { loadBuiltins, buildCatalog, priceCart } from "../lib/pricing.mjs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);
const METHODS = ["eSewa", "Khalti", "Fonepay", "Bank Transfer"];
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_PER_HOUR = 5;

function sniff(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

export default safe(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid request" }, 400); }

  const name = clean(body.name, 80);
  const phone = clean(body.phone, 20).replace(/[^\d+]/g, "");
  let product = clean(body.product, 300);
  let plan = clean(body.plan, 100);
  const method = clean(body.method, 30);
  let amount = Number(body.amount);

  if (!name || !product) return json({ ok: false, error: "Missing details" }, 400);
  if (!/^\+?\d{7,15}$/.test(phone)) return json({ ok: false, error: "Invalid phone number" }, 400);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return json({ ok: false, error: "Invalid amount" }, 400);
  if (!METHODS.includes(method)) return json({ ok: false, error: "Invalid payment method" }, 400);

  const s = String(body.screenshot || "");
  const comma = s.indexOf(",");
  if (comma < 0 || !/^data:image\/(jpeg|png|webp);base64$/.test(s.slice(0, comma)))
    return json({ ok: false, error: "Screenshot must be an image" }, 400);
  const bytes = Buffer.from(s.slice(comma + 1), "base64");
  if (bytes.length < 500) return json({ ok: false, error: "Screenshot is empty" }, 400);
  if (bytes.length > MAX_BYTES) return json({ ok: false, error: "Screenshot is too large" }, 413);
  const mime = sniff(bytes);
  if (!mime) return json({ ok: false, error: "Screenshot must be a real image" }, 400);

  // Price the order on the server so discounts, sale prices and stock can never be faked in the browser.
  let extra = {};
  const cartItems = Array.isArray(body.items) ? body.items.slice(0, 30) : null;
  const builtins = cartItems ? loadBuiltins() : null;
  if (cartItems && builtins) {
    const cs = getStore("catalog");
    const [ov, custom, coupons] = await Promise.all([cs.get("overrides", { type: "json" }), cs.get("custom", { type: "json" }), cs.get("coupons", { type: "json" })]);
    const priced = priceCart(buildCatalog(builtins, ov || {}, custom || {}), cartItems, coupons || [], clean(body.coupon, 30));
    if (!priced.ok) return json({ ok: false, error: priced.error }, priced.status || 400);
    if (priced.total !== amount) extra.clientAmount = amount;
    amount = priced.total;
    product = priced.lines.map((l) => `${l.name} (${l.plan}) x ${l.qty}`).join(", ").slice(0, 300);
    plan = priced.lines.length === 1 ? priced.lines[0].plan : "Cart order";
    extra.items = priced.lines; extra.subtotal = priced.subtotal; extra.discount = priced.discount; extra.coupon = priced.coupon;
  } else {
    // fallback (older page, or product list not readable on the server): at least block out-of-stock products
    const ids = [Number(body.productId)].concat(Array.isArray(body.productIds) ? body.productIds.slice(0, 30).map(Number) : []).concat(cartItems ? cartItems.map((x) => Number(x && x.id)) : []).filter((x) => x > 0);
    if (ids.length) {
      const ov = (await getStore("catalog").get("overrides", { type: "json" })) || {};
      if (ids.some((i) => ov[i] && ov[i].inStock === false)) return json({ ok: false, error: "An item in your order is out of stock" }, 409);
    }
  }
  const user = await userFrom(req);
  const limits = getStore("limits");
  const now = Date.now();
  let rec = await limits.get(phone, { type: "json" });
  if (!rec || now - rec.start > 3600 * 1000) rec = { start: now, count: 0 };
  if (rec.count >= MAX_PER_HOUR) return json({ ok: false, error: "Too many attempts. Please try again later." }, 429);
  rec.count++;
  await limits.setJSON(phone, rec);

  const id = `${now}-${randomBytes(3).toString("hex")}`;
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  await getStore("screenshots").set(id, ab);
  const at = new Date(now).toISOString();
  await getStore("orders").setJSON(id, {
    id, createdAt: at, name, phone, product, plan, amount, method,
    status: "pending", history: [{ status: "pending", at }], note: "", hasImage: true, mime,
    userEmail: user ? user.email : null, ...extra
  });
  if (user) {
    const us = getStore("userorders"), k = ekey(user.email);
    const list = (await us.get(k, { type: "json" })) || [];
    list.push(id);
    await us.setJSON(k, list);
  }
  return json({ ok: true, id });
});

export const config = { path: "/api/submit-order" };
