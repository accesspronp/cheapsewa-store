import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";

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

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid request" }, 400); }

  const name = clean(body.name, 80);
  const phone = clean(body.phone, 20).replace(/[^\d+]/g, "");
  const product = clean(body.product, 300);
  const plan = clean(body.plan, 100);
  const method = clean(body.method, 30);
  const amount = Number(body.amount);

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
  await getStore("orders").setJSON(id, {
    id, createdAt: new Date(now).toISOString(), name, phone, product, plan, amount, method,
    status: "pending", hasImage: true, mime
  });
  return json({ ok: true, id });
};

export const config = { path: "/api/submit-order" };
