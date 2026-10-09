// Presentation only. Keep canonical provider identifiers for payment routing,
// verification and accounting; customers see the method they recognize.
export function publicPaymentMethod(provider) {
  const value = String(provider || "").trim();
  return /^(merit|stripe|paylio|paylio card|card \(paylio\))$/i.test(value) ? "Card" : value;
}
