import test from "node:test";
import assert from "node:assert/strict";
import { loadOperationsStudio, validateBrowserSummary, validateOrderSummary } from "../artifacts/10-bottle-value/src/operations-portal-client.js";

const expectedEmail = "owner@example.invalid";
const supabase = { auth: { getSession: async () => ({ data: { session: { access_token: "synthetic-session", user: { id: "synthetic-owner-id", email: expectedEmail } } } }) } };
const window = { since: "2026-10-01T12:00:00.000Z", until: "2026-10-08T12:00:00.000Z" };
const orders = () => ({
  ok: true,
  summary: { totalOrders: 2, paidStatusOrders: 1, paidMissingPaymentId: 1, paidMissingPaidAt: 0, paidMissingTotal: 1, statuses: [{ status: "paid", count: 1 }, { status: "checkout", count: 1 }], daily: [{ date: "2026-10-07", orders: 2, paidStatusOrders: 1 }] },
  metadata: { schemaVersion: 1, source: "orders_recorded_state", days: 7, ...window, fetchedAt: "2026-10-08T12:00:01.000Z", timezone: "UTC", dateBasis: "order_created_at", complete: true, rowCount: 2, limit: 5_000, snapshot: "bounded_nontransactional_read", money: "unavailable_currency_and_settlement_not_verified" },
});
const traffic = (empty = false) => ({
  ok: true,
  summary: { totalEvents: empty ? 0 : 2, browserIdentifiers: empty ? 0 : 2, legacyEvents: empty ? 0 : 1, missingIdentifiers: 0, events: empty ? [] : [{ event: "product_view", count: 2 }] },
  metadata: { schemaVersion: 1, source: "browser_events_untrusted", complete: true, days: 7, ...window, fetchedAt: "2026-10-08T12:00:01.000Z", rowCount: empty ? 0 : 2, limit: 50_000, timezone: "UTC", snapshot: "bounded_nontransactional_read", orderingBasis: "server_received_created_at", identifiersDefinition: "mixed_legacy_browser_ids_and_v2_tab_sessions_not_people" },
});
const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const fetcher = async url => json(url.startsWith("/api/admin-operations-summary") ? orders() : traffic());

test("both sources use the current admin session and no-store requests", async () => {
  const seen = [];
  const signal = new AbortController().signal;
  const result = await loadOperationsStudio({ supabase, expectedEmail, days: 7, signal, fetcher: async (url, options) => {
    seen.push(url);
    assert.equal(options.method, "GET"); assert.equal(options.headers.Authorization, "Bearer synthetic-session"); assert.equal(options.cache, "no-store"); assert.ok(options.signal instanceof AbortSignal); assert.equal(options.signal.aborted, false);
    return fetcher(url);
  } });
  assert.deepEqual(seen.sort(), ["/api/admin-operations-events?days=7", "/api/admin-operations-summary?days=7"]);
  assert.equal(result.orders.status, "ready"); assert.equal(result.traffic.status, "ready");
  assert.equal(result.traffic.value.browserIdentifiers, 2); assert.equal(result.traffic.value.legacyEvents, 1);
  const serialized = JSON.stringify(result.traffic.value);
  for (const raw of ["browser-0", "synthetic-0", "not retained", "session_id"]) assert.ok(!serialized.includes(raw));
});

test("session absence, mismatch and verification error never issue requests", async () => {
  for (const authResponse of [{ data: { session: null } }, { data: { session: { access_token: "test", user: { id: "other-user", email: "other@example.invalid" } } } }, { data: { session: { access_token: "test", user: { email: expectedEmail } } } }, { error: new Error("expired") }]) {
    await assert.rejects(loadOperationsStudio({ supabase: { auth: { getSession: async () => authResponse } }, expectedEmail, days: 7, fetcher: () => { throw new Error("Unexpected request"); } }), error => error.code === "auth");
  }
});

test("account changes and cancelled reads cannot repopulate stale private data", async () => {
  let current = true;
  const result = await loadOperationsStudio({ supabase, expectedEmail, days: 7, isCurrent: () => current, fetcher: async url => {
    current = false; return fetcher(url);
  } });
  assert.equal(result, null);
  const controller = new AbortController(); controller.abort();
  assert.equal(await loadOperationsStudio({ supabase, expectedEmail, days: 7, signal: controller.signal, fetcher: () => { throw new Error("Unexpected request"); } }), null);
  let accepted = true;
  assert.equal(await loadOperationsStudio({ supabase, expectedEmail, days: 7, isCurrent: () => accepted, onSession: session => {
    assert.equal(session.user.id, "synthetic-owner-id"); accepted = false;
  }, fetcher: () => { throw new Error("Unexpected request"); } }), null);
});

test("either source denying access clears the whole result", async () => {
  for (const status of [401, 403]) await assert.rejects(loadOperationsStudio({ supabase, expectedEmail, days: 7, fetcher: async url => url.startsWith("/api/admin-operations-summary") ? json({}, status) : fetcher(url) }), error => error.code === "auth");
});

test("source failure is independent and cannot become a zero or hide partial coverage", async () => {
  const result = await loadOperationsStudio({ supabase, expectedEmail, days: 7, fetcher: async url => url.startsWith("/api/admin-operations-summary") ? json({ code: "OPERATIONS_WINDOW_TOO_LARGE" }, 503) : fetcher(url) });
  assert.deepEqual(result.orders, { status: "error", error: "range" }); assert.equal(result.traffic.status, "ready");
  const opposite = await loadOperationsStudio({ supabase, expectedEmail, days: 7, fetcher: async url => url.startsWith("/api/admin-operations-summary") ? fetcher(url) : json({}, 502) });
  assert.equal(opposite.orders.status, "ready"); assert.deepEqual(opposite.traffic, { status: "error", error: "unavailable" });
});

test("a stalled source reaches a bounded error while the other source remains usable", async () => {
  let stalledSignal;
  const result = await loadOperationsStudio({ supabase, expectedEmail, days: 7, timeoutMs: 10, fetcher: async (url, options) => {
    if (url.startsWith("/api/admin-operations-summary")) { stalledSignal = options.signal; return new Promise(() => {}); }
    return fetcher(url);
  } });
  assert.deepEqual(result.orders, { status: "error", error: "unavailable" });
  assert.equal(result.traffic.status, "ready"); assert.equal(stalledSignal.aborted, true);
});

test("403 immediately rejects and cancels a stalled sibling instead of waiting for its deadline", async () => {
  let stalledSignal;
  const started = Date.now();
  await assert.rejects(loadOperationsStudio({ supabase, expectedEmail, days: 7, timeoutMs: 1_000, fetcher: async (url, options) => {
    if (url.startsWith("/api/admin-operations-summary")) { stalledSignal = options.signal; return new Promise(() => {}); }
    return json({}, 403);
  } }), error => error.code === "auth");
  assert.ok(Date.now() - started < 500); assert.equal(stalledSignal.aborted, true);
});

test("a stalled session refresh also settles without any data request", async () => {
  await assert.rejects(loadOperationsStudio({ supabase: { auth: { getSession: () => new Promise(() => {}) } }, expectedEmail, days: 7, timeoutMs: 10, fetcher: () => { throw new Error("Unexpected data request"); } }), error => error.code === "unavailable");
});

test("complete zero order reads remain explicit", () => {
  const value = orders();
  value.summary = { totalOrders: 0, paidStatusOrders: 0, paidMissingPaymentId: 0, paidMissingPaidAt: 0, paidMissingTotal: 0, statuses: [], daily: [] }; value.metadata.rowCount = 0;
  assert.equal(validateOrderSummary(value, 7).summary.totalOrders, 0);
  assert.equal(validateBrowserSummary(traffic(true), 7).totalEvents, 0);
});

for (const [name, mutate] of [
  ["partial order result", value => { value.metadata.complete = false; }],
  ["wrong period", value => { value.metadata.days = 90; }],
  ["mismatched row count", value => { value.metadata.rowCount = 3; }],
  ["negative counts", value => { value.summary.paidStatusOrders = -1; }],
  ["quality count larger than paid population", value => { value.summary.paidMissingTotal = 2; }],
  ["missing status bucket", value => { value.summary.statuses.pop(); }],
  ["unknown free-text status", value => { value.summary.statuses[0].status = "email@example.invalid"; }],
  ["duplicated status bucket", value => { value.summary.statuses[1].status = "paid"; }],
  ["daily counts disagree", value => { value.summary.daily[0].orders = 1; }],
  ["unknown date", value => { value.summary.daily[0].date = "2026-99-99"; }],
  ["date outside the window", value => { value.summary.daily[0].date = "2026-01-01"; }],
  ["currency claim", value => { value.metadata.money = "USD"; }],
]) test(`${name} is rejected`, () => { const value = orders(); mutate(value); assert.throws(() => validateOrderSummary(value, 7)); });

test("event volumes above the old 5000 cap are accepted as complete aggregates", () => {
  const value = traffic(); value.summary.totalEvents = 10_249; value.summary.events[0].count = 10_249; value.metadata.rowCount = 10_249;
  assert.equal(validateBrowserSummary(value, 7).totalEvents, 10_249);
});

for (const [name, mutate] of [
  ["partial", value => { value.metadata.complete = false; }],
  ["missing metadata", value => { delete value.metadata; }],
  ["wrong date range", value => { value.metadata.days = 30; }],
  ["inconsistent total", value => { value.metadata.rowCount = 3; }],
  ["negative count", value => { value.summary.events[0].count = -1; }],
  ["duplicate category", value => { value.summary.events.push(value.summary.events[0]); }],
  ["unrecognized category", value => { value.summary.events[0].event = "customer@example.invalid"; }],
  ["sum mismatch", value => { value.summary.events[0].count = 1; }],
  ["too many identifiers", value => { value.summary.browserIdentifiers = 3; }],
  ["no identifiers for nonempty read", value => { value.summary.browserIdentifiers = 0; }],
  ["too many missing identifiers", value => { value.summary.missingIdentifiers = 3; }],
  ["too many legacy events", value => { value.summary.legacyEvents = 3; }],
  ["oversize read", value => { value.metadata.rowCount = 50_001; }],
]) test(`browser ${name} remains unknown`, () => { const value = traffic(); mutate(value); assert.throws(() => validateBrowserSummary(value, 7)); });
