import { processNowPaymentsStatus } from "./_nowpayments-shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    const data = req.body || {};
    const result = await processNowPaymentsStatus(data);
    return res.status(200).json(result);
  } catch (err) {
    console.error("NOWPayments webhook error:", err.message);
    return res.status(500).json({ error: "NOWPayments webhook failed", message: err.message });
  }
}
