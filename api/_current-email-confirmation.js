import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const CURRENT_EMAIL_MODE = "current_email_code";
const CODE_TTL_MS = 10 * 60 * 1000;
export const EMAIL_RESEND_INTERVAL_MS = 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;

function digest(key, userId, pending, code) {
  return createHmac("sha256", key)
    .update(JSON.stringify(["tbv-email-change", userId, pending.from, pending.to, pending.nonce, code]))
    .digest("hex");
}

export function createEmailChallenge(key, userId, from, to) {
  const code = randomBytes(8).toString("hex").toUpperCase();
  const pending = {
    mode: CURRENT_EMAIL_MODE, from, to,
    nonce: randomBytes(16).toString("hex"),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    attempts: 0, delivery: "sending",
  };
  pending.codeHash = digest(key, userId, pending, code);
  return { code, pending };
}

export function emailCodeMatches(key, userId, pending, input) {
  const code = String(input || "").replace(/\s|-/g, "").toUpperCase();
  if (!/^[A-F0-9]{16}$/.test(code) || !/^[a-f0-9]{64}$/.test(pending.codeHash || "")) return false;
  return timingSafeEqual(Buffer.from(pending.codeHash, "hex"), Buffer.from(digest(key, userId, pending, code), "hex"));
}

export function currentEmailStatus(pending) {
  const expired = !Number.isFinite(Date.parse(pending.expiresAt)) || Date.parse(pending.expiresAt) <= Date.now();
  return {
    ok: true, migrated: false, pendingConfirmation: pending.delivery === "sent",
    confirmationMode: CURRENT_EMAIL_MODE,
    currentEmail: pending.from, newEmail: pending.to,
    codeExpired: expired, codeLocked: Number(pending.attempts || 0) >= MAX_CODE_ATTEMPTS,
    confirmationSent: pending.delivery === "sent",
    ...(pending.delivery !== "sent" ? { requestNotSent: true } : {}),
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export async function sendCurrentEmailCode(pending, code) {
  if (!process.env.RESEND_API_KEY) throw new Error("Email sender unavailable");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", redirect: "error",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `email-change-${pending.nonce}`,
    },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      from: "10BottleValueCo <support@10bottlevalue.co>",
      to: pending.from,
      subject: "Confirm your email change — 10BottleValueCo",
      text: `You requested to change your account email from ${pending.from} to ${pending.to}.\nConfirmation code: ${code}\nEnter this code in Account > Security. It expires in 10 minutes.\nNo confirmation is sent to the new address. Check it carefully.\nIf you did not request this change, do not share or enter the code.`,
      html: `<h2>Confirm your email change</h2><p>You requested to change your account email to <strong>${escapeHtml(pending.to)}</strong>.</p><p>Your confirmation code:</p><p style="font-size:24px;font-family:monospace;font-weight:bold">${code}</p><p>Enter it in Account &gt; Security within 10 minutes.</p><p>No confirmation is sent to the new address. Check it carefully.</p><p>If you did not request this change, do not share or enter this code.</p>`,
    }),
  });
  if (!response.ok) throw new Error("Confirmation delivery was rejected");
}
