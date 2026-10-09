import { PaylioError, verifyPaylioAttempt, paylioStorage } from "./_paylio-binding.js";
import { sendPaymentConfirmationEmail } from "./_payment-confirmation-email.js";

// PayLio's callback is only a wake-up hint. No body, query amount, email,
// success flag, public payment ID, or browser-known token authorizes payment.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  try {
    const url = new URL(req.originalUrl || req.url || "/", "https://10bottlevalue.co");
    const id = req.query?.attempt || url.searchParams.get("attempt");
    const result = await verifyPaylioAttempt(typeof id === "string" ? id : "");
    // Database-only effects have a durable, transactional retry boundary. A
    // replay retries missing effects without repeating an uncertain email send.
    let effectsRecorded = false;
    try {
      const effects = await paylioStorage("rpc/apply_paylio_order_effects", { method: "POST", body: { p_id: id } });
      effectsRecorded = effects?.ok === true && typeof effects.applied === "boolean" && effects.orderId === result.orderId;
    } catch { /* The next verified notification may safely retry database effects. */ }
    let receiptAccepted = false;
    if (result.transitioned) {
      try {
        const order = { ...result.quote, orderId: result.orderId, paymentId: result.paymentId, paymentProvider: "Card" };
        const receipt = await sendPaymentConfirmationEmail(order, { escapeValues: true });
        receiptAccepted = receipt.ok === true;
      } catch { /* Uncertain receipt delivery needs reconciliation, never blind resend. */ }
    }
    if (!effectsRecorded || (result.transitioned && !receiptAccepted)) console.error("PayLio verified payment has pending secondary effects", { orderId: result.orderId, effectsRecorded, receiptAccepted });
    return res.status(effectsRecorded ? 200 : 503).json({
      ok: effectsRecorded, paymentRecorded: true, alreadyRecorded: !result.transitioned,
      effectsRecorded, ...(result.transitioned ? { receiptAccepted } : {}),
      ...(!effectsRecorded ? { code: "PAYLIO_EFFECTS_PENDING" } : {}),
    });
  } catch (error) {
    return res.status(error instanceof PaylioError ? error.status : 503).json({
      ok: false, code: error instanceof PaylioError ? error.code : "PAYLIO_RECONCILIATION_REQUIRED",
      error: "Payment verification is pending.",
    });
  }
}
