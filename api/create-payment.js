import { validateAndPriceItems, getShippingPrice, getAutomaticDiscountRate } from "./_catalog.js";
import { verifyPromoCode } from "./_promo.js";

const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const sbH = () => ({
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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
    if (String(promoCode || "").trim()) {
      const verifiedPromo = await verifyPromoCode({
        code: promoCode,
        email: customer_email,
        sbUrl: SB_URL,
        sbKey: SB_KEY,
      });
      if (verifiedPromo) {
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

    // Crypto discount removed
    const cryptoDiscount = 0;
    const totalAfterCryptoDiscount = preCreditTotal;

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

    // Mark order as checkout started in Supabase.
    // NEVER overwrite an already-paid order: if the customer re-opens/retries the
    // NOWPayments invoice creation after their payment was already confirmed by the
    // IPN webhook (e.g. double-clicking "Pay", reloading the checkout tab), this
    // used to unconditionally reset status back to "checkout (clicked pay)",
    // making a genuinely paid order look pending again in the admin panel even
    // though the confirmation email had already gone out.
    if (SB_URL && SB_KEY && order_id) {
      try {
        const existing = await fetch(
          `${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(order_id))}&select=status,metadata`,
          { headers: sbH() }
        );
        const rows = existing.ok ? await existing.json() : [];
        const currentStatus = String(rows?.[0]?.status || "").toLowerCase();
        const existingMeta = (rows?.[0]?.metadata && typeof rows[0].metadata === "object") ? rows[0].metadata : {};
        if (currentStatus !== "paid") {
          await fetch(`${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(order_id))}`, {
            method: "PATCH",
            headers: { ...sbH(), Prefer: "return=minimal" },
            body: JSON.stringify({
              status: "checkout (clicked pay)",
              // Persisted explicitly (not just relying on a prior client-side
              // upsert) so customer/shipping/pricing details survive even if
              // that earlier client write raced with or lost to this
              // server-side PATCH — mirrors the CatalystPay session fix.
              metadata: {
                ...existingMeta,
                total: Number(price_amount),
                subtotal: Number(subtotal),
                shipping: Number(shipping),
                automaticDiscount: Number(finalAutomaticDiscount),
                promoDiscount: Number(promoDiscount),
                promoCode: String(promoCode || ""),
                affiliateDiscount: Number(finalAffiliateDiscount),
                cryptoDiscount: Number(cryptoDiscount),
                storeCreditUsed: Number(safeStoreCreditUsed),
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
              },
            }),
          }).catch(() => {});
        }
      } catch {}
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
        success_url: success_url || `${baseUrl}/?payment=success&order=${encodeURIComponent(order_id)}`,
        cancel_url: cancel_url || `${baseUrl}/?payment=cancelled&order=${encodeURIComponent(order_id)}`,
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
    console.error("create-payment error:", err.message);
    return res.status(500).json({ error: err.message || "Payment creation failed" });
  }
}
