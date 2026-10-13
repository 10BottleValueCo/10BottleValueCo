// Public invoice numbers are eight characters. Checkout/idempotency keys
// remain full UUIDs; order ownership and payment proof never depend on secrecy
// of the invoice number. Existing long order IDs are accepted only for replay.
const UUID = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const HEX = /^[a-f\d]{32}$/i;
const SPACE = 36n ** 8n;
export const COMPATIBLE_INVOICE_PATTERN = /^INV-(?:[A-Z\d]{8}|[A-F\d]{32})$/;

export function invoiceNumberFromUuid(value) {
  if (typeof value !== "string" || (!UUID.test(value) && !HEX.test(value))) {
    throw new Error("A secure checkout key is required.");
  }
  const number = BigInt(`0x${value.replaceAll("-", "")}`) % SPACE;
  return `INV-${number.toString(36).padStart(8, "0").toUpperCase()}`;
}

export function generateInvoiceNumber(cryptoApi = globalThis.crypto) {
  if (typeof cryptoApi?.randomUUID === "function") {
    return invoiceNumberFromUuid(cryptoApi.randomUUID());
  }
  if (typeof cryptoApi?.getRandomValues !== "function") {
    throw new Error("Secure invoice generation is unavailable.");
  }
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  return invoiceNumberFromUuid(Array.from(bytes, value => value.toString(16).padStart(2, "0")).join(""));
}

export function matchesCheckoutInvoice(invoice, checkoutKey) {
  return invoice === invoiceNumberFromUuid(checkoutKey)
    || invoice === `INV-${checkoutKey.replaceAll("-", "").toUpperCase()}`;
}
