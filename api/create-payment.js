import { reserveLegacyInvoice, bindLegacyInvoice, legacyInvoicePending } from "./_legacy-invoice-lock.js";
import { legacyCheckoutQuote, assertExpectedTotal } from "./_legacy-checkout-quote.js";
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
  const access = await requireLegacyOrderAccess(req, res, { orderId: req.body?.order_id, provider: "nowpayments" });
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

    const quote = await legacyCheckoutQuote(req.body, customer_email, { crypto: true });
    const { pricedItems, subtotal, regularSubtotal, promoDiscount, discountRule, finalAutomaticDiscount,
      finalAffiliateDiscount, shipping, affiliateOwnerEmail, affiliateAttributionCode, affiliateCommission,
      affiliateRuleVersion } = quote;
    const cryptoDiscount = quote.cryptoDiscount;
    const safeStoreCreditUsed = 0;
    const price_amount = quote.total;
    assertExpectedTotal(req.body.expectedTotal, price_amount);

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
    let reservedOrder;
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
        affiliateOwnerEmail, affiliateAttributionCode, affiliateCommission, affiliateRuleVersion, affiliateQuoteVersion: "server-referral-v1",
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
      const existingAttempt = current.metadata?.legacyInvoiceAttempt;
      if (existingAttempt) {
        if (existingAttempt.provider !== "nowpayments" || existingAttempt.state !== "ready"
          || Number(current.total) !== price_amount || !isDeepStrictEqual(current.metadata.items, pricedItems)
          || current.metadata.nowpaymentsCurrency !== pay_currency
          || ["promoCode", "affiliateCode", "shippingType", "firstName", "lastName", "country", "address", "address2", "city", "state", "postalCode", "phone", "taxId", "orderNotes"]
            .some(key => String(req.body[key] || "") !== String(current.metadata[key] || ""))) throw legacyInvoicePending();
        return res.status(200).json({ id: existingAttempt.invoiceId, invoice_url: existingAttempt.checkoutUrl, price_amount });
      }
      reservedOrder = await reserveLegacyInvoice(current, "nowpayments", price_amount,
        { ...metadata, nowpaymentsCurrency: pay_currency, orderNotes: String(req.body.orderNotes || existingMeta.orderNotes || "") }, pricedItems);
    } catch (error) {
      if (error?.code === "PAYMENT_RECONCILIATION_REQUIRED") return res.status(409).json({ code: error.code, error: error.message });
      return res.status(503).json({ code: "PAYMENT_QUOTE_UNACKNOWLEDGED", error: "The checkout quote could not be saved. Please try again before paying." });
    }

    const nowRes = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(8000),
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
    if (!nowRes.ok || Buffer.byteLength(rawText) > 100000) throw legacyInvoicePending();
    let data; try { data = JSON.parse(rawText); } catch { throw legacyInvoicePending(); }
    let checkoutUrl; try { checkoutUrl = new URL(data.invoice_url); } catch { throw legacyInvoicePending(); }
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(String(data.id || "")) || checkoutUrl.protocol !== "https:"
      || checkoutUrl.hostname !== "nowpayments.io" || checkoutUrl.username || checkoutUrl.password
      || (data.price_amount != null && Math.round(Number(data.price_amount) * 100) !== Math.round(price_amount * 100))) throw legacyInvoicePending();
    await bindLegacyInvoice(reservedOrder, "nowpayments", String(data.id), checkoutUrl.href);
    return res.status(200).json({ id: data.id, invoice_url: checkoutUrl.href, price_amount });

  } catch (err) {
    if (err?.code === "PAYMENT_RECONCILIATION_REQUIRED") return res.status(409).json({ code: err.code, error: err.message });
    if (err?.code === "PROMO_LOOKUP_UNAVAILABLE" || err?.code?.startsWith("MERIT_AFFILIATE_")
      || ["PROMO_UNAVAILABLE", "CHECKOUT_QUOTE_CHANGED", "CHECKOUT_REFRESH_REQUIRED"].includes(err?.code))
      return res.status(err.status || 503).json({ code: err.code, error: err.message, ...(Number.isFinite(err.total) ? { total: err.total } : {}) });
    console.error("create-payment error:", err.message);
    return res.status(500).json({ error: err.message || "Payment creation failed" });
  }
}
