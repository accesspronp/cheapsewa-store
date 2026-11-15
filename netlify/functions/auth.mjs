import { getStore } from "@netlify/blobs";
import { randomBytes, randomInt, createHash, timingSafeEqual } from "node:crypto";
import { json, clean, ekey, hashPw, checkPw, userFrom, safe } from "../lib/lib.mjs";
import { sendMail, mailConfigured, codeEmail } from "../lib/mail.mjs";
const sha = (s) => createHash("sha256").update(s).digest("hex");

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
  if (b.action === "updateName") {
    const u = await userFrom(req);
    if (!u) return json({ ok: false, error: "Not signed in" }, 401);
    const name = clean(b.name, 80);
    if (name.length < 2) return json({ ok: false, error: "Name must be at least 2 characters" }, 400);
    await users.setJSON(ekey(u.email), { ...u, name });
    return json({ ok: true, user: { name, email: u.email } });
  }
  const email = clean(b.email, 120).toLowerCase(), password = String(b.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, error: "Enter a valid email" }, 400);

  if (b.action === "sendCode") {
    if (!mailConfigured()) return json({ ok: false, error: "Email code sign-in is not set up yet. Please use your password." }, 503);
    const otps = getStore("otp"), limits = getStore("limits"), k = ekey(email), now = Date.now();
    const ip = (req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "x").split(",")[0].trim().replace(/[^0-9a-fA-F.:]/g, "").slice(0, 45) || "x";
    let ipr = await limits.get("otpip-" + ip, { type: "json" });
    if (!ipr || now - ipr.start > 3600000) ipr = { start: now, count: 0 };
    if (ipr.count >= 15) return json({ ok: false, error: "Too many requests. Please try again later." }, 429);
    let r = (await otps.get(k, { type: "json" })) || {};
    const sent = (r.sent || []).filter((t) => now - t < 3600000);
    if (r.last && now - r.last < 60000) return json({ ok: false, error: "Please wait " + Math.ceil((60000 - (now - r.last)) / 1000) + " seconds before asking for a new code." }, 429);
    if (sent.length >= 5) return json({ ok: false, error: "Too many codes requested for this email. Try again in an hour." }, 429);
    const code = String(randomInt(0, 1000000)).padStart(6, "0"), salt = randomBytes(8).toString("hex");
    await otps.setJSON(k, { hash: sha(salt + code), salt, exp: now + 600000, tries: 0, last: now, sent: [...sent, now] });
    ipr.count++; await limits.setJSON("otpip-" + ip, ipr);
    try { await sendMail({ to: email, ...codeEmail(code) }); }
    catch (e) { console.error("Mail error:", e && e.message); await otps.delete(k); return json({ ok: false, error: "We could not send the email right now. Please try again or use your password." }, 502); }
    return json({ ok: true });
  }
  if (b.action === "verifyCode") {
    const otps = getStore("otp"), k = ekey(email), now = Date.now(), code = String(b.code || "").replace(/\D/g, "").slice(0, 6);
    const r = await otps.get(k, { type: "json" });
    if (!r || r.exp < now) return json({ ok: false, error: "This code has expired. Please request a new one." }, 400);
    if (r.tries >= 5) { await otps.delete(k); return json({ ok: false, error: "Too many wrong attempts. Please request a new code." }, 429); }
    const a1 = Buffer.from(sha(r.salt + code)), b1 = Buffer.from(r.hash);
    if (code.length !== 6 || a1.length !== b1.length || !timingSafeEqual(a1, b1)) {
      r.tries++; await otps.setJSON(k, r); await new Promise((x) => setTimeout(x, 500));
      return json({ ok: false, error: "Wrong code. Check the email and try again." }, 401);
    }
    await otps.delete(k);
    let u = await users.get(ekey(email), { type: "json" });
    if (!u) {
      u = { id: randomBytes(6).toString("hex"), name: clean(b.name, 80) || email.split("@")[0], email, phone: "", createdAt: new Date().toISOString(), emailVerified: true };
      await users.setJSON(ekey(email), u);
    }
    return start(u);
  }

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
    if (u && !u.hash) return json({ ok: false, error: "This account signs in with an email code. Use the Email code tab." }, 401);
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
