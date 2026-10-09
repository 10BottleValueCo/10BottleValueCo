import { processNowPaymentsStatus } from "./_nowpayments-shared.js";
import { readNowPaymentsPayment } from "./_nowpayments-provider.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  // A callback is only a lookup hint. Use the existing merchant-authenticated
  // status API; body status, amount, email and order metadata carry no authority.
  const verified = await readNowPaymentsPayment(req.body?.payment_id);
  if (!verified.payment) return res.status(verified.status).json({ received: false, code: verified.code });
  try {
    const result = await processNowPaymentsStatus(verified.payment, { providerVerified: true });
    return res.status(200).json(result);
  } catch (err) {
    console.error("NOWPayments verification could not be applied", { code: err.code || "PAYMENT_RECONCILIATION_REQUIRED" });
    return res.status(err.status || 503).json({ received: false, code: err.code || "PAYMENT_RECONCILIATION_REQUIRED" });
  }
}
