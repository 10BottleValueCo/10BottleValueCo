import { requireCheckoutOrder, persistCheckoutPricing } from "./_checkout-order.js";
import { requireCheckoutIdentity } from "./_checkout-auth.js";
import { rejectUnverifiedStoreCredit } from "./_payment-guard.js";
import { validateAndPriceItems, getShippingPrice, getAutomaticDiscountRate } from "./_catalog.js";
import { verifyPromoCode } from "./_promo.js";

const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SB_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";
const sbH = () => ({
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
});

export default async function handler(req, res) {
  if (rejectUnverifiedStoreCredit(req.body, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const checkoutIdentity = await requireCheckoutIdentity(req, res);
  if (!checkoutIdentity) return;

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
      orderNotes = "",
      items = [],
    } = { ...req.body, customer_email: checkoutIdentity.email };

    if (!order_id) {
      return res.status(400).json({ error: "Missing order_id" });
    }

    const checkoutOrder = await requireCheckoutOrder(
      {
        orderId: order_id,
        identity: checkoutIdentity,
        sbUrl: SB_URL,
        sbKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      res,
    );
    if (!checkoutOrder) return;

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
          { headers: sbH() },
        );
        if (checkResp.ok) {
          const rows = await checkResp.json();
          isFirstTimeBuyer = !Array.isArray(rows) || rows.length === 0;
        }
      } catch {}
    }

    let affiliateDiscount = 0;
    if (
      !promoDiscount &&
      isFirstTimeBuyer &&
      String(affiliateCode || "").trim() &&
      Number(clientAffiliateDiscount) > 0
    ) {
      const impliedRate = Number(clientAffiliateDiscount) / (subtotal || 1);
      affiliateDiscount =
        impliedRate <= MAX_AFFILIATE_RATE
          ? Math.min(Number(clientAffiliateDiscount), subtotal)
          : Math.round(subtotal * MAX_AFFILIATE_RATE * 100) / 100;
    }

    const finalAutomaticDiscount =
      promoDiscount > 0 || affiliateDiscount > 0 ? 0 : automaticDiscount;
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
      subtotal - finalAutomaticDiscount - promoDiscount - finalAffiliateDiscount + shipping,
    );

    // 2.5% discount for crypto payments
    const cryptoDiscount = Math.round(preCreditTotal * 0.025 * 100) / 100;
    const totalAfterCryptoDiscount = preCreditTotal - cryptoDiscount;

    const safeStoreCreditUsed = Math.min(
      Math.max(Number(storeCreditUsed) || 0, 0),
      totalAfterCryptoDiscount,
    );

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

    if (
      !(await persistCheckoutPricing(
        checkoutOrder,
        {
          total: Number(price_amount),
          items: pricedItems,
          metadata: {
            ...checkoutOrder.order.metadata,
            total: Number(price_amount),
            paymentProvider: "NOWPayments",
            checkoutStartedAt: new Date().toISOString(),
            subtotal: Number(subtotal),
            shipping: Number(shipping),
            automaticDiscount: Number(finalAutomaticDiscount),
            promoDiscount: Number(promoDiscount),
            promoCode: String(promoCode || ""),
            affiliateDiscount: Number(finalAffiliateDiscount),
            cryptoDiscount: Number(cryptoDiscount),
            storeCreditUsed: Number(safeStoreCreditUsed),
            affiliateCode: String(affiliateCode || "")
              .trim()
              .toUpperCase(),
            affiliateOwnerEmail: String(affiliateOwnerEmail || ""),
            shippingType: String(shippingType),
            items: pricedItems,
            orderNotes: String(orderNotes || checkoutOrder.order.metadata.orderNotes || ""),
            firstName: String(firstName || checkoutOrder.order.metadata.firstName || ""),
            lastName: String(lastName || checkoutOrder.order.metadata.lastName || ""),
            country: String(country || checkoutOrder.order.metadata.country || ""),
            address: String(address || checkoutOrder.order.metadata.address || ""),
            address2: String(address2 || checkoutOrder.order.metadata.address2 || ""),
            city: String(city || checkoutOrder.order.metadata.city || ""),
            state: String(state || checkoutOrder.order.metadata.state || ""),
            postalCode: String(postalCode || checkoutOrder.order.metadata.postalCode || ""),
            phone: String(phone || checkoutOrder.order.metadata.phone || ""),
            taxId: String(taxId || checkoutOrder.order.metadata.taxId || ""),
          },
        },
        res,
      ))
    )
      return;

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
        success_url:
          success_url || `${baseUrl}/?payment=success&order=${encodeURIComponent(order_id)}`,
        cancel_url:
          cancel_url || `${baseUrl}/?payment=cancelled&order=${encodeURIComponent(order_id)}`,
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
      return res
        .status(502)
        .json({ error: "NOWPayments returned non-JSON", raw: rawText.slice(0, 300) });
    }

    if (!nowRes.ok) {
      return res
        .status(nowRes.status)
        .json({ error: data.message || "NOWPayments error", ...data });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("create-payment error:", err.message);
    return res.status(500).json({ error: err.message || "Payment creation failed" });
  }
}
