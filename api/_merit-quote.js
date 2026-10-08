import { createHash } from "node:crypto";
import { findCatalogProduct, getAutomaticDiscountRate, getShippingPrice, validateAndPriceItems } from "./_catalog.js";

// Uses the existing catalog, shipping and static discount rules. Dynamic promo
// and affiliate tables remain publicly writable, so Merit cannot trust them as
// financial authority. This helper quotes only; it never reserves or charges.
const STATIC_PROMOS = {
  REVIEW10: { rate: 0.1, freeShipping: false },
  OWNERFREESHIP: { rate: 0, freeShipping: true, emailLock: "support@10bottlevalue.co" },
};
const ADMIN_EMAIL = "support@10bottlevalue.co";
const EXPRESS_COUNTRIES = new Set(["United States", "Puerto Rico", "Australia", "Colombia"]);
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const emailKey = value => typeof value === "string" ? value.trim().toLowerCase() : "";

export class MeritQuoteError extends Error {
  constructor(status, message, code = "MERIT_QUOTE_INVALID") {
    super(message);
    this.name = "MeritQuoteError";
    this.status = status;
    this.code = code;
  }
}

function cleanString(value, field, maxLength, required = false) {
  if (typeof value !== "string") {
    if (required) throw new MeritQuoteError(400, `Enter your ${field}.`);
    return "";
  }
  const cleaned = value.trim();
  if (cleaned.length > maxLength || (required && !cleaned)) {
    throw new MeritQuoteError(400, `Check your ${field} and try again.`);
  }
  return cleaned;
}

function moneyCents(value) {
  const cents = Math.round((Number(value) + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new MeritQuoteError(503, "Checkout pricing is unavailable.", "MERIT_QUOTE_UNAVAILABLE");
  }
  return cents;
}

function normalizeInput(body, verifiedEmail) {
  const email = emailKey(verifiedEmail);
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new MeritQuoteError(403, "A verified checkout email is required.", "MERIT_QUOTE_IDENTITY_REQUIRED");
  }
  if (!record(body) || !record(body.checkoutForm)) {
    throw new MeritQuoteError(400, "Checkout details are incomplete.");
  }
  const checkout = body.checkoutForm;
  for (const claimedEmail of [body.email, checkout.email]) {
    if (claimedEmail != null && claimedEmail !== "" && emailKey(claimedEmail) !== email) {
      throw new MeritQuoteError(403, "Checkout email must match your verified account.", "MERIT_QUOTE_IDENTITY_MISMATCH");
    }
  }
  const credit = Number(body.storeCreditUsed ?? 0);
  if (!Number.isFinite(credit) || credit < 0) {
    throw new MeritQuoteError(400, "Invalid Store Credit amount.");
  }
  if (credit > 0) {
    throw new MeritQuoteError(409, "Store Credit cannot be combined with this card payment. Remove Store Credit to continue.", "MERIT_PARTIAL_CREDIT_UNAVAILABLE");
  }

  const form = {};
  for (const [field, label, limit, required] of [
    ["firstName", "first name", 100, true], ["lastName", "last name", 100, true],
    ["country", "country", 100, true], ["address", "address", 250, true],
    ["address2", "address line 2", 250, false], ["city", "city", 100, true],
    ["state", "state or region", 100, false], ["postalCode", "postal code", 40, true],
    ["phone", "phone number", 40, true], ["taxId", "tax ID", 40, false],
  ]) form[field] = cleanString(checkout[field], label, limit, required);
  const phoneDigits = form.phone.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15 || new Set(phoneDigits).size < 3) {
    throw new MeritQuoteError(400, "Check your phone number and try again.");
  }
  if (form.country === "Mexico" && !/^\d{12,13}$/.test(form.taxId.replace(/\s/g, ""))) {
    throw new MeritQuoteError(400, "Enter a valid tax ID for this address.");
  }
  const shippingType = body.shippingType;
  if (!["standard", "express", "us-warehouse"].includes(shippingType)) {
    throw new MeritQuoteError(400, "Select a valid shipping method.");
  }
  if (shippingType === "express" && !EXPRESS_COUNTRIES.has(form.country)) {
    throw new MeritQuoteError(400, "Express shipping is unavailable for this destination.");
  }
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100) {
    throw new MeritQuoteError(400, "Your cart is empty or invalid.");
  }
  const items = body.items.map(item => {
    if (!record(item)) throw new MeritQuoteError(400, "Your cart contains an invalid item.");
    return {
      name: cleanString(item.name, "product name", 160, true),
      dose: cleanString(item.dose, "product size", 80, true),
      quantity: item.quantity,
      ...(item.fromWarehouse ? { fromWarehouse: item.fromWarehouse } : {}),
      ...(item.noteLabel ? { noteLabel: cleanString(item.noteLabel, "product option", 80) } : {}),
    };
  });
  if (shippingType === "us-warehouse" && !items.every(item => item.fromWarehouse === "us")) {
    throw new MeritQuoteError(400, "Refresh the cart and select shipping again.");
  }
  if (items.some(item => item.fromWarehouse === "us") && form.country !== "United States") {
    throw new MeritQuoteError(400, "US warehouse products can only be shipped to the United States.");
  }
  const ownerFreeShipping = body.ownerFreeShipping === true;
  if (ownerFreeShipping && email !== ADMIN_EMAIL) {
    throw new MeritQuoteError(400, "That shipping adjustment is not valid.");
  }
  const promoCode = cleanString(body.promoCode || "", "promo code", 80).toUpperCase();
  const affiliateCode = cleanString(body.affiliateCode || "", "affiliate code", 80).toUpperCase();
  if ((promoCode && !/^[A-Z0-9_-]+$/.test(promoCode)) || (affiliateCode && !/^[A-Z0-9_-]+$/.test(affiliateCode))) {
    throw new MeritQuoteError(400, "That promo or affiliate code is not valid.");
  }
  const purchaserAttestation = {};
  for (const field of ["over21AndResearchUseOnly", "qualifiedResearcherOrLicensedProfessional", "noHumanOrAnimalUse", "policiesAccepted"]) {
    if (body.purchaserAttestation?.[field] !== true) {
      throw new MeritQuoteError(400, "Confirm all purchaser attestations before placing the order.");
    }
    purchaserAttestation[field] = true;
  }
  const orderId = cleanString(body.orderId, "order number", 40);
  if (orderId && !/^INV-[A-Z0-9]{6,32}$/i.test(orderId)) {
    throw new MeritQuoteError(400, "The order number is invalid.");
  }
  return {
    email, form, items, orderId: orderId.toUpperCase(), shippingType, promoCode, affiliateCode,
    affiliateDiscountDisabled: body.affiliateDiscountDisabled === true,
    ownerFreeShipping, purchaserAttestation,
    orderNotes: cleanString(body.orderNotes || "", "order notes", 2000),
  };
}

function verifyPromo(code, email) {
  if (!code) return { rate: 0, freeShipping: false, userPromoId: null };
  if (Object.hasOwn(STATIC_PROMOS, code)) {
    const promo = STATIC_PROMOS[code];
    if (promo.emailLock && promo.emailLock !== email) throw new MeritQuoteError(400, "That promo code is not valid.");
    return { ...promo, userPromoId: null };
  }
  throw new MeritQuoteError(409, "This promo code is not available for card checkout yet. Remove it or contact support before paying.", "MERIT_PROMO_UNVERIFIED");
}

/**
 * Caller must authenticate verifiedEmail before calling. body uses the existing
 * full-credit checkout shape (checkoutForm, items, shippingType, attestations).
 * surchargeBps is trusted PRIVATE configuration, never a body value. It is a
 * customer surcharge, entirely separate from Merit's merchant processing fee.
 * Return values ending in Cents are authoritative integers. The deterministic
 * snapshot/fingerprint is ready for the caller's private payment-attempt store;
 * this fingerprint alone is neither authentication nor a reservation.
 */
export async function buildMeritQuote(body, verifiedEmail, options = {}) {
  const input = normalizeInput(body, verifiedEmail);
  // Fail before querying legacy public-write tables. Never silently remove an
  // advertised benefit: the buyer must explicitly remove the code or ask support.
  if (input.promoCode && !Object.hasOwn(STATIC_PROMOS, input.promoCode)) {
    throw new MeritQuoteError(409, "This promo code is not available for card checkout yet. Remove it or contact support before paying.", "MERIT_PROMO_UNVERIFIED");
  }
  if (input.affiliateCode) {
    throw new MeritQuoteError(409, "Affiliate codes are not available for card checkout yet. Remove the code or contact support before paying.", "MERIT_AFFILIATE_UNVERIFIED");
  }
  const surchargeBps = options.surchargeBps ?? 0;
  if (!Number.isSafeInteger(surchargeBps) || surchargeBps < 0 || surchargeBps > 10000) {
    throw new MeritQuoteError(503, "Card surcharge configuration is unavailable.", "MERIT_QUOTE_UNAVAILABLE");
  }
  // The shared legacy matcher falls back to a US-only row for a worldwide
  // request. Merit must bind an actual warehouse SKU, not that fallback: an
  // omitted/forged warehouse must never bypass US destination eligibility.
  for (const item of input.items) {
    const product = findCatalogProduct(item);
    if (!product || (product.warehouse === "us") !== (item.fromWarehouse === "us")) {
      throw new MeritQuoteError(400, "An item is unavailable from the selected warehouse. Refresh your cart.");
    }
  }
  let priced;
  try { priced = validateAndPriceItems(input.items); }
  catch (error) { throw new MeritQuoteError(400, error.message); }
  const promo = verifyPromo(input.promoCode, input.email);
  const subtotalCents = moneyCents(priced.subtotal);
  const automaticRate = getAutomaticDiscountRate(priced.subtotal);
  const automaticDiscountCents = promo.rate === 0 ? Math.round(subtotalCents * automaticRate) : 0;
  const affiliateDiscountCents = 0;
  const promoDiscountCents = Math.round(subtotalCents * promo.rate);
  const shippingCents = promo.freeShipping || input.ownerFreeShipping || priced.regularSubtotal === 0
    ? 0 : moneyCents(getShippingPrice(priced.regularSubtotal, input.shippingType));
  const preSurchargeTotalCents = subtotalCents - automaticDiscountCents - promoDiscountCents - affiliateDiscountCents + shippingCents;
  const surchargeCents = Number((BigInt(preSurchargeTotalCents) * BigInt(surchargeBps) + 5000n) / 10000n);
  const amountCents = preSurchargeTotalCents + surchargeCents;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new MeritQuoteError(400, "The order total must be greater than zero.");
  const snapshot = {
    ...(input.orderId ? { id: input.orderId } : {}),
    email: input.email, ...input.form, orderNotes: input.orderNotes,
    purchaserAttestation: input.purchaserAttestation,
    shippingType: input.shippingType, items: priced.pricedItems,
    subtotal: subtotalCents / 100, shipping: shippingCents / 100,
    automaticDiscount: automaticDiscountCents / 100, promoDiscount: promoDiscountCents / 100,
    promoCode: input.promoCode, promoFreeShipping: Boolean(promo.freeShipping),
    ownerFreeShipping: input.ownerFreeShipping, affiliateDiscount: affiliateDiscountCents / 100,
    affiliateDiscountDisabled: input.affiliateDiscountDisabled,
    affiliateCode: "", affiliateOwnerEmail: "", affiliateCommission: 0,
    customerCardSurcharge: surchargeCents / 100, customerCardSurchargeBps: surchargeBps,
    cryptoDiscount: 0, storeCreditUsed: 0, total: amountCents / 100,
  };
  const quoteFingerprint = createHash("sha256").update(JSON.stringify({ version: 1, currency: "usd", amountCents, userPromoId: promo.userPromoId, snapshot })).digest("hex");
  return {
    currency: "usd", amountCents, subtotalCents, shippingCents, automaticDiscountCents,
    promoDiscountCents, affiliateDiscountCents, preSurchargeTotalCents, surchargeBps, surchargeCents,
    userPromoId: promo.userPromoId, snapshot, quoteFingerprint,
  };
}
