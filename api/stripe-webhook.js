import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Use plain REST fetch calls instead of the @supabase/supabase-js and resend
// SDKs (like nowpayments-webhook.js and paylio-callback.js already do). This
// webhook used to be the ONLY api/*.js file importing those two npm packages
// directly; if either one is missing/mismatched in the deployed package.json,
// the whole function crashes at import time on every single invocation with
// an opaque platform-level 500 ("A server error has occurred") that never
// even reaches our own try/catch. Avoiding the SDKs removes that failure mode
// entirely and matches the proven-working pattern used everywhere else.
const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const sbH = () => ({ apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" });

async function sbSelectOne(table, params) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, { headers: sbH() });
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function sbUpsert(table, body, onConflict) {
  const qs = onConflict ? `?on_conflict=${onConflict}` : "";
  const r = await fetch(`${SB_URL}/rest/v1/${table}${qs}`, {
    method: "POST",
    headers: { ...sbH(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Supabase upsert into ${table} failed: ${r.status} ${text}`);
  }
}

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function money(v) {
  return Number(v || 0).toFixed(2);
}

async function sendConfirmationEmail({ email, orderId, meta, items, paymentId, session }) {
  if (!process.env.RESEND_API_KEY) return;

  const firstName = meta.firstName || session.metadata?.firstName || "";
  const lastName = meta.lastName || session.metadata?.lastName || "";
  const address = meta.address || "";
  const address2 = meta.address2 || "";
  const city = meta.city || "";
  const state = meta.state || "";
  const postalCode = meta.postalCode || "";
  const phone = meta.phone || "";
  const country = meta.country || session.metadata?.country || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const zipCode = postalCode;

  const total = Number(meta.total || session.amount_total / 100 || 0);
  const subtotal = Number(meta.subtotal || total);
  const shipping = Number(meta.shipping || 0);
  const autoDiscount = Number(meta.automaticDiscount || 0);
  const promoDiscount = Number(meta.promoDiscount || 0);
  const affiliateDiscount = Number(meta.affiliateDiscount || 0);
  const storeCreditUsed = Number(meta.storeCreditUsed || session.metadata?.storeCreditUsed || 0);
  const cardProcessingFee = Number(meta.cardProcessingFee || session.metadata?.cardProcessingFee || 0);
  const shippingType = meta.shippingType || session.metadata?.shippingType || "standard";
  const isExpress = String(shippingType).toLowerCase() === "express";
  const isUsWarehouse = String(shippingType).toLowerCase() === "us-warehouse";
  const shippingLabel = isUsWarehouse ? "US Warehouse" : isExpress ? "Express" : "Standard";
  const deliveryLine = isUsWarehouse
    ? "✓ US Warehouse delivery: 2–5 business days (ships from USA)"
    : isExpress
    ? "✓ Express delivery: 5–7 business days (worldwide)"
    : "✓ Standard delivery: 7–12 business days";

  const hasAddress = !!(fullName || address || city || country || zipCode || state || phone);
  const addressHtml = hasAddress
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e8e8;border:1px solid #d0d0d0;border-radius:14px;margin-bottom:28px;">
        <tr><td style="padding:20px 26px;">
          <p style="margin:0 0 10px;font-size:14px;font-weight:800;color:#555;text-transform:uppercase;letter-spacing:0.08em;">Shipping address</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;">
            <tr><td style="padding:2px 0;font-size:14px;color:#888;width:110px;">Name</td><td style="padding:2px 0;font-size:15px;color:#222;">${fullName || "—"}</td></tr>
            <tr><td style="padding:2px 0;font-size:14px;color:#888;">Address</td><td style="padding:2px 0;font-size:15px;color:#222;">${[address, address2].filter(Boolean).join(", ") || "—"}</td></tr>
            <tr><td style="padding:2px 0;font-size:14px;color:#888;">City</td><td style="padding:2px 0;font-size:15px;color:#222;">${city || "—"}</td></tr>
            <tr><td style="padding:2px 0;font-size:14px;color:#888;">Postal Code</td><td style="padding:2px 0;font-size:15px;color:#222;">${zipCode || "—"}</td></tr>
            ${state ? `<tr><td style="padding:2px 0;font-size:14px;color:#888;">State</td><td style="padding:2px 0;font-size:15px;color:#222;">${state}</td></tr>` : ""}
            <tr><td style="padding:2px 0;font-size:14px;color:#888;">Country</td><td style="padding:2px 0;font-size:15px;color:#222;">${country || "—"}</td></tr>
            <tr><td style="padding:2px 0;font-size:14px;color:#888;">Phone</td><td style="padding:2px 0;font-size:15px;color:#222;">${phone || "—"}</td></tr>
          </table>
        </td></tr>
      </table>`
    : "";

  const orderItems = Array.isArray(items) && items.length > 0 ? items : [];
  const itemsHtml = orderItems.length
    ? orderItems
        .map(
          (item) =>
            `<tr>
              <td style="padding:16px 0;border-bottom:1px solid #d7d7d7;color:#222;font-size:16px;">${(item.quantity || 1) * 10} vials × ${item.name || "Product"} ${item.dose || ""}</td>
              <td align="right" style="padding:16px 0;border-bottom:1px solid #d7d7d7;color:#222;font-size:16px;font-weight:700;">$${money(Number(item.price || 0) * Number(item.quantity || 1))}</td>
            </tr>`
        )
        .join("")
    : `<tr><td style="padding:16px 0;border-bottom:1px solid #d7d7d7;color:#222;font-size:16px;">Order item</td><td align="right" style="padding:16px 0;border-bottom:1px solid #d7d7d7;color:#222;font-size:16px;font-weight:700;">$${money(total)}</td></tr>`;

  const summaryHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
      <tr><td style="padding:7px 0;color:#444;font-size:15px;">Subtotal</td><td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">$${money(subtotal)}</td></tr>
      ${autoDiscount > 0 ? `<tr><td style="padding:7px 0;color:#444;font-size:15px;">Automatic discount</td><td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">-$${money(autoDiscount)}</td></tr>` : ""}
      ${promoDiscount > 0 ? `<tr><td style="padding:7px 0;color:#444;font-size:15px;">Promo discount</td><td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">-$${money(promoDiscount)}</td></tr>` : ""}
      ${affiliateDiscount > 0 ? `<tr><td style="padding:7px 0;color:#444;font-size:15px;">Affiliate discount</td><td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">-$${money(affiliateDiscount)}</td></tr>` : ""}
      <tr><td style="padding:7px 0;color:#444;font-size:15px;">Shipping method</td><td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">${shippingLabel}</td></tr>
      <tr><td style="padding:7px 0;color:#444;font-size:15px;">Shipping</td><td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">${shipping === 0 ? "Free" : `$${money(shipping)}`}</td></tr>
      ${cardProcessingFee > 0 ? `<tr><td style="padding:7px 0;color:#444;font-size:15px;">Card processing fee (5%)</td><td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">+$${money(cardProcessingFee)}</td></tr>` : ""}
      ${storeCreditUsed > 0 ? `<tr><td style="padding:7px 0;color:#444;font-size:15px;">Store credit used</td><td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">-$${money(storeCreditUsed)}</td></tr>` : ""}
      <tr><td style="padding:14px 0 0;border-top:1px solid #d7d7d7;color:#111;font-size:18px;font-weight:800;">Total paid</td><td align="right" style="padding:14px 0 0;border-top:1px solid #d7d7d7;color:#111;font-size:18px;font-weight:800;">$${money(total)}</td></tr>
    </table>`;

  const html = `<!doctype html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#d6d6d6;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#d6d6d6;padding:36px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:900px;background:#e9e9e9;border:1px solid #bfbfbf;border-radius:24px;overflow:hidden;">
        <tr><td align="center" style="padding:34px 34px 22px;">
          <img src="https://10bottlevalue.co/logo.png" alt="10BottleValueCo" style="width:70px;height:auto;display:block;margin:0 auto 14px;" />
          <div style="font-size:32px;font-weight:800;color:#111;letter-spacing:-0.04em;">10BottleValueCo</div>
          <div style="font-size:13px;color:#888;letter-spacing:0.12em;margin-top:4px;">RESEARCH USE ONLY</div>
        </td></tr>
        <tr><td style="padding:0 34px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border:1px solid #cfcfcf;border-radius:20px;">
            <tr><td style="padding:34px 34px;">
              <h1 style="margin:0 0 18px;font-size:30px;line-height:1.2;color:#111;">Payment confirmed</h1>
              <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#333;">Your payment has been received successfully. Your order is now being processed.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e8e8;border:1px solid #d0d0d0;border-radius:14px;margin-bottom:28px;">
                <tr><td style="padding:24px 26px;">
                  <p style="margin:0 0 10px;font-size:15px;color:#222;"><strong>Order ID:</strong> ${orderId}</p>
                  <p style="margin:0 0 10px;font-size:15px;color:#222;"><strong>Total:</strong> $${money(total)}</p>
                  <p style="margin:0 0 10px;font-size:15px;color:#222;"><strong>Shipping method:</strong> ${shippingLabel}</p>
                  <p style="margin:0 0 10px;font-size:15px;color:#222;"><strong>Payment method:</strong> Stripe</p>
                  <p style="margin:0;font-size:15px;color:#222;"><strong>Payment ID:</strong> ${paymentId}</p>
                </td></tr>
              </table>
              ${addressHtml}
              <table width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table>
              ${summaryHtml}
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e8e8;border:1px solid #d0d0d0;border-radius:14px;margin-top:30px;">
                <tr><td style="padding:24px 26px;">
                  <p style="margin:0 0 10px;font-size:15px;font-weight:800;color:#222;">What happens next:</p>
                  <p style="margin:0 0 7px;font-size:15px;color:#222;">✓ Order processing: 12–48 hours</p>
                  <p style="margin:0 0 7px;font-size:15px;color:#222;">${deliveryLine}</p>
                  <p style="margin:0;font-size:15px;color:#222;">✓ Tracking will be sent after fulfillment</p>
                </td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:30px;">
                <tr><td align="center"><a href="https://10bottlevalue.co" style="display:inline-block;background:#111;color:#fff;text-decoration:none;border-radius:999px;padding:15px 42px;font-size:14px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Go to account</a></td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr><td align="center"><a href="https://www.trustpilot.com/review/10bottlevalue.co" style="display:inline-block;background:#00b67a;color:#fff;text-decoration:none;border-radius:999px;padding:14px 42px;font-size:14px;font-weight:800;letter-spacing:0.10em;text-transform:uppercase;">Review on Trustpilot</a></td></tr>
              </table>
              <p style="margin:24px 0 0;text-align:center;font-size:13px;color:#888;">Need help? Contact us by email at <a href="mailto:support@10bottlevalue.co" style="color:#555;">support@10bottlevalue.co</a></p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 34px 28px;" align="center">
          <p style="margin:0;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.08em;">SUPPORT: SUPPORT@10BOTTLEVALUE.CO</p>
          <p style="margin:4px 0 0;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.08em;">ORDERS ARE FULFILLED BY INTERNATIONAL PARTNERS</p>
          <p style="margin:4px 0 0;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.08em;">FOR LABORATORY RESEARCH USE ONLY. NOT FOR HUMAN OR ANIMAL USE.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "10BottleValueCo <support@10bottlevalue.co>",
      to: email,
      subject: `Order confirmed — ${orderId}`,
      html,
    }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Resend send failed: ${response.status} ${JSON.stringify(data)}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const sig = req.headers["stripe-signature"];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    try {
      const session = event.data.object;
      // client_reference_id is a safety net in case metadata.orderId is missing
      const orderId = session.metadata?.orderId || session.client_reference_id || null;
      if (!orderId) {
        console.error("Stripe webhook: orderId missing from metadata and client_reference_id", session.id);
        return res.status(200).json({ received: true, warning: "orderId missing" });
      }

      const email = session.customer_email || session.metadata?.email || "";
      const paymentId = session.id;
      const paidAt = new Date().toISOString();

      // Fetch existing order from Supabase for full metadata (address, items, etc.)
      // NOTE: `orders` has no `affiliate_code` / `affiliate_owner_email` columns
      // (confirmed against the live schema) — selecting them makes PostgREST
      // reject the WHOLE select with a 400, silently wiping out prevMeta
      // (address, items, affiliate code, everything) for every order. Those
      // fields only ever live inside the `metadata` JSON column.
      const existingRow = await sbSelectOne(
        "orders",
        `id=eq.${encodeURIComponent(orderId)}&select=metadata,items,status,payment_id`
      );

      // Idempotency guard: Stripe can and does redeliver the same
      // checkout.session.completed event (retries on timeout/5xx, or
      // duplicate delivery). Without this guard, every redelivery would
      // re-upsert the order (resurrecting it after an admin deletion) and
      // re-send the confirmation email. If we already recorded this exact
      // payment as paid, treat the event as already handled and stop here.
      if (existingRow?.status === "paid" && existingRow?.payment_id === paymentId) {
        return res.status(200).json({ received: true, note: "already processed" });
      }

      const prevMeta =
        existingRow?.metadata &&
        typeof existingRow.metadata === "object" &&
        !Array.isArray(existingRow.metadata)
          ? existingRow.metadata
          : {};

      const affCode = String(
        prevMeta.affiliateCode || session.metadata?.affiliateCode || ""
      )
        .trim()
        .toUpperCase();

      let ownerEmail = prevMeta.affiliateOwnerEmail || "";
      if (!ownerEmail && affCode) {
        const affRow = await sbSelectOne("affiliates", `code=eq.${encodeURIComponent(affCode)}&select=email`);
        if (affRow?.email) ownerEmail = String(affRow.email).trim().toLowerCase();
      }

      // session.metadata.subtotal is server-verified (computed by create-stripe-session.js
      // from the catalog) and must take priority over prevMeta.subtotal, which comes from
      // the client-writable Supabase row and can be tampered with.
      const subtotal = Number(session.metadata?.subtotal || prevMeta.subtotal || session.amount_total / 100 || 0);
      // Affiliate commission is ALWAYS a fixed 10% of the verified subtotal — never trust
      // prevMeta.affiliateCommission (client-writable Supabase field), or a tampered order
      // could pay out an inflated commission to the affiliate.
      const commission = subtotal * 0.1;

      // Merge metadata: existing (full checkout data) takes priority for address fields
      const updatedMeta = {
        ...prevMeta,
        status: "paid",
        paymentProvider: "Stripe",
        paymentId,
        paidAt,
        affiliateOwnerEmail: ownerEmail,
      };

      // Determine best items source.
      // session.metadata.items is the SERVER-VALIDATED, re-priced list computed by
      // create-stripe-session.js (see api/_catalog.js) — it is the source of truth
      // for what was actually charged. prevMeta/existingRow.items come from the
      // client-submitted Supabase row (written before payment) and can be stale
      // or tampered, so they are only used as a fallback for display purposes
      // (address/notes etc. still come from prevMeta).
      let verifiedItems = [];
      try {
        const parsed = JSON.parse(session.metadata?.items || "[]");
        if (Array.isArray(parsed) && parsed.length > 0) verifiedItems = parsed;
      } catch {}

      const existingItems =
        verifiedItems.length > 0
          ? verifiedItems
          : Array.isArray(prevMeta.items) && prevMeta.items.length > 0
          ? prevMeta.items
          : Array.isArray(existingRow?.items) && existingRow.items.length > 0
          ? existingRow.items
          : [];

      // Build line items from Stripe session if local items are missing
      let items = existingItems;
      if (items.length === 0) {
        try {
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 20 });
          items = (lineItems.data || []).map((li) => ({
            name: li.description || "Product",
            dose: "",
            quantity: li.quantity || 1,
            price: Number(((li.amount_total || 0) / 100 / (li.quantity || 1)).toFixed(2)),
          }));
        } catch {}
      }

      // Update Supabase
      // NOTE: the `orders` table has no `affiliate_code` / `affiliate_owner_email`
      // columns (confirmed against the live schema) — those fields only live
      // inside the `metadata` JSON column (already included via updatedMeta).
      // Writing them as top-level columns makes PostgREST reject the whole
      // upsert with PGRST204 ("Could not find the column..."), silently
      // failing to mark the order paid.
      await sbUpsert("orders", {
        id: orderId,
        email: (email || prevMeta.email || "").toLowerCase(),
        status: "paid",
        payment_provider: "Stripe",
        payment_id: paymentId,
        paid_at: paidAt,
        total: Number(prevMeta.total || session.amount_total / 100 || 0),
        items: items.length > 0 ? items : (existingRow?.items || []),
        metadata: updatedMeta,
      });

      // Affiliate commission
      // NOTE: deliberately NOT using sbUpsert's on_conflict/merge-duplicates path
      // here. Postgres requires UPDATE privilege on the table for an
      // "ON CONFLICT DO UPDATE" upsert to even plan, regardless of whether a
      // real conflict happens at runtime. The `service_role` key was only
      // granted INSERT on `affiliate_orders`, so the upsert always failed with
      // a 403 ("permission denied for table affiliate_orders") — aborting the
      // whole handler and silently skipping the confirmation email below too.
      // Checking-then-inserting only ever needs INSERT privilege. This is also
      // wrapped in try/catch so a future/unrelated affiliate-write failure can
      // never again block the order being paid or the email being sent.
      if (affCode) {
        try {
          const existingAffOrder = await sbSelectOne(
            "affiliate_orders",
            `order_id=eq.${encodeURIComponent(orderId)}&select=id`
          );
          if (!existingAffOrder) {
            const r = await fetch(`${SB_URL}/rest/v1/affiliate_orders`, {
              method: "POST",
              headers: { ...sbH(), Prefer: "return=minimal" },
              body: JSON.stringify({
                order_id: orderId,
                affiliate_code: affCode,
                commission_amount: commission,
                shipping_type: String(prevMeta.shippingType || "standard").toLowerCase(),
              }),
            });
            if (!r.ok) {
              const text = await r.text().catch(() => "");
              throw new Error(`Supabase insert into affiliate_orders failed: ${r.status} ${text}`);
            }
          }
        } catch (affErr) {
          console.error("Failed to record affiliate commission:", affErr?.message || affErr);
        }
      }

      // Mark promo code as used server-side. This used to only happen client-side
      // (App.jsx, after the browser observed the order flip to "paid"), which never
      // ran if the customer closed the tab right after paying on Stripe's hosted
      // checkout page — leaving the code stuck "unused" forever despite being spent.
      const promoCodeUsed = String(prevMeta.promoCode || "").trim().toUpperCase();
      if (promoCodeUsed && email) {
        await fetch(
          `${SB_URL}/rest/v1/user_promos?email=eq.${encodeURIComponent(email.toLowerCase())}&code=eq.${encodeURIComponent(promoCodeUsed)}&used=eq.false`,
          { method: "PATCH", headers: { ...sbH(), Prefer: "return=minimal" }, body: JSON.stringify({ used: true }) }
        ).catch(() => {});
      }

      // Deduct spent store credit server-side — same rationale as above: this used
      // to happen only in the frontend's markOrderPaidById tied to the payment-return
      // page still being open, so a closed/abandoned tab left the credit un-deducted.
      const storeCreditUsedAmt = Number(prevMeta.storeCreditUsed || session.metadata?.storeCreditUsed || 0);
      if (storeCreditUsedAmt > 0 && email) {
        try {
          const creditEmail = email.toLowerCase();
          const creditRow = await sbSelectOne("user_credits", `email=eq.${encodeURIComponent(creditEmail)}&select=amount`);
          const newCreditAmount = Math.max(0, (creditRow ? Number(creditRow.amount) : 0) - storeCreditUsedAmt);
          await fetch(`${SB_URL}/rest/v1/user_credits?on_conflict=email`, {
            method: "POST",
            headers: { ...sbH(), Prefer: "resolution=merge-duplicates,return=minimal" },
            body: JSON.stringify({ email: creditEmail, amount: newCreditAmount, updated_at: new Date().toISOString() }),
          }).catch((e) => console.error("Stripe: user_credits upsert failed:", e.message));
        } catch (e) {
          console.error("Stripe: store credit deduction threw:", e?.message || e);
        }
      }

      // Send confirmation email (single email — frontend guard prevents duplicate)
      if (email) {
        try {
          await sendConfirmationEmail({
            email,
            orderId,
            meta: updatedMeta,
            items,
            paymentId,
            session,
          });
        } catch (emailErr) {
          console.error("Failed to send confirmation email:", emailErr.message);
        }
      }
    } catch (err) {
      // Any unexpected error here (bad Supabase creds, network hiccup, etc.)
      // used to crash the whole function with an opaque 500, causing Stripe
      // to endlessly retry the same event without ever giving a diagnosable
      // reason. Log it clearly and return 500 so Stripe still retries, but
      // now with a message visible in Vercel logs.
      console.error("Stripe webhook processing error:", err?.message || err);
      return res.status(500).json({ error: "Stripe webhook processing failed", message: err?.message || String(err) });
    }
  }

  if (event.type === "payment_intent.succeeded") {
    try {
      const intent = event.data.object;
      const orderId = intent.metadata?.orderId || null;
      if (!orderId) {
        console.warn("Stripe PI webhook: no orderId in metadata", intent.id);
        return res.status(200).json({ received: true, warning: "orderId missing" });
      }

      const email = intent.metadata?.email || intent.receipt_email || "";
      const paymentId = intent.id;
      const paidAt = new Date().toISOString();

      const existingRow = await sbSelectOne(
        "orders",
        `id=eq.${encodeURIComponent(orderId)}&select=metadata,items,status,payment_id`
      );

      // Idempotency: already processed this exact payment
      if (existingRow?.status === "paid" && existingRow?.payment_id === paymentId) {
        return res.status(200).json({ received: true, note: "already processed" });
      }

      const prevMeta =
        existingRow?.metadata && typeof existingRow.metadata === "object" && !Array.isArray(existingRow.metadata)
          ? existingRow.metadata
          : {};

      const affCode = String(prevMeta.affiliateCode || intent.metadata?.affiliateCode || "")
        .trim()
        .toUpperCase();

      let ownerEmail = prevMeta.affiliateOwnerEmail || "";
      if (!ownerEmail && affCode) {
        const affRow = await sbSelectOne("affiliates", `code=eq.${encodeURIComponent(affCode)}&select=email`);
        if (affRow?.email) ownerEmail = String(affRow.email).trim().toLowerCase();
      }

      const subtotal = Number(intent.metadata?.subtotal || prevMeta.subtotal || intent.amount / 100 || 0);
      const commission = subtotal * 0.1;

      const updatedMeta = {
        ...prevMeta,
        status: "paid",
        paymentProvider: "Stripe",
        paymentId,
        paidAt,
        affiliateOwnerEmail: ownerEmail,
      };

      const orderItems =
        Array.isArray(prevMeta.items) && prevMeta.items.length > 0
          ? prevMeta.items
          : Array.isArray(existingRow?.items) && existingRow.items.length > 0
          ? existingRow.items
          : [];

      await sbUpsert("orders", {
        id: orderId,
        email: (email || prevMeta.email || "").toLowerCase(),
        status: "paid",
        payment_provider: "Stripe",
        payment_id: paymentId,
        paid_at: paidAt,
        total: Number(prevMeta.total || intent.amount / 100 || 0),
        items: orderItems,
        metadata: updatedMeta,
      });

      // Affiliate commission (INSERT-only, no upsert — same pattern as checkout.session.completed)
      if (affCode) {
        try {
          const existingAffOrder = await sbSelectOne(
            "affiliate_orders",
            `order_id=eq.${encodeURIComponent(orderId)}&select=id`
          );
          if (!existingAffOrder) {
            const r = await fetch(`${SB_URL}/rest/v1/affiliate_orders`, {
              method: "POST",
              headers: { ...sbH(), Prefer: "return=minimal" },
              body: JSON.stringify({
                order_id: orderId,
                affiliate_code: affCode,
                commission_amount: commission,
                shipping_type: String(prevMeta.shippingType || "standard").toLowerCase(),
              }),
            });
            if (!r.ok) {
              const text = await r.text().catch(() => "");
              throw new Error(`affiliate_orders insert failed: ${r.status} ${text}`);
            }
          }
        } catch (affErr) {
          console.error("Stripe PI: affiliate commission error:", affErr?.message || affErr);
        }
      }

      // Mark promo code used
      const promoCodeUsed = String(prevMeta.promoCode || "").trim().toUpperCase();
      if (promoCodeUsed && email) {
        await fetch(
          `${SB_URL}/rest/v1/user_promos?email=eq.${encodeURIComponent(email.toLowerCase())}&code=eq.${encodeURIComponent(promoCodeUsed)}&used=eq.false`,
          { method: "PATCH", headers: { ...sbH(), Prefer: "return=minimal" }, body: JSON.stringify({ used: true }) }
        ).catch(() => {});
      }

      // Deduct store credit
      const storeCreditUsedAmt = Number(prevMeta.storeCreditUsed || intent.metadata?.storeCreditUsed || 0);
      if (storeCreditUsedAmt > 0 && email) {
        try {
          const creditEmail = email.toLowerCase();
          const creditRow = await sbSelectOne("user_credits", `email=eq.${encodeURIComponent(creditEmail)}&select=amount`);
          const newCreditAmount = Math.max(0, (creditRow ? Number(creditRow.amount) : 0) - storeCreditUsedAmt);
          await fetch(`${SB_URL}/rest/v1/user_credits?on_conflict=email`, {
            method: "POST",
            headers: { ...sbH(), Prefer: "resolution=merge-duplicates,return=minimal" },
            body: JSON.stringify({ email: creditEmail, amount: newCreditAmount, updated_at: new Date().toISOString() }),
          }).catch((e) => console.error("Stripe PI: user_credits upsert failed:", e.message));
        } catch (e) {
          console.error("Stripe PI: store credit deduction threw:", e?.message || e);
        }
      }

      // Confirmation email — Payment Intent metadata mirrors the Session
      // metadata shape set by create-payment-intent.js so the helper
      // reads session.metadata.* the same way from intent.metadata.*
      if (email) {
        try {
          await sendConfirmationEmail({
            email,
            orderId,
            meta: updatedMeta,
            items: orderItems,
            paymentId,
            session: { ...intent, amount_total: intent.amount },
          });
        } catch (emailErr) {
          console.error("Stripe PI: confirmation email failed:", emailErr.message);
        }
      }

      console.log(`Stripe payment_intent.succeeded: order ${orderId} marked paid ✓`);
    } catch (err) {
      console.error("Stripe PI webhook error:", err?.message || err);
      return res.status(500).json({ error: "Stripe PI webhook failed", message: err?.message || String(err) });
    }
  }

  return res.status(200).json({ received: true });
}
