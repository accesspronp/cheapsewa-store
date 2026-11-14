import { getStore } from "@netlify/blobs";
import { timingSafeEqual, scryptSync, randomBytes } from "node:crypto";

export const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
export const clean = (v, m) => String(v ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, m);
export const STAGES = ["pending", "verifying", "approved", "processing", "delivered", "rejected"];
export const validId = (id) => /^[a-z0-9-]{5,60}$/.test(id || "");
export const ekey = (e) => Buffer.from(String(e).toLowerCase()).toString("base64url");

export function adminOk(req) {
  const pw = (process.env.ADMIN_PASSWORD || "").trim();
  const a = Buffer.from(pw), b = Buffer.from((req.headers.get("x-admin-password") || "").trim());
  return pw.length >= 8 && a.length === b.length && timingSafeEqual(a, b);
}
export function hashPw(pw, salt = randomBytes(16).toString("hex")) {
  return { salt, hash: scryptSync(pw, salt, 64).toString("hex") };
}
export function checkPw(pw, salt, hash) {
  const a = Buffer.from(scryptSync(pw, salt, 64).toString("hex")), b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function userFrom(req) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (!/^[a-f0-9]{64}$/.test(t)) return null;
  const s = await getStore("sessions").get(t, { type: "json" });
  if (!s || s.exp < Date.now()) return null;
  return await getStore("users").get(ekey(s.email), { type: "json" });
}

export const adminConfigured = () => (process.env.ADMIN_PASSWORD || "").trim().length >= 8;
// Wrap a handler so a crash returns readable JSON instead of an empty 500 page
export const safe = (fn) => async (req, ctx) => {
  try { return await fn(req, ctx); }
  catch (e) { console.error("Function error:", e); return json({ ok: false, error: "Server error: " + String((e && e.message) || e).slice(0, 200) }, 500); }
};
