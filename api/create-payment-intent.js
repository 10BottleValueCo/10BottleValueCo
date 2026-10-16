import { requireLegacyOrderAccess } from "./_order-access.js";
import { legacyCreditStartError, legacyExistingCreditOrderError } from "./_legacy-store-credit.js";
import Stripe from "stripe";
import {
  validateAndPriceItems,
  getShippingPrice,
  getAutomaticDiscountRate,
} from "./_catalog.js";
import { verifyPromoCode } from "./_promo.js";
import { AffiliateQuoteError, verifyAffiliateQuote } from "./_affiliate-quote.js";

const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const creditError = legacyCreditStartError(req.body);
  if (creditError) {
    const { status, ...body } = creditError;
    return res.status(status).json(body);
  }
  const access = await requireLegacyOrderAccess(req, res, { orderId: req.body?.orderId });
  if (!access) return;
  const existingCreditError = await legacyExistingCreditOrderError({ orderId: req.body?.orderId });
  if (existingCreditError) {
    const { status, ...body } = existingCreditError;
    return res.status(status).json(body);
  }

  req.body = { ...req.body, email: access.identity.email, customer_email: access.identity.email };
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
      affiliateDiscountDisabled = false,
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
    let discountRule = null;
    if (String(promoCode || "").trim()) {
      const verifiedPromo = await verifyPromoCode({ code: promoCode, email, sbUrl: SB_URL, sbKey: SB_KEY, subtotalCents: Math.round(subtotal * 100) });
      if (!verifiedPromo) return res.status(400).json({ code: "PROMO_UNAVAILABLE", error: "This promo code is unavailable for this checkout. Review or remove it before paying." });
      if (verifiedPromo) {
        discountRule = verifiedPromo.rule;
        promoDiscount = Math.round(subtotal * verifiedPromo.rate * 100) / 100;
        verifiedPromoFreeShipping = !!verifiedPromo.freeShipping;
      }
    }

    const affiliate = await verifyAffiliateQuote({
      code: affiliateCode,
      email,
      customerId: access.identity.id,
      disabled: Boolean(promoDiscount) || affiliateDiscountDisabled === true,
      supabaseUrl: SB_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      rules: process.env.MERIT_AFFILIATE_RULES_JSON,
    });
    const verifiedAffiliateDiscount = Math.round(subtotal * (affiliate.discountBps || 0) / 10000 * 100) / 100;
    let affiliateDiscount = 0;
    if (!promoDiscount && verifiedAffiliateDiscount > 0 && Number(clientAffiliateDiscount) > 0) {
      affiliateDiscount = Math.min(verifiedAffiliateDiscount, Number(clientAffiliateDiscount));
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
      affiliateCode: String(affiliate.code || ""),
      affiliateAttributionCode: String(affiliate.code || ""),
      affiliateOwnerEmail: String(affiliate.ownerEmail || ""),
      affiliateCommission: String((subtotal * (affiliate.commissionBps || 0) / 10000).toFixed(2)),
      shippingType: String(shippingType),
      total: String(Number(amount).toFixed(2)),
      subtotal: String(Number(subtotal).toFixed(2)),
      shipping: String(Number(shipping).toFixed(2)),
      cardProcessingFee: String(Number(stripeFee).toFixed(2)),
      automaticDiscount: String(Number(finalAutomaticDiscount).toFixed(2)),
      promoDiscount: String(Number(promoDiscount).toFixed(2)),
      discountRule: JSON.stringify(discountRule),
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
    if (err instanceof AffiliateQuoteError) return res.status(err.status).json({ code: err.code, error: err.message });
    if (err?.code === "PROMO_LOOKUP_UNAVAILABLE") return res.status(503).json({ code: err.code, error: err.message });
    console.error("create-payment-intent error:", err.message);
    return res.status(500).json({ error: err.message || "Failed to create payment intent" });
  }
}
