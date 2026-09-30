// This file is the Vercel serverless version of /api/confirm-stripe-payment
// Copy this content to api/confirm-stripe-payment.js in the GitHub repo
import Stripe from "stripe";
import {
  getAutomaticDiscountRate,
  getShippingPrice,
  validateAndPriceItems,
} from "./_catalog.js";
import { verifyPromoCode } from "./_promo.js";

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

function cents(value, label) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Order has invalid ${label}`);
  }
  return Math.round(amount * 100);
}

async function getExpectedStripeAmount(order) {
  const metadata = order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
    ? order.metadata
    : {};
  if (metadata.id != null && String(metadata.id) !== String(order.id)) {
    throw new Error("Order record does not match its internal order ID");
  }
  const rowEmail = String(order.email || "").trim().toLowerCase();
  const metadataEmail = String(metadata.email || "").trim().toLowerCase();
  if (rowEmail && metadataEmail && rowEmail !== metadataEmail) {
    throw new Error("Order record customer association is inconsistent");
  }
  const items = Array.isArray(metadata.items) ? metadata.items : order.items;
  const priced = validateAndPriceItems(items);
  const subtotal = priced.subtotal;
  const email = rowEmail || metadataEmail;

  let promoDiscount = 0;
  let promoFreeShipping = false;
  const promoCode = String(metadata.promoCode || "").trim();
  if (promoCode) {
    const promo = await verifyPromoCode({
      code: promoCode,
      email,
      sbUrl: SUPABASE_URL,
      sbKey: getServiceKey(),
    });
    if (!promo) throw new Error("Order promo code cannot be verified");
    promoDiscount = Math.round(subtotal * promo.rate * 100) / 100;
    promoFreeShipping = !!promo.freeShipping;
  }

  let affiliateDiscount = 0;
  const affiliateCode = String(metadata.affiliateCode || "").trim();
  const storedAffiliateDiscount = Number(metadata.affiliateDiscount || 0);
  if (!Number.isFinite(storedAffiliateDiscount) || storedAffiliateDiscount < 0) {
    throw new Error("Order has invalid affiliate discount");
  }
  if (!promoDiscount && affiliateCode && storedAffiliateDiscount > 0) {
    const impliedRate = storedAffiliateDiscount / (subtotal || 1);
    affiliateDiscount = impliedRate <= 0.05
      ? Math.min(storedAffiliateDiscount, subtotal)
      : Math.round(subtotal * 0.05 * 100) / 100;
  }

  const automaticDiscount = Math.round(subtotal * getAutomaticDiscountRate(subtotal) * 100) / 100;
  const finalAutomaticDiscount = promoDiscount > 0 || affiliateDiscount > 0 ? 0 : automaticDiscount;
  const shippingType = String(metadata.shippingType || "standard");
  const shipping = priced.pricedItems.length === 0
    ? 0
    : promoFreeShipping || priced.regularSubtotal === 0
      ? 0
      : getShippingPrice(priced.regularSubtotal, shippingType === "express" ? "express" : "standard");
  const preCreditTotal = Math.max(
    0,
    subtotal - finalAutomaticDiscount - promoDiscount - affiliateDiscount + shipping,
  );
  const storedCredit = Number(metadata.storeCreditUsed || 0);
  if (!Number.isFinite(storedCredit) || storedCredit < 0) {
    throw new Error("Order has invalid store credit");
  }
  const storeCreditUsed = Math.min(storedCredit, preCreditTotal);
  if (storeCreditUsed > 0) {
    if (!email) throw new Error("Order store credit cannot be verified without a customer email");
    const creditRows = await supabaseAdmin(
      `user_credits?email=eq.${encodeURIComponent(email)}&select=amount&limit=1`,
    );
    const availableCredit = Array.isArray(creditRows) ? Number(creditRows[0]?.amount || 0) : 0;
    if (!Number.isFinite(availableCredit) || availableCredit < storeCreditUsed) {
      throw new Error("Order store credit exceeds the server-recorded customer balance");
    }
  }
  const stripeFee = Math.round(preCreditTotal * 0.0295 * 100) / 100;
  const expectedCents = Math.round((preCreditTotal + stripeFee - storeCreditUsed) * 100);
  if (expectedCents <= 0) throw new Error("Order has no positive server-verified payable total");
  return { expectedCents, subtotal };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { orderId, paymentIntentId } = req.body || {};
    if (!orderId) return res.status(400).json({ error: "Missing orderId" });
    if (typeof paymentIntentId !== "string" || !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
      return res.status(400).json({ error: "A valid paymentIntentId is required", confirmed: false });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return res.status(500).json({ error: "STRIPE_SECRET_KEY not set" });

    const stripe = new Stripe(secretKey);

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (String(intent.metadata?.orderId || "") !== String(orderId)) {
      return res.status(400).json({ error: "Payment intent orderId mismatch", confirmed: false });
    }
    if (intent.status !== "succeeded") {
      console.warn(`Payment not succeeded for order ${orderId}`);
      return res.json({ confirmed: false, message: "Payment not yet succeeded" });
    }
    if (String(intent.currency || "").toLowerCase() !== "usd") {
      return res.status(400).json({ error: "Payment intent currency does not match the order", confirmed: false });
    }

    const rows = await supabaseAdmin(
      `orders?id=eq.${encodeURIComponent(String(orderId))}&select=id,email,status,payment_id,total,items,metadata&limit=1`,
    );
    const order = Array.isArray(rows) ? rows[0] : null;
    if (!order || String(order.id) !== String(orderId)) {
      return res.status(404).json({ error: "Order not found", confirmed: false });
    }
    if (order.status === "paid" && order.payment_id === intent.id) {
      return res.json({ confirmed: true, dbUpdated: true, note: "already confirmed" });
    }
    if (!["checkout", "pending"].includes(String(order.status || "").toLowerCase())) {
      return res.status(409).json({ error: "Order is not in a payable status", confirmed: false });
    }

    const { expectedCents, subtotal } = await getExpectedStripeAmount(order);
    if (intent.amount !== expectedCents || intent.amount_received !== expectedCents ||
        cents(intent.metadata?.total, "payment intent total") !== expectedCents ||
        cents(intent.metadata?.subtotal, "payment intent subtotal") !== Math.round(subtotal * 100)) {
      return res.status(400).json({ error: "Payment amount does not match the server-priced order", confirmed: false });
    }
    const paidAt = intent.created ? new Date(intent.created * 1000).toISOString() : new Date().toISOString();

    // Only transition a known unpaid checkout order; never create a row or overwrite a
    // concurrent payment/provider update.
    const updated = await supabaseAdmin(
      `orders?id=eq.${encodeURIComponent(String(orderId))}&status=in.(checkout,pending)&select=id`,
      {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "paid",
        payment_provider: "Stripe",
        paid_at: paidAt,
      }),
      },
    );
    if (!Array.isArray(updated) || updated.length !== 1) {
      return res.status(409).json({ error: "Order status changed before payment confirmation", confirmed: false });
    }

    console.log(`Order ${orderId} marked paid via Stripe verification ✓`);
    return res.json({ confirmed: true, dbUpdated: true });
  } catch (err) {
    console.error("confirm-stripe-payment error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
