import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSupplierCostConfig } from "../api/_supplier-cost-config.js";
import { calculateOrderContribution } from "../artifacts/10-bottle-value/src/order-contribution.js";
import handler from "../api/admin-cost-config.js";

// Synthetic fixtures only: these are not merchant prices or contracted fees.
const fixture = {
  version: "fixture-v1", effectiveAt: "2026-10-01T00:00:00Z", currency: "USD",
  worldwide: { "Fixture product|5mg": 12 }, us: {},
  supplierShipping: { standard: 3, express: 7, us: 0 },
  processingFees: { "fixture provider": { percent: 0.05, fixed: 0.3 } },
};
const order = {
  id: "TEST-only", total: 100, currency: "USD", paidAt: "2026-10-07T12:00:00Z",
  items: [{ name: "Fixture product", dose: "5 mg", quantity: 2, price: 50 }],
  paymentProvider: "Fixture Provider", shippingType: "standard",
};

test("private config requires an explicit schedule with finite nonnegative values", () => {
  assert.ok(parseSupplierCostConfig(JSON.stringify(fixture)));
  for (const invalid of [undefined, "{}", "not-json", JSON.stringify({ ...fixture, currency: "EUR" }), JSON.stringify({ ...fixture, worldwide: { "Fixture|5mg": -1 } }), JSON.stringify({ ...fixture, processingFees: { x: { percent: 2, fixed: 0 } } }), JSON.stringify({ ...fixture, effectiveAt: "yesterday" })]) {
    assert.equal(parseSupplierCostConfig(invalid), null);
  }
});

test("missing/private or future cost schedule cannot become zero cost/profit", () => {
  const missing = calculateOrderContribution(order, null);
  assert.equal(missing.profit, null);
  assert.equal(missing.totalCogs, null);
  assert.equal(missing.lines[0].unitCost, null);
  const historic = calculateOrderContribution({ ...order, paidAt: "2026-09-01T00:00:00Z" }, fixture);
  assert.equal(historic.profit, null);
  const unknownProvider = calculateOrderContribution({ ...order, paymentProvider: "unknown" }, fixture);
  assert.equal(unknownProvider.paymentFee, null);
  assert.equal(unknownProvider.profit, null);
});

test("configured fee includes fixed amount and draft scenarios do not mutate orders", () => {
  const before = JSON.stringify(order);
  const result = calculateOrderContribution(order, fixture);
  assert.equal(result.cogs, 24);
  assert.equal(result.paymentFee, 5.3);
  assert.equal(result.profit, 67.7);
  const scenario = calculateOrderContribution(order, fixture, { lineCosts: { 0: 10 }, supplierShipping: 2 });
  assert.equal(scenario.profit, 82.7);
  assert.equal(scenario.isScenario, true);
  assert.equal(JSON.stringify(order), before);
  assert.equal(calculateOrderContribution({ ...order, currency: "EUR" }, fixture).profit, null);
});

test("shipping thresholds require explicit basis and exact-boundary behavior", () => {
  const rule = { basis: "productSubtotalBeforeDiscounts", tiers: [
    { min: 0, minInclusive: true, amount: 11 },
    { min: 50, minInclusive: false, amount: 4 },
    { min: 100, minInclusive: true, amount: 0 },
  ] };
  const config = { ...fixture, supplierShipping: { ...fixture.supplierShipping, standard: rule } };
  assert.ok(parseSupplierCostConfig(JSON.stringify(config)));
  for (const [subtotal, expected] of [[49, 11], [50, 11], [50.01, 4], [99.99, 4], [100, 0]]) {
    assert.equal(calculateOrderContribution({ ...order, subtotal }, config).supplierShipping, expected);
  }
  assert.equal(calculateOrderContribution(order, config).supplierShipping, null);
  const supplierBasis = { ...config, supplierShipping: { standard: { ...rule, basis: "supplierProductCost" } } };
  assert.equal(calculateOrderContribution({ ...order, subtotal: 1000 }, supplierBasis).supplierShipping, 11);
  assert.equal(parseSupplierCostConfig(JSON.stringify({ ...config, supplierShipping: { standard: { ...rule, basis: "ambiguous" } } })), null);
  assert.equal(parseSupplierCostConfig(JSON.stringify({ ...config, supplierShipping: { standard: { ...rule, tiers: [{ min: 0, amount: 1 }] } } })), null);
});

test("mixed-warehouse shipping stays unknown and affiliate adjustments deduct commission", () => {
  const mixed = { ...order, affiliateCode: "FIXTURE", affiliateCommission: 8, affiliateCommissionAdjustment: 3,
    items: [...order.items, { ...order.items[0], fromWarehouse: "us" }] };
  const mixedConfig = { ...fixture, us: fixture.worldwide };
  const result = calculateOrderContribution(mixed, mixedConfig);
  assert.equal(result.supplierShipping, null);
  assert.equal(result.profit, null);
  assert.equal(result.affiliatePayout, 5);
  assert.equal(calculateOrderContribution(mixed, mixedConfig, { supplierShipping: 9 }).supplierShipping, 9);
  assert.equal(calculateOrderContribution({ ...mixed, affiliateCommission: undefined }, mixedConfig).affiliatePayout, null);
});

test("recorded costs survive schedule changes; malformed values cannot silently become zero", () => {
  const recorded = { ...order, lineCostOverrides: { 0: 25 }, supplierShippingOverride: 8, actualPaymentFee: 4 };
  assert.equal(calculateOrderContribution(recorded, null).profit, 63);
  assert.equal(calculateOrderContribution(recorded, { ...fixture, effectiveAt: "2027-01-01T00:00:00Z" }).profit, 63);
  for (const invalid of [false, true, [], {}, " "]) {
    assert.equal(calculateOrderContribution({ ...recorded, actualPaymentFee: invalid }, null).profit, null);
    assert.equal(calculateOrderContribution({ ...recorded, total: invalid }, null).profit, null);
  }
});

test("cost API rejects anonymous/nonadmin access and never caches private values", async () => {
  const priorFetch = globalThis.fetch;
  const names = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "ADMIN_USER_IDS", "ADMIN_EMAILS", "SUPPLIER_COSTS_JSON"];
  const old = Object.fromEntries(names.map(name => [name, process.env[name]]));
  process.env.SUPABASE_URL = "https://fixture.invalid";
  process.env.SUPABASE_ANON_KEY = "fixture-only";
  process.env.ADMIN_USER_IDS = "";
  process.env.ADMIN_EMAILS = "owner@example.test";
  process.env.SUPPLIER_COSTS_JSON = JSON.stringify(fixture);
  let fetched = 0;
  let email = "customer@example.test";
  globalThis.fetch = async () => {
    fetched += 1;
    return { ok: true, json: async () => ({ id: "fixture-user", email, email_confirmed_at: "2026-01-01T00:00:00Z" }) };
  };
  const response = () => ({ code: null, body: null, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
  try {
    const anonymous = response();
    await handler({ method: "GET", headers: {} }, anonymous);
    assert.equal(anonymous.code, 401);
    assert.equal(fetched, 0);
    assert.equal(anonymous.body.config, undefined);
    const customer = response();
    await handler({ method: "GET", headers: { authorization: "Bearer fixture" } }, customer);
    assert.equal(customer.code, 403);
    assert.equal(customer.body.config, undefined);
    email = "owner@example.test";
    const admin = response();
    await handler({ method: "GET", headers: { authorization: "Bearer fixture" } }, admin);
    assert.equal(admin.code, 200);
    assert.equal(admin.body.config.worldwide["Fixture product|5mg"], 12);
    assert.match(admin.headers["cache-control"], /no-store/);
    delete process.env.SUPPLIER_COSTS_JSON;
    const missing = response();
    await handler({ method: "GET", headers: { authorization: "Bearer fixture" } }, missing);
    assert.equal(missing.code, 503);
    assert.equal(missing.body.config, undefined);
  } finally {
    globalThis.fetch = priorFetch;
    for (const name of names) old[name] === undefined ? delete process.env[name] : process.env[name] = old[name];
  }
});
