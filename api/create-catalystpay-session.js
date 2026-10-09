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

    const savedInvoiceId = access.order?.metadata?.catalystpay_invoice_id;
    if (savedInvoiceId) {
      const saved = access.order.metadata;
      if (Number(saved.total) !== price_amount || !isDeepStrictEqual(saved.items, pricedItems)
        || Number(saved.subtotal) !== subtotal || Number(saved.automaticDiscount || 0) !== finalAutomaticDiscount
        || Number(saved.cryptoDiscount || 0) !== cryptoDiscountAmount || Number(saved.storeCreditUsed || 0) !== safeStoreCreditUsed
        || Number(saved.shipping) !== shipping || String(saved.shippingType || "standard") !== shippingType
        || String(saved.promoCode || "") !== String(promoCode || "")
        || String(saved.affiliateCode || "") !== String(affiliateCode || "").trim().toUpperCase()
        || String(saved.affiliateOwnerEmail || "") !== String(affiliateOwnerEmail || "")
        || ['firstName', 'lastName', 'country', 'address', 'address2', 'city', 'state', 'postalCode', 'phone', 'taxId', 'orderNotes']
          .some(field => String(req.body[field] || saved[field] || '') !== String(saved[field] || ''))
        || Number(saved.promoDiscount || 0) !== promoDiscount || Number(saved.affiliateDiscount || 0) !== finalAffiliateDiscount)
        return res.status(409).json({ code: "PAYMENT_BINDING_CONFLICT", error: "This payment has already started. Return to the original checkout or contact support." });
      const invoice = await verifyCatalystInvoiceBinding(access.order, savedInvoiceId);
      if (!["New", "Processing"].includes(invoice.status) || !["None", "PaidPartial"].includes(invoice.additionalStatus))
        return res.status(409).json({ code: "PAYMENT_RECONCILIATION_REQUIRED", error: "This payment needs reconciliation. Contact support before trying another payment." });
      return res.status(200).json({ checkoutLink: catalystCheckoutUrl(invoice.checkoutLink), invoice_id: savedInvoiceId, amount: price_amount });
    }

    const baseUrl = process.env.BASE_URL || "https://10bottlevalue.co";
    const redirectURL = `${baseUrl}/?payment=success&order=${encodeURIComponent(order_id)}&provider=catalystpay`;

    // metadata values must be alphanumeric, dashes, underscores only (PaidlyInteractive restriction)
    const safeEmail = (customer_email || "").replace(/[^a-zA-Z0-9\-_]/g, "_");
    const safeAffCode = (affiliateCode || "").replace(/[^a-zA-Z0-9\-_]/g, "_");

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
    if (!nowRes.ok || Buffer.byteLength(rawText) > 100000)
      throw Object.assign(new Error('Payment setup is pending. Please contact support before trying another payment.'), { status: 503, code: 'PAYMENT_CREATION_UNAVAILABLE' });
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw Object.assign(new Error('Payment setup is pending. Please contact support before trying another payment.'), { status: 503, code: 'PAYMENT_CREATION_UNAVAILABLE' });
    }
    const checkoutLink = verifyCatalystCreatedInvoice(data, { orderId: order_id, amount: price_amount });

    // The callback depends on this exact invoice binding. Never send a customer
    // to an invoice whose canonical quote was not durably acknowledged.
    if (!SB_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !/^[A-Za-z0-9_-]{1,160}$/.test(data.id || ""))
      throw Object.assign(new Error("Payment setup is pending. Please contact support before trying another payment."), { status: 503, code: "PAYMENT_BINDING_UNAVAILABLE" });
    {
        const existing = await fetch(
          `${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(order_id))}&select=id,email,status,total,metadata,payment_id,payment_provider&limit=2`,
          { headers: sbH(), redirect: "error", signal: AbortSignal.timeout(8000) }
        );
        const rows = existing.ok ? await existing.json() : [];
        const currentStatus = String(rows?.[0]?.status || "").toLowerCase();
        if (!Array.isArray(rows) || rows.length !== 1 || rows[0].id !== order_id || rows[0].email !== customer_email
          || !["pending", "checkout", "checkout (clicked pay)", "wire_pending"].includes(currentStatus)
          || rows[0].payment_id || rows[0].payment_provider || rows[0].metadata?.catalystpay_invoice_id)
          throw Object.assign(new Error("A payment has already started or this order changed. Contact support before trying another payment."), { status: 409, code: "PAYMENT_BINDING_CONFLICT" });
          const patch = {
              status: "checkout (clicked pay)",
              total: price_amount,
              metadata: {
                ...(rows?.[0]?.metadata || {}),
                catalystpay_invoice_id: data.id,
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
          };
          const query = new URLSearchParams({ id: `eq.${order_id}`, email: `eq.${customer_email}`, status: `eq.${rows[0].status}`, payment_id: 'is.null', payment_provider: 'is.null', 'metadata->>catalystpay_invoice_id': 'is.null' });
          if (rows[0].total != null) query.set('total', `eq.${rows[0].total}`);
          const saved = await fetch(`${SB_URL}/rest/v1/orders?${query}`, {
            method: "PATCH",
            headers: { ...sbH(), Prefer: "return=representation" },
            redirect: "error", signal: AbortSignal.timeout(8000),
            body: JSON.stringify(patch),
          });
          const acknowledged = saved.ok ? await saved.json() : null;
          const row = Array.isArray(acknowledged) && acknowledged.length === 1 ? acknowledged[0] : null;
          if (!row || row.id !== order_id || row.email !== customer_email || row.status !== patch.status
            || Number(row.total) !== price_amount || !isDeepStrictEqual(row.metadata, patch.metadata))
            throw Object.assign(new Error("Payment setup is pending. Please contact support before trying another payment."), { status: 503, code: "PAYMENT_BINDING_UNACKNOWLEDGED" });
    }

    return res.status(200).json({
      checkoutLink,
      invoice_id: data.id,
      amount: price_amount,
    });
  } catch (err) {
    const known = typeof err?.code === 'string' && /^PAYMENT_[A-Z_]+$/.test(err.code);
    console.error("create-catalystpay-session error:", known ? err.code : "PAYMENT_CREATION_UNAVAILABLE");
    return res.status(known ? err.status || 503 : 503).json({ code: known ? err.code : "PAYMENT_CREATION_UNAVAILABLE", error: known ? err.message : "Payment setup is pending. Please contact support before trying another payment." });
  }
}
