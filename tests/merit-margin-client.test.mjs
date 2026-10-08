import assert from "node:assert/strict";
import test from "node:test";
import { loadOperationsStudio, validateMeritMarginSummary } from "../artifacts/10-bottle-value/src/operations-portal-client.js";

const payload = () => ({
  ok: true,
  summary: {
    recordedPaidAttempts: 3, eligibleAttempts: 1, excludedRefundOrReversal: 1, excludedUnknown: 1,
    feeKnownAttempts: 1, feeUnknownAttempts: 0, chargedAmountCents: 10300, storeCreditUsedCents: 0, orderValueCents: 10300, customerCardSurchargeCents: 300,
    customerShippingCollectedCents: 1000, processorExpenseEstimateCents: 773, merchantFeeBurdenEstimateCents: 473,
    otherProcessorFeesCents: null, supplierCostsCents: null, netProfitCents: null,
  },
  metadata: {
    schemaVersion: 1, source: "private_merit_attempts", money: "percentage_fee_estimate_not_settled_profit",
    currency: "usd", days: 7, since: "2026-10-01T21:00:00Z", until: "2026-10-08T21:00:00Z",
    fetchedAt: "2026-10-08T21:00:01Z", timezone: "UTC", dateBasis: "merit_paid_at", complete: true,
    rowCount: 3, limit: 5000, snapshot: "bounded_nontransactional_read",
  },
});
const expectedEmail = "owner@example.invalid";
const supabase = { auth: { getSession: async () => ({ data: { session: { access_token: "synthetic-admin-token", user: { id: "owner", email: expectedEmail } } } }) } };

test("admin client accepts complete typed estimates and strips unrequested private fields", () => {
  const value = payload(); value.summary.paymentRules = { secret: "private-rate-source" };
  value.metadata.customerEmail = "private@example.invalid";
  const result = validateMeritMarginSummary(value, 7);
  assert.equal(result.summary.processorExpenseEstimateCents, 773);
  assert.equal(result.summary.merchantFeeBurdenEstimateCents, 473);
  assert.equal(result.summary.netProfitCents, null);
  assert.doesNotMatch(JSON.stringify(result), /private-rate-source|private@example|paymentRules|customerEmail/);
});

test("unknown fee basis remains null, while an explicit zero fee remains zero", () => {
  const value = payload(); value.summary.feeKnownAttempts = 0; value.summary.feeUnknownAttempts = 1;
  value.summary.processorExpenseEstimateCents = null; value.summary.merchantFeeBurdenEstimateCents = null;
  assert.equal(validateMeritMarginSummary(value, 7).summary.processorExpenseEstimateCents, null);
  const zero = payload(); zero.summary.processorExpenseEstimateCents = 0; zero.summary.merchantFeeBurdenEstimateCents = -300;
  assert.equal(validateMeritMarginSummary(zero, 7).summary.processorExpenseEstimateCents, 0);
});

for (const [name, mutate] of [
  ["wrong source", value => { value.metadata.source = "browser_report"; }],
  ["settlement claim", value => { value.metadata.money = "net_profit"; }],
  ["incomplete read", value => { value.metadata.complete = false; }],
  ["wrong currency", value => { value.metadata.currency = "eur"; }],
  ["wrong time basis", value => { value.metadata.dateBasis = "order_created_at"; }],
  ["wrong window", value => { value.metadata.days = 30; }],
  ["row count disagreement", value => { value.metadata.rowCount = 4; }],
  ["unaccounted excluded record", value => { value.summary.excludedUnknown = 0; }],
  ["unaccounted fee record", value => { value.summary.feeKnownAttempts = 0; }],
  ["negative surcharge", value => { value.summary.customerCardSurchargeCents = -1; }],
  ["string amount", value => { value.summary.chargedAmountCents = "10300"; }],
  ["subcent amount", value => { value.summary.customerCardSurchargeCents = 300.5; }],
  ["surcharge above charge", value => { value.summary.customerCardSurchargeCents = 20000; }],
  ["shipping double count", value => { value.summary.customerShippingCollectedCents = 10300; }],
  ["wrong offset calculation", value => { value.summary.merchantFeeBurdenEstimateCents = 472; }],
  ["fabricated profit", value => { value.summary.netProfitCents = 0; }],
  ["fabricated supplier cost", value => { value.summary.supplierCostsCents = 0; }],
  ["partial known fee sum", value => { value.summary.feeKnownAttempts = 0; value.summary.feeUnknownAttempts = 1; }],
]) test(`${name} is rejected before entering private client state`, () => {
  const value = payload(); mutate(value); assert.throws(() => validateMeritMarginSummary(value, 7));
});

test("a verified empty source preserves zero activity but never zero net profit", () => {
  const value = payload(); value.metadata.rowCount = 0;
  for (const key of Object.keys(value.summary)) if (value.summary[key] !== null) value.summary[key] = 0;
  assert.equal(validateMeritMarginSummary(value, 7).summary.recordedPaidAttempts, 0);
  assert.equal(validateMeritMarginSummary(value, 7).summary.netProfitCents, null);
});

test("Merit fees use the current Bearer identity and remain independently available", async () => {
  const result = await loadOperationsStudio({ supabase, expectedEmail, days: 7, fetcher: async (url, options) => {
    assert.equal(options.headers.Authorization, "Bearer synthetic-admin-token"); assert.equal(options.cache, "no-store");
    return url.startsWith("/api/admin-merit-margin")
      ? new Response(JSON.stringify(payload())) : new Response("{}", { status: 502 });
  } });
  assert.equal(result.merit.status, "ready"); assert.equal(result.merit.value.summary.processorExpenseEstimateCents, 773);
  assert.equal(result.orders.status, "error"); assert.equal(result.traffic.status, "error");
});

test("Merit authorization denial rejects the entire read and a late account cannot receive amounts", async () => {
  await assert.rejects(loadOperationsStudio({ supabase, expectedEmail, days: 7, fetcher: async url => new Response("{}", { status: url.startsWith("/api/admin-merit-margin") ? 403 : 502 }) }), error => error.code === "auth");
  let current = true;
  const result = await loadOperationsStudio({ supabase, expectedEmail, days: 7, isCurrent: () => current, fetcher: async url => {
    if (url.startsWith("/api/admin-merit-margin")) { current = false; return new Response(JSON.stringify(payload())); }
    return new Response("{}", { status: 502 });
  } });
  assert.equal(result, null);
});


test("mixed tender summary binds order value to credit plus card charge without treating credit as processing expense", () => {
  const value = payload();
  Object.assign(value.summary, { chargedAmountCents: 1030, storeCreditUsedCents: 5000, orderValueCents: 6030,
    customerCardSurchargeCents: 30, customerShippingCollectedCents: 2000,
    processorExpenseEstimateCents: 77, merchantFeeBurdenEstimateCents: 47 });
  const result = validateMeritMarginSummary(value, 7);
  assert.equal(result.summary.storeCreditUsedCents, 5000);
  assert.equal(result.summary.orderValueCents, 6030);
  value.summary.orderValueCents = 1030;
  assert.throws(() => validateMeritMarginSummary(value, 7));
});
