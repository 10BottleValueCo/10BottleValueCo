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

const MERCHANT_ID = process.env.CATALYSTPAY_MERCHANT_ID || "";
const API_TOKEN = process.env.CATALYSTPAY_API_TOKEN || "";
// Set CATALYSTPAY_ENV=production in Vercel when switching to prod credentials
const IS_PRODUCTION = process.env.CATALYSTPAY_ENV === "production";
const BASE_API_URL = IS_PRODUCTION
  ? "https://api.paidlyinteractive.com"
  : "https://api-staging.paidlyinteractive.com";

export default async function handler(req, res) {
  if (rejectUnverifiedStoreCredit(req.body, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const checkoutIdentity = await requireCheckoutIdentity(req, res);
  if (!checkoutIdentity) return;

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
      orderNotes = "",
      items = [],
      paymentMethod = "",
    } = { ...req.body, customer_email: checkoutIdentity.email };

    if (!order_id) return res.status(400).json({ error: "Missing order_id" });

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

    const baseTotal =
      subtotal - finalAutomaticDiscount - promoDiscount - finalAffiliateDiscount + shipping;

    // Crypto discount removed
    const cryptoDiscountAmount = 0;

    const safeStoreCreditUsed = Math.min(
      Math.max(Number(storeCreditUsed) || 0, 0),
      Math.max(0, baseTotal - cryptoDiscountAmount),
    );

    const price_amount =
      Math.round((baseTotal - cryptoDiscountAmount - safeStoreCreditUsed) * 100) / 100;

    if (!price_amount || price_amount <= 0) {
      return res.status(400).json({ error: "Order total must be greater than zero." });
    }

    const baseUrl = process.env.BASE_URL || "https://10bottlevalue.co";
    const redirectURL = `${baseUrl}/?payment=success&order=${encodeURIComponent(order_id)}&provider=catalystpay`;

    // metadata values must be alphanumeric, dashes, underscores only (PaidlyInteractive restriction)
    const safeEmail = (customer_email || "").replace(/[^a-zA-Z0-9\-_]/g, "_");
    const safeAffCode = (affiliateCode || "").replace(/[^a-zA-Z0-9\-_]/g, "_");

    if (
      !(await persistCheckoutPricing(
        checkoutOrder,
        {
          total: Number(price_amount),
          items: pricedItems,
          metadata: {
            ...(checkoutOrder.order.metadata || {}),
            total: price_amount,
            paymentProvider: "CatalystPay BTC",
            checkoutStartedAt: new Date().toISOString(),
            subtotal: Number(subtotal),
            shipping: Number(shipping),
            automaticDiscount: Number(finalAutomaticDiscount),
            promoDiscount: Number(promoDiscount),
            promoCode: String(promoCode || ""),
            affiliateDiscount: Number(finalAffiliateDiscount),
            cryptoDiscount: Number(cryptoDiscountAmount),
            storeCreditUsed: Number(safeStoreCreditUsed),
            affiliateCode: String(affiliateCode || "")
              .trim()
              .toUpperCase(),
            affiliateOwnerEmail: String(affiliateOwnerEmail || ""),
            shippingType: String(shippingType),
            items: pricedItems,
            orderNotes: String(orderNotes || checkoutOrder.order.metadata.orderNotes || ""),
            // Persisted explicitly (not just relying on a prior client-side
            // upsert) so customer/shipping details survive even if that
            // earlier write raced with or lost to this server-side PATCH.
            firstName: String(firstName || (checkoutOrder.order.metadata?.firstName ?? "")),
            lastName: String(lastName || (checkoutOrder.order.metadata?.lastName ?? "")),
            country: String(country || (checkoutOrder.order.metadata?.country ?? "")),
            address: String(address || (checkoutOrder.order.metadata?.address ?? "")),
            address2: String(address2 || (checkoutOrder.order.metadata?.address2 ?? "")),
            city: String(city || (checkoutOrder.order.metadata?.city ?? "")),
            state: String(state || (checkoutOrder.order.metadata?.state ?? "")),
            postalCode: String(postalCode || (checkoutOrder.order.metadata?.postalCode ?? "")),
            phone: String(phone || (checkoutOrder.order.metadata?.phone ?? "")),
            taxId: String(taxId || (checkoutOrder.order.metadata?.taxId ?? "")),
          },
        },
        res,
      ))
    )
      return;

    const nowRes = await fetch(`${BASE_API_URL}/api/v1/stores/${MERCHANT_ID}/invoices`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `token ${API_TOKEN}`,
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
      return res
        .status(502)
        .json({ error: "CatalystPay returned non-JSON", raw: rawText.slice(0, 300) });
    }

    if (!nowRes.ok) {
      console.error("CatalystPay invoice creation failed:", nowRes.status, JSON.stringify(data));
      return res.status(nowRes.status).json({
        error: data.message || data.error || "CatalystPay error",
        ...data,
      });
    }

    if (
      typeof data.id !== "string" ||
      !data.id ||
      typeof data.checkoutLink !== "string" ||
      !data.checkoutLink
    ) {
      return res.status(502).json({ error: "Payment provider returned an incomplete invoice." });
    }
    // The provider invoice already exists here. Withhold its payment link if
    // binding fails; do not describe that failure as no invoice being created.
    if (
      !(await persistCheckoutPricing(
        checkoutOrder,
        {
          total: Number(price_amount),
          items: pricedItems,
          metadata: { catalystpay_invoice_id: data.id },
        },
        res,
        { providerCreated: true },
      ))
    )
      return;

    console.log("CatalystPay invoice created");

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
