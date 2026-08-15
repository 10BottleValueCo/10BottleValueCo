import crypto from "crypto";

const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const sbH = () => ({ apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" });

async function sbSelectOneCredit(email) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/user_credits?email=eq.${encodeURIComponent(email)}&select=amount`, { headers: sbH() });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

const WEBHOOK_SECRET = process.env.CATALYSTPAY_WEBHOOK_SECRET || "";
const BASE_URL = process.env.BASE_URL || "https://10bottlevalue.co";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  if (typeof req.body === "string") return req.body;

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  console.error("CatalystPay webhook raw payload:", JSON.stringify({
    type: payload.type,
    invoiceId: payload.invoiceId || payload.id,
    metadata: payload.metadata,
    headers_sig: req.headers["x-signature"] || req.headers["x-webhook-signature"] || req.headers["x-paidly-signature"] || "(none)",
  }));

  if (WEBHOOK_SECRET) {
    const sigHeader =
      req.headers["x-signature"] ||
      req.headers["x-webhook-signature"] ||
      req.headers["x-paidly-signature"] ||
      "";
    const expected = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(rawBody, "utf8")
      .digest("hex");
    if (!sigHeader || sigHeader !== expected) {
      console.error("CatalystPay webhook: invalid signature", { sigHeader, expected: expected.slice(0, 8) + "…" });
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
  } else {
    console.error("CatalystPay webhook: CATALYSTPAY_WEBHOOK_SECRET not set — skipping signature validation");
  }

  const eventType = String(payload.type || payload.eventType || "").toLowerCase();
  const isSettled = eventType.includes("invoicesettled") || eventType.includes("invoice_settled") || eventType === "settled";

  if (!isSettled) {
    console.error("CatalystPay webhook: skipping non-settled event:", eventType);
    return res.status(200).json({ received: true, skipped: "not_settled", eventType });
  }

  const metadata = payload.metadata || {};
  const orderId = String(metadata.OrderId || metadata.orderid || payload.orderId || payload.order_id || "");
  const invoiceId = String(payload.invoiceId || payload.id || "");

  if (!orderId) {
    console.error("CatalystPay webhook: no OrderId in metadata:", JSON.stringify(metadata));
    return res.status(200).json({ received: true, skipped: "missing_order_id" });
  }

  let sbMeta = {};
  let sbEmail = "";
  let alreadyEmailSent = false;
  let alreadyPaidInDb = false;

  if (SB_URL && SB_KEY) {
    try {
      const sbRes = await fetch(
        `${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=metadata,items,status,email`,
        { headers: sbH() }
      );
      if (sbRes.ok) {
        const rows = await sbRes.json();
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
  const finalAffiliateOwnerEmail = String(sbMeta.affiliateOwnerEmail || "");
  const finalStoreCreditUsed = Number(sbMeta.storeCreditUsed ?? 0);
  const finalAffiliateCode = String(sbMeta.affiliateCode || "").trim().toUpperCase();
  const finalAffiliateCommission = Number(finalSubtotal || finalTotal) * 0.1;
  const finalShippingType = String(sbMeta.shippingType || "standard");

  if (!alreadyEmailSent) {
    await fetch(`${BASE_URL}/api/send-payment-confirmed-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    }).catch((e) => console.error("CatalystPay: send-payment-confirmed-email failed:", e.message));

    if (SB_URL && SB_KEY) {
      await fetch(`${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers: { ...sbH(), Prefer: "return=minimal" },
        body: JSON.stringify({ metadata: { ...sbMeta, confirmationEmailSentAt: new Date().toISOString() } }),
      }).catch(() => {});
    }
  }

  let dbMarkedPaid = alreadyPaidInDb;
  let dbWriteError = null;

  if (!alreadyPaidInDb && SB_URL && SB_KEY) {
    const patchPaid = async () => {
      try {
        const r = await fetch(`${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
          method: "PATCH",
          headers: { ...sbH(), Prefer: "return=representation" },
          body: JSON.stringify({
            status: "paid",
            payment_provider: "CatalystPay BTC",
            payment_id: invoiceId || orderId,
            paid_at: new Date().toISOString(),
          }),
        });
        if (!r.ok) {
          dbWriteError = `HTTP ${r.status}`;
          console.error("CatalystPay: PATCH order paid failed:", orderId, dbWriteError);
          return false;
        }
        const rows = await r.json().catch(() => []);
        if (!Array.isArray(rows) || rows.length === 0) {
          dbWriteError = `matched 0 rows for id=${orderId}`;
          console.error("CatalystPay: PATCH matched 0 rows:", orderId);
          return false;
        }
        return true;
      } catch (e) {
        dbWriteError = String(e?.message || e);
        console.error("CatalystPay: PATCH threw:", orderId, dbWriteError);
        return false;
      }
    };

    dbMarkedPaid = await patchPaid();
    if (!dbMarkedPaid) dbMarkedPaid = await patchPaid();

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

    if (finalStoreCreditUsed > 0 && email) {
      try {
        const creditEmail = email.toLowerCase();
        const creditRow = await sbSelectOneCredit(creditEmail);
        const newCreditAmount = Math.max(0, (creditRow ? Number(creditRow.amount) : 0) - finalStoreCreditUsed);
        await fetch(`${SB_URL}/rest/v1/user_credits?on_conflict=email`, {
          method: "POST",
          headers: { ...sbH(), Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ email: creditEmail, amount: newCreditAmount, updated_at: new Date().toISOString() }),
        }).catch((e) => console.error("CatalystPay: user_credits upsert failed:", e.message));
      } catch (e) {
        console.error("CatalystPay: store credit deduction threw:", e?.message || e);
      }
    }
  }

  return res.status(200).json({ received: true, orderId, dbMarkedPaid, dbWriteError, alreadyEmailSent, alreadyPaidInDb });
}
