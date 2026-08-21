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
    let paidAt = new Date().toISOString();

    if (paymentIntentId && String(paymentIntentId).startsWith("pi_")) {
      const intent = await stripe.paymentIntents.retrieve(String(paymentIntentId));
      if (intent.metadata?.orderId && intent.metadata.orderId !== orderId) {
        console.error(`orderId mismatch — intent has ${intent.metadata.orderId}, request has ${orderId}`);
        return res.status(400).json({ error: "orderId mismatch", confirmed: false });
      }
      paymentSucceeded = intent.status === "succeeded";
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
        if (succeeded.created) paidAt = new Date(succeeded.created * 1000).toISOString();
      }
    }

    if (!paymentSucceeded) {
      console.warn(`Payment not succeeded for order ${orderId}`);
      return res.json({ confirmed: false, message: "Payment not yet succeeded" });
    }

    // Mark order paid in Supabase using service role key (bypasses RLS)
    await supabaseAdmin(`orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "paid",
        payment_provider: "Stripe",
        paid_at: paidAt,
      }),
    });

    console.log(`Order ${orderId} marked paid via Stripe verification ✓`);
    return res.json({ confirmed: true, dbUpdated: true });
  } catch (err) {
    console.error("confirm-stripe-payment error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
