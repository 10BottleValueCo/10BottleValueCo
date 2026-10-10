import { settlementAffiliate } from "./_settlement-affiliate.js";
import { sendPaymentConfirmationEmail } from "./_payment-confirmation-email.js";
import { acknowledgeLegacyPaid, inspectLegacyTransition } from "./_legacy-paid-transition.js";
import { debitLegacyOrderCredit } from "./_legacy-store-credit.js";
import crypto from "crypto";
import { catalystPayConfigured, verifyCatalystSettlement } from "./_catalystpay-provider.js";

const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const sbH = () => ({ apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" });

const WEBHOOK_SECRET = process.env.CATALYSTPAY_WEBHOOK_SECRET || "";
const BASE_URL = process.env.BASE_URL || "https://10bottlevalue.co";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const invalid = () => new Error("Invalid webhook body");
  if (Number(req.headers?.["content-length"] || 0) > 65536) throw invalid();
  if (typeof req.on !== "function") {
    const raw = Object.getOwnPropertyDescriptor(req, "body")?.value;
    if ((typeof raw !== "string" && !Buffer.isBuffer(raw)) || Buffer.byteLength(raw) > 65536) throw invalid();
    return Buffer.isBuffer(raw) ? raw : Buffer.from(raw, "utf8");
  }
  // Vercel may install a lazy parsed-body getter. Authenticate the original
  // stream bytes; never touch that getter or stringify parsed JSON.
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0, settled = false;
    const finish = error => {
      if (settled) return; settled = true;
      const raw = error ? null : Buffer.concat(chunks, size); chunks.length = 0;
      for (const [event, listener] of listeners) req.removeListener?.(event, listener);
      if (error) reject(invalid()); else resolve(raw);
    };
    const listeners = [
      ["error", () => finish(true)], ["aborted", () => finish(true)],
      ["close", () => { if (req.complete !== true) finish(true); }],
      ["end", () => finish(false)],
      ["data", chunk => { if (settled) return; if (!Buffer.isBuffer(chunk)) return finish(true); size += chunk.length; if (size > 65536) return finish(true); chunks.push(chunk); }],
    ];
    for (const [event, listener] of listeners) req.on(event, listener);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "no-store");
  if (!WEBHOOK_SECRET && !catalystPayConfigured()) return res.status(503).json({ received: false, code: "PAYMENT_VERIFICATION_UNAVAILABLE" });


  let rawBody = "";
  try {
    rawBody = await readRawBody(req);
  } catch (e) {
    console.error("CatalystPay webhook: failed to read raw body:", e?.message);
    return res.status(400).json({ error: "Failed to read request body" });
  }

  let payload = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid object');
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  if (WEBHOOK_SECRET) {
    // Paidly's documented header includes the algorithm prefix. Preserve the
    // earlier explicit aliases, but never fall back from an invalid BTCPay-Sig.
    const officialHeader = req.headers?.["btcpay-sig"];
    const sigHeader = officialHeader !== undefined
      ? (typeof officialHeader === "string" ? /^sha256=([a-f0-9]{64})$/i.exec(officialHeader)?.[1] : null)
      : req.headers?.["x-signature"] || req.headers?.["x-webhook-signature"] || req.headers?.["x-paidly-signature"] || "";
    const expected = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(rawBody, "utf8")
      .digest("hex");
    if (typeof sigHeader !== "string" || !/^[a-f0-9]{64}$/i.test(sigHeader)
      || !crypto.timingSafeEqual(Buffer.from(sigHeader, "hex"), Buffer.from(expected, "hex"))) {
      console.error("CatalystPay webhook: invalid signature");
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
  }

  const eventType = String(payload.type || payload.eventType || "").toLowerCase();
  const isSettled = ['invoicesettled', 'invoice_settled', 'settled'].includes(eventType);

  if (!isSettled) {
    console.error("CatalystPay webhook: skipping non-settled event:", eventType);
    return res.status(200).json({ received: true, skipped: "not_settled", eventType });
  }
  if (payload.manuallyMarked === true) return res.status(409).json({ received: false, code: 'PAYMENT_RECONCILIATION_REQUIRED' });

  const metadata = payload.metadata || {};
  const hintedOrderId = String(metadata.OrderId || metadata.orderid || payload.orderId || payload.order_id || "");
  const invoiceId = String(payload.invoiceId || payload.id || "");

  if ((hintedOrderId && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(hintedOrderId)) || !/^[A-Za-z0-9_-]{1,160}$/.test(invoiceId))
    return res.status(400).json({ received: false, code: "INVALID_PAYMENT_REFERENCE" });

  let sbMeta = {};
  let sbEmail = "";
  let alreadyEmailSent = false;
  let alreadyPaidInDb = false;
  let orderReadVerified = false;
  let savedOrder;

  if (SB_URL && SB_KEY) {
    try {
      const sbRes = await fetch(
        `${SB_URL}/rest/v1/orders?${new URLSearchParams({ 'metadata->>catalystpay_invoice_id': `eq.${invoiceId}`, select: 'id,metadata,items,status,email,payment_id,payment_provider,total', limit: '2' })}`,
        { headers: sbH(), redirect: 'error', signal: AbortSignal.timeout(8000) }
      );
      if (sbRes.ok) {
        const raw = await sbRes.text();
        if (Buffer.byteLength(raw) > 250000) throw new Error('Order response too large');
        const rows = JSON.parse(raw);
        savedOrder = rows?.[0];
        orderReadVerified = Array.isArray(rows) && rows.length === 1 && !!rows[0] && typeof rows[0] === "object";
        if (rows?.length) {
          if (rows[0].metadata && typeof rows[0].metadata === "object") {
            sbMeta = rows[0].metadata;
            if (sbMeta.confirmationEmailSentAt) alreadyEmailSent = true;
          }
          if (String(rows[0].status || "").toLowerCase() === "paid") alreadyPaidInDb = true;
          if (Array.isArray(rows[0].items) && rows[0].items.length > 0) {
            sbMeta = { ...sbMeta, items: rows[0].items };
          }
          sbEmail = String(rows[0].email || "");
        }
      }
    } catch {}
  }

  if (!orderReadVerified) return res.status(503).json({ received: false, code: "CREDIT_RECONCILIATION_REQUIRED" });
  const orderId = savedOrder.id;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(orderId || '') || (hintedOrderId && hintedOrderId !== orderId)
    || sbMeta.catalystpay_invoice_id !== invoiceId) {
    return res.status(409).json({ received: false, code: "PAYMENT_RECONCILIATION_REQUIRED" });
  }
  if (!WEBHOOK_SECRET) {
    // An unsigned callback is only a bounded lookup hint. Settlement authority
    // comes from authenticated Paidly GET, bound to this saved invoice/order.
    try { await verifyCatalystSettlement(savedOrder, invoiceId); }
    catch (error) { return res.status(error.status || 503).json({ received: false, code: error.code || "PAYMENT_VERIFICATION_UNAVAILABLE" }); }
  }

  const email = String(sbEmail || sbMeta.customer_email || sbMeta.email || "");

  if (!email) {
    console.error("CatalystPay webhook: no email found for order:", orderId);
    return res.status(200).json({ received: true, skipped: "missing_email", orderId });
  }

  const items = Array.isArray(sbMeta.items) && sbMeta.items.length ? sbMeta.items : [];
  const finalTotal = Number(sbMeta.total ?? 0);
  const finalSubtotal = Number(sbMeta.subtotal ?? 0);
  const finalShipping = Number(sbMeta.shipping ?? 0);
  const finalAutoDiscount = Number(sbMeta.automaticDiscount ?? 0);
  const finalPromoDiscount = Number(sbMeta.promoDiscount ?? 0);
  const finalAffiliateDiscount = Number(sbMeta.affiliateDiscount ?? 0);
  const verifiedAffiliate = await settlementAffiliate(sbMeta, email, finalSubtotal, orderId, savedOrder.status);
  const finalAffiliateOwnerEmail = verifiedAffiliate.ownerEmail;
  const finalStoreCreditUsed = Number(sbMeta.storeCreditUsed ?? 0);
  const finalAffiliateCode = verifiedAffiliate.code;
  const finalAffiliateCommission = verifiedAffiliate.commission;
  const finalShippingType = String(sbMeta.shippingType || "standard");

  const expectedPaid = { id: orderId, email, status: "paid", payment_provider: "CatalystPay BTC",
    payment_id: invoiceId, paid_at: new Date().toISOString() };
  if (!invoiceId) return res.status(409).json({ received: false, code: "PAYMENT_RECONCILIATION_REQUIRED" });
  try {
    const transition = inspectLegacyTransition(savedOrder, expectedPaid);
    alreadyPaidInDb = transition.alreadyPaid;
    if (alreadyPaidInDb) return res.status(200).json({ received: true, orderId, dbMarkedPaid: true, alreadyPaidInDb: true });
    await debitLegacyOrderCredit({ orderId, email, creditAmount: finalStoreCreditUsed, provider: "catalystpay" });
    await acknowledgeLegacyPaid(savedOrder, expectedPaid);
  } catch (error) { return res.status(error.status || 503).json({ received: false, code: error.code || "PAYMENT_RECONCILIATION_REQUIRED" }); }
  const dbMarkedPaid = true, dbWriteError = null;

  if (!alreadyEmailSent) {
    const emailResponse = await sendPaymentConfirmationEmail({
        email,
        orderId,
        total: finalTotal,
        subtotal: finalSubtotal,
        shipping: finalShipping,
        automaticDiscount: finalAutoDiscount,
        promoDiscount: finalPromoDiscount,
        affiliateDiscount: finalAffiliateDiscount,
        storeCreditUsed: finalStoreCreditUsed,
        affiliateCode: finalAffiliateCode,
        affiliateOwnerEmail: finalAffiliateOwnerEmail,
        affiliateCommission: finalAffiliateCommission,
        shippingType: finalShippingType,
        paymentProvider: "CatalystPay BTC",
        paymentId: invoiceId || orderId,
        items,
        firstName: String(sbMeta.firstName || ""),
        lastName: String(sbMeta.lastName || ""),
        address: String(sbMeta.address || ""),
        address2: String(sbMeta.address2 || ""),
        city: String(sbMeta.city || ""),
        state: String(sbMeta.state || ""),
        postalCode: String(sbMeta.postalCode || ""),
        phone: String(sbMeta.phone || ""),
        country: String(sbMeta.country || ""),
      }, { escapeValues: true }).catch(() => { console.error("CatalystPay payment receipt delivery failed"); });

    if (emailResponse?.ok && SB_URL && SB_KEY) {
      await fetch(`${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&status=eq.paid`, {
        method: "PATCH",
        headers: { ...sbH(), Prefer: "return=minimal" },
        body: JSON.stringify({ metadata: { ...sbMeta, confirmationEmailSentAt: new Date().toISOString() } }),
      }).catch(() => {});
    }
  }

    if (finalAffiliateCode) {
      try {
        const existsRes = await fetch(
          `${SB_URL}/rest/v1/affiliate_orders?order_id=eq.${encodeURIComponent(orderId)}&select=id`,
          { headers: sbH() }
        );
        const existingRows = existsRes.ok ? await existsRes.json() : [];
        if (!Array.isArray(existingRows) || existingRows.length === 0) {
          await fetch(`${SB_URL}/rest/v1/affiliate_orders`, {
            method: "POST",
            headers: { ...sbH(), Prefer: "return=minimal" },
            body: JSON.stringify({
              order_id: orderId,
              affiliate_code: finalAffiliateCode,
              commission_amount: Number(finalAffiliateCommission.toFixed(2)),
              shipping_type: finalShippingType,
              created_at: new Date().toISOString(),
            }),
          });
        }
      } catch {}
    }

    const promoCodeUsed = String(sbMeta.promoCode || "").trim().toUpperCase();
    if (promoCodeUsed && email) {
      await fetch(
        `${SB_URL}/rest/v1/user_promos?email=eq.${encodeURIComponent(email.toLowerCase())}&code=eq.${encodeURIComponent(promoCodeUsed)}&used=eq.false`,
        { method: "PATCH", headers: { ...sbH(), Prefer: "return=minimal" }, body: JSON.stringify({ used: true }) }
      ).catch(() => {});
    }


  return res.status(200).json({ received: true, orderId, dbMarkedPaid, dbWriteError, alreadyEmailSent, alreadyPaidInDb });
}
