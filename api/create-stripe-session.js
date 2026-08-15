import Stripe from "stripe";
import {
  validateAndPriceItems,
  getShippingPrice,
  getAutomaticDiscountRate,
} from "./_catalog.js";
import { verifyPromoCode } from "./_promo.js";

const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: "STRIPE_SECRET_KEY not configured on server." });
  const stripe = new Stripe(stripeKey);

  try {
    const {
      orderId,
      email,
      items = [],
      successUrl,
      cancelUrl,
      shippingType = "standard",
      promoCode = "",
      affiliateDiscount: clientAffiliateDiscount = 0,
      affiliateCode = "",
      storeCreditUsed = 0,
      metadata = {},
    } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId" });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "STRIPE_SECRET_KEY not set" });
    }

    // ---- SERVER-SIDE PRICE & STOCK VALIDATION ----
    let pricedItems, subtotal, regularSubtotal, usSubtotal;
    try {
      ({ pricedItems, subtotal, regularSubtotal, usSubtotal } = validateAndPriceItems(items));
    } catch (validationErr) {
      return res.status(400).json({ error: validationErr.message });
    }

    const automaticDiscountRate = getAutomaticDiscountRate(subtotal);
    const automaticDiscount = Math.round(subtotal * automaticDiscountRate * 100) / 100;

    const MAX_AFFILIATE_RATE = 0.05;

    let promoDiscount = 0;
    let verifiedPromoFreeShipping = false;
    if (String(promoCode || "").trim()) {
      const verifiedPromo = await verifyPromoCode({
        code: promoCode,
        email,
        sbUrl: SB_URL,
        sbKey: SB_KEY,
      });
      if (verifiedPromo) {
        promoDiscount = Math.round(subtotal * verifiedPromo.rate * 100) / 100;
        verifiedPromoFreeShipping = !!verifiedPromo.freeShipping;
      }
    }

    // Affiliate discount is first-order-only — verify server-side
    const SB_URL_S = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const SB_KEY_S = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    const sbHS = () => ({ apikey: SB_KEY_S, Authorization: `Bearer ${SB_KEY_S}`, "Content-Type": "application/json" });
    let isFirstTimeBuyer = true;
    if (SB_URL_S && SB_KEY_S && email) {
      try {
        const checkResp = await fetch(
          `${SB_URL_S}/rest/v1/orders?email=eq.${encodeURIComponent(String(email).toLowerCase().trim())}&status=in.(paid,done)&select=id&limit=1`,
          { headers: sbHS() }
        );
        if (checkResp.ok) {
          const rows = await checkResp.json();
          isFirstTimeBuyer = !Array.isArray(rows) || rows.length === 0;
        }
      } catch {}
    }

    let affiliateDiscount = 0;
    if (!promoDiscount && isFirstTimeBuyer && String(affiliateCode || "").trim() && Number(clientAffiliateDiscount) > 0) {
      const impliedRate = Number(clientAffiliateDiscount) / (subtotal || 1);
      affiliateDiscount = impliedRate <= MAX_AFFILIATE_RATE
        ? Math.min(Number(clientAffiliateDiscount), subtotal)
        : Math.round(subtotal * MAX_AFFILIATE_RATE * 100) / 100;
    }

    const finalAutomaticDiscount = promoDiscount > 0 || affiliateDiscount > 0 ? 0 : automaticDiscount;
    const finalAffiliateDiscount = promoDiscount > 0 ? 0 : affiliateDiscount;

    const shipping =
      pricedItems.length === 0
        ? 0
        : verifiedPromoFreeShipping || regularSubtotal === 0
        ? 0
        : getShippingPrice(regularSubtotal, shippingType === "express" ? "express" : "standard");

    const preCreditTotal = Math.max(
      0,
      subtotal - finalAutomaticDiscount - promoDiscount - finalAffiliateDiscount + shipping
    );
    const safeStoreCreditUsed = Math.min(Math.max(Number(storeCreditUsed) || 0, 0), preCreditTotal);

    // Fee is always calculated on preCreditTotal (before store credit), so store credit
    // doesn't also save the customer from the card processing fee.
    const STRIPE_FEE_RATE = 0.05;
    const stripeFee = Math.round(preCreditTotal * STRIPE_FEE_RATE * 100) / 100;
    const amount = Math.max(0, Math.round((preCreditTotal + stripeFee - safeStoreCreditUsed) * 100) / 100);

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Order total must be greater than zero." });
    }


    const productName = `10BottleValueCo Order #${orderId}`;

    const lineItems = [{
      price_data: {
        currency: "usd",
        product_data: { name: productName },
        unit_amount: Math.round(Number(amount) * 100),
      },
      quantity: 1,
    }];

    const sessionMetadata = {
      ...(typeof metadata === "object" && metadata !== null ? metadata : {}),
      orderId: String(orderId),
      email: String(email || ""),
      affiliateCode: String(affiliateCode || ""),
      shippingType: String(shippingType),
      total: String(Number(amount).toFixed(2)),
      subtotal: String(Number(subtotal).toFixed(2)),
      shipping: String(Number(shipping).toFixed(2)),
      cardProcessingFee: String(Number(stripeFee).toFixed(2)),
      automaticDiscount: String(Number(finalAutomaticDiscount).toFixed(2)),
      promoDiscount: String(Number(promoDiscount).toFixed(2)),
      affiliateDiscount: String(Number(finalAffiliateDiscount).toFixed(2)),
      storeCreditUsed: String(Number(safeStoreCreditUsed).toFixed(2)),
      items: JSON.stringify(pricedItems).slice(0, 480),
    };

    for (const key of Object.keys(sessionMetadata)) {
      if (typeof sessionMetadata[key] !== "string") {
        sessionMetadata[key] = String(sessionMetadata[key]);
      }
      if (sessionMetadata[key].length > 500) {
        sessionMetadata[key] = sessionMetadata[key].slice(0, 500);
      }
    }

    // Embedded checkout (returns client_secret for EmbeddedCheckout component)
    const origin = req.headers.origin || "https://10bottlevalue.co";
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      return_url: `${origin}/?payment=success&order=${encodeURIComponent(orderId)}&provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
      payment_method_types: ["card"],
      mode: "payment",
      client_reference_id: String(orderId),
      customer_email: email || undefined,
      line_items: lineItems,
      metadata: sessionMetadata,
    });

    return res.status(200).json({ clientSecret: session.client_secret, sessionId: session.id, verifiedAmount: amount });
  } catch (err) {
    console.error("create-stripe-session error:", err.message);
    return res.status(500).json({ error: err.message || "Failed to create Stripe session" });
  }
}
