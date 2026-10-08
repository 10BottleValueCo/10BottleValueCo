import { processNowPaymentsStatus } from "./_nowpayments-shared.js";
import { createHmac, timingSafeEqual } from "node:crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    const data = req.body || {};
    const secret = process.env.NOWPAYMENTS_IPN_SECRET || process.env.NOWPAYMENTS_IPN_SECRET_KEY;
    const apiKey = process.env.NOWPAYMENTS_API_KEY || process.env.NOW_PAYMENTS_API_KEY;
    if (!secret || !apiKey) return res.status(503).json({ error: "Payment notification verification is not configured." });
    // NOWPayments official API: alphabetical top-level keys, JSON.stringify,
    // HMAC-SHA512 and x-nowpayments-sig. Never log signatures or the payload.
    // https://documenter.getpostman.com/view/7907941/S1a32n38
    if (!data || typeof data !== "object" || Array.isArray(data)) return res.status(400).json({ error: "Invalid payload." });
    const signature = req.headers?.["x-nowpayments-sig"];
    const expected = createHmac("sha512", secret).update(JSON.stringify(data, Object.keys(data).sort())).digest("hex");
    if (typeof signature !== "string" || !/^[a-f0-9]{128}$/i.test(signature)
      || !timingSafeEqual(Buffer.from(signature.toLowerCase()), Buffer.from(expected))) {
      return res.status(401).json({ error: "Invalid payment notification signature." });
    }
    if (!data.payment_id) return res.status(400).json({ error: "Missing payment identifier." });
    // Use the provider's current record, not even the signed callback's status,
    // so delayed notifications cannot turn a subsequently refunded payment paid.
    const paymentResponse = await fetch(`https://api.nowpayments.io/v1/payment/${encodeURIComponent(String(data.payment_id))}`, {
      headers: { "x-api-key": apiKey }, signal: AbortSignal.timeout(8_000),
    });
    if (!paymentResponse.ok) return res.status(502).json({ error: "Payment verification unavailable." });
    const payment = await paymentResponse.json();
    if (String(payment.payment_id) !== String(data.payment_id)
      || !payment.order_id || String(payment.order_id) !== String(data.order_id)) {
      return res.status(409).json({ error: "Payment does not match the notification." });
    }
    const result = await processNowPaymentsStatus(payment);
    if (result.dbWriteError) return res.status(503).json({ error: "Payment reconciliation incomplete." });
    return res.status(200).json(result);
  } catch (err) {
    console.error("NOWPayments webhook processing failed");
    return res.status(500).json({ error: "NOWPayments webhook failed" });
  }
}
