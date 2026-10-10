import { requireAdmin } from "../_auth.js";
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!(await requireAdmin(req, res))) return;
  const { email, orderId, trackingNumber } = req.body || {};

  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || typeof orderId !== "string" || !orderId || orderId.length > 120
    || typeof trackingNumber !== "string" || !trackingNumber || trackingNumber.length > 200) {
    return res.status(400).json({ error: "Missing required fields: email, orderId, trackingNumber" });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "Missing RESEND_API_KEY" });
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
                Great news — your order <strong style="color:#09090b;">${escapeHtml(orderId)}</strong> is on its way. Here is your tracking number:
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
      method: "POST", redirect: "error", signal: AbortSignal.timeout(5000),
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "10 Bottle Value Co <noreply@10bottlevalue.co>",
        to: email,
        subject: `Your order ${orderId} has shipped — tracking inside`,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Tracking email provider request failed", { status: response.status });
      return res.status(500).json({ error: "Email delivery unavailable" });
    }

    return res.status(200).json({ ok: true, id: data?.id });
  } catch (err) {
    console.error("Tracking email delivery failed");
    return res.status(500).json({ error: "Email delivery unavailable" });
  }
}
