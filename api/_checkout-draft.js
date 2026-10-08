import { randomBytes } from "node:crypto";
import { validateAndPriceItems } from "./_catalog.js";

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const invalid = () => new Error("Check your contact details, cart and checkout confirmations.");
const text = (value, max, required = false, multiline = false) => {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string" || value.length > max || (multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(value)) throw invalid();
  const result = value.trim();
  if (required && !result) throw invalid();
  return result;
};

// A pending draft is not a payable quote. Method-specific adjustments and
// promos are still priced by the provider routes; unknown total stays null.
// No caller-owned ID, ownership, payment state, commission or raw metadata is copied.
export function normalizeCheckoutDraftInput(body) {
  if (!isRecord(body) || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) throw invalid();
  const selections = body.items.map((item) => {
    if (!isRecord(item) || typeof item.quantity !== "number" || !Number.isInteger(item.quantity)
      || item.quantity < 1 || item.quantity > 50
      || ![undefined, "", "worldwide", "us"].includes(item.fromWarehouse)) throw invalid();
    return {
      name: text(item.name, 160, true), dose: text(item.dose, 80, true),
      noteLabel: text(item.noteLabel, 80), quantity: item.quantity,
      ...(item.fromWarehouse === "us" ? { fromWarehouse: "us" } : {}),
    };
  });
  const fields = {};
  for (const [key, max, required] of [
    ["firstName", 120, true], ["lastName", 120, true], ["country", 120, true],
    ["address", 300, true], ["address2", 300, false], ["city", 120, true],
    ["state", 120, false], ["postalCode", 40, true], ["phone", 80, true],
    ["taxId", 80, false], ["orderNotes", 2000, false],
    ["promoCode", 80, false], ["affiliateCode", 80, false],
  ]) fields[key] = text(body[key], max, required, key === "orderNotes");
  const phoneDigits = fields.phone.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15 || new Set(phoneDigits).size < 3) throw invalid();
  if (fields.country === "Mexico" && !/^\S{12,13}$/.test(fields.taxId.replace(/\s/g, ""))) throw invalid();
  if (selections.some(item => item.fromWarehouse === "us") && fields.country !== "United States") throw invalid();
  if (!["standard", "express"].includes(body.shippingType)) throw invalid();
  const attestation = body.purchaserAttestation;
  const flags = ["over21AndResearchUseOnly", "qualifiedResearcherOrLicensedProfessional", "noHumanOrAnimalUse", "policiesAccepted"];
  if (!isRecord(attestation) || flags.some(key => attestation[key] !== true)) throw invalid();
  return { ...fields, shippingType: body.shippingType,
    purchaserAttestation: Object.fromEntries(flags.map(key => [key, true])), items: selections };
}

export function buildCheckoutDraft(body, identity, { id: suppliedId } = {}) {
  const input = normalizeCheckoutDraftInput(body);
  const { items: selections, purchaserAttestation, ...fields } = input;
  const { pricedItems, subtotal } = validateAndPriceItems(selections);
  const quantities = new Map();
  for (const item of pricedItems) {
    const key = JSON.stringify([item.name, item.dose, item.noteLabel || "", item.fromWarehouse || ""]);
    const quantity = (quantities.get(key) || 0) + item.quantity;
    if (quantity > 50) throw invalid();
    quantities.set(key, quantity);
  }
  const id = suppliedId || `INV-${randomBytes(12).toString("hex").toUpperCase()}`;
  const createdAt = new Date().toISOString();
  const metadata = {
    ...fields, id, email: identity.email, status: "pending", createdAt,
    purchaserAttestation: { ...purchaserAttestation, acceptedAt: createdAt },
    items: pricedItems, subtotal, total: null,
    pricingState: "awaiting_provider_quote", paymentProvider: "pending",
  };
  return { id, user_id: identity.id, email: identity.email, status: "pending", created_at: createdAt,
    total: null, items: pricedItems, metadata };
}
