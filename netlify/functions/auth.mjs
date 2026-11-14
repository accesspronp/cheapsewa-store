import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { json, clean, ekey, hashPw, checkPw, userFrom, safe } from "../lib/lib.mjs";

export default safe(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  let b; try { b = await req.json(); } catch { return json({ ok: false, error: "Invalid request" }, 400); }
  const users = getStore("users"), sessions = getStore("sessions");
  const start = async (u) => {
    const token = randomBytes(32).toString("hex");
    await sessions.setJSON(token, { email: u.email, exp: Date.now() + 30 * 864e5 });
    return json({ ok: true, token, user: { name: u.name, email: u.email } });
  };
  if (b.action === "me") {
    const u = await userFrom(req);
    return u ? json({ ok: true, user: { name: u.name, email: u.email } }) : json({ ok: false, error: "Not signed in" }, 401);
  }
  const email = clean(b.email, 120).toLowerCase(), password = String(b.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, error: "Enter a valid email" }, 400);

  if (b.action === "register") {
    const name = clean(b.name, 80);
    if (!name) return json({ ok: false, error: "Enter your name" }, 400);
    if (password.length < 8 || password.length > 100) return json({ ok: false, error: "Password must be 8 to 100 characters" }, 400);
    if (await users.get(ekey(email), { type: "json" })) return json({ ok: false, error: "This email is already registered. Please sign in." }, 409);
    const { salt, hash } = hashPw(password);
    const u = { id: randomBytes(6).toString("hex"), name, email, phone: clean(b.phone, 20).replace(/[^\d+]/g, ""), salt, hash, createdAt: new Date().toISOString() };
    await users.setJSON(ekey(email), u);
    return start(u);
  }
  if (b.action === "login") {
    const limits = getStore("limits"), lk = "login-" + ekey(email), now = Date.now();
    let r = await limits.get(lk, { type: "json" });
    if (!r || now - r.start > 900000) r = { start: now, count: 0 };
    if (r.count >= 8) return json({ ok: false, error: "Too many attempts. Try again in 15 minutes." }, 429);
    const u = await users.get(ekey(email), { type: "json" });
    if (!u || !checkPw(password, u.salt, u.hash)) {
      r.count++; await limits.setJSON(lk, r);
      await new Promise((x) => setTimeout(x, 600));
      return json({ ok: false, error: "Wrong email or password" }, 401);
    }
    return start(u);
  }
  return json({ ok: false, error: "Unknown action" }, 400);
});
export const config = { path: "/api/auth" };
