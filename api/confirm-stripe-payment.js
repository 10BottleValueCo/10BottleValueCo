import { assertLegacyCreditPaidAcknowledgement, debitLegacyOrderCredit } from "./_legacy-store-credit.js";
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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { orderId, paymentIntentId } = req.body || {};
    if (!orderId) return res.status(400).json({ error: "Missing orderId" });

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return res.status(500).json({ error: "STRIPE_SECRET_KEY not set" });

    const stripe = new Stripe(secretKey);

    let paymentSucceeded = false;
    let verifiedIntent = null;
    let paidAt = new Date().toISOString();

    if (paymentIntentId && String(paymentIntentId).startsWith("pi_")) {
      const intent = await stripe.paymentIntents.retrieve(String(paymentIntentId));
      if (intent.metadata?.orderId && intent.metadata.orderId !== orderId) {
        console.error(`orderId mismatch — intent has ${intent.metadata.orderId}, request has ${orderId}`);
        return res.status(400).json({ error: "orderId mismatch", confirmed: false });
      }
      paymentSucceeded = intent.status === "succeeded";
      if (paymentSucceeded) verifiedIntent = intent;
      if (intent.created) paidAt = new Date(intent.created * 1000).toISOString();
    } else {
      // Fallback: search recent payment intents by orderId in metadata
      const list = await stripe.paymentIntents.search({
        query: `metadata["orderId"]:"${orderId}"`,
        limit: 5,
      });
      const succeeded = list.data.find((pi) => pi.status === "succeeded");
      if (succeeded) {
        paymentSucceeded = true;
        verifiedIntent = succeeded;
        if (succeeded.created) paidAt = new Date(succeeded.created * 1000).toISOString();
      }
    }

    if (!paymentSucceeded) {
      console.warn(`Payment not succeeded for order ${orderId}`);
      return res.json({ confirmed: false, message: "Payment not yet succeeded" });
    }

    const rows = await supabaseAdmin(`orders?id=eq.${encodeURIComponent(orderId)}&select=email,status,metadata,total&limit=1`);
    const order = Array.isArray(rows) ? rows[0] : null;
    if (!order) return res.status(503).json({ confirmed: false, code: "ORDER_RECONCILIATION_REQUIRED" });
    const recordedCredit = Number(order.metadata?.storeCreditUsed ?? 0);
    const providerCredit = Number(verifiedIntent?.metadata?.storeCreditUsed ?? 0);
    if (recordedCredit !== 0 || providerCredit !== 0) {
      const moneyCents = value => {
        if (!["number", "string"].includes(typeof value)) return null;
        const valueNumber = Number(value), cents = Math.round(valueNumber * 100);
        return Number.isFinite(valueNumber) && valueNumber >= 0 && Number.isSafeInteger(cents)
          && Math.abs(valueNumber * 100 - cents) < 1e-7 ? cents : null;
      };
      const ownerEmail = String(order.email || "").trim().toLowerCase();
      const providerEmail = String(verifiedIntent?.metadata?.email || "").trim().toLowerCase();
      const creditCents = moneyCents(order.metadata?.storeCreditUsed);
      const amountCents = moneyCents(order.total ?? order.metadata?.total);
      if (!ownerEmail || providerEmail !== ownerEmail || verifiedIntent?.metadata?.orderId !== orderId
          || creditCents === null || creditCents <= 0 || moneyCents(verifiedIntent?.metadata?.storeCreditUsed) !== creditCents
          || amountCents === null || amountCents <= 0 || verifiedIntent.currency !== "usd"
          || verifiedIntent.amount !== amountCents || verifiedIntent.amount_received !== amountCents
          || moneyCents(verifiedIntent?.metadata?.total) !== amountCents) {
        return res.status(503).json({ confirmed: false, code: "CREDIT_RECONCILIATION_REQUIRED" });
      }
    }
    if (!["paid", "done"].includes(String(order.status || "").toLowerCase())) {
      await debitLegacyOrderCredit({
        orderId, email: verifiedIntent?.metadata?.email || verifiedIntent?.receipt_email || order.email,
        creditAmount: verifiedIntent?.metadata?.storeCreditUsed ?? order.metadata?.storeCreditUsed ?? 0,
        provider: "stripe",
      });
    }

    // Mark order paid in Supabase using service role key (bypasses RLS)
    const paidPatch = {
      status: "paid",
      payment_provider: "Stripe",
      paid_at: paidAt,
    };
    const updatedRows = await supabaseAdmin(`orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      ...(recordedCredit > 0 ? { headers: { Prefer: "return=representation" } } : {}),
      body: JSON.stringify(paidPatch),
    });
    if (recordedCredit > 0) assertLegacyCreditPaidAcknowledgement(updatedRows, { id: orderId, email: order.email, ...paidPatch });

    console.log(`Order ${orderId} marked paid via Stripe verification ✓`);
    return res.json({ confirmed: true, dbUpdated: true });
  } catch (err) {
    console.error("confirm-stripe-payment error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
