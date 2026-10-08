import assert from "node:assert/strict";
import test from "node:test";
import { computeMeritMargin } from "../api/_merit-margin.js";

const attempt = () => ({
  id: "synthetic-private-attempt", state: "paid", orderStatus: "paid", expected_live: true,
  currency: "usd", amount_cents: 10300,
  snapshot: {
    total: 103, customerCardSurcharge: 3, customerCardSurchargeBps: 300, shipping: 10,
    paymentRules: {
      version: "synthetic-2026-10-08", currency: "usd",
      customerCardSurcharge: { rate: 300, unit: "basis_points", source: "Owner instruction", effectiveAt: "2026-10-08T00:00:00Z" },
      merchantProcessingExpense: { rate: 750, unit: "basis_points", source: "Synthetic provider terms", effectiveAt: "2026-10-08T00:00:00Z", status: "reported_rate_not_actual_settlement", basis: "charged_amount" },
    },
  },
});
const actual = () => ({
  attemptId: "synthetic-private-attempt", currency: "usd", version: "statement-1", source: "Private statement row",
  status: "settlement_verified", recordedAt: "2026-10-09T00:00:00Z", chargedAmountCents: 10300,
  processorExpenseCents: 795, refundedAmountCents: 0,
});
const costs = () => ({
  attemptId: "synthetic-private-attempt", currency: "usd", version: "invoice-1", source: "Private invoice row",
  status: "invoice_verified", recordedAt: "2026-10-09T00:00:00Z", supplierProductCostCents: 4000,
  supplierShippingPaidCents: 1200, otherOrderCostsCents: 50,
});

test("3% customer revenue offsets only part of a 7.5% fee on the full charge, with cent rounding", () => {
  const result = computeMeritMargin(attempt());
  assert.equal(result.status, "estimated_fee_known");
  assert.equal(result.chargedAmountCents, 10300);
  assert.equal(result.customerCardSurchargeCents, 300);
  assert.equal(result.processorExpenseCents, 773); // 103 * 7.5% = 7.725, rounded half up.
  assert.equal(result.merchantFeeBurdenCents, 473);
  assert.equal(result.processorExpenseKind, "reported_rate_estimate");
  assert.equal(result.processorExpenseScope, "percentage_component_only");
  assert.equal(result.otherProcessorFeesCents, null);
  assert.equal(result.netProfitCents, null);
  assert.equal(result.supplierProductCostCents, null);
});

test("the immutable attempt rate survives later environment price changes", () => {
  const old = process.env.MERIT_PROCESSOR_FEE_BPS;
  process.env.MERIT_PROCESSOR_FEE_BPS = "9999";
  try { assert.equal(computeMeritMargin(attempt()).processorExpenseCents, 773); }
  finally { old === undefined ? delete process.env.MERIT_PROCESSOR_FEE_BPS : process.env.MERIT_PROCESSOR_FEE_BPS = old; }
});

for (const [name, change] of [
  ["missing fee", row => { row.snapshot.paymentRules.merchantProcessingExpense = null; }],
  ["unknown charge basis", row => { row.snapshot.paymentRules.merchantProcessingExpense.basis = null; }],
  ["unsupported basis", row => { row.snapshot.paymentRules.merchantProcessingExpense.basis = "net_after_surcharge"; }],
  ["missing source", row => { row.snapshot.paymentRules.merchantProcessingExpense.source = ""; }],
  ["invalid unit", row => { row.snapshot.paymentRules.merchantProcessingExpense.unit = "percent"; }],
  ["missing effective date", row => { row.snapshot.paymentRules.merchantProcessingExpense.effectiveAt = null; }],
  ["nonfinite rate", row => { row.snapshot.paymentRules.merchantProcessingExpense.rate = Infinity; }],
  ["negative rate", row => { row.snapshot.paymentRules.merchantProcessingExpense.rate = -1; }],
]) test(`${name} keeps the surcharge known but processing expense and profit unknown`, () => {
  const row = attempt(); change(row); const result = computeMeritMargin(row);
  assert.equal(result.status, "fee_unknown"); assert.equal(result.customerCardSurchargeCents, 300);
  assert.equal(result.processorExpenseCents, null); assert.equal(result.merchantFeeBurdenCents, null); assert.equal(result.netProfitCents, null);
});

for (const [name, change] of [
  ["unpaid", row => { row.state = "ready"; }],
  ["test mode", row => { row.expected_live = false; }],
  ["wrong currency", row => { row.currency = "eur"; }],
  ["missing order status", row => { delete row.orderStatus; }],
  ["unknown order state", row => { row.orderStatus = "unexpected"; }],
  ["wrong charge", row => { row.amount_cents = 10301; }],
  ["missing surcharge", row => { row.snapshot.customerCardSurcharge = null; }],
  ["blank amount", row => { row.snapshot.total = ""; }],
  ["boolean shipping", row => { row.snapshot.shipping = false; }],
  ["subcent amount", row => { row.snapshot.total = 103.001; }],
  ["forged surcharge", row => { row.snapshot.customerCardSurcharge = 7.5; }],
  ["mismatched rate", row => { row.snapshot.customerCardSurchargeBps = 750; }],
  ["missing rule version", row => { delete row.snapshot.paymentRules.version; }],
]) test(`${name} cannot become a known fee or zero profit`, () => {
  const row = attempt(); change(row); const result = computeMeritMargin(row);
  assert.equal(result.status, "unavailable"); assert.equal(result.processorExpenseCents, null); assert.equal(result.netProfitCents, null);
});

test("refund, partial-refund and reversal states cannot reuse the original sale margin", () => {
  for (const status of ["refunded", "partially_refunded", "chargeback", "disputed", "cancelled"]) {
    const result = computeMeritMargin({ ...attempt(), orderStatus: status });
    assert.equal(result.reason, "refund_or_reversal"); assert.equal(result.chargedAmountCents, null); assert.equal(result.contributionCents, null);
  }
  const result = computeMeritMargin(attempt(), { settlement: { ...actual(), refundedAmountCents: 1 } });
  assert.equal(result.status, "unavailable"); assert.equal(result.reason, "refund_or_reversal"); assert.equal(result.processorExpenseCents, null);
});

test("an exact trusted actual fee replaces the estimate even when the historical basis is unknown", () => {
  const row = attempt(); row.snapshot.paymentRules.merchantProcessingExpense.basis = null;
  const result = computeMeritMargin(row, { settlement: actual() });
  assert.equal(result.status, "actual_fee_known"); assert.equal(result.processorExpenseCents, 795);
  assert.equal(result.merchantFeeBurdenCents, 495); assert.equal(result.processorExpenseKind, "settlement_actual");
  assert.equal(result.processorExpenseScope, "verified_total_processing_expense"); assert.equal(result.netProfitCents, null);
});

test("invalid or wrong-attempt actual evidence cannot silently fall back to a lower estimate", () => {
  for (const change of [{ attemptId: "another-attempt" }, { currency: "eur" }, { source: "" }, { status: "reported" }, { processorExpenseCents: null }, { refundedAmountCents: null }, { chargedAmountCents: 10000 }]) {
    const result = computeMeritMargin(attempt(), { settlement: { ...actual(), ...change } });
    assert.equal(result.reason, "invalid_settlement_record"); assert.equal(result.processorExpenseCents, null);
  }
});

test("explicit actual zero is known; a negative fee balance is retained instead of clamped", () => {
  const result = computeMeritMargin(attempt(), { settlement: { ...actual(), processorExpenseCents: 0 } });
  assert.equal(result.processorExpenseCents, 0); assert.equal(result.merchantFeeBurdenCents, -300);
  assert.equal(result.processorExpenseKind, "settlement_actual");
});

test("supplier shipping is distinct from collected shipping and counted once", () => {
  const result = computeMeritMargin(attempt(), { costs: costs(), settlement: actual() });
  assert.equal(result.customerShippingCollectedCents, 1000);
  assert.equal(result.supplierShippingPaidCents, 1200);
  assert.equal(result.contributionCents, 10300 - 795 - 4000 - 1200 - 50);
  assert.equal(result.contributionKind, "verified_recorded_components"); assert.equal(result.netProfitCents, null);
});

test("missing supplier or other order costs remain null instead of creating profit", () => {
  for (const change of [{ supplierProductCostCents: null }, { supplierShippingPaidCents: null }, { otherOrderCostsCents: null }, { attemptId: "unrelated" }]) {
    const result = computeMeritMargin(attempt(), { costs: { ...costs(), ...change } });
    assert.equal(result.contributionCents, null); assert.equal(result.netProfitCents, null);
  }
  const result = computeMeritMargin(attempt(), { costs: { ...costs(), status: "operator_report" } });
  assert.equal(result.contributionKind, "estimated_recorded_components");
});

test("rounding uses integers and preserves a genuine zero percent fee", () => {
  const row = attempt(); row.snapshot.paymentRules.merchantProcessingExpense.rate = 0;
  const result = computeMeritMargin(row);
  assert.equal(result.processorExpenseCents, 0); assert.equal(result.merchantFeeBurdenCents, -300);
  const tiny = attempt(); tiny.amount_cents = 17; tiny.snapshot.total = .17; tiny.snapshot.shipping = 0;
  tiny.snapshot.customerCardSurcharge = 0; tiny.snapshot.customerCardSurchargeBps = 0; tiny.snapshot.paymentRules.customerCardSurcharge.rate = 0;
  tiny.snapshot.paymentRules.merchantProcessingExpense.rate = 300;
  assert.equal(computeMeritMargin(tiny).processorExpenseCents, 1); // 0.51 cents rounds up.
});

test("private source strings and provider secrets are never copied into the computed result", () => {
  const row = attempt(); row.client_secret = "must-not-return-secret"; row.snapshot.email = "private@example.invalid";
  row.snapshot.paymentRules.merchantProcessingExpense.source = "private-agreement-reference";
  const serialized = JSON.stringify(computeMeritMargin(row));
  assert.doesNotMatch(serialized, /must-not-return-secret|private@example|private-agreement-reference|paymentRules/);
});

test("mixed credit order preserves full value and estimates processing on card charge only", () => {
  const row = attempt();
  row.amount_cents = 1030;
  row.credit_reserved_cents = 5000;
  Object.assign(row.snapshot, { total: 10.30, storeCreditUsed: 50, shipping: 20, customerCardSurcharge: .30 });
  const result = computeMeritMargin(row);
  assert.equal(result.status, 'estimated_fee_known');
  assert.equal(result.orderValueCents, 6030);
  assert.equal(result.storeCreditUsedCents, 5000);
  assert.equal(result.chargedAmountCents, 1030);
  assert.equal(result.processorExpenseCents, 77);
  assert.equal(result.merchantFeeBurdenCents, 47);
  assert.equal(result.customerShippingCollectedCents, 2000);
  const withCosts = computeMeritMargin(row, { costs: costs() });
  assert.equal(withCosts.contributionCents, null);
  assert.equal(withCosts.contributionKind, 'store_credit_funding_unknown');
  assert.equal(withCosts.netProfitCents, null);
  row.snapshot.paymentRules.merchantProcessingExpense.basis = null;
  const unknown = computeMeritMargin(row);
  assert.equal(unknown.orderValueCents, 6030);
  assert.equal(unknown.processorExpenseCents, null);
  assert.equal(unknown.merchantFeeBurdenCents, null);
});


test("mixed credit margin excludes missing or mismatched private reservations", () => {
  const row = attempt(); row.amount_cents = 1030;
  Object.assign(row.snapshot, { total: 10.30, storeCreditUsed: 50, shipping: 20, customerCardSurcharge: .30 });
  for (const held of [undefined, null, 0, 4999, 5001]) {
    row.credit_reserved_cents = held;
    assert.equal(computeMeritMargin(row).status, "unavailable");
  }
});
