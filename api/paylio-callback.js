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

export default async function handler(req, res) {
  try {
    const data = req.body || {};
    const query = req.query || {};
    const status = String(data.status || data.payment_status || data.transaction_status || data.state || "").toLowerCase();
    const isPaid = ["success", "paid", "completed", "confirmed"].includes(status);
    if (!isPaid) return res.status(200).json({ ok: true, skipped: "payment_not_paid" });

    const baseUrl = process.env.BASE_URL || "https://10bottlevalue.co";
    const metadata = data.metadata || {};

    const orderId = metadata.order_id || metadata.orderId || data.order_id || query.order_id || data.transaction_id || data.id;
    const email = String(metadata.customer_email || metadata.email || data.customer_email || data.email || query.email || "");
    const total = Number(metadata.total || data.amount || query.total || 0);
    const subtotal = Number(metadata.subtotal || query.subtotal || 0);
    const shipping = Number(metadata.shipping || query.shipping || 0);
    const automaticDiscount = Number(metadata.automaticDiscount || query.automaticDiscount || 0);
    const promoDiscount = Number(metadata.promoDiscount || query.promoDiscount || 0);
    const affiliateDiscount = Number(metadata.affiliateDiscount || query.affiliateDiscount || 0);
    const affiliateOwnerEmail = String(metadata.affiliateOwnerEmail || query.affiliateOwnerEmail || "");
    const affiliateCommission = Number(metadata.affiliateCommission || query.affiliateCommission || 0);
    const shippingType = String(metadata.shippingType || query.shippingType || "standard");

    let items = [];
    if (Array.isArray(metadata.items)) items = metadata.items;
    else if (typeof query.items === "string") { try { const p = JSON.parse(query.items); items = Array.isArray(p) ? p : []; } catch {} }

    if (!email || !orderId) return res.status(200).json({ ok: true, skipped: "missing_email_or_order_id" });

    // Fetch full order from Supabase for address fields and dedup check
    let sbMeta = {};
    let alreadyEmailSent = false;
    let alreadyPaidInDb = false;
    if (SB_URL && SB_KEY) {
      try {
        const sbRes = await fetch(`${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(orderId))}&select=metadata,items,status&limit=1`, { headers: sbH() });
        if (sbRes.ok) {
          const sbRows = await sbRes.json();
          if (sbRows?.length && sbRows[0].metadata && typeof sbRows[0].metadata === "object") {
            sbMeta = sbRows[0].metadata;
            if (sbMeta.confirmationEmailSentAt) alreadyEmailSent = true;
          }
          if (sbRows?.length && String(sbRows[0].status || "").toLowerCase() === "paid") alreadyPaidInDb = true;
          if (Array.isArray(sbRows?.[0]?.items) && sbRows[0].items.length > 0 && items.length === 0) {
            items = sbRows[0].items;
          }
        }
      } catch {}
    }

    const resolvedAffiliate = await resolveAffiliate(email, String(metadata.affiliateCode || metadata.affiliate_code || query.affiliateCode || query.affiliate_code || "")).catch(() => null);
    const affiliateCode = resolvedAffiliate || "";

    // Address fields are display-only, so Supabase metadata (client-submitted) is fine as a source.
    const firstName = String(sbMeta.firstName || "");
    const lastName = String(sbMeta.lastName || "");
    const address = String(sbMeta.address || "");
    const address2 = String(sbMeta.address2 || "");
    const city = String(sbMeta.city || "");
    const state = String(sbMeta.state || "");
    const postalCode = String(sbMeta.postalCode || "");
    const phone = String(sbMeta.phone || "");
    const country = String(sbMeta.country || "");

    // Money fields prefer the payment processor's own callback payload (`metadata`/`total`
    // computed above from `data`/`query`) over `sbMeta` (the Supabase row written directly
    // by the client before payment, which cannot be trusted). Falling back to sbMeta only
    // covers legacy orders. NOTE: Paylio has no server-side catalog re-pricing step like
    // Stripe/NOWPayments (there is no api/create-paylio-payment.js), so the amount actually
    // charged is whatever Paylio reports here — this callback cannot re-validate it against
    // the catalog. If Paylio volume grows, add a create-paylio-payment.js that reprices
    // server-side the same way api/create-stripe-session.js does.
    const finalTotal = Number(total || sbMeta.total || 0);
    const finalSubtotal = Number(subtotal || sbMeta.subtotal || 0);
    const finalShipping = Number(shipping || sbMeta.shipping || 0);
    const finalAutoDiscount = Number(automaticDiscount || sbMeta.automaticDiscount || 0);
    const finalPromoDiscount = Number(promoDiscount || sbMeta.promoDiscount || 0);
    const finalAffiliateDiscount = Number(affiliateDiscount || sbMeta.affiliateDiscount || 0);
    const finalAffiliateOwnerEmail = String(affiliateOwnerEmail || sbMeta.affiliateOwnerEmail || "");
    // Affiliate commission is ALWAYS a fixed 10% of the verified subtotal — never trust
    // metadata.affiliateCommission/sbMeta.affiliateCommission (client-writable fields),
    // or a tampered order could pay out an inflated commission to the affiliate.
    const finalAffiliateCommission = Number(finalSubtotal || finalTotal) * 0.1;
    const finalShippingType = String(shippingType || sbMeta.shippingType || "standard");

    // Update Supabase status to paid. The `&status=neq.paid` filter makes this
    // PATCH the atomic "who gets to run paid-only side effects" gate: Postgres
    // only matches/updates the row for whichever concurrent callback reaches it
    // first, so a near-simultaneous duplicate delivery (not just a later retry,
    // which `alreadyPaidInDb` already covered) gets zero rows back and cannot
    // also run promo-mark-used / store-credit deduction below.
    let supabaseUpdateStatus = null;
    let wonPaidTransition = false;
    if (SB_URL && SB_KEY) {
      const updateRes = await fetch(
        `${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(orderId))}&status=neq.paid`,
        {
          method: "PATCH",
          headers: { ...sbH(), Prefer: "return=representation" },
          body: JSON.stringify({
            status: "paid",
            payment_provider: "Paylio Card",
            payment_id: data.transaction_id || data.id || orderId,
            paid_at: new Date().toISOString(),
          }),
        }
      ).catch(() => null);
      supabaseUpdateStatus = updateRes?.status || null;
      if (updateRes?.ok) {
        const rows = await updateRes.json().catch(() => []);
        wonPaidTransition = Array.isArray(rows) && rows.length > 0;
      }
    }

    // Send confirmation email (only once)
    if (!alreadyEmailSent) {
      await fetch(`${baseUrl}/api/send-payment-confirmed-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, orderId,
          total: finalTotal, subtotal: finalSubtotal, shipping: finalShipping,
          automaticDiscount: finalAutoDiscount, promoDiscount: finalPromoDiscount,
          affiliateDiscount: finalAffiliateDiscount, affiliateCode,
          affiliateOwnerEmail: finalAffiliateOwnerEmail, affiliateCommission: finalAffiliateCommission,
          shippingType: finalShippingType,
          paymentProvider: "Paylio Card",
          paymentId: data.transaction_id || data.id || orderId,
          items,
          firstName, lastName, address, address2, city, state, postalCode, phone, country,
        }),
      }).catch(() => {});
    }

    // Affiliate commission
    // NOTE: deliberately not using on_conflict/merge-duplicates here — Postgres
    // requires UPDATE privilege on the table for "ON CONFLICT DO UPDATE" to even
    // plan, and the service_role key here was only ever granted INSERT on
    // affiliate_orders (confirmed live: writes fail with 403 "permission denied"
    // when using merge-duplicates). Checking-then-inserting only needs INSERT.
    if (affiliateCode && SB_URL && SB_KEY) {
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

    // Mark promo code as used + deduct spent store credit server-side, once,
    // guarded on the order not already being paid before this callback ran —
    // same pattern as the Stripe/CatalystPay/NOWPayments webhooks. Previously
    // Paylio had neither: both only ever happened client-side in App.jsx,
    // tied to the browser still being on/returning to the payment-return
    // page, so a closed tab left the promo code "unused" and the store
    // credit un-deducted forever, even though the order was genuinely paid.
    if (!alreadyPaidInDb && wonPaidTransition && SB_URL && SB_KEY) {
      const promoCodeUsed = String(finalPromoDiscount > 0 ? (sbMeta.promoCode || "") : "").trim().toUpperCase();
      if (promoCodeUsed && email) {
        await fetch(
          `${SB_URL}/rest/v1/user_promos?email=eq.${encodeURIComponent(email.toLowerCase())}&code=eq.${encodeURIComponent(promoCodeUsed)}&used=eq.false`,
          { method: "PATCH", headers: { ...sbH(), Prefer: "return=minimal" }, body: JSON.stringify({ used: true }) }
        ).catch(() => {});
      }

      const storeCreditUsedAmt = Number(sbMeta.storeCreditUsed || 0);
      if (storeCreditUsedAmt > 0 && email) {
        try {
          const creditEmail = email.toLowerCase();
          const creditRes = await fetch(`${SB_URL}/rest/v1/user_credits?email=eq.${encodeURIComponent(creditEmail)}&select=amount`, { headers: sbH() });
          const creditRows = creditRes.ok ? await creditRes.json() : [];
          const newCreditAmount = Math.max(0, (creditRows?.[0] ? Number(creditRows[0].amount) : 0) - storeCreditUsedAmt);
          await fetch(`${SB_URL}/rest/v1/user_credits?on_conflict=email`, {
            method: "POST",
            headers: { ...sbH(), Prefer: "resolution=merge-duplicates,return=minimal" },
            body: JSON.stringify({ email: creditEmail, amount: newCreditAmount, updated_at: new Date().toISOString() }),
          }).catch((e) => console.error("Paylio: user_credits upsert failed:", e.message));
        } catch (e) {
          console.error("Paylio: store credit deduction threw:", e?.message || e);
        }
      }
    }

    return res.status(200).json({ ok: true, supabaseUpdateStatus, affiliateCode, alreadyEmailSent, alreadyPaidInDb });
  } catch (err) {
    console.error("Paylio callback error:", err.message);
    return res.status(500).json({ error: "Paylio callback failed", message: err.message });
  }
}
