const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const ADMIN_EMAIL = "support@10bottlevalue.co";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function validEmail(value) {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function authenticateAdmin(req) {
  const token = String(req.headers?.authorization || "").match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return { error: "Administrator Supabase bearer token is required", status: 401 };
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY || !SUPABASE_SERVICE_KEY) {
    return { error: "Supabase URL, public key, and service-role key are required", status: 500 };
  }
  const response = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/user`, {
    headers: { apikey: SUPABASE_PUBLIC_KEY, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return { error: "Invalid Supabase bearer token", status: 401 };
  const user = await response.json();
  const email = String(user?.email || "").trim().toLowerCase();
  if (email !== ADMIN_EMAIL) return { error: "Administrator access required", status: 403 };
  return {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let auth;
  try {
    auth = await authenticateAdmin(req);
  } catch {
    return res.status(502).json({ error: "Unable to verify administrator session" });
  }
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const { orderId, trackingNumber: requestedTrackingNumber } = req.body || {};

  if (!orderId || typeof orderId !== "string" || orderId.length > 160 || !requestedTrackingNumber) {
    return res.status(400).json({ error: "A valid orderId and trackingNumber are required" });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "Missing RESEND_API_KEY" });
  }

  const orderResponse = await fetch(
    `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,email,tracking_number,tracking_number_2,metadata&limit=1`,
    { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  if (!orderResponse.ok) return res.status(502).json({ error: "Could not verify order tracking details" });
  const rows = await orderResponse.json();
  const order = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
  if (!order) return res.status(404).json({ error: "Order not found" });
  const email = String(order.email || "").trim().toLowerCase();
  if (!validEmail(email)) return res.status(409).json({ error: "Order has no valid trusted recipient" });
  const metadata = order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata) ? order.metadata : {};
  const storedTrackingNumbers = [
    order.tracking_number,
    order.tracking_number_2,
    metadata.trackingNumber,
    metadata.tracking_number,
    metadata.trackingNumber2,
    metadata.tracking_number_2,
  ].map((value) => String(value || "").trim()).filter(Boolean);
  const trackingNumber = String(requestedTrackingNumber).trim();
  if (!storedTrackingNumbers.includes(trackingNumber) || trackingNumber.length > 200 || /[\r\n<>]/.test(trackingNumber)) {
    return res.status(403).json({ error: "Tracking number does not match the verified order record" });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Order Has Shipped</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">

          <!-- Header -->
          <tr>
            <td style="padding:40px 48px 32px;text-align:center;">
              <div style="font-size:13px;font-weight:600;color:#18181b;margin-bottom:12px;">10BottleValueCo</div>
              <div style="font-size:26px;font-weight:800;color:#09090b;letter-spacing:-0.02em;line-height:1.2;">Your order has shipped</div>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 48px;"><div style="height:1px;background:#e4e4e7;"></div></td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 48px 24px;">
              <p style="margin:0 0 28px;font-size:15px;color:#3f3f46;line-height:1.65;">
                Great news — your order <strong style="color:#09090b;">${escapeHtml(order.id)}</strong> is on its way. Here is your tracking number:
              </p>

              <!-- Tracking number box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px;padding:20px 24px;text-align:center;">
                    <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;color:#71717a;text-transform:uppercase;margin-bottom:8px;">Tracking Number</div>
                    <div style="font-size:20px;font-weight:800;color:#09090b;letter-spacing:0.06em;font-family:monospace;">${escapeHtml(trackingNumber)}</div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:14px;color:#71717a;line-height:1.65;">
                You can also find this number at any time in your account in the <strong style="color:#3f3f46;">Orders</strong> section.
              </p>
            </td>
          </tr>

          <!-- Info box -->
          <tr>
            <td style="padding:0 48px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#f9f9f9;border:1px solid #e4e4e7;border-radius:10px;padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">
                      If you have any questions about your shipment, contact us at
                      <a href="mailto:support@10bottlevalue.co" style="color:#09090b;text-decoration:underline;">support@10bottlevalue.co</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 48px;"><div style="height:1px;background:#e4e4e7;"></div></td></tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px;text-align:center;">
              <div style="font-size:11px;color:#a1a1aa;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">
                SUPPORT: SUPPORT@10BOTTLEVALUE.CO
              </div>
              <div style="font-size:11px;color:#a1a1aa;letter-spacing:0.08em;text-transform:uppercase;">
                FOR LABORATORY RESEARCH USE ONLY. NOT FOR HUMAN OR ANIMAL USE.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "10 Bottle Value Co <noreply@10bottlevalue.co>",
        to: email,
        subject: `Your order ${String(order.id).replace(/[\r\n]/g, "")} has shipped — tracking inside`,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[send-tracking-email] Resend error:", data);
      return res.status(500).json({ error: data?.message || "Failed to send email" });
    }

    return res.status(200).json({ ok: true, id: data?.id });
  } catch (err) {
    console.error("[send-tracking-email] Exception:", err?.message);
    return res.status(500).json({ error: err?.message || "Unknown error" });
  }
}
