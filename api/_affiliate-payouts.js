export const PAYOUT_PAGE_SIZE = 1_000;
export const MAX_PAYOUT_ROWS = 20_000;

export class PayoutDataError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function payoutConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceKey ? { url: url.replace(/\/+$/, ""), serviceKey } : null;
}

export function payoutCode(value) {
  return typeof value === "string" && /^[A-Z0-9_-]{1,64}$/.test(value) ? value : null;
}

// The table is numeric(10, 2). Parse cents without coercing null/booleans to zero
// or silently rounding corrupt fractional/negative historical entries.
export function payoutCents(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const text = String(value);
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function invalidHistory() {
  return new PayoutDataError("PAYOUT_HISTORY_UNAVAILABLE", "Payout history could not be summarized safely.");
}

// A short page alone is not proof of completion: PostgREST can apply a lower
// row cap. Require a count and exact range so incomplete history stays unknown.
export async function readExactPage(endpoint, config, { offset = 0, limit = PAYOUT_PAGE_SIZE } = {}) {
  endpoint.searchParams.set("limit", String(limit));
  endpoint.searchParams.set("offset", String(offset));
  const response = await fetch(endpoint, {
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      Prefer: "count=exact",
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw invalidHistory();
  let rows;
  try { rows = await response.json(); } catch { throw invalidHistory(); }
  if (!Array.isArray(rows)) throw invalidHistory();
  const range = response.headers.get("content-range") || "";
  const match = /^(?:(\d+)-(\d+)|\*)\/(\d+)$/.exec(range);
  if (!match) throw invalidHistory();
  const total = Number(match[3]);
  if (!Number.isSafeInteger(total) || total < 0) throw invalidHistory();
  const expected = Math.min(limit, Math.max(0, total - offset));
  if (rows.length !== expected) throw invalidHistory();
  if (expected === 0) {
    if (match[1] !== undefined) throw invalidHistory();
  } else if (Number(match[1]) !== offset || Number(match[2]) !== offset + expected - 1) {
    throw invalidHistory();
  }
  return { rows, total };
}

export async function readPayouts(config, code = null) {
  const payouts = [];
  let expectedTotal;
  let previousId = 0n;
  for (let offset = 0; offset < MAX_PAYOUT_ROWS; offset += PAYOUT_PAGE_SIZE) {
    const endpoint = new URL(`${config.url}/rest/v1/affiliate_payouts`);
    endpoint.searchParams.set("select", "id,affiliate_code,amount");
    endpoint.searchParams.set("order", "id.asc");
    // Include legacy case variants so they fail canonical validation below
    // instead of silently disappearing from the owner's paid total.
    if (code) endpoint.searchParams.set("affiliate_code", `ilike.${code.replace(/_/g, "\\_")}`);
    const { rows, total } = await readExactPage(endpoint, config, { offset });
    if (total > MAX_PAYOUT_ROWS) {
      throw new PayoutDataError("PAYOUT_HISTORY_TOO_LARGE", "Payout history is too large to summarize safely.", 503);
    }
    if (expectedTotal !== undefined && total !== expectedTotal) throw invalidHistory();
    expectedTotal = total;
    for (const row of rows) {
      const id = row?.id;
      const validId = (typeof id === "string" && /^[1-9]\d{0,18}$/.test(id))
        || (typeof id === "number" && Number.isSafeInteger(id) && id > 0);
      const cents = payoutCents(row?.amount);
      if (!validId || !payoutCode(row?.affiliate_code) || cents === null
        || (code && row.affiliate_code !== code)) throw invalidHistory();
      const currentId = BigInt(id);
      if (currentId <= previousId) throw invalidHistory();
      previousId = currentId;
      payouts.push({ affiliate_code: row.affiliate_code, amount: cents / 100, cents });
    }
    if (payouts.length === total) return payouts;
  }
  throw invalidHistory();
}

export function sendPayoutError(res, error) {
  const known = error instanceof PayoutDataError;
  return res.status(known ? error.status : 503).json({
    ok: false,
    code: known ? error.code : "PAYOUT_SERVICE_UNAVAILABLE",
    error: known ? error.message : "Payout information is temporarily unavailable.",
  });
}
