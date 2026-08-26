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
      shippingType = "standard",
      promoCode = "",
      affiliateDiscount: clientAffiliateDiscount = 0,
      affiliateCode = "",
      storeCreditUsed = 0,
      metadata = {},
    } = req.body || {};

    if (!orderId) return res.status(400).json({ error: "Missing orderId" });
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "STRIPE_SECRET_KEY not set" });

    let pricedItems, subtotal, regularSubtotal;
    try {
      ({ pricedItems, subtotal, regularSubtotal } = validateAndPriceItems(items));
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    const automaticDiscountRate = getAutomaticDiscountRate(subtotal);
    const automaticDiscount = Math.round(subtotal * automaticDiscountRate * 100) / 100;

    let promoDiscount = 0;
    let verifiedPromoFreeShipping = false;
    if (String(promoCode || "").trim()) {
      const verifiedPromo = await verifyPromoCode({ code: promoCode, email, sbUrl: SB_URL, sbKey: SB_KEY });
      if (verifiedPromo) {
        promoDiscount = Math.round(subtotal * verifiedPromo.rate * 100) / 100;
        verifiedPromoFreeShipping = !!verifiedPromo.freeShipping;
      }
    }

    let affiliateDiscount = 0;
    if (!promoDiscount && String(affiliateCode || "").trim() && Number(clientAffiliateDiscount) > 0) {
      const impliedRate = Number(clientAffiliateDiscount) / (subtotal || 1);
      affiliateDiscount = impliedRate <= 0.05
        ? Math.min(Number(clientAffiliateDiscount), subtotal)
        : Math.round(subtotal * 0.05 * 100) / 100;
    }

    const finalAutomaticDiscount = promoDiscount > 0 || affiliateDiscount > 0 ? 0 : automaticDiscount;
    const finalAffiliateDiscount = promoDiscount > 0 ? 0 : affiliateDiscount;

    const shipping = pricedItems.length === 0 ? 0 :
      verifiedPromoFreeShipping || regularSubtotal === 0 ? 0 :
      getShippingPrice(regularSubtotal, shippingType === "express" ? "express" : "standard");

    const preCreditTotal = Math.max(0, subtotal - finalAutomaticDiscount - promoDiscount - finalAffiliateDiscount + shipping);
    const safeStoreCreditUsed = Math.min(Math.max(Number(storeCreditUsed) || 0, 0), preCreditTotal);

    // Fee is always calculated on preCreditTotal (before store credit), so store credit
    // doesn't also save the customer from the card processing fee.
    const stripeFee = Math.round(preCreditTotal * 0.0295 * 100) / 100;
    const amount = Math.max(0, Math.round((preCreditTotal + stripeFee - safeStoreCreditUsed) * 100) / 100);

    if (!amount || amount <= 0) return res.status(400).json({ error: "Order total must be greater than zero." });

    const intentMetadata = {
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
    };

    for (const key of Object.keys(intentMetadata)) {
      intentMetadata[key] = String(intentMetadata[key]).slice(0, 500);
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      receipt_email: email || undefined,
      metadata: intentMetadata,
      automatic_payment_methods: { enabled: true },
    });

    return res.status(200).json({ clientSecret: intent.client_secret, verifiedAmount: amount });
  } catch (err) {
    console.error("create-payment-intent error:", err.message);
    return res.status(500).json({ error: err.message || "Failed to create payment intent" });
  }
}
