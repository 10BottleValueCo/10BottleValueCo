import { publicProductName } from "./_public-product-name.js";
import crypto from "crypto";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://danpkqqzcptamojrnrmk.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function validEmail(value) {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function authenticateRequest(req) {
  const internalSecret = process.env.INTERNAL_EMAIL_API_SECRET || "";
  const suppliedSecret = String(req.headers?.["x-internal-email-secret"] || "");
  if (internalSecret && suppliedSecret) {
    const expectedBytes = Buffer.from(internalSecret);
    const suppliedBytes = Buffer.from(suppliedSecret);
    if (expectedBytes.length === suppliedBytes.length && crypto.timingSafeEqual(expectedBytes, suppliedBytes)) {
      return { internal: true };
    }
  }

  const token = String(req.headers?.authorization || "").match(/^Bearer\s+(\S+)$/i)?.[1];
  const publicKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!token) return { error: "Internal email authorization or a Supabase bearer token is required", status: 401 };
  if (!SUPABASE_URL || !publicKey) return { error: "Supabase authentication is not configured", status: 500 };
  const identity = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/user`, {
    headers: { apikey: publicKey, Authorization: `Bearer ${token}` },
  });
  if (!identity.ok) return { error: "Invalid Supabase bearer token", status: 401 };
  const user = await identity.json();
  const email = String(user?.email || "").trim().toLowerCase();
  if (!validEmail(email)) return { error: "Authenticated user has no valid email address", status: 403 };
  return { email, internal: false };
}

async function loadOrder(orderId) {
  if (!SUPABASE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to verify payment orders");
  const response = await fetch(
    `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,email,status,total,items,metadata,payment_provider,payment_id,paid_at&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!response.ok) throw new Error("Could not verify order in Supabase");
  const rows = await response.json();
  return Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const auth = await authenticateRequest(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });
    const {
      orderId,
      total,
      subtotal,
      shipping = 0,
      automaticDiscount = 0,
      promoDiscount = 0,
      affiliateDiscount = 0,
      storeCreditUsed = 0,
      cardProcessingFee = 0,
      shippingType,
      paymentProvider,
      paymentId,
      items = [],
      firstName = "",
      lastName = "",
      address = "",
      address2 = "",
      city = "",
      state = "",
      postalCode = "",
      zip = "",
      phone = "",
      country = "",
    } = req.body || {};

    if (!orderId || typeof orderId !== "string" || orderId.length > 160) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const order = await loadOrder(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const email = String(order.email || "").trim().toLowerCase();
    if (!validEmail(email)) return res.status(409).json({ error: "Order has no valid trusted recipient" });
    if (!auth.internal && (auth.email !== email || String(order.status || "").toLowerCase() !== "paid")) {
      return res.status(403).json({ error: "A paid order belonging to the authenticated user is required" });
    }
    if (auth.internal && !String(paymentProvider || "").trim()) {
      return res.status(403).json({ error: "Verified payment provider is required for internal email delivery" });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "Missing RESEND_API_KEY" });
    }

    const money = (value) => Number(value || 0).toFixed(2);

    const orderSubtotal =
      subtotal !== undefined && subtotal !== null
        ? Number(subtotal)
        : Array.isArray(items)
        ? items.reduce(
            (sum, item) =>
              sum + Number(item.price || 0) * Number(item.quantity || 1),
            0
          )
        : Number(total || 0);

    const orderTotal = Number(total || 0);
    const orderShipping = Number(shipping || 0);
    const autoDiscount = Number(automaticDiscount || 0);
    const promoDiscountValue = Number(promoDiscount || 0);
    const affiliateDiscountValue = Number(affiliateDiscount || 0);
    const storeCreditValue = Number(storeCreditUsed || 0);

    const isExpress = String(shippingType || "standard").toLowerCase() === "express";
    const isUsWarehouse = String(shippingType || "standard").toLowerCase() === "us-warehouse";
    const shippingLabel = isUsWarehouse ? "US Warehouse" : isExpress ? "Express" : "Standard";
    const deliveryLine = isUsWarehouse
      ? "✓ US Warehouse delivery: 2–5 business days (ships from USA)"
      : isExpress
      ? "✓ Express delivery: 5–7 business days (worldwide)"
      : "✓ Standard delivery: 7–12 business days";

    const trustpilotUrl = "https://www.trustpilot.com/review/10bottlevalue.co";
    const accountUrl = "https://10bottlevalue.co";

    const fullName = escapeHtml([firstName, lastName].filter(Boolean).join(" "));
    const zipCode = postalCode || zip;
    const hasAddress = !!(fullName || address || city || country || zipCode || state || phone);

    const addressHtml = hasAddress ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e8e8;border:1px solid #d0d0d0;border-radius:14px;margin-bottom:28px;">
        <tr>
          <td style="padding:20px 26px;">
            <p style="margin:0 0 10px;font-size:14px;font-weight:800;color:#555;text-transform:uppercase;letter-spacing:0.08em;">Shipping address</p>
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              <tr><td style="padding:2px 0;font-size:14px;color:#888;width:110px;">Name</td><td style="padding:2px 0;font-size:15px;color:#222;">${fullName || "—"}</td></tr>
              <tr><td style="padding:2px 0;font-size:14px;color:#888;">Address</td><td style="padding:2px 0;font-size:15px;color:#222;">${escapeHtml([address, address2].filter(Boolean).join(", ")) || "—"}</td></tr>
              <tr><td style="padding:2px 0;font-size:14px;color:#888;">City</td><td style="padding:2px 0;font-size:15px;color:#222;">${escapeHtml(city) || "—"}</td></tr>
              <tr><td style="padding:2px 0;font-size:14px;color:#888;">Postal Code</td><td style="padding:2px 0;font-size:15px;color:#222;">${escapeHtml(zipCode) || "—"}</td></tr>
              ${state ? `<tr><td style="padding:2px 0;font-size:14px;color:#888;">State</td><td style="padding:2px 0;font-size:15px;color:#222;">${escapeHtml(state)}</td></tr>` : ""}
              <tr><td style="padding:2px 0;font-size:14px;color:#888;">Country</td><td style="padding:2px 0;font-size:15px;color:#222;">${escapeHtml(country) || "—"}</td></tr>
              <tr><td style="padding:2px 0;font-size:14px;color:#888;">Phone</td><td style="padding:2px 0;font-size:15px;color:#222;">${escapeHtml(phone) || "—"}</td></tr>
            </table>
          </td>
        </tr>
      </table>` : "";

    const itemsHtml =
      Array.isArray(items) && items.length
        ? items
            .map(
              (item) => `
          <tr>
            <td style="padding:16px 0;border-bottom:1px solid #d7d7d7;color:#222;font-size:16px;">
              ${escapeHtml((Number(item.quantity) || 1) * 10)} vials × ${escapeHtml(publicProductName(item.name) || "Product")} ${escapeHtml(item.dose || "")}
            </td>
            <td align="right" style="padding:16px 0;border-bottom:1px solid #d7d7d7;color:#222;font-size:16px;font-weight:700;">
              $${money(Number(item.price || 0) * Number(item.quantity || 1))}
            </td>
          </tr>
        `
            )
            .join("")
        : `
          <tr>
            <td style="padding:16px 0;border-bottom:1px solid #d7d7d7;color:#222;font-size:16px;">Order item</td>
            <td align="right" style="padding:16px 0;border-bottom:1px solid #d7d7d7;color:#222;font-size:16px;font-weight:700;">$${money(orderTotal)}</td>
          </tr>
        `;

    const summaryHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
        <tr>
          <td style="padding:7px 0;color:#444;font-size:15px;">Subtotal</td>
          <td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">$${money(orderSubtotal)}</td>
        </tr>
        ${autoDiscount > 0 ? `<tr><td style="padding:7px 0;color:#444;font-size:15px;">Automatic discount</td><td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">-$${money(autoDiscount)}</td></tr>` : ""}
        ${promoDiscountValue > 0 ? `<tr><td style="padding:7px 0;color:#444;font-size:15px;">Promo discount</td><td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">-$${money(promoDiscountValue)}</td></tr>` : ""}
        ${affiliateDiscountValue > 0 ? `<tr><td style="padding:7px 0;color:#444;font-size:15px;">Affiliate discount</td><td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">-$${money(affiliateDiscountValue)}</td></tr>` : ""}
        <tr>
          <td style="padding:7px 0;color:#444;font-size:15px;">Shipping method</td>
          <td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">${escapeHtml(shippingLabel)}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#444;font-size:15px;">Shipping</td>
          <td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">${orderShipping === 0 ? "Free" : `$${money(orderShipping)}`}</td>
        </tr>
        ${Number(cardProcessingFee) > 0 ? `<tr><td style="padding:7px 0;color:#444;font-size:15px;">Card processing fee (5%)</td><td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">+$${money(cardProcessingFee)}</td></tr>` : ""}
        ${storeCreditValue > 0 ? `<tr><td style="padding:7px 0;color:#444;font-size:15px;">Store credit</td><td align="right" style="padding:7px 0;color:#222;font-size:15px;font-weight:700;">-$${money(storeCreditValue)}</td></tr>` : ""}
        <tr>
          <td style="padding:14px 0 0;border-top:1px solid #d7d7d7;color:#111;font-size:18px;font-weight:800;">Total paid</td>
          <td align="right" style="padding:14px 0 0;border-top:1px solid #d7d7d7;color:#111;font-size:18px;font-weight:800;">$${money(orderTotal)}</td>
        </tr>
      </table>
    `;

    const html = `<!doctype html>
<html>
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#d6d6d6;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your payment was received successfully. Your order is now being processed.</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#d6d6d6;padding:36px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:900px;background:#e9e9e9;border:1px solid #bfbfbf;border-radius:24px;overflow:hidden;">
        <tr><td align="center" style="padding:34px 34px 22px;">
          <img src="https://10bottlevalue.co/logo.png" alt="10BottleValueCo" style="width:70px;height:auto;display:block;margin:0 auto 14px;" />
          <div style="font-size:32px;font-weight:800;color:#111;letter-spacing:-0.04em;">10BottleValueCo</div>
          <div style="margin-top:12px;font-size:14px;letter-spacing:0.28em;color:#666;text-transform:uppercase;">Research Use Only</div>
        </td></tr>
        <tr><td style="padding:0 34px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border:1px solid #cfcfcf;border-radius:20px;">
            <tr><td style="padding:34px 34px;">
              <h1 style="margin:0 0 18px;font-size:30px;line-height:1.2;color:#111;">Payment confirmed</h1>
              <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#333;">Your payment has been received successfully. Your order is now being processed.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e8e8;border:1px solid #d0d0d0;border-radius:14px;margin-bottom:28px;">
                <tr><td style="padding:24px 26px;">
                  <p style="margin:0 0 10px;font-size:15px;color:#222;"><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>
                  <p style="margin:0 0 10px;font-size:15px;color:#222;"><strong>Total:</strong> $${money(orderTotal)}</p>
                  <p style="margin:0 0 10px;font-size:15px;color:#222;"><strong>Shipping method:</strong> ${escapeHtml(shippingLabel)}</p>
                  <p style="margin:0 0 10px;font-size:15px;color:#222;"><strong>Payment method:</strong> ${escapeHtml(paymentProvider || "Payment")}</p>
                  <p style="margin:0;font-size:15px;color:#222;"><strong>Payment ID:</strong> ${escapeHtml(paymentId || "—")}</p>
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
                <tr><td align="center">
                  <a href="${accountUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;border-radius:999px;padding:15px 42px;font-size:14px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Go to account</a>
                </td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr><td align="center">
                  <a href="${trustpilotUrl}" style="display:inline-block;background:#00b67a;color:#fff;text-decoration:none;border-radius:999px;padding:14px 42px;font-size:14px;font-weight:800;letter-spacing:0.10em;text-transform:uppercase;">Review on Trustpilot</a>
                </td></tr>
              </table>
              <p style="margin:24px 0 0;text-align:center;font-size:13px;line-height:1.6;color:#555;">Need help? Contact us by email at support@10bottlevalue.co</p>
            </td></tr>
          </table>
          <div style="padding:28px 20px 18px;text-align:center;color:#666;font-size:12px;line-height:1.8;text-transform:uppercase;">
            <div>Support: <a href="mailto:support@10bottlevalue.co" style="color:#135ccf;">support@10bottlevalue.co</a></div>
            <div>Orders are fulfilled by international partners</div>
            <div>For laboratory research use only. Not for human or animal use.</div>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "10BottleValueCo <support@10bottlevalue.co>",
        to: email,
        subject: `Order confirmed — ${String(orderId).replace(/[\r\n]/g, "")}`,
        html,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: "Resend error", data });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
