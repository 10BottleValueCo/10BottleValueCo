import test from "node:test";
import assert from "node:assert/strict";
import { ServerResponse } from "node:http";
import handler from "../api/admin-operations-summary.js";
import { readOperationsSummary, operationsDays, OPERATIONS_PAGE_SIZE } from "../api/_admin-operations-summary.js";

const config = { url: "https://database.invalid", serviceKey: "synthetic-service-key" };
const now = new Date("2026-10-07T22:00:00.000Z");
const row = (index = 0, extra = {}) => ({
  id: `synthetic-order-${index}`, status: "paid", created_at: new Date(now.getTime() - 1_000 - index * 1_000).toISOString(),
  payment_id: "synthetic-provider-id", paid_at: "2026-10-07T21:59:00.000Z", total: "100.00", ...extra,
});
const page = (rows, total = rows.length, offset = 0, extra = {}) => new Response(JSON.stringify(rows), {
  headers: { "Content-Range": rows.length ? `${offset}-${offset + rows.length - 1}/${total}` : `*/${total}`, ...extra },
});
const response = () => ({ statusCode: 200, headers: {}, ended: false, setHeader(key, value) { if (this.ended) throw new Error("ERR_HTTP_HEADERS_SENT"); this.headers[key] = value; }, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; this.ended = true; return this; } });
const admin = { id: "synthetic-admin", email: "owner@example.invalid", email_confirmed_at: "2026-01-01T00:00:00Z" };

test("an unauthorized request does not write headers after a real HTTP response ends", async () => {
  const res = new ServerResponse({ method: "GET" });
  res.status = function status(value) { this.statusCode = value; return this; };
  res.json = function json(body) { this.setHeader("Content-Type", "application/json"); this.end(JSON.stringify(body)); return this; };
  try {
    await assert.doesNotReject(handler({ method: "GET", headers: {}, query: {} }, res));
    assert.equal(res.statusCode, 401); assert.equal(res.headersSent, true); assert.equal(res.writableEnded, true);
    assert.match(res.getHeader("Cache-Control"), /no-store/);
    assert.throws(() => res.setHeader("example", "late"), { code: "ERR_HTTP_HEADERS_SENT" });
  } finally { res.destroy(); }
});

test("operations access is verified on the server before any privileged read", async () => {
  const originalFetch = globalThis.fetch;
  const names = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_USER_IDS", "ADMIN_EMAILS"];
  const originals = Object.fromEntries(names.map(name => [name, process.env[name]]));
  Object.assign(process.env, { SUPABASE_URL: config.url, SUPABASE_ANON_KEY: "synthetic-anon", SUPABASE_SERVICE_ROLE_KEY: config.serviceKey, ADMIN_USER_IDS: "", ADMIN_EMAILS: admin.email });
  try {
    let calls = [];
    let user = admin;
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith("/auth/v1/user")) return new Response(JSON.stringify(user));
      assert.equal(options.method, "GET");
      return page([]);
    };
    let res = response();
    await handler({ method: "GET", headers: {}, query: {} }, res);
    assert.equal(res.statusCode, 401); assert.equal(calls.length, 0); assert.equal(res.body.summary, undefined);
    assert.match(res.headers["Cache-Control"], /no-store/); assert.equal(res.headers.Vary, "Authorization");
    for (const forbidden of [{ ...admin, email: "customer@example.invalid", user_metadata: { role: "admin" } }, { ...admin, email_confirmed_at: null }]) {
      user = forbidden; calls = []; res = response();
      await handler({ method: "GET", headers: { authorization: "Bearer synthetic-token" }, query: {} }, res);
      assert.equal(res.statusCode, 403); assert.equal(calls.length, 1); assert.equal(res.body.summary, undefined);
    }
    user = admin; calls = []; res = response();
    await handler({ method: "GET", headers: { authorization: "Bearer synthetic-token" }, query: { days: "7" } }, res);
    assert.equal(res.statusCode, 200); assert.equal(calls.length, 2);
    assert.equal(res.body.metadata.complete, true); assert.equal(res.body.summary.totalOrders, 0);
    assert.equal(res.headers["Cache-Control"], "private, no-store");
    assert.equal(calls[1].options.headers.Authorization, `Bearer ${config.serviceKey}`);
    assert.equal(calls[0].options.headers.Authorization, "Bearer synthetic-token");
    calls = []; res = response();
    await handler({ method: "POST", headers: {}, query: {} }, res);
    assert.equal(res.statusCode, 405); assert.equal(calls.length, 0);
    calls = []; res = response();
    await handler({ method: "GET", headers: { authorization: "Bearer synthetic-token" }, query: { days: "7", email: "selector@example.invalid" } }, res);
    assert.equal(res.statusCode, 400); assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of names) originals[name] === undefined ? delete process.env[name] : process.env[name] = originals[name];
  }
});

test("only bounded named ranges are accepted", () => {
  assert.equal(operationsDays(), 30);
  for (const days of ["1", "7", "30", "90"]) assert.equal(operationsDays({ days }), Number(days));
  for (const query of [{ days: "0" }, { days: "365" }, { days: "7.0" }, { days: ["7", "90"] }, { days: 7 }, { select: "*" }, { days: "7", until: "future" }]) assert.equal(operationsDays(query), null);
});

test("server returns aggregate recorded counts only and leaves all financial conclusions unknown", async () => {
  const rows = [row(0), row(1, { status: " PAID ", payment_id: null, paid_at: null, total: null }), row(2, { status: "pending" }), row(3, { status: "customer@example.invalid" })];
  const result = await readOperationsSummary(config, 7, { now, fetcher: async (url, options) => {
    const query = new URL(url).searchParams;
    assert.equal(query.get("select"), "id,status,created_at,payment_id,paid_at,total");
    assert.equal(query.get("order"), "created_at.desc,id.asc");
    assert.equal(query.get("and"), "(created_at.gte.2026-09-30T22:00:00.000Z,created_at.lte.2026-10-07T22:00:00.000Z)");
    assert.equal(options.headers.Prefer, "count=exact"); assert.equal(options.method, "GET");
    return page(rows);
  } });
  assert.equal(result.summary.totalOrders, 4); assert.equal(result.summary.paidStatusOrders, 2);
  assert.equal(result.summary.paidMissingTotal, 1); assert.equal(result.summary.paidMissingPaymentId, 1); assert.equal(result.summary.paidMissingPaidAt, 1);
  assert.deepEqual(result.summary.daily, [{ date: "2026-10-07", orders: 4, paidStatusOrders: 2 }]);
  assert.equal(result.metadata.money, "unavailable_currency_and_settlement_not_verified");
  assert.equal(result.metadata.snapshot, "bounded_nontransactional_read");
  const serialized = JSON.stringify(result);
  for (const privateValue of [rows[0].id, rows[0].payment_id, "customer@example.invalid", '"total":', '"email":', '"revenue":']) assert.ok(!serialized.includes(privateValue));
});

test("an explicit complete zero remains distinct from failed reads", async () => {
  const result = await readOperationsSummary(config, 1, { now, fetcher: async () => page([]) });
  assert.equal(result.summary.totalOrders, 0); assert.deepEqual(result.summary.daily, []); assert.equal(result.metadata.complete, true);
});

test("pagination reads every declared order without treating the row cap as a complete answer", async () => {
  const all = Array.from({ length: OPERATIONS_PAGE_SIZE + 1 }, (_, index) => row(index));
  const calls = [];
  const result = await readOperationsSummary(config, 7, { now, fetcher: async url => {
    const offset = Number(new URL(url).searchParams.get("offset")); calls.push(offset);
    return page(all.slice(offset, offset + OPERATIONS_PAGE_SIZE), all.length, offset);
  } });
  assert.deepEqual(calls, [0, OPERATIONS_PAGE_SIZE]); assert.equal(result.summary.totalOrders, all.length);
});

for (const [name, fetcher] of [
  ["missing count", async () => new Response(JSON.stringify([row()]))],
  ["malformed range", async () => page([row()], 1, 0, { "Content-Range": "1-1/1" })],
  ["short page", async () => page([row()], 2)],
  ["duplicate IDs", async () => page([row(), row()])],
  ["out-of-order records", async () => page([row(2), row(1)])],
  ["outside requested range", async () => page([row(0, { created_at: "2020-01-01T00:00:00Z" })])],
  ["future record", async () => page([row(0, { created_at: "2030-01-01T00:00:00Z" })])],
  ["unknown creation time", async () => page([row(0, { created_at: null })])],
  ["unexpected shape", async () => page([row(0, { payment_id: { secret: true } })])],
  ["upstream failure", async () => new Response("not available", { status: 503 })],
  ["invalid JSON", async () => new Response("{", { headers: { "Content-Range": "0-0/1" } })],
  ["oversize response", async () => page([row(0, { ignored: "x".repeat(1_000_000) })])],
  ["network timeout", async () => { throw new DOMException("timed out", "TimeoutError"); }],
]) test(`${name} does not return partial or fabricated totals`, async () => {
  await assert.rejects(readOperationsSummary(config, 7, { now, fetcher }));
});

test("count drift across pages rejects the whole summary", async () => {
  const first = Array.from({ length: OPERATIONS_PAGE_SIZE }, (_, index) => row(index));
  await assert.rejects(readOperationsSummary(config, 7, { now, fetcher: async url => {
    const offset = Number(new URL(url).searchParams.get("offset"));
    return offset ? page([row(offset), row(offset + 1)], OPERATIONS_PAGE_SIZE + 2, offset) : page(first, OPERATIONS_PAGE_SIZE + 1);
  } }));
});

test("oversize period fails explicitly before rows are used", async () => {
  await assert.rejects(readOperationsSummary(config, 90, { now, fetcher: async () => page([], 5_001) }), error => error.code === "OPERATIONS_WINDOW_TOO_LARGE" && error.status === 503);
});

test("malformed or missing recorded amounts are unknown, including false and blanks", async () => {
  const rows = [null, undefined, false, "", " ", "-5", "1.123"].map((total, index) => row(index, { total }));
  const result = await readOperationsSummary(config, 7, { now, fetcher: async () => page(rows) });
  assert.equal(result.summary.paidMissingTotal, rows.length);
});
