import test from "node:test";
import assert from "node:assert/strict";
import { ServerResponse } from "node:http";
import accessHandler from "../api/admin-operations-access.js";
import eventsHandler from "../api/admin-operations-events.js";
import { boundedAuth, checkOperationsAccess, sessionIdentity, signInOperations } from "../artifacts/10-bottle-value/src/operations-auth.js";

const session = { access_token: "synthetic-token", user: { id: "owner-id", email: "owner@example.invalid" } };
const admin = { ...session.user, email_confirmed_at: "2026-01-01T00:00:00Z", user_metadata: { private: "must not return" } };
const response = () => ({ statusCode: 200, headers: {}, ended: false, setHeader(key, value) { if (this.ended) throw new Error("ERR_HTTP_HEADERS_SENT"); this.headers[key] = value; }, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; this.ended = true; return this; } });

test("new routes deny anonymous requests without writing after real HTTP response completion", async () => {
  for (const handler of [accessHandler, eventsHandler]) {
    const res = new ServerResponse({ method: "GET" });
    res.status = function (value) { this.statusCode = value; return this; };
    res.json = function (body) { this.setHeader("Content-Type", "application/json"); this.end(JSON.stringify(body)); return this; };
    try {
      await handler({ method: "GET", headers: {}, query: {} }, res);
      assert.equal(res.statusCode, 401); assert.equal(res.writableEnded, true);
      assert.match(res.getHeader("Cache-Control"), /no-store/); assert.equal(res.getHeader("Vary"), "Authorization");
    } finally { res.destroy(); }
  }
});

test("server roster gates each new route, ignores client metadata and honors configured IDs", async () => {
  const originalFetch = globalThis.fetch;
  const names = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_USER_IDS", "ADMIN_EMAILS"];
  const originals = Object.fromEntries(names.map(name => [name, process.env[name]]));
  Object.assign(process.env, { SUPABASE_URL: "https://database.invalid", SUPABASE_ANON_KEY: "synthetic-anon", SUPABASE_SERVICE_ROLE_KEY: "synthetic-service", ADMIN_USER_IDS: "", ADMIN_EMAILS: admin.email });
  let user = admin;
  let calls;
  globalThis.fetch = async url => {
    calls.push(String(url));
    return String(url).endsWith("/auth/v1/user") ? new Response(JSON.stringify(user)) : new Response("[]", { headers: { "Content-Range": "*/0" } });
  };
  try {
    for (const handler of [accessHandler, eventsHandler]) {
      for (const method of ["POST", "PATCH", "DELETE", "PUT"]) {
        calls = []; const res = response(); await handler({ method, headers: {}, query: {} }, res);
        assert.equal(res.statusCode, 405); assert.equal(calls.length, 0);
      }
      user = { ...admin, email: "customer@example.invalid", user_metadata: { role: "admin" } }; calls = [];
      let res = response(); await handler({ method: "GET", headers: { authorization: "Bearer test" }, query: {} }, res);
      assert.equal(res.statusCode, 403); assert.equal(calls.length, 1);
      user = admin; calls = []; res = response(); await handler({ method: "GET", headers: { authorization: "Bearer test" }, query: {} }, res);
      assert.equal(res.statusCode, 200); assert.equal(res.headers["Cache-Control"], "private, no-store");
      assert.equal(res.headers.Vary, "Authorization"); assert.ok(!JSON.stringify(res.body).includes("must not return"));
      process.env.ADMIN_USER_IDS = "another-id"; calls = []; res = response();
      await handler({ method: "GET", headers: { authorization: "Bearer test" }, query: {} }, res); assert.equal(res.statusCode, 403); assert.equal(calls.length, 1);
      process.env.ADMIN_USER_IDS = admin.id; user = { ...admin, email: "id-authorized@example.invalid" }; calls = []; res = response();
      await handler({ method: "GET", headers: { authorization: "Bearer test" }, query: {} }, res); assert.equal(res.statusCode, 200);
      process.env.ADMIN_USER_IDS = "";
    }
    user = admin; calls = []; const res = response();
    await eventsHandler({ method: "GET", headers: { authorization: "Bearer test" }, query: { days: ["7", "90"] } }, res);
    assert.equal(res.statusCode, 400); assert.equal(calls.length, 1);
  } finally { globalThis.fetch = originalFetch; for (const name of names) originals[name] === undefined ? delete process.env[name] : process.env[name] = originals[name]; }
});

test("access client verifies the response belongs to the current session", async () => {
  const result = await checkOperationsAccess(session, { fetcher: async (url, options) => {
    assert.equal(url, "/api/admin-operations-access"); assert.equal(options.headers.Authorization, "Bearer synthetic-token"); assert.equal(options.cache, "no-store");
    return new Response(JSON.stringify({ ok: true, user: session.user }));
  } });
  assert.deepEqual(result, session.user);
  for (const user of [{ ...session.user, id: "other" }, { ...session.user, email: "other@example.invalid" }]) await assert.rejects(checkOperationsAccess(session, { fetcher: async () => new Response(JSON.stringify({ ok: true, user })) }), error => error.code === "denied");
  for (const status of [401, 403]) await assert.rejects(checkOperationsAccess(session, { fetcher: async () => new Response("{}", { status }) }), error => error.code === "denied");
  assert.notEqual(sessionIdentity(session), sessionIdentity({ ...session, user: { ...session.user, id: "different-same-email" } }));
});

test("stalled auth work, JSON parsing and cancellation are bounded", async () => {
  await assert.rejects(boundedAuth(() => new Promise(() => {}), { timeoutMs: 5 }), error => error.code === "unavailable");
  await assert.rejects(checkOperationsAccess(session, { timeoutMs: 5, fetcher: async () => ({ ok: true, status: 200, json: () => new Promise(() => {}) }) }), error => error.code === "unavailable");
  const controller = new AbortController(); controller.abort();
  await assert.rejects(checkOperationsAccess(session, { signal: controller.signal, fetcher: () => { throw new Error("must not fetch"); } }), error => error.code === "cancelled");
});

test("password login remains default and email codes never create users", async () => {
  const calls = [];
  const supabase = { auth: {
    signInWithPassword: async value => { calls.push(["password", value]); return { data: { session } }; },
    signInWithOtp: async value => { calls.push(["code", value]); return { data: {} }; },
    verifyOtp: async value => { calls.push(["verify", value]); return { data: { session } }; },
  } };
  await signInOperations(supabase, { email: " OWNER@example.invalid ", password: "synthetic password" });
  assert.deepEqual(calls[0], ["password", { email: "owner@example.invalid", password: "synthetic password" }]);
  await assert.rejects(signInOperations(supabase, { email: session.user.email, method: "email_code" })); assert.equal(calls.length, 1);
  await signInOperations(supabase, { email: session.user.email, method: "email_code", emailCodeEnabled: true });
  assert.deepEqual(calls[1][1].options, { shouldCreateUser: false });
  await assert.rejects(signInOperations(supabase, { email: session.user.email, method: "verify_code", token: "123", emailCodeEnabled: true }));
  await signInOperations(supabase, { email: session.user.email, method: "verify_code", token: "123456", emailCodeEnabled: true });
  assert.equal(calls[2][1].type, "email");
});
