import { validateAndPriceItems, getShippingPrice, getAutomaticDiscountRate } from "./_catalog.js";
import { verifyPromoCode } from "./_promo.js";

const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const sbH = () => ({
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
});

const MERCHANT_ID = process.env.CATALYSTPAY_MERCHANT_ID || "";
const API_TOKEN = process.env.CATALYSTPAY_API_TOKEN || "";
// Set CATALYSTPAY_ENV=production in Vercel when switching to prod credentials
const IS_PRODUCTION = process.env.CATALYSTPAY_ENV === "production";
const BASE_API_URL = IS_PRODUCTION
  ? "https://api.paidlyinteractive.com"
  : "https://api-staging.paidlyinteractive.com";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!MERCHANT_ID || !API_TOKEN) {
      return res.status(500).json({ error: "CATALYSTPAY credentials not configured" });
    }

    const {
      order_id,
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
      paymentMethod = "",
    } = req.body || {};

    if (!order_id) return res.status(400).json({ error: "Missing order_id" });

    // ---- SERVER-SIDE PRICE & STOCK VALIDATION ----
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

    const baseTotal = subtotal - finalAutomaticDiscount - promoDiscount - finalAffiliateDiscount + shipping;

    // Crypto discount removed
    const cryptoDiscountAmount = 0;

    const safeStoreCreditUsed = Math.min(
      Math.max(Number(storeCreditUsed) || 0, 0),
      Math.max(0, baseTotal - cryptoDiscountAmount)
    );

    const price_amount = Math.round(
      (baseTotal - cryptoDiscountAmount - safeStoreCreditUsed) * 100
    ) / 100;

    if (!price_amount || price_amount <= 0) {
      return res.status(400).json({ error: "Order total must be greater than zero." });
    }

    const baseUrl = process.env.BASE_URL || "https://10bottlevalue.co";
    const redirectURL = `${baseUrl}/?payment=success&order=${encodeURIComponent(order_id)}&provider=catalystpay`;

    // metadata values must be alphanumeric, dashes, underscores only (PaidlyInteractive restriction)
    const safeEmail = (customer_email || "").replace(/[^a-zA-Z0-9\-_]/g, "_");
    const safeAffCode = (affiliateCode || "").replace(/[^a-zA-Z0-9\-_]/g, "_");

    const nowRes = await fetch(`${BASE_API_URL}/api/v1/stores/${MERCHANT_ID}/invoices`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `token ${API_TOKEN}`,
      },
      body: JSON.stringify({
        amount: price_amount.toFixed(2),
        currency: "USD",
        checkout: {
          paymentMethods: ["BTC-LightningNetwork"],
          redirectURL,
          redirectAutomatically: true,
          expirationMinutes: 30,
        },
        metadata: {
          OrderId: order_id,
          CustomerId: safeEmail || "guest",
          AffCode: safeAffCode || "none",
        },
      }),
    });

    const rawText = await nowRes.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return res.status(502).json({ error: "CatalystPay returned non-JSON", raw: rawText.slice(0, 300) });
    }

    if (!nowRes.ok) {
      console.error("CatalystPay invoice creation failed:", nowRes.status, JSON.stringify(data));
      return res.status(nowRes.status).json({
        error: data.message || data.error || "CatalystPay error",
        _debug: {
          status: nowRes.status,
          api_url: BASE_API_URL,
          is_production: IS_PRODUCTION,
          merchant_id_set: !!MERCHANT_ID,
          token_set: !!API_TOKEN,
          token_prefix: API_TOKEN ? API_TOKEN.slice(0, 6) + "..." : "MISSING",
        },
        ...data,
      });
    }

    // Persist order to Supabase so webhook can find address/discount data
    if (SB_URL && SB_KEY && order_id) {
      try {
        const existing = await fetch(
          `${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(order_id))}&select=status,metadata`,
          { headers: sbH() }
        );
        const rows = existing.ok ? await existing.json() : [];
        const currentStatus = String(rows?.[0]?.status || "").toLowerCase();
        if (currentStatus !== "paid") {
          await fetch(`${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(order_id))}`, {
            method: "PATCH",
            headers: { ...sbH(), Prefer: "return=minimal" },
            body: JSON.stringify({
              status: "checkout (clicked pay)",
              metadata: {
                ...(rows?.[0]?.metadata || {}),
                catalystpay_invoice_id: data.id || "",
                total: price_amount,
                subtotal: Number(subtotal),
                shipping: Number(shipping),
                automaticDiscount: Number(finalAutomaticDiscount),
                promoDiscount: Number(promoDiscount),
                promoCode: String(promoCode || ""),
                affiliateDiscount: Number(finalAffiliateDiscount),
                cryptoDiscount: Number(cryptoDiscountAmount),
                storeCreditUsed: Number(safeStoreCreditUsed),
                affiliateCode: String(affiliateCode || "").trim().toUpperCase(),
                affiliateOwnerEmail: String(affiliateOwnerEmail || ""),
                shippingType: String(shippingType),
                items: pricedItems,
                // Persisted explicitly (not just relying on a prior client-side
                // upsert) so customer/shipping details survive even if that
                // earlier write raced with or lost to this server-side PATCH.
                firstName: String(firstName || (rows?.[0]?.metadata?.firstName ?? "")),
                lastName: String(lastName || (rows?.[0]?.metadata?.lastName ?? "")),
                country: String(country || (rows?.[0]?.metadata?.country ?? "")),
                address: String(address || (rows?.[0]?.metadata?.address ?? "")),
                address2: String(address2 || (rows?.[0]?.metadata?.address2 ?? "")),
                city: String(city || (rows?.[0]?.metadata?.city ?? "")),
                state: String(state || (rows?.[0]?.metadata?.state ?? "")),
                postalCode: String(postalCode || (rows?.[0]?.metadata?.postalCode ?? "")),
                phone: String(phone || (rows?.[0]?.metadata?.phone ?? "")),
                taxId: String(taxId || (rows?.[0]?.metadata?.taxId ?? "")),
              },
            }),
          }).catch(() => {});
        }
      } catch {}
    }

    console.error("CatalystPay invoice created:", { order_id, price_amount, invoice_id: data.id, checkoutLink: data.checkoutLink, api_url: BASE_API_URL, is_production: IS_PRODUCTION });

    return res.status(200).json({
      checkoutLink: data.checkoutLink,
      invoice_id: data.id,
      amount: price_amount,
    });
  } catch (err) {
    console.error("create-catalystpay-session error:", err.message);
    return res.status(500).json({ error: err.message || "CatalystPay session creation failed" });
  }
}
