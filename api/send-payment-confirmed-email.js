import { requireAdmin } from "./_auth.js";
import { sendPaymentConfirmationEmail } from "./_payment-confirmation-email.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!(await requireAdmin(req, res))) return;
  try {
    const order = req.body || {};
    if (!order.email || !order.orderId) return res.status(400).json({ error: "Missing required fields" });
    if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: "Missing RESEND_API_KEY" });
    const result = await sendPaymentConfirmationEmail(order, { escapeValues: true });
    if (!result.ok) return res.status(500).json({ error: "Email delivery unavailable" });
    return res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    return res.status(500).json({ error: "Email delivery unavailable" });
  }
}
