import { assertLegacyCreditPaidAcknowledgement } from "./_legacy-store-credit.js";

const PAYABLE = new Set(["pending", "checkout", "checkout (clicked pay)"]);

export function legacyTransitionError(status = 409) {
  return Object.assign(new Error("Payment reconciliation is pending. Contact support."), {
    status, code: "PAYMENT_RECONCILIATION_REQUIRED",
  });
}

// This guards lifecycle/acknowledgement only. Legacy provider quote storage is
// not a private immutable payment ledger and must not be described as one.
export function inspectLegacyTransition(row, expected) {
  if (!row || row.id !== expected.id || !row.email) throw legacyTransitionError(503);
  const status = String(row.status || "").trim().toLowerCase();
  if (row.payment_id && String(row.payment_id) !== expected.payment_id) throw legacyTransitionError();
  if (row.payment_provider && row.payment_provider !== expected.payment_provider) throw legacyTransitionError();
  if (["paid", "done", "completed", "shipped", "delivered"].includes(status)) {
    // Preserve fulfillment state; only an exact stored provider binding allows
    // a callback replay to claim its payment was already acknowledged.
    if (String(row.payment_id || "") !== expected.payment_id || row.payment_provider !== expected.payment_provider) throw legacyTransitionError();
    return { alreadyPaid: true };
  }
  if (!PAYABLE.has(status)) throw legacyTransitionError();
  return { alreadyPaid: false };
}

export async function acknowledgeLegacyPaid(row, expected, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const state = inspectLegacyTransition(row, expected);
  if (state.alreadyPaid) return state;
  const base = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw legacyTransitionError(503);
  const query = new URLSearchParams({ id: `eq.${row.id}`, email: `eq.${row.email}`, status: `eq.${row.status}` });
  if (row.total != null) query.set("total", `eq.${row.total}`);
  if (row.metadata?.catalystpay_invoice_id) query.set("metadata->>catalystpay_invoice_id", `eq.${row.metadata.catalystpay_invoice_id}`);
  for (const field of ["payment_id", "payment_provider"]) query.set(field, row[field] == null ? "is.null" : `eq.${row[field]}`);
  const { id, email, ...patch } = expected;
  try {
    const response = await fetchImpl(`${base}/rest/v1/orders?${query}`, {
      method: "PATCH", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(patch), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw legacyTransitionError(503);
    assertLegacyCreditPaidAcknowledgement(await response.json(), expected);
    return { alreadyPaid: false };
  } catch { throw legacyTransitionError(503); }
}
