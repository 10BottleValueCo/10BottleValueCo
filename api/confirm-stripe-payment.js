// This file is the Vercel serverless version of /api/confirm-stripe-payment
// Copy this content to api/confirm-stripe-payment.js in the GitHub repo
import Stripe from "stripe";

const SUPABASE_URL = "https://danpkqqzcptamojrnrmk.supabase.co";

function getServiceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return key;
}

async function supabaseAdmin(path, options = {}) {
  const key = getServiceKey();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || text; } catch {}
    throw new Error(`Supabase error ${res.status}: ${msg}`);
  }
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { orderId, paymentIntentId } = req.body || {};
    if (typeof orderId !== "string" || !orderId || orderId.length > 128
      || typeof paymentIntentId !== "string" || !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
      return res.status(400).json({ error: "A valid order and payment identifier are required.", confirmed: false, dbUpdated: false });
    }
    if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: "Payment verification unavailable.", confirmed: false, dbUpdated: false });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    // A missing binding is a failure, never permission to apply another payment.
    if (intent.metadata?.orderId !== orderId || intent.currency !== "usd") {
      return res.status(409).json({ error: "Payment does not match the order.", confirmed: false, dbUpdated: false });
    }
    if (intent.status !== "succeeded") return res.status(200).json({ confirmed: false, dbUpdated: false });
    const rows = await supabaseAdmin(`orders?id=eq.${encodeURIComponent(orderId)}&select=id,email,total,status,payment_id&limit=1`, {
      method: "GET", headers: { Prefer: "return=representation" },
    });
    const order = rows?.[0];
    const expectedCents = Math.round(Number(order?.total) * 100);
    const providerCents = intent.amount_received;
    const expectedEmail = String(order?.email || "").trim().toLowerCase();
    const paymentEmail = String(intent.metadata?.email || intent.receipt_email || "").trim().toLowerCase();
    if (!order || !Number.isSafeInteger(expectedCents) || expectedCents <= 0
      || providerCents !== expectedCents || intent.amount !== expectedCents
      || !expectedEmail || expectedEmail !== paymentEmail) {
      return res.status(409).json({ error: "Payment requires reconciliation.", confirmed: false, dbUpdated: false });
    }
    // Read-only fallback. The signed webhook owns state transitions and side effects.
    const dbUpdated = ["paid", "done"].includes(String(order.status).toLowerCase()) && order.payment_id === intent.id;
    return res.status(200).json({ confirmed: true, dbUpdated });
  } catch {
    console.error("Stripe payment verification failed");
    return res.status(502).json({ error: "Payment verification unavailable.", confirmed: false, dbUpdated: false });
  }
}
