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
    if (String(promoCode || "").trim()) {
      const verifiedPromo = await verifyPromoCode({
        code: promoCode,
        email: finalEmail,
        sbUrl: SB_URL,
        sbKey: SB_KEY,
      });
      if (verifiedPromo) {
        promoDiscount = Math.round(subtotal * verifiedPromo.rate * 100) / 100;
        verifiedPromoFreeShipping = !!verifiedPromo.freeShipping;
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

    const payload = {
      order_id: finalOrderId,
      orderId: finalOrderId,
      customer_email: finalEmail,
      email: finalEmail,
      total: Number(safeAmount),
      subtotal: Number(subtotal),
      shipping: Number(shipping),
      automaticDiscount: Number(finalAutomaticDiscount),
      promoDiscount: Number(promoDiscount),
      affiliateDiscount: Number(finalAffiliateDiscount),
      affiliateCode: finalAffiliateCode,
      affiliate_code: finalAffiliateCode,
      affiliateOwnerEmail: affiliateOwnerEmail || "",
      affiliateCommission: Number(affiliateCommission || 0),
      shippingType: shippingType || "standard",
      storeCreditUsed: Number(safeStoreCreditUsed.toFixed(2)),
      paymentProvider: "Paylio Card",
      items: pricedItems,
    };

    const callbackUrl =
      `${baseUrl}/api/paylio-callback` +
      `?order_id=${encodeURIComponent(payload.order_id)}` +
      `&email=${encodeURIComponent(payload.email)}` +
      `&total=${encodeURIComponent(payload.total)}` +
      `&subtotal=${encodeURIComponent(payload.subtotal)}` +
      `&shipping=${encodeURIComponent(payload.shipping)}` +
      `&automaticDiscount=${encodeURIComponent(payload.automaticDiscount)}` +
      `&promoDiscount=${encodeURIComponent(payload.promoDiscount)}` +
      `&affiliateDiscount=${encodeURIComponent(payload.affiliateDiscount)}` +
      `&affiliateCode=${encodeURIComponent(payload.affiliateCode)}` +
      `&affiliateOwnerEmail=${encodeURIComponent(payload.affiliateOwnerEmail)}` +
      `&affiliateCommission=${encodeURIComponent(payload.affiliateCommission)}` +
      `&storeCreditUsed=${encodeURIComponent(payload.storeCreditUsed)}` +
      `&shippingType=${encodeURIComponent(payload.shippingType)}` +
      `&items=${encodeURIComponent(JSON.stringify(payload.items))}`;

    const response = await fetch("https://paylio.org/api/v1/wallet", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYLIO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: process.env.PAYLIO_PAYOUT_ADDRESS,
        callback: callbackUrl,
        return_url: `${baseUrl}/?payment=success&order=${encodeURIComponent(finalOrderId)}`,
        amount: safeAmount,
        currency,
        email: finalEmail,
        note: note || finalOrderId || "10BottleValueCo order",
        metadata: payload,
        ...(provider ? { provider } : {}),
      }),
    });

    const rawText = await response.text();
    let data = {};

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      console.error("[create-paylio-payment] Paylio non-JSON response:", rawText.slice(0, 500));
      return res.status(502).json({
        error: "Paylio returned an unexpected response (non-JSON). Try again in a moment.",
        raw: rawText.slice(0, 200),
      });
    }

    if (!response.ok) {
      console.error("[create-paylio-payment] Paylio error:", response.status, data);
      return res.status(response.status).json(data);
    }

    const paymentUrl =
      data?.payment_url ||
      data?.checkout_url ||
      data?.url ||
      data?.link ||
      data?.short_url ||
      data?.paymentLink;

    if (!paymentUrl) {
      console.error("[create-paylio-payment] Paylio returned no URL. Full response:", data);
      return res.status(502).json({
        error: "Paylio did not return a payment link. Please try again.",
        paylio_response: data,
      });
    }

    return res.status(200).json({ ...data, payment_url: paymentUrl, verifiedAmount: amount });
  } catch (error) {
    console.error("[create-paylio-payment] Exception:", error?.message);
    return res.status(500).json({
      error: error?.message || "Payment creation failed",
    });
  }
}
