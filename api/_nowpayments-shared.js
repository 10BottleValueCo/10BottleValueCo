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
export async function processNowPaymentsStatus(data) {
  const status = String(data.payment_status || "").toLowerCase();
  const shouldEmail = ["confirming", "confirmed", "sending", "finished"].includes(status);
  const isPaid = ["confirming", "confirmed", "sending", "finished"].includes(status);

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

  if (!shouldEmail) return { received: true, skipped: "not_relevant", status };

  const baseUrl = process.env.BASE_URL || "https://10bottlevalue.co";
  let metadata = {};
  if (typeof data.order_description === "string") {
    try { const p = JSON.parse(data.order_description); metadata = p && typeof p === "object" ? p : {}; } catch {}
  }

  const orderId = metadata.order_id || metadata.orderId || data.order_id || data.payment_id || data.invoice_id;
  const currency = String(data.pay_currency || "").toUpperCase();

  if (!orderId) {
    console.error("NOWPayments: bailed out, no orderId at all:", { status });
    return { received: true, skipped: "missing_order_id", status };
  }

  let sbMeta = {};
  let sbEmail = "";
  let alreadyEmailSent = false;
  let alreadyPaidInDb = false;
  if (SB_URL && SB_KEY) {
    try {
      const sbRes = await fetch(`${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(orderId))}&select=metadata,items,status,email`, { headers: sbH() });
      if (sbRes.ok) {
        const sbRows = await sbRes.json();
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

  // NOWPayments truncates order_description past its own length limit, which silently
  // breaks the JSON.parse above (and thus drops customer_email) for any order with a
  // long enough address/items/promo/affiliate payload — this is exactly what stranded
  // real paid orders as "checkout (clicked pay)" forever. Our own Supabase orders.email
  // column (written at checkout time, independent of NOWPayments' echo) is the
  // authoritative fallback so a truncated order_description no longer blocks processing.
  const email = String(
    metadata.customer_email || metadata.email || data.customer_email || data.email ||
    sbEmail || sbMeta.customer_email || sbMeta.email || ""
  );

  if (!email) {
    console.error("NOWPayments: bailed out, no email resolvable from any source:", { orderId, status });
    return { received: true, skipped: "missing_email", status };
  }

  if (alreadyEmailSent && !isPaid) {
    return { received: true, skipped: "email_already_sent", status };
  }

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
    await fetch(`${baseUrl}/api/send-payment-confirmed-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    }).catch(() => {});

    // Persist that the email was sent so a later duplicate status update (e.g. the
    // real IPN webhook arriving after our own fallback already handled it, or vice
    // versa) doesn't send a second confirmation email for the same order.
    if (SB_URL && SB_KEY) {
      await fetch(`${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(orderId))}`, {
        method: "PATCH",
        headers: { ...sbH(), Prefer: "return=minimal" },
        body: JSON.stringify({ metadata: { ...sbMeta, confirmationEmailSentAt: new Date().toISOString() } }),
      }).catch(() => {});
    }
  }

  let dbMarkedPaid = alreadyPaidInDb;
  let dbWriteError = null;
  if (isPaid && !alreadyPaidInDb && SB_URL && SB_KEY) {
    // This PATCH is the ONLY thing that actually marks the order paid in Supabase.
    // It used to be fire-and-forget (`.catch(() => {})` swallowing failures), and the
    // frontend retry loop (verify-nowpayments-payment) stopped retrying as soon as the
    // *payment provider* said "paid" — regardless of whether this write actually
    // succeeded. A transient failure here (network blip, momentary Supabase hiccup)
    // silently left the order stuck "checkout (clicked pay)" forever, even though the
    // confirmation email had already gone out. Now we retry the write itself and report
    // real success back, so the frontend knows to keep retrying if the DB write failed.
    const patchOrderPaid = async () => {
      try {
        const r = await fetch(`${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(orderId))}`, {
          method: "PATCH",
          headers: { ...sbH(), Prefer: "return=representation" },
          body: JSON.stringify({
            status: "paid",
            payment_provider: `NOWPayments ${currency}`.trim(),
            payment_id: data.payment_id || data.invoice_id || orderId,
            paid_at: new Date().toISOString(),
          }),
        });
        if (!r.ok) {
          dbWriteError = `HTTP ${r.status}: ${await r.text().catch(() => "")}`;
          console.error("NOWPayments: failed to PATCH order paid:", orderId, dbWriteError);
          return false;
        }
        const rows = await r.json().catch(() => []);
        if (!Array.isArray(rows) || rows.length === 0) {
          // 2xx with zero rows affected means the filter matched nothing — the order
          // row doesn't actually exist under this id. Silently "succeeding" here is
          // exactly what caused this to go undetected before: the promo/affiliate
          // side effects ran as if paid, while the order itself stayed unpaid forever.
          dbWriteError = `matched 0 rows for id=${orderId}`;
          console.error("NOWPayments: order PATCH matched 0 rows:", orderId);
          return false;
        }
        return true;
      } catch (e) {
        dbWriteError = String(e?.message || e);
        console.error("NOWPayments: order PATCH threw:", orderId, dbWriteError);
        return false;
      }
    };

    dbMarkedPaid = await patchOrderPaid();
    if (!dbMarkedPaid) dbMarkedPaid = await patchOrderPaid();

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

    // Deduct spent store credit server-side. This used to happen ONLY in the
    // frontend's markOrderPaidById (tied to the browser polling/checking status
    // on the payment-return page) — if the webhook/status-check landed after the
    // client gave up retrying or the customer closed/left the tab, the credit was
    // never deducted at all, letting it be re-spent on a future order.
    if (finalStoreCreditUsed > 0 && email) {
      try {
        const creditEmail = email.toLowerCase();
        const creditRes = await fetch(`${SB_URL}/rest/v1/user_credits?email=eq.${encodeURIComponent(creditEmail)}&select=amount`, { headers: sbH() });
        const creditRows = creditRes.ok ? await creditRes.json() : [];
        const newCreditAmount = Math.max(0, (creditRows?.[0] ? Number(creditRows[0].amount) : 0) - finalStoreCreditUsed);
        await fetch(`${SB_URL}/rest/v1/user_credits?on_conflict=email`, {
          method: "POST",
          headers: { ...sbH(), Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ email: creditEmail, amount: newCreditAmount, updated_at: new Date().toISOString() }),
        }).catch((e) => console.error("NOWPayments: user_credits upsert failed:", e.message));
      } catch (e) {
        console.error("NOWPayments: store credit deduction threw:", e?.message || e);
      }
    }
  }

  return { received: true, status, isPaid, dbMarkedPaid, dbWriteError, affiliateCode, alreadyEmailSent, alreadyPaidInDb };
}
