import { requireLegacyOrderAccess } from "./_order-access.js";
import { legacyCreditStartError, legacyExistingCreditOrderError } from "./_legacy-store-credit.js";
import { validateAndPriceItems, getShippingPrice, getAutomaticDiscountRate } from "./_catalog.js";
import { verifyPromoCode } from "./_promo.js";
import { isDeepStrictEqual } from "node:util";

const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const sbH = () => ({
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const creditError = legacyCreditStartError(req.body);
  if (creditError) {
    const { status, ...body } = creditError;
    return res.status(status).json(body);
  }
  const access = await requireLegacyOrderAccess(req, res, { orderId: req.body?.order_id });
  if (!access) return;
  const existingCreditError = await legacyExistingCreditOrderError(req.body);
  if (existingCreditError) {
    const { status, ...body } = existingCreditError;
    return res.status(status).json(body);
  }

  req.body = { ...req.body, email: access.identity.email, customer_email: access.identity.email };
  try {
    const apiKey = process.env.NOWPAYMENTS_API_KEY || process.env.NOW_PAYMENTS_API_KEY || "";
    if (!apiKey) return res.status(500).json({ error: "NOWPAYMENTS_API_KEY not set" });

    const {
      pay_currency = "usdtbsc",
      order_id,
      success_url,
      cancel_url,
      customer_email = "",
      promoCode = "",
      affiliateDiscount: clientAffiliateDiscount = 0,
      storeCreditUsed = 0,
      affiliateCode = "",
      affiliateOwnerEmail = "",
      shippingType = "standard",
      firstName = "",
      lastName = "",
      country = "",
      address = "",
      address2 = "",
      city = "",
      state = "",
      postalCode = "",
      phone = "",
      taxId = "",
      items = [],
    } = req.body || {};

    if (!order_id) {
      return res.status(400).json({ error: "Missing order_id" });
    }

    // ---- SERVER-SIDE PRICE & STOCK VALIDATION ----
    // Same rule as create-stripe-session.js: never trust a client-submitted
    // price_amount/subtotal/discounts. Recompute everything from the catalog.
    let pricedItems, subtotal, regularSubtotal;
    try {
      ({ pricedItems, subtotal, regularSubtotal } = validateAndPriceItems(items));
    } catch (validationErr) {
      return res.status(400).json({ error: validationErr.message });
    }

    const automaticDiscountRate = getAutomaticDiscountRate(subtotal);
    const automaticDiscount = Math.round(subtotal * automaticDiscountRate * 100) / 100;

    const MAX_AFFILIATE_RATE = 0.05;

    // Never trust the client-submitted promo discount amount or an arbitrary rate cap.
    // Look up the real promo code (static catalog or admin-issued Supabase user_promos,
    // which can legitimately be up to 100%) and apply its verified rate.
    let promoDiscount = 0;
    let verifiedPromoFreeShipping = false;
    let discountRule = null;
    if (String(promoCode || "").trim()) {
      const verifiedPromo = await verifyPromoCode({
        code: promoCode,
        email: customer_email,
        sbUrl: SB_URL,
        sbKey: SB_KEY,
        subtotalCents: Math.round(subtotal * 100),
      });
      if (!verifiedPromo) return res.status(400).json({ code: "PROMO_UNAVAILABLE", error: "This promo code is unavailable for this checkout. Review or remove it before paying." });
      if (verifiedPromo) {
        discountRule = verifiedPromo.rule;
        promoDiscount = Math.round(subtotal * verifiedPromo.rate * 100) / 100;
        verifiedPromoFreeShipping = !!verifiedPromo.freeShipping;
      }
    }

    // Affiliate discount is first-order-only — verify server-side
    let isFirstTimeBuyer = true;
    if (SB_URL && SB_KEY && customer_email) {
      try {
        const checkResp = await fetch(
          `${SB_URL}/rest/v1/orders?email=eq.${encodeURIComponent(String(customer_email).toLowerCase().trim())}&status=in.(paid,done)&select=id&limit=1`,
          { headers: sbH() }
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

    // storeCreditUsed is capped server-side to the recomputed pre-credit total so
    // it can't be inflated to zero out or exceed the real order value.
    const preCreditTotal = Math.max(
      0,
      subtotal - finalAutomaticDiscount - promoDiscount - finalAffiliateDiscount + shipping
    );

    // 2.5% discount for crypto payments
    const cryptoDiscount = Math.round(preCreditTotal * 0.025 * 100) / 100;
    const totalAfterCryptoDiscount = preCreditTotal - cryptoDiscount;

    const safeStoreCreditUsed = Math.min(Math.max(Number(storeCreditUsed) || 0, 0), totalAfterCryptoDiscount);

    const price_amount = Math.round((totalAfterCryptoDiscount - safeStoreCreditUsed) * 100) / 100;

    if (!price_amount || price_amount <= 0) {
      return res.status(400).json({ error: "Order total must be greater than zero." });
    }

    const price_currency = "usd";

    const baseUrl = process.env.BASE_URL || "https://10bottlevalue.co";
    const ipnCallbackUrl = `${baseUrl}/api/nowpayments-webhook`;

    // NOWPayments has a ~500 char limit on order_description.
    // All order details are already saved in Supabase; the webhook
    // only needs the order_id to look them up.
    const orderDescription = String(order_id);

    // Save and acknowledge the server quote before creating a payable invoice.
    // The callback compares the provider amount with this canonical total.
    // This is a conditional snapshot save, not an immutable payment ledger.
    try {
      const storageUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!storageUrl || !serviceKey) throw new Error("Private quote storage unavailable");
      const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
      const readQuery = new URLSearchParams({ id: `eq.${order_id}`, select: "id,user_id,email,status,total,metadata,payment_id,payment_provider", limit: "2" });
      const readResponse = await fetch(`${storageUrl}/rest/v1/orders?${readQuery}`, { headers, signal: AbortSignal.timeout(10000), redirect: "error" });
      if (!readResponse.ok) throw new Error("Quote order unavailable");
      const rows = await readResponse.json();
      const current = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
      if (!current || current.id !== order_id || typeof current.email !== "string"
        || current.email.trim().toLowerCase() !== access.identity.email
        || (current.user_id != null && current.user_id !== access.identity.id)
        || !["pending", "checkout", "checkout (clicked pay)", "wire_pending"].includes(current.status)
        || (current.metadata != null && (typeof current.metadata !== "object" || Array.isArray(current.metadata)))
        || Number(current.metadata?.storeCreditUsed ?? 0) !== 0 || current.payment_id) {
        return res.status(409).json({ code: "CHECKOUT_ORDER_CHANGED", error: "This order has changed. Refresh checkout before continuing." });
      }
      const existingMeta = current.metadata || {};
      const metadata = {
        ...existingMeta,
        total: Number(price_amount),
        subtotal: Number(subtotal),
        shipping: Number(shipping),
        automaticDiscount: Number(finalAutomaticDiscount),
        promoDiscount: Number(promoDiscount),
        discountRule,
        promoCode: String(promoCode || ""),
        affiliateDiscount: Number(finalAffiliateDiscount),
        cryptoDiscount: Number(cryptoDiscount),
        storeCreditUsed: 0,
        affiliateCode: String(affiliateCode || "").trim().toUpperCase(),
        affiliateOwnerEmail: String(affiliateOwnerEmail || ""),
        shippingType: String(shippingType),
        items: pricedItems,
        firstName: String(firstName || existingMeta.firstName || ""),
        lastName: String(lastName || existingMeta.lastName || ""),
        country: String(country || existingMeta.country || ""),
        address: String(address || existingMeta.address || ""),
        address2: String(address2 || existingMeta.address2 || ""),
        city: String(city || existingMeta.city || ""),
        state: String(state || existingMeta.state || ""),
        postalCode: String(postalCode || existingMeta.postalCode || ""),
        phone: String(phone || existingMeta.phone || ""),
        taxId: String(taxId || existingMeta.taxId || ""),
      };
      const query = new URLSearchParams({ id: `eq.${current.id}`, email: `eq.${current.email}`, status: `eq.${current.status}` });
      for (const field of ["user_id", "total", "payment_id", "payment_provider"]) query.set(field, current[field] == null ? "is.null" : `eq.${current[field]}`);
      const response = await fetch(`${storageUrl}/rest/v1/orders?${query}`, {
        method: "PATCH", headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ status: "checkout (clicked pay)", total: price_amount, items: pricedItems, metadata }),
        signal: AbortSignal.timeout(10000), redirect: "error",
      });
      if (!response.ok) throw new Error("Quote save unavailable");
      const savedRows = await response.json();
      const saved = Array.isArray(savedRows) && savedRows.length === 1 ? savedRows[0] : null;
      if (!saved || saved.id !== current.id || saved.email !== current.email || saved.user_id !== current.user_id
        || saved.status !== "checkout (clicked pay)" || Number(saved.total) !== price_amount
        || saved.payment_id !== current.payment_id || saved.payment_provider !== current.payment_provider
        || !isDeepStrictEqual(saved.items, pricedItems) || !isDeepStrictEqual(saved.metadata, metadata)) throw new Error("Quote save not acknowledged");
    } catch {
      return res.status(503).json({ code: "PAYMENT_QUOTE_UNACKNOWLEDGED", error: "The checkout quote could not be saved. Please try again before paying." });
    }

    const nowRes = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        price_amount: Number(price_amount).toFixed(2),
        price_currency,
        pay_currency,
        order_id,
        order_description: orderDescription,
        ipn_callback_url: ipnCallbackUrl,
        success_url: success_url || `${baseUrl}/?payment=pending&provider=nowpayments&order=${encodeURIComponent(order_id)}`,
        cancel_url: cancel_url || `${baseUrl}/?payment=cancelled&provider=nowpayments&order=${encodeURIComponent(order_id)}`,
        customer_email,
        is_fixed_rate: false,
        is_fee_paid_by_user: false,
      }),
    });

    const rawText = await nowRes.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return res.status(502).json({ error: "NOWPayments returned non-JSON", raw: rawText.slice(0, 300) });
    }

    if (!nowRes.ok) {
      return res.status(nowRes.status).json({ error: data.message || "NOWPayments error", ...data });
    }

    return res.status(200).json(data);
  } catch (err) {
    if (err?.code === "PROMO_LOOKUP_UNAVAILABLE") return res.status(503).json({ code: err.code, error: err.message });
    console.error("create-payment error:", err.message);
    return res.status(500).json({ error: err.message || "Payment creation failed" });
  }
}
