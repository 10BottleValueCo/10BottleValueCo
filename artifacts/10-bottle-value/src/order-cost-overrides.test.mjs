import assert from "node:assert/strict";
import test from "node:test";
import { parseCostAmount, unitCostToLineCost, validateCostChange, createOrderCostSaver, loadOrderCostOverrides } from "./order-cost-overrides.js";

test("USD costs permit zero and commas, reject invalid precision, negatives and excess values", () => {
  assert.equal(parseCostAmount("40"), 40);
  assert.equal(parseCostAmount("40,25"), 40.25);
  assert.equal(parseCostAmount("0"), 0);
  for (const value of ["", "-1", "Infinity", "NaN", "40.001", "1000001", "1e3"]) assert.throws(() => parseCostAmount(value));
});
test("unit costs multiply by quantity with cent precision", () => {
  assert.equal(unitCostToLineCost(145, 2), 290);
  assert.equal(unitCostToLineCost(0.1, 3), 0.3);
  assert.equal(unitCostToLineCost(0, 2), 0);
  assert.throws(() => unitCostToLineCost(10, 0));
});
test("changes validate order IDs, kinds and line indexes", () => {
  assert.equal(validateCostChange("INV-1234ABCD", { kind: "shipping", amount: 40 }), 40);
  assert.throws(() => validateCostChange("bad/id", { kind: "shipping", amount: 40 }));
  assert.throws(() => validateCostChange("order", { kind: "line", index: -1, amount: 40 }));
});
test("missing session fails before any HTTP request", async () => {
  let count = 0;
  const guest = { auth: { getSession: async () => ({ data: { session: null } }) } };
  const options = { fetch: async () => { count++; } };
  await assert.rejects(createOrderCostSaver(guest, options)("order", { kind: "shipping", amount: 40 }), /Sign in/);
  await assert.rejects(loadOrderCostOverrides(guest, options), /Sign in/);
  assert.equal(count, 0);
});
test("a successful HTTP response with an incorrect stored value is rejected", async () => {
  const client = { auth: { getSession: async () => ({ data: { session: { access_token: "test" } } }) } };
  const save = createOrderCostSaver(client, { fetch: async () => Response.json({
    ok: true, order: { id: "order", metadata: { supplierShippingOverride: 100 } },
  }) });
  await assert.rejects(save("order", { kind: "shipping", amount: 40 }), /could not be verified/);
});
test("load failures and circular pagination cannot produce an empty successful fallback", async () => {
  const client = { auth: { getSession: async () => ({ data: { session: { access_token: "test" } } }) } };
  await assert.rejects(loadOrderCostOverrides(client, { fetch: async () => Response.json({ error: "offline" }, { status: 503 }) }), /offline/);
  await assert.rejects(loadOrderCostOverrides(client, { fetch: async () => Response.json({
    ok: true, orders: [], nextCursor: "repeat",
  }) }), /pagination/);
});
