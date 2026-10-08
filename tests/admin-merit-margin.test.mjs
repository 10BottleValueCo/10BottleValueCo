import assert from "node:assert/strict";
import { ServerResponse } from "node:http";
import test from "node:test";
import handler from "../api/admin-merit-margin.js";
import { readMeritMarginSummary, MERIT_MARGIN_PAGE_SIZE } from "../api/_admin-merit-margin.js";

const now = new Date("2026-10-08T21:00:00Z");
const config = { url: "https://database.invalid", serviceKey: "synthetic-service-key" };
const row = (id = 0, extra = {}) => ({
  id: `synthetic-${id}`, state: "paid", amount_cents: 10300, currency: "usd", expected_live: true,
  created_at: "2026-10-08T20:00:00Z", paid_at: new Date(now.getTime() - 1000 - id * 1000).toISOString(),
  total: 103, customer_surcharge: 3, customer_surcharge_bps: 300, customer_shipping: 10,
  payment_rules: {
    version: "synthetic-rule-v1", currency: "usd",
    customerCardSurcharge: { rate: 300, unit: "basis_points", source: "Owner instruction", effectiveAt: "2026-10-08T00:00:00Z" },
    merchantProcessingExpense: { rate: 750, unit: "basis_points", source: "Private supplier rate reference", effectiveAt: "2026-10-08T00:00:00Z", status: "reported_rate_not_actual_settlement", basis: "charged_amount" },
  },
  order: { status: "paid" }, ...extra,
});
const page = (rows, total = rows.length, offset = 0, headers = {}) => new Response(JSON.stringify(rows), {
  headers: { "Content-Range": rows.length ? `${offset}-${offset + rows.length - 1}/${total}` : `*/${total}`, ...headers },
});
const response = () => ({ statusCode: 200, headers: {}, ended: false, setHeader(key, value) { if (this.ended) throw new Error("headers already sent"); this.headers[key] = value; }, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; this.ended = true; return this; } });

test("reads canonical live paid snapshots without requesting secrets or personal details", async () => {
  const result = await readMeritMarginSummary(config, 7, { now, fetcher: async (url, options) => {
    const parsed = new URL(url); const q = parsed.searchParams;
    assert.match(parsed.pathname, /merit_payment_attempts$/);
    assert.equal(q.get("state"), "eq.paid"); assert.equal(q.get("expected_live"), "eq.true");
    assert.equal(q.get("order"), "paid_at.desc,id.asc");
    assert.equal(q.get("and"), "(paid_at.gte.2026-10-01T21:00:00.000Z,paid_at.lte.2026-10-08T21:00:00.000Z)");
    assert.match(q.get("select"), /payment_rules:snapshot->paymentRules/);
    assert.match(q.get("select"), /order:orders\(status\)/);
    assert.doesNotMatch(q.get("select"), /client_secret|email|phone|address|publishable_key|\*/);
    assert.equal(options.method, "GET"); assert.equal(options.cache, "no-store"); assert.equal(options.headers.Authorization, `Bearer ${config.serviceKey}`);
    return page([row()]);
  } });
  assert.equal(result.summary.customerCardSurchargeCents, 300); assert.equal(result.summary.processorExpenseEstimateCents, 773);
  assert.equal(result.summary.merchantFeeBurdenEstimateCents, 473); assert.equal(result.summary.netProfitCents, null);
  assert.equal(result.metadata.dateBasis, "merit_paid_at"); assert.equal(result.metadata.currency, "usd");
  assert.doesNotMatch(JSON.stringify(result), /synthetic-0|Private supplier rate reference|payment_rules|client_secret/);
});

test("unknown fee basis cannot become a partial aggregate presented as a complete expense", async () => {
  const unknown = row(1); unknown.payment_rules.merchantProcessingExpense.basis = null;
  const result = await readMeritMarginSummary(config, 7, { now, fetcher: async () => page([row(), unknown]) });
  assert.equal(result.summary.eligibleAttempts, 2); assert.equal(result.summary.feeKnownAttempts, 1); assert.equal(result.summary.feeUnknownAttempts, 1);
  assert.equal(result.summary.customerCardSurchargeCents, 600); assert.equal(result.summary.processorExpenseEstimateCents, null);
  assert.equal(result.summary.merchantFeeBurdenEstimateCents, null); assert.equal(result.summary.netProfitCents, null);
});

test("refunds and unverified order states are separately excluded from the eligible amounts", async () => {
  const rows = [row(), row(1, { order: { status: "refunded" } }), row(2, { order: null }), row(3, { total: null })];
  const { summary } = await readMeritMarginSummary(config, 7, { now, fetcher: async () => page(rows) });
  assert.equal(summary.recordedPaidAttempts, 4); assert.equal(summary.eligibleAttempts, 1);
  assert.equal(summary.excludedRefundOrReversal, 1); assert.equal(summary.excludedUnknown, 2);
  assert.equal(summary.chargedAmountCents, 10300); assert.equal(summary.processorExpenseEstimateCents, 773);
});

test("a complete empty private read is distinct from a missing or inaccessible table", async () => {
  const result = await readMeritMarginSummary(config, 7, { now, fetcher: async () => page([]) });
  assert.equal(result.summary.recordedPaidAttempts, 0); assert.equal(result.summary.customerCardSurchargeCents, 0);
  assert.equal(result.summary.netProfitCents, null); assert.equal(result.metadata.complete, true);
  await assert.rejects(readMeritMarginSummary(config, 7, { now, fetcher: async () => new Response("table missing", { status: 404 }) }));
});

test("a complete multi-page read reconciles all rows and counts", async () => {
  const rows = Array.from({ length: MERIT_MARGIN_PAGE_SIZE + 1 }, (_, index) => row(index));
  const offsets = [];
  const { summary } = await readMeritMarginSummary(config, 7, { now, fetcher: async url => {
    const offset = Number(new URL(url).searchParams.get("offset")); offsets.push(offset);
    return page(rows.slice(offset, offset + MERIT_MARGIN_PAGE_SIZE), rows.length, offset);
  } });
  assert.deepEqual(offsets, [0, MERIT_MARGIN_PAGE_SIZE]); assert.equal(summary.recordedPaidAttempts, rows.length);
  assert.equal(summary.processorExpenseEstimateCents, 773 * rows.length);
});

for (const [name, fetcher] of [
  ["missing count", async () => new Response("[]")],
  ["partial page", async () => page([row()], 2)],
  ["wrong content range", async () => page([row()], 1, 0, { "Content-Range": "1-1/1" })],
  ["duplicate attempts", async () => page([row(), row()])],
  ["unsorted attempts", async () => page([row(1), row(0)])],
  ["wrong currency", async () => page([row(0, { currency: "eur" })])],
  ["test attempt", async () => page([row(0, { expected_live: false })])],
  ["unpaid attempt", async () => page([row(0, { state: "ready" })])],
  ["future paid date", async () => page([row(0, { paid_at: "2030-01-01T00:00:00Z" })])],
  ["missing paid date", async () => page([row(0, { paid_at: null })])],
  ["oversize page", async () => page([row(0, { ignored: "x".repeat(2_000_000) })])],
  ["malformed JSON", async () => new Response("{", { headers: { "Content-Range": "0-0/1" } })],
]) test(`${name} never returns partial amounts`, async () => {
  await assert.rejects(readMeritMarginSummary(config, 7, { now, fetcher }));
});

test("oversized windows and count drift fail explicitly", async () => {
  await assert.rejects(readMeritMarginSummary(config, 90, { now, fetcher: async () => page([], 5001) }), error => error.code === "OPERATIONS_WINDOW_TOO_LARGE");
  const rows = Array.from({ length: MERIT_MARGIN_PAGE_SIZE }, (_, i) => row(i));
  await assert.rejects(readMeritMarginSummary(config, 7, { now, fetcher: async url => Number(new URL(url).searchParams.get("offset"))
    ? page([row(MERIT_MARGIN_PAGE_SIZE)], MERIT_MARGIN_PAGE_SIZE + 2, MERIT_MARGIN_PAGE_SIZE)
    : page(rows, MERIT_MARGIN_PAGE_SIZE + 1) }));
});

test("anonymous denial finishes a real response without a privileged request or late headers", async () => {
  const res = new ServerResponse({ method: "GET" });
  res.status = function (value) { this.statusCode = value; return this; };
  res.json = function (body) { this.setHeader("Content-Type", "application/json"); this.end(JSON.stringify(body)); return this; };
  try {
    await handler({ method: "GET", headers: {}, query: {} }, res);
    assert.equal(res.statusCode, 401); assert.equal(res.writableEnded, true); assert.match(res.getHeader("Cache-Control"), /no-store/);
    assert.equal(res.getHeader("Vary"), "Authorization");
  } finally { res.destroy(); }
});

test("the route verifies the server admin roster before private reads and sanitizes failures", async () => {
  const names = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_EMAILS", "ADMIN_USER_IDS"];
  const originals = Object.fromEntries(names.map(name => [name, process.env[name]])); const oldFetch = globalThis.fetch;
  Object.assign(process.env, { SUPABASE_URL: config.url, SUPABASE_ANON_KEY: "synthetic-anon", SUPABASE_SERVICE_ROLE_KEY: config.serviceKey, ADMIN_EMAILS: "owner@example.invalid", ADMIN_USER_IDS: "" });
  let user = { id: "synthetic-owner", email: "owner@example.invalid", email_confirmed_at: "2026-10-01T00:00:00Z" };
  let failPrivate = false; const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/auth/v1/user")) return new Response(JSON.stringify(user));
    if (failPrivate) throw new Error("private-provider-secret-and-customer-record");
    return page([]);
  };
  try {
    let res = response(); await handler({ method: "POST", headers: {}, query: {} }, res);
    assert.equal(res.statusCode, 405); assert.equal(calls.length, 0);
    res = response(); await handler({ method: "GET", headers: {}, query: {} }, res);
    assert.equal(res.statusCode, 401); assert.equal(calls.length, 0);
    for (const forbidden of [{ ...user, email: "customer@example.invalid", user_metadata: { role: "admin" } }, { ...user, email_confirmed_at: null }]) {
      const saved = user; user = forbidden; calls.length = 0; res = response();
      await handler({ method: "GET", headers: { authorization: "Bearer customer" }, query: {} }, res);
      assert.equal(res.statusCode, 403); assert.equal(calls.length, 1); user = saved;
    }
    calls.length = 0; res = response(); await handler({ method: "GET", headers: { authorization: "Bearer admin" }, query: { days: "7", feeBps: "0" } }, res);
    assert.equal(res.statusCode, 400); assert.equal(calls.length, 1);
    calls.length = 0; res = response(); await handler({ method: "GET", headers: { authorization: "Bearer admin" }, query: { days: "7" } }, res);
    assert.equal(res.statusCode, 200); assert.equal(calls.length, 2); assert.equal(res.headers["Cache-Control"], "private, no-store");
    assert.equal(calls[0].options.headers.Authorization, "Bearer admin"); assert.equal(calls[1].options.headers.Authorization, `Bearer ${config.serviceKey}`);
    assert.equal(res.body.summary.netProfitCents, null);
    failPrivate = true; res = response(); await handler({ method: "GET", headers: { authorization: "Bearer admin" }, query: {} }, res);
    assert.equal(res.statusCode, 502); assert.doesNotMatch(JSON.stringify(res.body), /private-provider-secret|customer-record/);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY; calls.length = 0; res = response();
    await handler({ method: "GET", headers: { authorization: "Bearer admin" }, query: {} }, res);
    assert.equal(res.statusCode, 503); assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = oldFetch;
    for (const name of names) originals[name] === undefined ? delete process.env[name] : process.env[name] = originals[name];
  }
});
