import assert from "node:assert/strict";
import test from "node:test";
import { createOrderCostHandler, createCostStorageClient } from "./admin-order-costs.js";
import { createOrderCostSaver, loadOrderCostOverrides } from "../artifacts/10-bottle-value/src/order-cost-overrides.js";

const copy = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const order = Object.freeze({ id: "fixture-order", status: "paid", paymentProvider: "Merit", total: 1903.34,
    metadata: { status: "paid", paymentId: "protected-payment", items: [{ quantity: 2 }, { quantity: 1 }] } });
  let cost = { order_id: order.id, line_cost_overrides: { 1: 50 }, supplier_shipping_override: 100 };
  let denied = false;
  const requests = [];
  const fetcher = async (input, init) => {
    const url = new URL(input);
    assert.equal(init.headers.apikey, "server-fixture-key");
    assert.notEqual(url.pathname, "/rest/v1/orders", "Payment records must never be written");
    requests.push({ url, method: init.method || "GET", body: init.body && JSON.parse(init.body) });
    if (denied) return Response.json({ code: "42501" }, { status: 403 });
    if (url.pathname === "/rest/v1/order_cost_overrides") {
      assert.equal(init.method || "GET", "GET");
      return Response.json([copy(cost)]);
    }
    assert.equal(url.pathname, "/rest/v1/rpc/save_order_cost_override");
    assert.equal(init.method, "POST");
    const body = JSON.parse(init.body);
    assert.deepEqual(Object.keys(body).sort(), ["p_amount", "p_kind", "p_line_index", "p_order_id"]);
    if (body.p_order_id !== order.id) return Response.json({ code: "P0002" }, { status: 400 });
    if (body.p_kind === "line" && body.p_line_index >= order.metadata.items.length) {
      return Response.json({ code: "22023" }, { status: 400 });
    }
    cost = { ...cost, ...(body.p_kind === "line"
      ? { line_cost_overrides: { ...cost.line_cost_overrides, [body.p_line_index]: body.p_amount } }
      : { supplier_shipping_override: body.p_amount }) };
    return Response.json(copy(cost));
  };
  return {
    client: createCostStorageClient("https://fixture.invalid", "server-fixture-key", fetcher),
    get cost() { return copy(cost); }, order, requests,
    deny() { denied = true; }, allow() { denied = false; },
  };
}
function response() {
  return { code: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}
async function call(handler, body, method = "POST", query = {}) {
  const res = response();
  await handler({ method, headers: { authorization: "Bearer fixture-admin" }, body, query }, res);
  return res;
}
const authorize = async () => true;

test("Merit costs are saved separately without any payment/order mutation", async () => {
  const db = fixture(), before = JSON.stringify(db.order);
  const handler = createOrderCostHandler({ client: db.client, authorize });
  const shipping = await call(handler, { orderId: db.order.id, kind: "shipping", amount: 40 });
  assert.equal(shipping.code, 200);
  assert.equal(shipping.body.order.metadata.supplierShippingOverride, 40);
  const line = await call(handler, { orderId: db.order.id, kind: "line", index: 0, amount: 300.5 });
  assert.equal(line.code, 200);
  assert.deepEqual(line.body.order.metadata.lineCostOverrides, { 0: 300.5, 1: 50 });
  assert.equal(line.body.order.metadata.supplierShippingOverride, 40);
  assert.equal(JSON.stringify(db.order), before);
  assert.equal(JSON.stringify(line.body).includes("server-fixture-key"), false);
});

test("guests cannot read or write costs; authorization precedes all database calls", async () => {
  const db = fixture();
  const handler = createOrderCostHandler({ client: db.client, authorize: async (_req, res) => {
    res.status(401).json({ ok: false, error: "Authentication required" }); return false;
  } });
  for (const method of ["POST", "GET"]) assert.equal((await call(handler, {}, method)).code, 401);
  assert.equal(db.requests.length, 0);
});

test("real admin authorization rejects customer and unverified sessions for reads and writes", async () => {
  const original = globalThis.fetch;
  try {
    for (const [user, expected] of [
      [{ email: "customer@example.test", email_confirmed_at: "2026-01-01" }, 403],
      [{ email: "support@10bottlevalue.co" }, 403],
      [{ email: "support@10bottlevalue.co", email_confirmed_at: "2026-01-01" }, 200],
    ]) {
      globalThis.fetch = async input => {
        assert.equal(new URL(input).pathname, "/auth/v1/user"); return Response.json(user);
      };
      const db = fixture(), handler = createOrderCostHandler({ client: db.client });
      for (const method of ["GET", "POST"]) {
        const res = await call(handler, { orderId: db.order.id, kind: "shipping", amount: 40, isAdmin: true }, method);
        assert.equal(res.code, expected);
      }
      assert.equal(db.requests.length, expected === 200 ? 2 : 0);
    }
  } finally { globalThis.fetch = original; }
});

test("invalid input, missing orders and absent item indexes fail explicitly", async () => {
  const db = fixture(), handler = createOrderCostHandler({ client: db.client, authorize });
  for (const change of [{ kind: "shipping", amount: -1 }, { kind: "status", amount: 40 }, { kind: "line", index: 999, amount: 40 }]) {
    assert.equal((await call(handler, { orderId: db.order.id, ...change })).code, 400);
  }
  assert.equal((await call(handler, { orderId: "missing-order", kind: "shipping", amount: 40 })).code, 404);
  assert.equal((await call(handler, {}, "GET", { cursor: ["bad"] })).code, 400);
  assert.equal((await call(handler, {}, "DELETE")).code, 405);
  const zero = await call(handler, { orderId: db.order.id, kind: "shipping", amount: 0, metadata: { status: "refunded" } });
  assert.equal(zero.code, 200); assert.equal(zero.body.order.metadata.supplierShippingOverride, 0);
  assert.equal(db.order.status, "paid");
});

test("RPC failures and unverified acknowledgements never report successful saves", async () => {
  const db = fixture(), handler = createOrderCostHandler({ client: db.client, authorize });
  db.deny();
  const failed = await call(handler, { orderId: db.order.id, kind: "shipping", amount: 40 });
  assert.equal(failed.code, 503); assert.match(failed.body.error, /42501/);
  assert.equal(db.cost.supplier_shipping_override, 100);
  const bad = createOrderCostHandler({ authorize, client: { save: async () => db.cost } });
  assert.equal((await call(bad, { orderId: db.order.id, kind: "shipping", amount: 40 })).code, 503);
});

test("browser saves, reloads private costs, retries failed writes and preserves independent line edits", async () => {
  const db = fixture(), handler = createOrderCostHandler({ client: db.client, authorize });
  const client = { auth: { getSession: async () => ({ data: { session: { access_token: "fixture-admin" } } }) } };
  const options = { endpoint: "/api/admin-order-costs", fetch: async (url, init) => {
    assert.equal(init.headers.Authorization, "Bearer fixture-admin");
    assert.equal(init.headers.apikey, undefined);
    const parsed = new URL(url, "https://fixture.invalid");
    const res = await call(handler, init.body && JSON.parse(init.body), init.method, Object.fromEntries(parsed.searchParams));
    return Response.json(res.body, { status: res.code });
  } };
  const save = createOrderCostSaver(client, options);
  await Promise.all([
    save(db.order.id, { kind: "shipping", amount: 40 }),
    save(db.order.id, { kind: "line", index: 0, amount: 290 }),
  ]);
  const reloaded = await loadOrderCostOverrides(client, options);
  assert.deepEqual(reloaded[db.order.id], { supplierShippingOverride: 40, lineCostOverrides: { 0: 290, 1: 50 } });
  db.deny();
  await assert.rejects(save(db.order.id, { kind: "shipping", amount: 10 }), /42501/);
  await assert.rejects(loadOrderCostOverrides(client, options), /42501/);
  assert.equal(db.cost.supplier_shipping_override, 40);
  db.allow();
  assert.equal((await save(db.order.id, { kind: "shipping", amount: 10 })).metadata.supplierShippingOverride, 10);
});

test("GET pages include every saved record and do not leak full order metadata", async () => {
  const rows = Array.from({ length: 501 }, (_, i) => ({
    order_id: `order-${String(i).padStart(4, "0")}`, line_cost_overrides: {}, supplier_shipping_override: 40,
  }));
  const storage = createCostStorageClient("https://fixture.invalid", "key", async input => {
    const url = new URL(input), cursor = url.searchParams.get("order_id")?.slice(3);
    return Response.json(rows.filter(r => !cursor || r.order_id > cursor).slice(0, 500));
  });
  const handler = createOrderCostHandler({ authorize, client: storage });
  const client = { auth: { getSession: async () => ({ data: { session: { access_token: "fixture" } } }) } };
  const costs = await loadOrderCostOverrides(client, { fetch: async url => {
    const res = await call(handler, null, "GET", Object.fromEntries(new URL(url, "https://fixture.invalid").searchParams));
    return Response.json(res.body, { status: res.code });
  } });
  assert.equal(Object.keys(costs).length, 501);
  assert.deepEqual(Object.keys(costs["order-0500"]).sort(), ["lineCostOverrides", "supplierShippingOverride"]);
});
