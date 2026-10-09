import { isDeepStrictEqual } from "node:util";

const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
function cents(value) {
  if (!["number", "string"].includes(typeof value) || String(value).trim() === "") return null;
  const amount = Number(value), result = Math.round(amount * 100);
  return Number.isFinite(amount) && amount >= 0 && Number.isSafeInteger(result)
    && Math.abs(amount * 100 - result) < 1e-7 ? result : null;
}
function lines(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) return null;
  const result = [];
  for (const item of items) {
    if (!record(item) || typeof item.name !== "string" || !Number.isInteger(Number(item.quantity))
      || Number(item.quantity) < 1 || cents(item.price) === null) return null;
    result.push(JSON.stringify([item.name, String(item.dose || ""), String(item.noteLabel || ""),
      String(item.fromWarehouse || ""), Number(item.vials ?? 10), Number(item.quantity), cents(item.price)]));
  }
  return result.sort();
}

// Permit only a no-write return to the original Lightning quote. The provider
// endpoint still checks current catalog pricing and the exact live invoice.
export function catalystResumeMatchesOrder(existing, order) {
  const saved = existing?.metadata, incoming = order?.metadata;
  if (!record(saved) || !record(incoming) || !/^[A-Za-z0-9_-]{1,160}$/.test(saved.catalystpay_invoice_id || "")
    || incoming.paymentProvider !== "CatalystPay BTC"
    || cents(existing.total) === null || cents(existing.total) <= 0
    || cents(existing.total) !== cents(saved.total) || cents(order.total) !== cents(existing.total)) return false;
  for (const field of ["subtotal", "shipping", "automaticDiscount", "promoDiscount", "affiliateDiscount", "cryptoDiscount", "storeCreditUsed"]) {
    const left = cents(incoming[field] ?? 0), right = cents(saved[field] ?? 0);
    if (left === null || right === null || left !== right) return false;
  }
  if (cents(incoming.storeCreditUsed ?? 0) !== 0) return false;
  if (String(incoming.shippingType || "standard") !== String(saved.shippingType || "standard")) return false;
  for (const field of ["promoCode", "affiliateCode", "affiliateOwnerEmail", "firstName", "lastName", "country", "address", "address2", "city", "state", "postalCode", "phone", "taxId", "orderNotes"]) {
    if (String(incoming[field] || "") !== String(saved[field] || "")) return false;
  }
  const left = lines(incoming.items), right = lines(saved.items);
  return left !== null && right !== null && isDeepStrictEqual(left, right);
}
