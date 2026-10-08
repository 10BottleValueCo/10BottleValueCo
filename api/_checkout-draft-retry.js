import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const VERSION = 1;
const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const canonical = value => JSON.stringify(sort(value));
function sort(value) {
  if (Array.isArray(value)) return value.map(sort);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])]));
  return value;
}
const hash = value => createHash("sha256").update(canonical(value)).digest("hex");
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);

export function checkoutDraftRetry(key, identity, input) {
  if (key === undefined) return null; // Older clients retain their original contract.
  if (typeof key !== "string" || !UUID4.test(key)) throw new Error("Invalid retry key");
  const secret = process.env.CHECKOUT_DRAFT_SIGNING_SECRET;
  if (typeof secret !== "string" || Buffer.byteLength(secret) < 32) {
    const error = new Error("Draft retry signing is unavailable");
    error.code = "RETRY_UNAVAILABLE";
    throw error;
  }
  // ID is deliberately independent of secret rotation. Rotation fails closed
  // for an existing proof; it must never silently allocate another draft.
  const id = `INV-${hash(["checkout-draft-id-v1", identity.id, key.toLowerCase()]).slice(0, 24).toUpperCase()}`;
  return { id, requestHash: hash(["checkout-draft-input-v1", input]), identity, secret };
}

function projection(row) {
  const { _draftRetry, ...metadata } = row.metadata;
  return { id: row.id, user_id: row.user_id, email: row.email, status: row.status, total: row.total,
    created_at: new Date(row.created_at).toISOString(), payment_id: row.payment_id,
    payment_provider: row.payment_provider, paid_at: row.paid_at, items: row.items, metadata };
}
function proof(row, retry) {
  return createHmac("sha256", retry.secret).update(canonical(["checkout-draft-proof-v1", retry.requestHash, projection(row)])).digest("hex");
}
export function signCheckoutDraft(draft, retry) {
  draft.metadata._draftRetry = { version: VERSION, requestHash: retry.requestHash, proof: proof(draft, retry) };
  return draft;
}
export function customerDraft(draft) {
  const { _draftRetry, ...metadata } = draft.metadata;
  return metadata;
}

// A proof prevents treating arbitrary mutable DB content as a server-created
// draft. It cannot prevent restoring an older signed snapshot in a publicly
// writable table. RLS and immutable quote/payment attempts remain mandatory.
export function recoverCheckoutDraft(row, retry) {
  if (!record(row) || !record(row.metadata)) throw new Error("Draft changed");
  const meta = row.metadata, saved = meta._draftRetry;
  if (row.id !== retry.id || row.user_id !== retry.identity.id || row.email !== retry.identity.email
    || row.status !== "pending" || row.total !== null || meta.id !== row.id || meta.email !== row.email
    || meta.status !== "pending" || meta.total !== null || meta.pricingState !== "awaiting_provider_quote"
    || meta.paymentProvider !== "pending" || !record(saved) || saved.version !== VERSION
    || row.payment_id !== null || row.payment_provider !== null || row.paid_at !== null
    || saved.requestHash !== retry.requestHash || !/^[a-f0-9]{64}$/.test(saved.proof)
    || !Array.isArray(row.items) || row.items.length === 0 || canonical(row.items) !== canonical(meta.items)
    || typeof meta.createdAt !== "string" || !Number.isFinite(Date.parse(meta.createdAt))
    || typeof row.created_at !== "string" || Date.parse(row.created_at) !== Date.parse(meta.createdAt)) throw new Error("Draft changed");
  if (!timingSafeEqual(Buffer.from(saved.proof, "hex"), Buffer.from(proof(row, retry), "hex"))) throw new Error("Draft changed");
  return customerDraft(row);
}
