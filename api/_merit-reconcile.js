import { MeritError, readMeritOrderId, requireMeritProof } from "./_merit-core.js";
import { sendMeritReceipt } from "./_merit-receipt.js";

// `provider.verify` is a server-only adapter to the documented Merit verify
// endpoint. The adapter explicitly separates provider-returned payment facts
// from its authenticated request and configuration context.
export async function reconcileMeritAttempt({ attempt, provider, store, notify = sendMeritReceipt }) {
  if (!attempt?.intent_id) {
    return { ok: true, paid: false, status: "preparing", orderId: attempt?.order_id || "" };
  }
  let proof;
  try {
    proof = await provider.verify({ intentId: attempt.intent_id, orderId: attempt.order_id });
  } catch {
    throw new MeritError(503, "Payment confirmation is still pending. Check again before making another payment.", "MERIT_VERIFICATION_PENDING");
  }
  const verdict = requireMeritProof(attempt, proof);
  if (!verdict.paid) {
    return { ok: true, paid: false, status: verdict.status, orderId: attempt.order_id };
  }
  let result;
  try {
    result = await store.finalize({
      p_attempt_id: attempt.id,
      p_intent_id: attempt.intent_id,
      p_amount_cents: proof.source === "merit_authenticated_verify" ? proof.verified.amountCents : proof.amountCents,
      p_currency: proof.source === "merit_authenticated_verify" ? proof.verified.currency : proof.currency,
      p_email: attempt.email.trim().toLowerCase(),
      p_order_id: attempt.order_id,
      p_stripe_account: attempt.expected_account,
      p_livemode: attempt.expected_live,
    });
  } catch {
    throw new MeritError(503, "Your payment is being confirmed. Check its status again; do not pay again.", "MERIT_RECORDING_PENDING");
  }
  if (result?.ok !== true || result?.paid !== true || !result?.order || result.order.id !== attempt.order_id) {
    // A captured payment with a failed DB write is pending reconciliation. Never
    // tell the customer payment failed or invite another charge in this state.
    throw new MeritError(503, "Your payment is being confirmed. Check its status again; do not pay again.", "MERIT_RECORDING_PENDING");
  }
  if (result.alreadyPaid === false) {
    // Exactly one SQL transition can reach this branch across browser/webhook
    // races. Delivery is best effort: a timeout must never undo payment or invite
    // another charge. A durable mail outbox is a separate future improvement.
    try { await notify({ attempt, order: result.order }); }
    catch { /* Do not expose mail errors or customer data in the payment result. */ }
  }
  // Preserve a strict result boundary rather than exposing an internal RPC row.
  // Public order data is persisted separately by the transaction, excluding the
  // private rules snapshot and provider credentials.
  return { ok: true, paid: true, status: "paid", orderId: attempt.order_id, order: result.order };
}

export async function reconcileMeritOrder({ orderId, customerId, store, provider, notify }) {
  readMeritOrderId(orderId);
  if (typeof customerId !== "string" || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(customerId)) throw new MeritError(401, "Sign in to check your payment.");
  const attempt = await store.findByOrder(orderId, customerId);
  if (!attempt || attempt.customer_id !== customerId || attempt.order_id !== orderId) {
    throw new MeritError(404, "This payment is unavailable.", "MERIT_ORDER_NOT_FOUND");
  }
  return reconcileMeritAttempt({ attempt, store, provider, notify });
}
