import { sendPaymentConfirmationEmail } from "./_payment-confirmation-email.js";
import { acknowledgeLegacyPaid, inspectLegacyTransition, legacyTransitionError } from "./_legacy-paid-transition.js";
import { debitLegacyOrderCredit } from "./_legacy-store-credit.js";
const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const sbH = () => ({ apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" });

async function resolveAffiliate(email, code) {
  if (!email || !SB_URL) return (code || "").trim().toUpperCase() || null;
  const normalized = (code || "").trim().toUpperCase();
  const key = email.toLowerCase();
  try {
    const r = await fetch(`${SB_URL}/rest/v1/affiliate_customers?email=eq.${encodeURIComponent(key)}&select=affiliate_code&limit=1`, { headers: sbH() });
    if (r.ok) {
      const rows = await r.json();
      if (rows?.length) return rows[0].affiliate_code;
    }
  } catch {}
  if (normalized) {
    await fetch(`${SB_URL}/rest/v1/affiliate_customers`, {
      method: "POST",
      headers: { ...sbH(), Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({ email: key, affiliate_code: normalized }),
    }).catch(() => {});
    return normalized;
  }
  return null;
}

// Shared core logic for processing a NOWPayments status update, whatever the
// source (the real IPN webhook, or a direct server-side status check we run
// ourselves as a fallback when the IPN is late/missing). `data` must look like
// either a NOWPayments IPN payload or a GET /v1/payment/{id} response — both
// share the same field names (payment_status, order_id, order_description,
// pay_currency, actually_paid, payment_id, invoice_id).
export async function processNowPaymentsStatus(data, { providerVerified = false } = {}) {
  const status = String(data.payment_status || "").toLowerCase();
  const isPaid = status === "finished";

  // Log the raw payload for EVERY call, before any early return. Without this,
  // a call that bails out early (e.g. missing order_id/email in this specific
  // status update) leaves zero trace in Vercel logs — "no outgoing requests"
  // and 0 errors — making it impossible to tell "bailed out early" apart from
  // "never got invoked" or "crashed silently". console.error (not .log) so it
  // is visible even when only the Error filter is checked in Vercel's UI.
  console.error("NOWPayments webhook raw payload:", JSON.stringify({
    payment_status: data.payment_status,
    order_id: data.order_id,
    payment_id: data.payment_id,
    invoice_id: data.invoice_id,
    pay_currency: data.pay_currency,
    order_description: typeof data.order_description === "string" ? data.order_description.slice(0, 500) : data.order_description,
  }));

  if (!isPaid) return { received: true, skipped: "not_relevant", status };
  if (!providerVerified) {
    const error = new Error("Authenticated provider verification is required.");
    error.status = 503; error.code = "PAYMENT_VERIFICATION_REQUIRED"; throw error;
  }


  const baseUrl = process.env.BASE_URL || "https://10bottlevalue.co";
  let metadata = {};
  if (typeof data.order_description === "string") {
    try { const p = JSON.parse(data.order_description); metadata = p && typeof p === "object" ? p : {}; } catch {}
  }

  const orderId = data.order_id;
  const describedOrder = metadata.order_id || metadata.orderId;
  if (describedOrder && String(describedOrder) !== String(orderId)) throw legacyTransitionError();
  const currency = String(data.pay_currency || "").toUpperCase();

  if (!orderId) {
    console.error("NOWPayments: bailed out, no orderId at all:", { status });
    return { received: true, skipped: "missing_order_id", status };
  }

  let sbMeta = {};
  let sbEmail = "";
  let alreadyEmailSent = false;
  let alreadyPaidInDb = false;
  let orderReadVerified = false;
  let savedOrder;
  if (SB_URL && SB_KEY) {
    try {
      const sbRes = await fetch(`${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(orderId))}&select=id,total,metadata,items,status,email,payment_id,payment_provider&limit=2`, { headers: sbH() });
      if (sbRes.ok) {
        const sbRows = await sbRes.json();
        savedOrder = sbRows?.[0];
        orderReadVerified = Array.isArray(sbRows) && sbRows.length === 1 && !!sbRows[0] && typeof sbRows[0] === "object";
        if (sbRows?.length && sbRows[0].metadata && typeof sbRows[0].metadata === "object") {
          sbMeta = sbRows[0].metadata;
          if (sbMeta.confirmationEmailSentAt) alreadyEmailSent = true;
        }
        if (sbRows?.length && String(sbRows[0].status || "").toLowerCase() === "paid") alreadyPaidInDb = true;
        if (Array.isArray(sbRows?.[0]?.items) && sbRows[0].items.length > 0) {
          sbMeta = { ...sbMeta, items: sbRows[0].items };
        }
        sbEmail = String(sbRows?.[0]?.email || "");
      }
    } catch {}
  }

  if (!orderReadVerified) {
    const error = new Error("Store credit reconciliation requires the saved order.");
    error.code = "CREDIT_RECONCILIATION_REQUIRED";
    error.status = 503;
    throw error;
  }

  // NOWPayments truncates order_description past its own length limit, which silently
  // breaks the JSON.parse above (and thus drops customer_email) for any order with a
  // long enough address/items/promo/affiliate payload — this is exactly what stranded
  // real paid orders as "checkout (clicked pay)" forever. Our own Supabase orders.email
  // column (written at checkout time, independent of NOWPayments' echo) is the
  // authoritative fallback so a truncated order_description no longer blocks processing.
  const email = String(
    sbEmail
  );

  if (!email) {
    console.error("NOWPayments: bailed out, no email resolvable from any source:", { orderId, status });
    return { received: true, skipped: "missing_email", status };
  }

  const expectedPaid = { id: String(orderId), email, status: "paid", payment_provider: `NOWPayments ${currency}`.trim(),
    payment_id: String(data.payment_id || data.invoice_id || ""), paid_at: new Date().toISOString() };
  if (!expectedPaid.payment_id) throw legacyTransitionError();
  const quotedAmount = Number(data.price_amount), savedAmount = Number(savedOrder.total);
  if (String(data.price_currency || "").toLowerCase() !== "usd" || !Number.isFinite(quotedAmount) || !Number.isFinite(savedAmount)
      || savedAmount <= 0 || Math.round(quotedAmount * 100) !== Math.round(savedAmount * 100)) throw legacyTransitionError();
  const transition = inspectLegacyTransition(savedOrder, expectedPaid);
  alreadyPaidInDb = transition.alreadyPaid;
  if (alreadyPaidInDb) return { received: true, status, isPaid: true, dbMarkedPaid: true, alreadyPaidInDb: true };
  const declaredCredit = sbMeta.storeCreditUsed ?? 0;
  await debitLegacyOrderCredit({ orderId, email, creditAmount: declaredCredit, provider: "nowpayments" });
  await acknowledgeLegacyPaid(savedOrder, expectedPaid);
  const dbMarkedPaid = true, dbWriteError = null;

  const resolvedAffiliate = await resolveAffiliate(email, String(sbMeta.affiliateCode || metadata.affiliateCode || metadata.affiliate_code || "")).catch(() => null);
  const affiliateCode = resolvedAffiliate || String(sbMeta.affiliateCode || metadata.affiliateCode || "").trim().toUpperCase();

  const firstName = String(sbMeta.firstName || metadata.firstName || "");
  const lastName = String(sbMeta.lastName || metadata.lastName || "");
  const address = String(sbMeta.address || metadata.address || "");
  const address2 = String(sbMeta.address2 || metadata.address2 || "");
  const city = String(sbMeta.city || metadata.city || "");
  const state = String(sbMeta.state || metadata.state || "");
  const postalCode = String(sbMeta.postalCode || metadata.postalCode || "");
  const phone = String(sbMeta.phone || metadata.phone || "");
  const country = String(sbMeta.country || metadata.country || "");

  // Trust our own Supabase order record (written server-side at invoice-creation
  // time by create-payment.js, from validated catalog prices) above anything
  // parsed from NOWPayments' order_description or raw provider fields. NOWPayments
  // silently truncates order_description past a length limit, which breaks the
  // JSON.parse above and used to fall back to data.price_amount/actually_paid —
  // provider-side fields that don't reflect our discounts/store-credit and once
  // caused a confirmation email to show an inflated total.
  const items = Array.isArray(sbMeta.items) && sbMeta.items.length ? sbMeta.items : (Array.isArray(metadata.items) ? metadata.items : []);
  const finalTotal = Number(sbMeta.total ?? metadata.total ?? data.price_amount ?? data.actually_paid ?? 0);
  const finalSubtotal = Number(sbMeta.subtotal ?? metadata.subtotal ?? 0);
  const finalShipping = Number(sbMeta.shipping ?? metadata.shipping ?? 0);
  const finalAutoDiscount = Number(sbMeta.automaticDiscount ?? metadata.automaticDiscount ?? 0);
  const finalPromoDiscount = Number(sbMeta.promoDiscount ?? metadata.promoDiscount ?? 0);
  const finalAffiliateDiscount = Number(sbMeta.affiliateDiscount ?? metadata.affiliateDiscount ?? 0);
  const finalAffiliateOwnerEmail = String(sbMeta.affiliateOwnerEmail || metadata.affiliateOwnerEmail || "");
  const finalStoreCreditUsed = Number(sbMeta.storeCreditUsed ?? metadata.storeCreditUsed ?? 0);
  // Affiliate commission is ALWAYS a fixed 10% of the verified subtotal — never trust
  // client-writable metadata fields, or a tampered order could pay out an inflated commission.
  const finalAffiliateCommission = Number(finalSubtotal || finalTotal) * 0.1;
  const finalShippingType = String(sbMeta.shippingType || metadata.shippingType || "standard");

  if (!alreadyEmailSent) {
    const emailResponse = await sendPaymentConfirmationEmail({
        email, orderId,
        total: finalTotal, subtotal: finalSubtotal, shipping: finalShipping,
        automaticDiscount: finalAutoDiscount, promoDiscount: finalPromoDiscount,
        affiliateDiscount: finalAffiliateDiscount, storeCreditUsed: finalStoreCreditUsed, affiliateCode,
        affiliateOwnerEmail: finalAffiliateOwnerEmail, affiliateCommission: finalAffiliateCommission,
        shippingType: finalShippingType,
        paymentProvider: `NOWPayments ${currency}`.trim(),
        paymentId: data.payment_id || data.invoice_id || orderId,
        items,
        firstName, lastName, address, address2, city, state, postalCode, phone, country,
      }, { escapeValues: true }).catch(() => { console.error("NOWPayments payment receipt delivery failed"); });

    // Persist that the email was sent so a later duplicate status update (e.g. the
    // real IPN webhook arriving after our own fallback already handled it, or vice
    // versa) doesn't send a second confirmation email for the same order.
    if (emailResponse?.ok && SB_URL && SB_KEY) {
      await fetch(`${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(orderId))}&status=eq.paid`, {
        method: "PATCH",
        headers: { ...sbH(), Prefer: "return=minimal" },
        body: JSON.stringify({ metadata: { ...sbMeta, confirmationEmailSentAt: new Date().toISOString() } }),
      }).catch(() => {});
    }
  }

    // NOTE: deliberately not using on_conflict/merge-duplicates here — Postgres
    // requires UPDATE privilege on the table for "ON CONFLICT DO UPDATE" to even
    // plan, and the service_role key here was only ever granted INSERT on
    // affiliate_orders. Checking-then-inserting only needs INSERT.
    if (affiliateCode) {
      const commissionAmount = finalAffiliateCommission;
      try {
        const existsRes = await fetch(
          `${SB_URL}/rest/v1/affiliate_orders?order_id=eq.${encodeURIComponent(String(orderId))}&select=id`,
          { headers: sbH() }
        );
        const existingRows = existsRes.ok ? await existsRes.json() : [];
        if (!Array.isArray(existingRows) || existingRows.length === 0) {
          await fetch(`${SB_URL}/rest/v1/affiliate_orders`, {
            method: "POST",
            headers: { ...sbH(), Prefer: "return=minimal" },
            body: JSON.stringify({
              order_id: orderId,
              affiliate_code: affiliateCode,
              commission_amount: Number(commissionAmount.toFixed(2)),
              shipping_type: finalShippingType,
              created_at: new Date().toISOString(),
            }),
          });
        }
      } catch {}
    }

    // Mark the user's personal promo code as used server-side. This used to
    // only happen client-side (in App.jsx, after the browser observed the
    // order flip to "paid"), which never ran for crypto buyers who pay on
    // the NOWPayments-hosted invoice and never click back to the site —
    // leaving the code stuck "unused" in Supabase forever even though it
    // had genuinely already been spent on a paid order.
    const promoCodeUsed = String(sbMeta.promoCode || metadata.promoCode || "").trim().toUpperCase();
    if (promoCodeUsed) {
      await fetch(
        `${SB_URL}/rest/v1/user_promos?email=eq.${encodeURIComponent(email.toLowerCase())}&code=eq.${encodeURIComponent(promoCodeUsed)}&used=eq.false`,
        { method: "PATCH", headers: { ...sbH(), Prefer: "return=minimal" }, body: JSON.stringify({ used: true }) }
      ).catch(() => {});
    }


  return { received: true, status, isPaid, dbMarkedPaid, dbWriteError, affiliateCode, alreadyEmailSent, alreadyPaidInDb };
}
