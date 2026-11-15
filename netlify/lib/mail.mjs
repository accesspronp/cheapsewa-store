import nodemailer from "nodemailer";

export const mailConfigured = () => !!((process.env.SMTP_USER || "").trim() && (process.env.SMTP_PASS || "").trim());

export async function sendMail({ to, subject, text, html }) {
  const user = process.env.SMTP_USER.trim(), pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 465);
  const t = nodemailer.createTransport({
    host: (process.env.SMTP_HOST || "smtp.titan.email").trim(), port, secure: port === 465,
    auth: { user, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
  });
  // Titan only accepts the mailbox you log in with as the sender
  await t.sendMail({ from: '"CheapSewa.Store" <' + user + ">", to, subject, text, html });
}

export const codeEmail = (code) => ({
  subject: code + " is your CheapSewa.Store sign-in code",
  text: "Your CheapSewa.Store sign-in code is " + code + ".\nIt expires in 10 minutes. If you did not ask for it, you can ignore this email.",
  html: '<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #e6e9f5;border-radius:16px">' +
    '<h2 style="margin:0 0 6px;color:#151a30">CheapSewa<span style="color:#17c3e8">.Store</span></h2>' +
    '<p style="color:#4b5170;font-size:15px">Use this code to sign in:</p>' +
    '<div style="font-size:34px;letter-spacing:8px;font-weight:700;background:#f3f1ff;color:#5b3df5;text-align:center;padding:16px;border-radius:12px">' + code + "</div>" +
    '<p style="color:#6a7190;font-size:13px">This code expires in 10 minutes. If you did not request it, you can safely ignore this email.</p></div>'
});
