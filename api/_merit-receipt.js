import { sendPaymentConfirmationEmail } from "./_payment-confirmation-email.js";

const unavailable = () => new Error("Canonical payment receipt is unavailable.");
const strings = ["firstName", "lastName", "address", "address2", "city", "state", "postalCode", "phone", "country", "shippingType"];
const amounts = ["subtotal", "shipping", "automaticDiscount", "promoDiscount", "affiliateDiscount", "storeCreditUsed", "customerCardSurcharge"];
function cents(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw unavailable();
  const result = Math.round(value * 100);
  if (!Number.isSafeInteger(result) || Math.abs(value * 100 - result) > 0.000001) throw unavailable();
  return result;
}

// This is called only after the database acknowledges its first paid transition.
// Use the immutable private attempt, never a browser payload or mutable public
// order metadata. Do not pass payment rules, costs or affiliate ownership to mail.
export function buildMeritReceipt(attempt) {
  const snapshot = attempt?.snapshot;
  const amountCents = Number(attempt?.amount_cents);
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)
    || !/^INV-[A-F\d]{32}$/.test(attempt.order_id || "")
    || !/^pi_[A-Za-z0-9]+$/.test(attempt.intent_id || "")
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attempt.email || "")
    || snapshot.email !== attempt.email || attempt.currency !== "usd"
    || !Number.isSafeInteger(amountCents) || amountCents <= 0 || cents(snapshot.total) !== amountCents
    || !Array.isArray(snapshot.items) || snapshot.items.length === 0) throw unavailable();
  const receipt = { email: attempt.email, orderId: attempt.order_id, paymentId: attempt.intent_id, paymentProvider: "Merit", total: amountCents / 100 };
  for (const key of amounts) { cents(snapshot[key]); receipt[key] = snapshot[key]; }
  const base = cents(receipt.subtotal) + cents(receipt.shipping) - cents(receipt.automaticDiscount)
    - cents(receipt.promoDiscount) - cents(receipt.affiliateDiscount) - cents(receipt.storeCreditUsed);
  if (base < 0 || base + cents(receipt.customerCardSurcharge) !== amountCents) throw unavailable();
  if (snapshot.customerCardSurchargeBps !== undefined && snapshot.customerCardSurchargeBps !== null) {
    const rate = snapshot.customerCardSurchargeBps;
    if (!Number.isSafeInteger(rate) || rate < 0 || rate > 10000
      || Number((BigInt(base) * BigInt(rate) + 5000n) / 10000n) !== cents(receipt.customerCardSurcharge)) throw unavailable();
    receipt.customerCardSurchargeBps = rate;
  }
  for (const key of strings) receipt[key] = String(snapshot[key] || "");
  receipt.items = snapshot.items.map(item => {
    if (!item || typeof item.name !== "string" || typeof item.dose !== "string"
      || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw unavailable();
    cents(item.price);
    return { name: item.name, dose: item.dose, quantity: item.quantity, price: item.price };
  });
  return receipt;
}

export async function sendMeritReceipt({ attempt }, options = {}) {
  try {
    const receipt = buildMeritReceipt(attempt);
    const result = await sendPaymentConfirmationEmail(receipt, { ...options, escapeValues: true });
    if (!result.ok) throw new Error();
    return { sent: true };
  } catch {
    throw new Error("Payment receipt delivery failed.");
  }
}
