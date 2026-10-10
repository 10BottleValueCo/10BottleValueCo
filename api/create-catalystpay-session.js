import { checkoutTiming } from "./_checkout-timing.js";
import { reserveLegacyInvoice, bindLegacyInvoice, legacyInvoicePending } from "./_legacy-invoice-lock.js";
import { legacyCheckoutQuote, assertExpectedTotal } from "./_legacy-checkout-quote.js";
import { requireLegacyOrderAccess } from "./_order-access.js";
import { legacyCreditStartError, legacyExistingCreditOrderError } from "./_legacy-store-credit.js";
import { validateAndPriceItems, getShippingPrice, getAutomaticDiscountRate } from "./_catalog.js";
import { verifyPromoCode } from "./_promo.js";
import { assertCatalystVerificationReady, catalystCheckoutUrl, verifyCatalystInvoiceBinding, verifyCatalystCreatedInvoice } from "./_catalystpay-provider.js";
import { isDeepStrictEqual } from "node:util";

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
  const markTiming = checkoutTiming(res);
  const creditError = legacyCreditStartError(req.body);
  if (creditError) {
    const { status, ...body } = creditError;
    return res.status(status).json(body);
  }
  const access = await requireLegacyOrderAccess(req, res, { orderId: req.body?.order_id, provider: "catalystpay" });
  if (!access) return;
  markTiming("access");
  const existingCreditError = await legacyExistingCreditOrderError(req.body);
  markTiming("credit");
  if (existingCreditError) {
    const { status, ...body } = existingCreditError;
    return res.status(status).json(body);
  }

  req.body = { ...req.body, email: access.identity.email, customer_email: access.identity.email };
  try {
    if (!MERCHANT_ID || !API_TOKEN) {
      return res.status(500).json({ error: "Payment verification is temporarily unavailable." });
    }
    if (!process.env.CATALYSTPAY_WEBHOOK_SECRET) await assertCatalystVerificationReady();

    const {
      order_id,
      customer_email = "",
      promoCode = "",
      affiliateDiscount: clientAffiliateDiscount = 0,
      storeCreditUsed = 0,
      affiliateCode = "",
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

    if (access.order.metadata?.catalystpay_invoice_id && String(affiliateCode || "").trim().toUpperCase() !== String(access.order.metadata.affiliateCode || "").trim().toUpperCase())
      return res.status(409).json({ code: "PAYMENT_BINDING_CONFLICT", error: "This payment has already started. Restore its original referral or contact support." });

    const quote = await legacyCheckoutQuote(req.body, customer_email, { crypto: false, customerId: access.identity.id });
    const { pricedItems, subtotal, regularSubtotal, promoDiscount, discountRule, finalAutomaticDiscount,
      finalAffiliateDiscount, shipping, affiliateOwnerEmail, affiliateAttributionCode, affiliateCommission,
      affiliateRuleVersion } = quote;
    const cryptoDiscountAmount = quote.cryptoDiscount;
    const safeStoreCreditUsed = 0;
    const price_amount = quote.total;
    assertExpectedTotal(req.body.expectedTotal, price_amount);
    markTiming("quote");

    if (!price_amount || price_amount <= 0) {
      return res.status(400).json({ error: "Order total must be greater than zero." });
    }

    const savedInvoiceId = access.order?.metadata?.catalystpay_invoice_id;
    if (savedInvoiceId) {
      const saved = access.order.metadata;
      if (Number(saved.total) !== price_amount || !isDeepStrictEqual(saved.items, pricedItems)
        || Number(saved.subtotal) !== subtotal || Number(saved.automaticDiscount || 0) !== finalAutomaticDiscount
        || Number(saved.cryptoDiscount || 0) !== cryptoDiscountAmount || Number(saved.storeCreditUsed || 0) !== safeStoreCreditUsed
        || Number(saved.shipping) !== shipping || String(saved.shippingType || "standard") !== shippingType
        || String(saved.promoCode || "") !== String(promoCode || "")
        || String(saved.affiliateCode || "") !== String(affiliateCode || "").trim().toUpperCase()
        || ['firstName', 'lastName', 'country', 'address', 'address2', 'city', 'state', 'postalCode', 'phone', 'taxId', 'orderNotes']
          .some(field => String(req.body[field] || saved[field] || '') !== String(saved[field] || ''))
        || Number(saved.promoDiscount || 0) !== promoDiscount || Number(saved.affiliateDiscount || 0) !== finalAffiliateDiscount)
        return res.status(409).json({ code: "PAYMENT_BINDING_CONFLICT", error: "This payment has already started. Return to the original checkout or contact support." });
      const invoice = await verifyCatalystInvoiceBinding(access.order, savedInvoiceId);
      markTiming("resume");
      if (!["New", "Processing"].includes(invoice.status) || !["None", "PaidPartial"].includes(invoice.additionalStatus))
        return res.status(409).json({ code: "PAYMENT_RECONCILIATION_REQUIRED", error: "This payment needs reconciliation. Contact support before trying another payment." });
      return res.status(200).json({ checkoutLink: catalystCheckoutUrl(invoice.checkoutLink), invoice_id: savedInvoiceId, amount: price_amount });
    }

    const baseUrl = process.env.BASE_URL || "https://10bottlevalue.co";
    const redirectURL = `${baseUrl}/?payment=success&order=${encodeURIComponent(order_id)}&provider=catalystpay`;

    // metadata values must be alphanumeric, dashes, underscores only (PaidlyInteractive restriction)
    const safeEmail = (customer_email || "").replace(/[^a-zA-Z0-9\-_]/g, "_");
    const safeAffCode = (affiliateCode || "").replace(/[^a-zA-Z0-9\-_]/g, "_");

    const reservedOrder = await reserveLegacyInvoice(access.order, "catalystpay", price_amount, {
      total: price_amount, subtotal, shipping, automaticDiscount: finalAutomaticDiscount, promoDiscount, discountRule,
      promoCode: String(promoCode || ""), affiliateDiscount: finalAffiliateDiscount, cryptoDiscount: cryptoDiscountAmount,
      storeCreditUsed: 0, affiliateCode: String(affiliateCode || "").trim().toUpperCase(), affiliateOwnerEmail,
      affiliateAttributionCode, affiliateCommission, affiliateRuleVersion, affiliateQuoteVersion: "server-referral-v1",
      shippingType, items: pricedItems,
      ...Object.fromEntries(["firstName", "lastName", "country", "address", "address2", "city", "state", "postalCode", "phone", "taxId", "orderNotes"]
        .map(key => [key, String(req.body[key] || access.order.metadata?.[key] || "")])),
    }, pricedItems);
    markTiming("reserve");

    const nowRes = await fetch(`${BASE_API_URL}/api/v1/stores/${MERCHANT_ID}/invoices`, {
      method: "POST",
      redirect: "error", signal: AbortSignal.timeout(8000),
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
    markTiming("provider");
    if (!nowRes.ok || Buffer.byteLength(rawText) > 100000)
      throw Object.assign(new Error('Payment setup is pending. Please contact support before trying another payment.'), { status: 503, code: 'PAYMENT_CREATION_UNAVAILABLE' });
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw Object.assign(new Error('Payment setup is pending. Please contact support before trying another payment.'), { status: 503, code: 'PAYMENT_CREATION_UNAVAILABLE' });
    }
    const checkoutLink = verifyCatalystCreatedInvoice(data, { orderId: order_id, amount: price_amount });

    await bindLegacyInvoice(reservedOrder, "catalystpay", data.id, checkoutLink, { catalystpay_invoice_id: data.id });
    markTiming("bind");

    return res.status(200).json({
      checkoutLink,
      invoice_id: data.id,
      amount: price_amount,
    });
  } catch (err) {
    if (err?.code === "PROMO_LOOKUP_UNAVAILABLE" || err?.code?.startsWith("MERIT_AFFILIATE_")
      || ["PROMO_UNAVAILABLE", "CHECKOUT_QUOTE_CHANGED", "CHECKOUT_REFRESH_REQUIRED"].includes(err?.code))
      return res.status(err.status || 503).json({ code: err.code, error: err.message, ...(Number.isFinite(err.total) ? { total: err.total } : {}) });
    const known = typeof err?.code === 'string' && /^PAYMENT_[A-Z_]+$/.test(err.code);
    console.error("create-catalystpay-session error:", known ? err.code : "PAYMENT_CREATION_UNAVAILABLE");
    return res.status(known ? err.status || 503 : 503).json({ code: known ? err.code : "PAYMENT_CREATION_UNAVAILABLE", error: known ? err.message : "Payment setup is pending. Please contact support before trying another payment." });
  } finally {
    markTiming.report("catalystpay");
  }
}
