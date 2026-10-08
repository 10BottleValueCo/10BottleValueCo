import { createHmac, timingSafeEqual } from "node:crypto";
import { getMeritConfig, MeritError } from "./_merit-core.js";
import { createMeritProvider } from "./_merit-provider.js";
import { createMeritStore } from "./_merit-storage.js";
import { reconcileMeritAttempt } from "./_merit-reconcile.js";
import { sendMeritReceipt } from "./_merit-receipt.js";

export const config = { api: { bodyParser: false } };
const invalid = () => new MeritError(400, "Invalid webhook.", "MERIT_INVALID_WEBHOOK");

async function readRawBody(req) {
  if (Number(req.headers?.["content-length"] || 0) > 65536) throw invalid();
  if (typeof req.on !== "function") {
    // Explicit raw-buffer adapters are supported without invoking a body getter.
    const raw = Object.getOwnPropertyDescriptor(req, "body")?.value;
    if (!Buffer.isBuffer(raw) || raw.length > 65536) throw invalid();
    return raw;
  }
  // Bare @vercel/node installs a lazy parsed req.body and replays the original
  // bytes through data/end listeners. Never read that getter or reconstruct JSON.
  // Its consumed original request can already be ended while replay is pending.
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0; let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      const raw = error ? null : Buffer.concat(chunks, size);
      chunks.length = 0;
      for (const [name, listener] of listeners) req.removeListener?.(name, listener);
      if (error) reject(invalid()); else resolve(raw);
    };
    const listeners = [
      ["error", () => finish(true)],
      ["aborted", () => finish(true)],
      ["close", () => { if (req.complete !== true) finish(true); }],
      ["end", () => finish(false)],
      ["data", chunk => {
        if (settled) return;
        if (!Buffer.isBuffer(chunk)) return finish(true);
        size += chunk.length;
        if (size > 65536) return finish(true);
        chunks.push(chunk);
      }],
    ];
    // Register separately: Vercel's data/end .on() returns its replay stream.
    for (const [name, listener] of listeners) req.on(name, listener);
  });
}

export function verifyMeritSignature(raw, header, secret) {
  if (!Buffer.isBuffer(raw) || typeof header !== "string" || header.length > 1024 || !secret) return false;
  const entries = header.split(",").map(part => part.trim().split("="));
  if (entries.length !== 2 || entries.some(pair => pair.length !== 2)
    || new Set(entries.map(pair => pair[0])).size !== 2) return false;
  const fields = Object.fromEntries(entries);
  if (!/^\d{10,11}$/.test(fields.t || "") || !/^[a-f\d]{64}$/i.test(fields.v1 || "")) return false;
  if (!Number.isSafeInteger(Number(fields.t))) return false;
  // Merit does not document whether delayed retries receive a new signature.
  // Authenticate the timestamp, but accept old signed deliveries: verification
  // of the bound intent and SQL idempotency make replay safe.
  const expected = createHmac("sha256", secret).update(fields.t + ".").update(raw).digest();
  const supplied = Buffer.from(fields.v1, "hex");
  return supplied.length === expected.length && timingSafeEqual(expected, supplied);
}

export function createMeritWebhookHandler({ env = process.env, provider = createMeritProvider({ env }), store = createMeritStore({ env }), notify = payload => sendMeritReceipt(payload, { env }) } = {}) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ received: false }); }
    try {
      const privateConfig = getMeritConfig(env);
      // Disabling new checkouts must not disable confirmation of prior charges.
      // Frozen orders do not depend on today's surcharge/pricing-rule fields.
      if (!privateConfig.apiKey || !privateConfig.webhookSecret) throw new MeritError(503, "Webhook unavailable.");
      const raw = await readRawBody(req);
      if (!verifyMeritSignature(raw, req.headers?.["merit-signature"], privateConfig.webhookSecret)) throw invalid();
      let event;
      try { event = JSON.parse(raw.toString("utf8")); } catch { throw invalid(); }
      if (!event || typeof event !== "object" || Array.isArray(event) || typeof event.type !== "string") throw invalid();
      if (event.type !== "payment_intent.succeeded") return res.status(200).json({ received: true });
      const data = event.data;
      if (!data || !/^pi_[A-Za-z0-9]+$/.test(data.paymentIntentId || "")
        || !/^INV-[A-F\d]{32}$/.test(data.metadata?.orderId || "")
        || !Number.isSafeInteger(data.amount) || data.amount <= 0 || data.currency !== "usd") throw invalid();
      const attempt = await store.findByIntent(data.paymentIntentId);
      // The webhook can arrive before bind commits. A non-2xx preserves retry.
      if (!attempt) throw new MeritError(503, "Payment recording is pending.", "MERIT_RECORDING_PENDING");
      if (attempt.intent_id !== data.paymentIntentId || attempt.order_id !== data.metadata.orderId
        || Number(attempt.amount_cents) !== data.amount || attempt.currency !== data.currency) throw invalid();
      const result = await reconcileMeritAttempt({ attempt, provider, store, notify });
      if (result.paid !== true) throw new MeritError(503, "Payment verification is pending.", "MERIT_VERIFICATION_PENDING");
      return res.status(200).json({ received: true });
    } catch (error) {
      const known = error instanceof MeritError;
      return res.status(known ? error.status : 503).json({ received: false, code: known ? error.code : "MERIT_WEBHOOK_PENDING" });
    }
  };
}

export default createMeritWebhookHandler();
