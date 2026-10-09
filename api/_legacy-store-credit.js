// New credit-backed payments use the server-reserved Merit flow (or full-credit
// checkout). Legacy providers may still deliver callbacks for older invoices.
export function legacyCreditStartError(body = {}) {
  const raw = body?.storeCreditUsed;
  if (raw === undefined || raw === null || raw === "") return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0 || typeof raw === "object" || typeof raw === "boolean") {
    return { status: 400, code: "INVALID_STORE_CREDIT", error: "Store credit amount is invalid." };
  }
  if (amount === 0) return null;
  return {
    status: 409,
    code: "STORE_CREDIT_REQUIRES_MERIT",
    error: "To apply store credit, choose Merit card checkout or pay fully with store credit.",
  };
}

export async function legacyExistingCreditOrderError(body = {}, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const id = body?.order_id || body?.orderId;
  if (!id) return null; // The provider handler owns its ordinary required-field response.
  const pending = { status: 503, code: "CREDIT_RECONCILIATION_REQUIRED", error: "The saved order must be checked before another payment can start. Please try again or contact support." };
  const url = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    if (!url || !key) return pending;
    const response = await fetchImpl(`${url}/rest/v1/orders?id=eq.${encodeURIComponent(String(id))}&select=metadata&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return pending;
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length !== 1 || !rows[0] || typeof rows[0] !== "object") return pending;
    const credit = rows[0]?.metadata?.storeCreditUsed ?? 0;
    if (!["number", "string"].includes(typeof credit) || !Number.isFinite(Number(credit)) || Number(credit) < 0) return pending;
    if (Number(credit) > 0) return { status: 409, code: "CREDIT_RECONCILIATION_REQUIRED", error: "This order already claims store credit. Contact support to reconcile it before starting another payment." };
    return null;
  } catch {
    return pending;
  }
}

export async function debitLegacyOrderCredit(
  { orderId, email, creditAmount = 0, provider },
  { env = process.env, fetchImpl = globalThis.fetch } = {},
) {
  const fail = () => {
    const error = new Error("Store credit reconciliation is pending. Contact support before retrying payment.");
    error.code = "CREDIT_RECONCILIATION_REQUIRED";
    error.status = 503;
    return error;
  };
  if (creditAmount !== null && !["number", "string"].includes(typeof creditAmount)) throw fail();
  const amount = Number(creditAmount);
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(cents) || Math.abs(amount * 100 - cents) > 1e-7) throw fail();
  if (cents === 0) return { ok: true, skipped: true };
  const id = String(orderId || "").trim();
  const owner = String(email || "").trim().toLowerCase();
  const kind = String(provider || "").trim().toLowerCase();
  const url = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!id || !owner || !["stripe", "nowpayments", "catalystpay", "paylio"].includes(kind) || !url || !key) throw fail();
  let response, receipt;
  try {
    response = await fetchImpl(`${url}/rest/v1/rpc/debit_legacy_order_credit`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_order_id: id, p_email: owner, p_credit_cents: cents, p_provider: kind }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw fail();
    receipt = await response.json();
  } catch {
    throw fail();
  }
  if (receipt?.ok !== true || receipt.orderId !== id || receipt.email !== owner || receipt.creditCents !== cents || receipt.provider !== kind ||
      receipt.alreadyDebited !== true || !Number.isSafeInteger(receipt.balanceCents) || receipt.balanceCents < 0) throw fail();
  return receipt;
}

export function assertLegacyCreditPaidAcknowledgement(rows, expected) {
  const saved = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
  if (!saved || saved.id !== expected.id || saved.status !== "paid"
      || String(saved.email || "").trim().toLowerCase() !== String(expected.email || "").trim().toLowerCase()
      || saved.payment_provider !== expected.payment_provider
      || (expected.payment_id !== undefined && saved.payment_id !== expected.payment_id)
      || !Number.isFinite(Date.parse(saved.paid_at)) || Date.parse(saved.paid_at) !== Date.parse(expected.paid_at)) {
    const error = new Error("Store credit payment reconciliation is pending.");
    error.code = "CREDIT_RECONCILIATION_REQUIRED";
    error.status = 503;
    throw error;
  }
}

// Used only after an acknowledged private legacy ledger replay. Do not send
// receipts or create affiliate/promo effects until the saved order says paid.
export async function acknowledgeLegacyCreditPaid(expected, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const url = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const { id, email, ...patch } = expected;
  try {
    if (!url || !key) throw new Error("missing private database access");
    const response = await fetchImpl(`${url}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(patch), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("paid write failed");
    assertLegacyCreditPaidAcknowledgement(await response.json(), expected);
  } catch {
    assertLegacyCreditPaidAcknowledgement(null, expected);
  }
}
