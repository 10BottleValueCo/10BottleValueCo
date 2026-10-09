import test from "node:test";
import assert from "node:assert/strict";
import { createMeritStore } from "./_merit-storage.js";
const env = { SUPABASE_URL: "https://test.invalid/", SUPABASE_SERVICE_ROLE_KEY: "private-unit-test-key" };

test("customer lookup restricts both order and validated account id", async () => {
  let call;
  const store = createMeritStore({ env, fetcher: async (...args) => { call = args; return Response.json([{ id: "attempt" }]); } });
  assert.deepEqual(await store.findByOrder("INV-TEST", "customer-id"), { id: "attempt" });
  const url = new URL(call[0]);
  assert.equal(url.searchParams.get("order_id"), "eq.INV-TEST");
  assert.equal(url.searchParams.get("customer_id"), "eq.customer-id");
  assert.equal(call[1].headers.Authorization, "Bearer private-unit-test-key");
});

test("missing and ambiguous rows are distinguished", async () => {
  const empty = createMeritStore({ env, fetcher: async () => Response.json([]) });
  assert.equal(await empty.findByIntent("pi_test"), null);
  for (const body of [{}, [{ id: "one" }, { id: "two" }]]) {
    const store = createMeritStore({ env, fetcher: async () => Response.json(body) });
    await assert.rejects(store.findByIntent("pi_test"), { status: 503 });
  }
});

test("RPC request does not disclose database errors", async () => {
  const store = createMeritStore({ env, fetcher: async () => Response.json({ message: "private-unit-test-key full customer details" }, { status: 400 }) });
  await assert.rejects(store.reserve({}), error => error.status === 503 && !error.message.includes("private-unit-test-key") && !error.message.includes("customer details"));
});

test("missing server configuration never makes an unauthenticated database call", async () => {
  let calls = 0;
  const store = createMeritStore({ env: {}, fetcher: async () => { calls++; } });
  await assert.rejects(store.findByIntent("pi_test"), { status: 503 });
  assert.equal(calls, 0);
});

test("readiness verifies empty private-table access and all RPC definitions without customer rows", async () => {
  const calls = [];
  const schema = { paths: Object.fromEntries(["reserve_merit_checkout", "bind_merit_checkout", "finalize_merit_checkout"].map(name => [`/rpc/${name}`, { post: {} }])) };
  const store = createMeritStore({ env, fetcher: async (url, options) => {
    calls.push([url, options]);
    return Response.json(url.endsWith("/rest/v1/") ? schema : []);
  } });
  assert.equal(await store.ready(), true);
  assert.equal(await store.ready(), true);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(([, options]) => options.method === "GET"));
  assert.equal(new URL(calls.find(([url]) => url.includes("merit_payment_attempts"))[0]).searchParams.get("limit"), "0");
  const unavailable = createMeritStore({ env, fetcher: async url => Response.json(url.endsWith("/rest/v1/") ? { paths: {} } : []) });
  await assert.rejects(unavailable.ready(), { status: 503 });
});
