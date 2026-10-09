import { PaylioError, reservePaylio, bindPaylio, paylioCheckoutUrl, paylioStorage } from "./_paylio-binding.js";
import { requireLegacyOrderAccess } from "./_order-access.js";
import { legacyCreditStartError, legacyExistingCreditOrderError } from "./_legacy-store-credit.js";
import {
  validateAndPriceItems,
  getShippingPrice,
  getAutomaticDiscountRate,
} from "./_catalog.js";
import { verifyPromoCode } from "./_promo.js";

const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const creditError = legacyCreditStartError(req.body);
  if (creditError) {
    const { status, ...body } = creditError;
    return res.status(status).json(body);
  }
  const access = await requireLegacyOrderAccess(req, res, { orderId: req.body?.order_id || req.body?.orderId, provider: "paylio" });
  if (!access) return;
  const existingCreditError = await legacyExistingCreditOrderError(req.body);
  if (existingCreditError) {
    const { status, ...body } = existingCreditError;
    return res.status(status).json(body);
  }

  req.body = { ...req.body, email: access.identity.email, customer_email: access.identity.email };
  try {
    const {
      currency = "USD",
      order_id,
      orderId,
      note,
      provider = "",
      customer_email,
      email,
      shippingType = "standard",
      items = [],
      promoCode = "",
      affiliateDiscount: clientAffiliateDiscount = 0,
      affiliateCode = "",
      affiliate_code = "",
      affiliateOwnerEmail = "",
      affiliateCommission = 0,
      storeCreditUsed = 0,
    } = req.body || {};

    if (String(currency).toUpperCase() !== "USD") return res.status(400).json({ error: "This checkout is priced in USD." });
    if (provider && !["multi","moonpay","wert","revolut","cryptocom","rampnetwork","transak","coinbase","paypal","stripe","banxa","klarna"].includes(provider))
      return res.status(400).json({ error: "Invalid payment provider." });
    const finalOrderId = order_id || orderId;
    const finalEmail = customer_email || email || "";

    if (!finalOrderId) {
      return res.status(400).json({ error: "Missing order_id" });
    }

    if (!process.env.PAYLIO_API_KEY) {
      return res.status(500).json({ error: "Missing PAYLIO_API_KEY" });
    }

    if (!process.env.PAYLIO_PAYOUT_ADDRESS) {
      return res.status(500).json({ error: "Missing PAYLIO_PAYOUT_ADDRESS" });
    }

    // ---- SERVER-SIDE PRICE & STOCK VALIDATION ----
    // Never trust amount/prices/discounts submitted by the client — recompute
    // everything from the server catalog (api/_catalog.js), exactly like
    // create-stripe-session.js and create-payment.js (NOWPayments) do.
    let pricedItems, subtotal, regularSubtotal;
    try {
      ({ pricedItems, subtotal, regularSubtotal } = validateAndPriceItems(items));
    } catch (validationErr) {
      return res.status(400).json({ error: validationErr.message });
    }

    const automaticDiscountRate = getAutomaticDiscountRate(subtotal);
    const automaticDiscount = Math.round(subtotal * automaticDiscountRate * 100) / 100;

    const MAX_AFFILIATE_RATE = 0.05;

    let promoDiscount = 0;
    let verifiedPromoFreeShipping = false;
    let promoUsageRequired = false;
    if (String(promoCode || "").trim()) {
      const verifiedPromo = await verifyPromoCode({
        code: promoCode,
        email: finalEmail,
        sbUrl: SB_URL,
        sbKey: SB_KEY,
        requireEmailMatch: true,
      });
      if (!verifiedPromo) return res.status(400).json({ code: "PAYLIO_PROMO_UNAVAILABLE", error: "This promo code is unavailable for this checkout." });
      if (verifiedPromo) {
        promoDiscount = Math.round(subtotal * verifiedPromo.rate * 100) / 100;
        verifiedPromoFreeShipping = !!verifiedPromo.freeShipping;
        promoUsageRequired = verifiedPromo.source === "personal";
      }
    }

    // Affiliate discount is first-order-only — verify server-side
    const sbH = () => ({ apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" });
    let isFirstTimeBuyer = true;
    if (SB_URL && SB_KEY && finalEmail) {
      try {
        const checkResp = await fetch(
          `${SB_URL}/rest/v1/orders?email=eq.${encodeURIComponent(String(finalEmail).toLowerCase().trim())}&status=in.(paid,done)&select=id&limit=1`,
          { headers: sbH() }
        );
        if (checkResp.ok) {
          const rows = await checkResp.json();
          isFirstTimeBuyer = !Array.isArray(rows) || rows.length === 0;
        }
      } catch {}
    }

    let affiliateDiscount = 0;
    const finalAffiliateCode = String(affiliateCode || affiliate_code || "").trim().toUpperCase();
    const affiliateRows = await paylioStorage(`affiliate_customers?${new URLSearchParams({email: `eq.${finalEmail}`, select: "affiliate_code", limit: "2"})}`);
    if (!Array.isArray(affiliateRows) || affiliateRows.length > 1) throw new PaylioError("PAYLIO_ATTRIBUTION_UNAVAILABLE");
    const affiliateAttributionCode = affiliateRows.length
      ? String(affiliateRows[0].affiliate_code || "").trim().toUpperCase() : finalAffiliateCode;
    if (affiliateRows.length && !affiliateAttributionCode) throw new PaylioError("PAYLIO_ATTRIBUTION_UNAVAILABLE");
    if (!promoDiscount && isFirstTimeBuyer && finalAffiliateCode && Number(clientAffiliateDiscount) > 0) {
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

    // storeCreditUsed is capped server-side to the recomputed pre-credit total so
    // it can't be inflated to zero out or exceed the real order value.
    const preCreditTotal = Math.max(
      0,
      subtotal - finalAutomaticDiscount - promoDiscount - finalAffiliateDiscount + shipping
    );
    const safeStoreCreditUsed = Math.min(Math.max(Number(storeCreditUsed) || 0, 0), preCreditTotal);

    const amount = Math.max(
      0,
      Math.round((preCreditTotal - safeStoreCreditUsed) * 100) / 100
    );

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Order total must be greater than zero." });
    }

    const safeAmount = amount.toFixed(2);
    const baseUrl = process.env.BASE_URL || "https://10bottlevalue.co";
    const source = access.order.metadata || {};
    const address = Object.fromEntries(["firstName","lastName","address","address2","city","state","postalCode","country","phone","taxId","orderNotes"]
      .map(key => [key, String(source[key] || "").slice(0, 2000)]));
    const quote = {
      ...address, orderId: finalOrderId, email: finalEmail, total: Number(safeAmount),
      subtotal, shipping, automaticDiscount: finalAutomaticDiscount, promoDiscount,
      promoCode: promoDiscount > 0 ? String(promoCode).trim().toUpperCase() : "", promoUsageRequired,
      affiliateDiscount: finalAffiliateDiscount, affiliateCode: finalAffiliateCode,
      affiliateAttributionCode,
      affiliateCommission: Number((subtotal * 0.1).toFixed(2)),
      shippingType: shippingType === "express" ? "express" : "standard",
      storeCreditUsed: 0, paymentProvider: "Paylio Card", items: pricedItems,
    };
    const reservation = await reservePaylio(access, quote, provider);
    if (!reservation.created) {
      if (reservation.attempt.state !== "ready") throw new PaylioError("PAYLIO_CREATE_RECONCILIATION_REQUIRED", 409);
      return res.status(200).json({ payment_url: paylioCheckoutUrl(reservation.attempt.checkout_url), verifiedAmount: reservation.attempt.amount_cents / 100 });
    }
    // There is no documented idempotent create contract. An uncertain provider
    // response leaves the reservation locked for reconciliation, never auto-retried.
    const response = await fetch("https://paylio.org/api/v1/wallet", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${reservation.account.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        address: reservation.account.payout,
        callback: `${baseUrl}/api/paylio-callback?attempt=${encodeURIComponent(reservation.attempt.id)}`,
        return_url: `${baseUrl}/?payment=pending&provider=paylio&order=${encodeURIComponent(finalOrderId)}`,
        amount: safeAmount, currency: "USD", passFeeToCustomer: false,
        email: finalEmail, note: finalOrderId,
        ...(provider ? { provider } : {}),
      }),
    });
    const raw = await response.text();
    if (!response.ok || Buffer.byteLength(raw) > 50000) throw new PaylioError("PAYLIO_CREATION_UNAVAILABLE");
    let data; try { data = JSON.parse(raw); } catch { throw new PaylioError("PAYLIO_CREATION_UNAVAILABLE"); }
    // The binding is durably acknowledged before the customer receives a URL.
    return res.status(200).json(await bindPaylio(reservation.attempt, data));
  } catch (error) {
    return res.status(error instanceof PaylioError ? error.status : 503).json({
      code: error instanceof PaylioError ? error.code : "PAYLIO_CREATION_UNAVAILABLE",
      error: "Payment setup is pending. Please contact support before trying another payment.",
    });
  }
}
