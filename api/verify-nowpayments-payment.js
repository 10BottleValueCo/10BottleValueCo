import { processNowPaymentsStatus } from "./_nowpayments-shared.js";

// Fallback endpoint: the frontend calls this right after the customer is
// redirected back from a NOWPayments crypto checkout. Normally the order gets
// marked "paid" by the IPN webhook (nowpayments-webhook.js), but that webhook
// can be delayed or (rarely) never arrive. Here we ask NOWPayments directly
// for the real, server-verified status of the payment and — if it's already
// confirmed/finished — run the exact same paid-order logic the webhook uses.
// This never trusts anything from the client except which payment ID to look
// up; the actual status/amount always comes from NOWPayments' own API.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const apiKey = process.env.NOWPAYMENTS_API_KEY || process.env.NOW_PAYMENTS_API_KEY || "";
    const { payment_id, order_id } = req.body || {};

    if (!apiKey) return res.status(200).json({ received: false, skipped: "no_api_key" });
    if (!payment_id && !order_id) return res.status(200).json({ received: false, skipped: "missing_payment_id_and_order_id" });

    let data = null;

    if (payment_id) {
      const nowRes = await fetch(`https://api.nowpayments.io/v1/payment/${encodeURIComponent(String(payment_id))}`, {
        headers: { "x-api-key": apiKey },
      });
      if (nowRes.ok) data = await nowRes.json();
    }

    // Fallback: the success-redirect URL from NOWPayments' hosted invoice page
    // does not always carry a payment_id/NP_id query param, which used to leave
    // us with no way to check status at all (order stuck as "checkout (clicked
    // pay)" even though the invoice had already been paid and confirmed on
    // NOWPayments' side). When we only have our own order_id, look the payment
    // up by the merchant order_id instead via the list endpoint.
    if (!data && order_id) {
      const listRes = await fetch(
        `https://api.nowpayments.io/v1/payment/?orderId=${encodeURIComponent(String(order_id))}&limit=1&sortField=created_at&sortDirection=-1`,
        { headers: { "x-api-key": apiKey } }
      );
      if (listRes.ok) {
        const listData = await listRes.json();
        const rows = Array.isArray(listData?.data) ? listData.data : Array.isArray(listData) ? listData : [];
        if (rows.length) data = rows[0];
      }
    }

    if (!data) {
      return res.status(200).json({ received: false, skipped: "nowpayments_lookup_failed" });
    }

    const result = await processNowPaymentsStatus(data);
    return res.status(200).json(result);
  } catch (err) {
    console.error("verify-nowpayments-payment error:", err.message);
    return res.status(500).json({ error: "verify-nowpayments-payment failed", message: err.message });
  }
}
