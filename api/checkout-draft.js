import { isDeepStrictEqual } from "node:util";
import { requireCheckoutIdentity } from "./_checkout-auth.js";
import { rejectUnverifiedStoreCredit } from "./_payment-guard.js";
import { buildCheckoutDraft, normalizeCheckoutDraftInput } from "./_checkout-draft.js";
import { checkoutDraftRetry, signCheckoutDraft, recoverCheckoutDraft, customerDraft } from "./_checkout-draft-retry.js";

const unavailable = res => res.status(503).json({ error: "Your order draft could not be confirmed. No payment was started.", code: "CHECKOUT_DRAFT_UNAVAILABLE" });
const invalid = res => res.status(400).json({ error: "Check your contact details, cart and checkout confirmations.", code: "CHECKOUT_DRAFT_INVALID" });
const columns = "id,user_id,email,status,total,items,metadata";
const retryColumns = `${columns},created_at,payment_id,payment_provider,paid_at`;
async function rowsFrom(response) {
  if (!response.ok) throw new Error("Draft storage unavailable");
  const raw = await response.text();
  if (raw.length > 250_000) throw new Error("Invalid draft response");
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows) || rows.length > 1) throw new Error("Ambiguous draft response");
  return rows;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const identity = await requireCheckoutIdentity(req, res);
  if (!identity) return;
  if (rejectUnverifiedStoreCredit(req.body, res)) return;
  const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) return res.status(503).json({ error: "Order storage is unavailable." });
  let input, retry;
  try {
    if (Buffer.byteLength(JSON.stringify(req.body)) > 64_000) throw new Error("Checkout request is too large.");
    input = normalizeCheckoutDraftInput(req.body);
    retry = checkoutDraftRetry(req.body.requestIdempotencyKey, identity, input);
  } catch (error) {
    return error.code === "RETRY_UNAVAILABLE" ? unavailable(res) : invalid(res);
  }
  let url;
  try { url = new URL(`${sbUrl.replace(/\/+$/, "")}/rest/v1/orders`); }
  catch { return unavailable(res); }
  url.searchParams.set("select", retry ? retryColumns : columns);
  const headers = { apikey: sbKey, Authorization: `Bearer ${sbKey}`, "Content-Type": "application/json" };
  const signal = AbortSignal.timeout(8_000); // One deadline across all DB steps.
  async function findExisting() {
    const lookup = new URL(url);
    lookup.searchParams.set("id", `eq.${retry.id}`);
    lookup.searchParams.set("limit", "2");
    return (await rowsFrom(await fetch(lookup.toString(), { headers, signal })))[0];
  }
  function replay(existing) {
    try {
      return res.status(200).json({ ok: true, order: recoverCheckoutDraft(existing, retry) });
    } catch {
      return res.status(409).json({ error: "This checkout draft has changed. Review your order before continuing.", code: "CHECKOUT_DRAFT_CHANGED" });
    }
  }
  // Recover the signed original before validating current catalog prices or stock.
  if (retry) {
    try {
      const existing = await findExisting();
      if (existing) return replay(existing);
    } catch { return unavailable(res); }
  }
  let draft;
  try {
    draft = buildCheckoutDraft(input, identity, retry ? { id: retry.id } : {});
    if (retry) {
      // Do not depend on database defaults for an untouched payment state.
      Object.assign(draft, { payment_id: null, payment_provider: null, paid_at: null });
      signCheckoutDraft(draft, retry);
    }
  } catch { return invalid(res); }
  try {
    // Requires an immediate nonpartial unique index on orders.id: verify with
    // the read-only release preflight. Never UPSERT or overwrite a draft.
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify(draft), signal,
    });
    const rows = await rowsFrom(response);
    if (rows.length !== 1) throw new Error("Draft was not acknowledged.");
    const saved = rows[0];
    for (const key of columns.split(",")) {
      if (!isDeepStrictEqual(saved?.[key], draft[key])) throw new Error("Draft acknowledgement did not match.");
    }
    // Also validate the canonical timestamp and untouched payment fields,
    // including on INSERT acknowledgement (a trigger may have changed them).
    if (retry) recoverCheckoutDraft(saved, retry);
    // Return only the constructed customer projection, never arbitrary DB fields.
    return res.status(201).json({ ok: true, order: customerDraft(draft) });
  } catch {
    // A conflict/lost acknowledgement may mean this INSERT committed. Read
    // once by the same ID, without retrying INSERT or starting a payment.
    if (retry) {
      try {
        const existing = await findExisting();
        if (existing) return replay(existing);
      } catch { /* The caller may retry with the same key after recovery. */ }
    }
    return unavailable(res);
  }
}
