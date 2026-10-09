import assert from "node:assert/strict";
import { test } from "node:test";
import handler from "./supabase/affiliate-orders.js";

const adminId = "a0000000-0000-4000-8000-000000000001";
const customerId = "a0000000-0000-4000-8000-000000000002";
const confirmedAt = "2026-01-01T00:00:00Z";
const admin = { id: adminId, email: "support@10bottlevalue.co", email_confirmed_at: confirmedAt };
const customer = { id: customerId, email: "buyer@example.test", email_confirmed_at: confirmedAt };
const payload = { order_id: "INV-FIXTURE", affiliate_code: "FIXTURE", commission_amount: 10, shipping_type: "standard" };

function fixture(t, { user = customer, authStatus = 200, configuredAdminIds = "" } = {}) {
  const keys = ["SUPABASE_URL", "VITE_SUPABASE_URL", "SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_EMAILS", "ADMIN_USER_IDS"];
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, { SUPABASE_URL: "https://auth.fixture.test", SUPABASE_ANON_KEY: "synthetic-anon",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service", ADMIN_USER_IDS: configuredAdminIds });
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    calls.push({ url, options });
    if (url.origin === "https://auth.fixture.test" && url.pathname === "/auth/v1/user") {
      assert.equal(options.headers.apikey, "synthetic-anon");
      assert.equal(options.headers.Authorization, "Bearer synthetic-user-token");
      return new Response(JSON.stringify(user), { status: authStatus });
    }
    assert.equal(url.origin, "https://danpkqqzcptamojrnrmk.supabase.co");
    assert.equal(url.pathname, "/rest/v1/affiliate_orders");
    return new Response(null, { status: 201 });
  };
  t.after(() => {
    globalThis.fetch = previousFetch;
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  });
  return calls;
}

async function invoke({ method = "POST", authorization = "Bearer synthetic-user-token", body = payload, headers = {} } = {}) {
  const response = { statusCode: 200, headers: {}, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; } };
  await handler({ method, body, headers: { ...headers, ...(authorization ? { authorization } : {}) } }, response);
  assert.equal(response.headers["Cache-Control"], "no-store");
  return response;
}

test("anonymous affiliate-ledger POST is rejected before any service request", async t => {
  const calls = fixture(t);
  assert.equal((await invoke({ authorization: "" })).statusCode, 401);
  assert.equal(calls.length, 0);
});

test("confirmed non-admin cannot insert a commission through the service key", async t => {
  const calls = fixture(t);
  assert.equal((await invoke()).statusCode, 403);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.pathname, "/auth/v1/user");
});

test("forged support identity in body, headers and user metadata grants no access", async t => {
  const calls = fixture(t, { user: { ...customer, user_metadata: { email: admin.email, role: "admin", isAdmin: true } } });
  const response = await invoke({ body: { ...payload, email: admin.email, role: "admin", user: admin },
    headers: { "x-user-email": admin.email, "x-admin": "true" } });
  assert.equal(response.statusCode, 403);
  assert.equal(calls.length, 1);
});

test("unconfirmed support email is denied even with a generic confirmed_at value", async t => {
  const calls = fixture(t, { user: { ...admin, email_confirmed_at: null, confirmed_at: confirmedAt } });
  assert.equal((await invoke()).statusCode, 403);
  assert.equal(calls.length, 1);
});

test("configured admin ID still requires actual email confirmation for financial writes", async t => {
  const calls = fixture(t, { user: { ...admin, email_confirmed_at: null }, configuredAdminIds: adminId });
  assert.equal((await invoke()).statusCode, 403);
  assert.equal(calls.length, 1);
});

test("a rejected session cannot be promoted by a claimed support response body", async t => {
  const calls = fixture(t, { user: admin, authStatus: 401 });
  assert.equal((await invoke()).statusCode, 401);
  assert.equal(calls.length, 1);
});

test("authentication outage fails closed without attempting a service write", async t => {
  const calls = fixture(t, { user: admin, authStatus: 503 });
  assert.equal((await invoke()).statusCode, 503);
  assert.equal(calls.length, 1);
});

test("confirmed server-recognized admin keeps the existing insert and duplicate semantics", async t => {
  const calls = fixture(t, { user: admin });
  const response = await invoke();
  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, { ok: true });
  assert.equal(calls.length, 2);
  const write = calls[1];
  assert.equal(write.options.method, "POST");
  assert.equal(write.url.searchParams.get("on_conflict"), "order_id");
  assert.equal(write.options.headers.Prefer, "resolution=ignore-duplicates,return=minimal");
  assert.equal(write.options.headers.apikey, "synthetic-service");
  assert.equal(write.options.headers.Authorization, "Bearer synthetic-service");
  assert.deepEqual(JSON.parse(write.options.body), payload);
});

test("unsupported method remains 405 without authenticating or writing", async t => {
  const calls = fixture(t, { user: admin });
  const response = await invoke({ method: "GET" });
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, "POST");
  assert.equal(calls.length, 0);
});
