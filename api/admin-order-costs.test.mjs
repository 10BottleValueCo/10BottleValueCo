import assert from "node:assert/strict";
import test from "node:test";
import { createOrderCostHandler, createCostStorageClient } from "./admin-order-costs.js";
import { createOrderCostSaver } from "../artifacts/10-bottle-value/src/order-cost-overrides.js";

const copy = data => JSON.parse(JSON.stringify(data));
function fixture() {
  let row = { id: "fixture-order", items: [{}, {}], metadata: {
    items: [{ quantity: 2 }, { quantity: 1 }], status: "paid", notes: "keep this",
    lineCostOverrides: { 1: 50 }, supplierShippingOverride: 100,
  } };
  const requests = [];
  let denied = false, conflict = false;
  const fetcher = async (input, init) => {
    const url = new URL(input);
    assert.equal(url.pathname, "/rest/v1/orders");
    assert.equal(init.headers.apikey, "server-fixture-key");
    requests.push({ method: init.method, url: new URL(url), body: init.body && JSON.parse(init.body) });
    if (init.method === "PATCH") {
      if (denied) return Response.json({ code: "42501", message: "permission denied" }, { status: 403 });
      if (conflict) { row.metadata.otherChange = "preserved"; conflict = false; return Response.json([]); }
      assert.equal(url.searchParams.get("metadata"), "eq." + JSON.stringify(row.metadata));
      const body = JSON.parse(init.body);
      assert.deepEqual(Object.keys(body), ["metadata"]);
      row.metadata = body.metadata;
    }
    return Response.json([copy(row)]);
  };
  return {
    client: createCostStorageClient("https://fixture.invalid", "server-fixture-key", fetcher),
    get row() { return copy(row); }, requests,
    deny() { denied = true; }, allow() { denied = false; }, conflict() { conflict = true; },
  };
}
function response() {
  return { code: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}
const authorized = async () => true;
async function call(handler, body, method = "POST") {
  const res = response();
  await handler({ method, headers: { authorization: "Bearer fixture-admin-session" }, body }, res);
  return res;
}

test("authorized server saves shipping and line costs, preserves history and verifies returned data", async () => {
  const db = fixture(), handler = createOrderCostHandler({ client: db.client, authorize: authorized });
  const shipping = await call(handler, { orderId: "fixture-order", kind: "shipping", amount: 40 });
  assert.equal(shipping.code, 200);
  assert.equal(shipping.body.order.metadata.supplierShippingOverride, 40);
  const line = await call(handler, { orderId: "fixture-order", kind: "line", index: 0, amount: 300.5 });
  assert.equal(line.code, 200);
  assert.deepEqual(db.row.metadata.lineCostOverrides, { 0: 300.5, 1: 50 });
  assert.equal(db.row.metadata.supplierShippingOverride, 40);
  assert.equal(db.row.metadata.notes, "keep this");
  assert.equal(db.row.metadata.status, "paid");
  assert.equal(JSON.stringify(line.body).includes("server-fixture-key"), false);
});

test("server refuses unauthenticated requests without touching storage", async () => {
  const db = fixture();
  const handler = createOrderCostHandler({ client: db.client, authorize: async (_req, res) => {
    res.status(401).json({ ok: false, error: "Authentication required" }); return false;
  } });
  const result = await call(handler, { orderId: "fixture-order", kind: "shipping", amount: 40 });
  assert.equal(result.code, 401); assert.equal(db.requests.length, 0);
});

test("real authorization accepts verified admins, rejects customers and spoofed browser permissions", async () => {
  const original = globalThis.fetch;
  try {
    for (const { user, status } of [
      { user: { id: "customer", email: "customer@example.test", email_confirmed_at: "2026-01-01" }, status: 403 },
      { user: { id: "admin", email: "support@10bottlevalue.co", email_confirmed_at: null }, status: 403 },
      { user: { id: "admin", email: "support@10bottlevalue.co", email_confirmed_at: "2026-01-01" }, status: 200 },
    ]) {
      globalThis.fetch = async input => {
        assert.equal(new URL(input).pathname, "/auth/v1/user");
        return Response.json(user);
      };
      const db = fixture(), handler = createOrderCostHandler({ client: db.client });
      const result = await call(handler, { orderId: "fixture-order", kind: "shipping", amount: 40, isAdmin: true });
      assert.equal(result.code, status);
      assert.equal(db.requests.length, status === 200 ? 2 : 0);
    }
  } finally { globalThis.fetch = original; }
});

test("server validates input and existing item index; never changes status or other submitted columns", async () => {
  const db = fixture(), handler = createOrderCostHandler({ client: db.client, authorize: authorized });
  for (const change of [
    { kind: "shipping", amount: -1 },
    { kind: "line", index: 999, amount: 40 },
    { kind: "status", amount: 40 },
  ]) assert.equal((await call(handler, { orderId: "fixture-order", ...change })).code, 400);
  assert.equal(db.requests.filter(x => x.method === "PATCH").length, 0);
  const result = await call(handler, { orderId: "fixture-order", kind: "shipping", amount: 0, metadata: { status: "refunded" } });
  assert.equal(result.code, 200); assert.equal(db.row.metadata.status, "paid");
  assert.equal((await call(handler, {}, "GET")).code, 405);
});

test("concurrent metadata edits are preserved; database failures cannot report Saved", async () => {
  const db = fixture(), handler = createOrderCostHandler({ client: db.client, authorize: authorized });
  db.conflict();
  assert.equal((await call(handler, { orderId: "fixture-order", kind: "shipping", amount: 40 })).code, 200);
  assert.equal(db.row.metadata.otherChange, "preserved");
  db.deny();
  const result = await call(handler, { orderId: "fixture-order", kind: "shipping", amount: 10 });
  assert.equal(result.code, 503); assert.equal(result.body.ok, false);
  assert.match(result.body.error, /42501/);
  assert.equal(db.row.metadata.supplierShippingOverride, 40);
});

test("browser sends its session to the server, not database PATCHes; reload and Retry use confirmed data", async () => {
  const db = fixture(), handler = createOrderCostHandler({ client: db.client, authorize: authorized });
  const client = { auth: { getSession: async () => ({ data: { session: { access_token: "fixture-admin-session" } } }) } };
  const save = createOrderCostSaver(client, { endpoint: "/api/admin-order-costs", fetch: async (url, init) => {
    assert.equal(url, "/api/admin-order-costs");
    assert.equal(init.method, "POST");
    assert.equal(init.headers.Authorization, "Bearer fixture-admin-session");
    assert.equal(init.headers.apikey, undefined);
    assert.equal(init.body.includes("server-fixture-key"), false);
    const res = await call(handler, JSON.parse(init.body));
    return Response.json(res.body, { status: res.code });
  } });
  const saved = await save("fixture-order", { kind: "shipping", amount: 40 });
  assert.equal(saved.metadata.supplierShippingOverride, 40);
  const reloaded = await db.client.from("orders").select("id,metadata,items").eq("id", "fixture-order").single();
  assert.equal(reloaded.data.metadata.supplierShippingOverride, 40);
  db.deny();
  await assert.rejects(save("fixture-order", { kind: "shipping", amount: 10 }), /42501/);
  assert.equal(db.row.metadata.supplierShippingOverride, 40);
  db.allow();
  assert.equal((await save("fixture-order", { kind: "shipping", amount: 10 })).metadata.supplierShippingOverride, 10);
});

test("browser rejects missing session and unverified server acknowledgement", async () => {
  let calls = 0;
  const guest = createOrderCostSaver({ auth: { getSession: async () => ({ data: { session: null } }) } },
    { fetch: async () => { calls++; } });
  await assert.rejects(guest("fixture-order", { kind: "shipping", amount: 40 }), /Sign in/);
  assert.equal(calls, 0);
  const client = { auth: { getSession: async () => ({ data: { session: { access_token: "fixture" } } }) } };
  const save = createOrderCostSaver(client, { fetch: async () => Response.json({ ok: true,
    order: { id: "fixture-order", metadata: { supplierShippingOverride: 100 } } }) });
  await assert.rejects(save("fixture-order", { kind: "shipping", amount: 40 }), /could not be verified/);
});
