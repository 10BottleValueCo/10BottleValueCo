import assert from "node:assert/strict";
import { test } from "node:test";
import handler from "./affiliate-payouts.js";

const admin = { id: "a0000000-0000-4000-8000-000000000001", email: "support@10bottlevalue.co", email_confirmed_at: "2026-01-01T00:00:00Z" };
const customer = { id: "a0000000-0000-4000-8000-000000000002", email: "buyer@example.test", email_confirmed_at: "2026-01-01T00:00:00Z" };

function fixture(t, { user = admin, authStatus = 200, payouts = [] } = {}) {
  const keys = ["SUPABASE_URL", "VITE_SUPABASE_URL", "SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, { SUPABASE_URL: "https://payout.fixture.test", SUPABASE_ANON_KEY: "synthetic-anon", SUPABASE_SERVICE_ROLE_KEY: "synthetic-service" });
  const previousFetch = globalThis.fetch, calls = [];
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://payout.fixture.test");
    calls.push({ url, options });
    if (url.pathname === "/auth/v1/user") {
      assert.equal(options.headers.apikey, "synthetic-anon");
      assert.equal(options.headers.Authorization, "Bearer synthetic-session");
      return new Response(JSON.stringify(user), { status: authStatus });
    }
    assert.equal(url.pathname, "/rest/v1/affiliate_payouts");
    assert.equal(options.headers.Authorization, "Bearer synthetic-service");
    if (options.method === "POST") return new Response(null, { status: 201 });
    return new Response(JSON.stringify(payouts));
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

async function invoke(method = "POST", { authorization = "Bearer synthetic-session", body = { affiliate_code: "fixture", amount: 12.34 } } = {}) {
  const res = { statusCode: 200, headers: {}, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; } };
  await handler({ method, headers: authorization ? { authorization } : {}, body }, res);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.equal(res.headers.Vary, "Authorization");
  return res;
}

test("payout list and insert reject anonymous requests before storage access", async t => {
  const calls = fixture(t);
  for (const method of ["GET", "POST"]) assert.equal((await invoke(method, { authorization: "" })).statusCode, 401);
  assert.equal(calls.length, 0);
});

test("payout list and insert reject a real confirmed non-admin despite forged support metadata", async t => {
  const calls = fixture(t, { user: { ...customer, user_metadata: { email: admin.email, role: "admin" } } });
  for (const method of ["GET", "POST"]) assert.equal((await invoke(method, { body: { email: admin.email, role: "admin", affiliate_code: "FIXTURE", amount: 20 } })).statusCode, 403);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.url.pathname === "/auth/v1/user"));
});

test("payout list and insert require email_confirmed_at for the actual support identity", async t => {
  const calls = fixture(t, { user: { ...admin, email_confirmed_at: null, confirmed_at: admin.email_confirmed_at } });
  for (const method of ["GET", "POST"]) assert.equal((await invoke(method)).statusCode, 403);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.url.pathname === "/auth/v1/user"));
});

test("payout authorization rejects a session refused by the authentication service", async t => {
  const calls = fixture(t, { user: admin, authStatus: 401 });
  assert.equal((await invoke()).statusCode, 401);
  assert.equal(calls.length, 1);
});

test("confirmed admin payout list preserves amounts without exposing unrelated columns", async t => {
  const calls = fixture(t, { payouts: [{ affiliate_code: "FIXTURE", amount: "12.34", note: "private fixture note" }] });
  const response = await invoke("GET");
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { payouts: [{ affiliate_code: "FIXTURE", amount: 12.34 }] });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url.searchParams.get("select"), "affiliate_code,amount");
});

test("confirmed admin can record the same normalized payout fields as before", async t => {
  const calls = fixture(t);
  const response = await invoke();
  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, { ok: true });
  const write = calls[1];
  assert.equal(write.options.method, "POST");
  assert.equal(write.options.headers.Prefer, "return=minimal");
  const body = JSON.parse(write.options.body);
  assert.equal(body.affiliate_code, "FIXTURE");
  assert.equal(body.amount, 12.34);
  assert.match(body.note, /^Admin payout \d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(Object.keys(body).sort(), ["affiliate_code", "amount", "note"]);
});

test("invalid payout amount still fails before a privileged insert", async t => {
  const calls = fixture(t);
  assert.equal((await invoke("POST", { body: { affiliate_code: "FIXTURE", amount: 0.001 } })).statusCode, 400);
  assert.equal(calls.length, 1);
});

test("unsupported payout methods remain unavailable", async t => {
  const calls = fixture(t);
  const response = await invoke("DELETE");
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, "GET, POST");
  assert.equal(calls.length, 0);
});
