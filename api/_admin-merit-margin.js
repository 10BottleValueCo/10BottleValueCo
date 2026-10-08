import { computeMeritMargin } from "./_merit-margin.js";

export const MERIT_MARGIN_PAGE_SIZE = 250;
export const MAX_MERIT_MARGIN_ATTEMPTS = 5_000;
const MAX_PAGE_BYTES = 2_000_000;
// Fetch only the private canonical amounts/rules needed for this read. Customer
// details, provider client secrets and payment credentials never leave storage.
const FIELDS = "id,state,amount_cents,currency,expected_live,created_at,paid_at,total:snapshot->total,customer_surcharge:snapshot->customerCardSurcharge,customer_surcharge_bps:snapshot->customerCardSurchargeBps,customer_shipping:snapshot->shipping,payment_rules:snapshot->paymentRules,order:orders(status)";
const timestamp = value => typeof value === "string" && value.length <= 64 && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;

export class MeritMarginReadError extends Error {
  constructor(code = "MERIT_MARGIN_UNAVAILABLE", status = 502) {
    super("Merit fee records could not be read completely.");
    this.code = code; this.status = status;
  }
}

function sum(left, right) {
  const result = left + right;
  if (!Number.isSafeInteger(result)) throw new MeritMarginReadError();
  return result;
}

export async function readMeritMarginSummary(config, days, { now = new Date(), fetcher = fetch, signal = AbortSignal.timeout(15_000) } = {}) {
  if (![1, 7, 30, 90].includes(days) || !Number.isFinite(now.getTime()) || !config?.url || !config?.serviceKey) throw new MeritMarginReadError();
  const until = now.toISOString();
  const since = new Date(now.getTime() - days * 86_400_000).toISOString();
  const summary = {
    recordedPaidAttempts: 0, eligibleAttempts: 0, excludedRefundOrReversal: 0, excludedUnknown: 0,
    feeKnownAttempts: 0, feeUnknownAttempts: 0, chargedAmountCents: 0, customerCardSurchargeCents: 0,
    customerShippingCollectedCents: 0, processorExpenseEstimateCents: 0, merchantFeeBurdenEstimateCents: 0,
    otherProcessorFeesCents: null, supplierCostsCents: null, netProfitCents: null,
  };
  const ids = new Set();
  let expectedTotal;
  let previousTime = Infinity;
  for (let offset = 0; offset < MAX_MERIT_MARGIN_ATTEMPTS; offset += MERIT_MARGIN_PAGE_SIZE) {
    const url = new URL(`${config.url.replace(/\/+$/, "")}/rest/v1/merit_payment_attempts`);
    for (const [key, value] of Object.entries({
      select: FIELDS, state: "eq.paid", expected_live: "eq.true",
      and: `(paid_at.gte.${since},paid_at.lte.${until})`, order: "paid_at.desc,id.asc",
      limit: String(MERIT_MARGIN_PAGE_SIZE), offset: String(offset),
    })) url.searchParams.set(key, value);
    const response = await fetcher(url, {
      method: "GET", cache: "no-store", signal,
      headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}`, Prefer: "count=exact" },
    });
    if (!response.ok) throw new MeritMarginReadError();
    const range = /^(?:(\d+)-(\d+)|\*)\/(\d+)$/.exec(response.headers.get("content-range") || "");
    const total = range ? Number(range[3]) : NaN;
    if (!Number.isSafeInteger(total) || total < 0) throw new MeritMarginReadError();
    if (total > MAX_MERIT_MARGIN_ATTEMPTS) throw new MeritMarginReadError("OPERATIONS_WINDOW_TOO_LARGE", 503);
    if (expectedTotal !== undefined && total !== expectedTotal) throw new MeritMarginReadError();
    expectedTotal = total;
    const raw = await response.text();
    if (Buffer.byteLength(raw) > MAX_PAGE_BYTES) throw new MeritMarginReadError();
    let rows;
    try { rows = JSON.parse(raw); } catch { throw new MeritMarginReadError(); }
    const expected = Math.min(MERIT_MARGIN_PAGE_SIZE, Math.max(0, total - offset));
    if (!Array.isArray(rows) || rows.length !== expected || (expected === 0 ? range[1] !== undefined
      : Number(range[1]) !== offset || Number(range[2]) !== offset + expected - 1)) throw new MeritMarginReadError();
    for (const row of rows) {
      const paidAt = timestamp(row?.paid_at);
      if (!row || typeof row.id !== "string" || !row.id || row.id.length > 100 || ids.has(row.id)
        || paidAt === null || paidAt < Date.parse(since) || paidAt > now.getTime() || paidAt > previousTime
        || row.state !== "paid" || row.expected_live !== true || row.currency !== "usd") throw new MeritMarginReadError();
      previousTime = paidAt; ids.add(row.id);
      summary.recordedPaidAttempts += 1;
      const margin = computeMeritMargin({
        id: row.id, state: row.state, currency: row.currency, expected_live: row.expected_live,
        amount_cents: row.amount_cents, orderStatus: row.order?.status,
        snapshot: {
          total: row.total, customerCardSurcharge: row.customer_surcharge,
          customerCardSurchargeBps: row.customer_surcharge_bps, shipping: row.customer_shipping,
          paymentRules: row.payment_rules,
        },
      });
      if (margin.status === "unavailable") {
        if (margin.reason === "refund_or_reversal") summary.excludedRefundOrReversal += 1;
        else summary.excludedUnknown += 1;
        continue;
      }
      summary.eligibleAttempts += 1;
      for (const key of ["chargedAmountCents", "customerCardSurchargeCents", "customerShippingCollectedCents"]) summary[key] = sum(summary[key], margin[key]);
      if (margin.processorExpenseCents === null) summary.feeUnknownAttempts += 1;
      else {
        summary.feeKnownAttempts += 1;
        summary.processorExpenseEstimateCents = sum(summary.processorExpenseEstimateCents, margin.processorExpenseCents);
        summary.merchantFeeBurdenEstimateCents = sum(summary.merchantFeeBurdenEstimateCents, margin.merchantFeeBurdenCents);
      }
    }
    if (summary.recordedPaidAttempts === total) {
      if (summary.feeUnknownAttempts > 0) {
        summary.processorExpenseEstimateCents = null;
        summary.merchantFeeBurdenEstimateCents = null;
      }
      return {
        ok: true, summary,
        metadata: {
          schemaVersion: 1, source: "private_merit_attempts", money: "percentage_fee_estimate_not_settled_profit",
          currency: "usd", days, since, until, fetchedAt: new Date().toISOString(), timezone: "UTC", dateBasis: "merit_paid_at",
          complete: true, rowCount: total, limit: MAX_MERIT_MARGIN_ATTEMPTS, snapshot: "bounded_nontransactional_read",
        },
      };
    }
  }
  throw new MeritMarginReadError();
}
