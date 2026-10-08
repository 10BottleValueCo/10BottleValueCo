import test from "node:test";
import assert from "node:assert/strict";
import { loadOperationsStudio, summarizeBrowserEvents, validateOrderSummary } from "../artifacts/10-bottle-value/src/operations-studio.js";

const expectedEmail = "owner@example.invalid";
const supabase = { auth: { getSession: async () => ({ data: { session: { access_token: "synthetic-session", user: { id: "synthetic-owner-id", email: expectedEmail } } } }) } };
const window = { since: "2026-10-01T12:00:00.000Z", until: "2026-10-08T12:00:00.000Z" };
const orders = () => ({
  ok: true,
  summary: { totalOrders: 2, paidStatusOrders: 1, paidMissingPaymentId: 1, paidMissingPaidAt: 0, paidMissingTotal: 1, statuses: [{ status: "paid", count: 1 }, { status: "checkout", count: 1 }], daily: [{ date: "2026-10-07", orders: 2, paidStatusOrders: 1 }] },
  metadata: { schemaVersion: 1, source: "orders_recorded_state", days: 7, ...window, fetchedAt: "2026-10-08T12:00:01.000Z", timezone: "UTC", dateBasis: "order_created_at", complete: true, rowCount: 2, limit: 5_000, snapshot: "bounded_nontransactional_read", money: "unavailable_currency_and_settlement_not_verified" },
});
const event = (index = 0, extra = {}) => ({ id: `synthetic-${index}`, session_id: `browser-${index}`, created_at: new Date(Date.parse(window.until) - index * 1_000 - 1_000).toISOString(), event_type: "product_view", properties: { schema_version: 2, ignored: "not retained" }, ...extra });
const traffic = (rows = [event(0), event(1, { properties: {} })], extra = {}) => ({
  events: rows,
  metadata: { schema_version: 2, source: "browser_events_untrusted", ...window, received_at: "2026-10-08T12:00:01.000Z", returned_events: rows.length, legacy_events: rows.filter(row => row.properties?.schema_version !== 2).length, limit: 5_000, timezone: "UTC", truncated: false, coverage: "complete_for_requested_window", ...extra },
});
const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const fetcher = async url => json(url.startsWith("/api/admin-") ? orders() : traffic());

test("both sources use the current admin session and no-store requests", async () => {
  const seen = [];
  const signal = new AbortController().signal;
  const result = await loadOperationsStudio({ supabase, expectedEmail, days: 7, signal, fetcher: async (url, options) => {
    seen.push(url);
    assert.equal(options.method, "GET"); assert.equal(options.headers.Authorization, "Bearer synthetic-session"); assert.equal(options.cache, "no-store"); assert.ok(options.signal instanceof AbortSignal); assert.equal(options.signal.aborted, false);
    return fetcher(url);
  } });
  assert.deepEqual(seen.sort(), ["/api/admin-operations-summary?days=7", "/api/analytics?days=7"]);
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
  for (const status of [401, 403]) await assert.rejects(loadOperationsStudio({ supabase, expectedEmail, days: 7, fetcher: async url => url.startsWith("/api/admin-") ? json({}, status) : fetcher(url) }), error => error.code === "auth");
});

test("source failure is independent and cannot become a zero or hide partial coverage", async () => {
  const result = await loadOperationsStudio({ supabase, expectedEmail, days: 7, fetcher: async url => url.startsWith("/api/admin-") ? json({ code: "OPERATIONS_WINDOW_TOO_LARGE" }, 503) : fetcher(url) });
  assert.deepEqual(result.orders, { status: "error", error: "range" }); assert.equal(result.traffic.status, "ready");
  const opposite = await loadOperationsStudio({ supabase, expectedEmail, days: 7, fetcher: async url => url.startsWith("/api/admin-") ? fetcher(url) : json({}, 502) });
  assert.equal(opposite.orders.status, "ready"); assert.deepEqual(opposite.traffic, { status: "error", error: "unavailable" });
});

test("a stalled source reaches a bounded error while the other source remains usable", async () => {
  let stalledSignal;
  const result = await loadOperationsStudio({ supabase, expectedEmail, days: 7, timeoutMs: 10, fetcher: async (url, options) => {
    if (url.startsWith("/api/admin-")) { stalledSignal = options.signal; return new Promise(() => {}); }
    return fetcher(url);
  } });
  assert.deepEqual(result.orders, { status: "error", error: "unavailable" });
  assert.equal(result.traffic.status, "ready"); assert.equal(stalledSignal.aborted, true);
});

test("403 immediately rejects and cancels a stalled sibling instead of waiting for its deadline", async () => {
  let stalledSignal;
  const started = Date.now();
  await assert.rejects(loadOperationsStudio({ supabase, expectedEmail, days: 7, timeoutMs: 1_000, fetcher: async (url, options) => {
    if (url.startsWith("/api/admin-")) { stalledSignal = options.signal; return new Promise(() => {}); }
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
  assert.equal(summarizeBrowserEvents(traffic([]), 7).totalEvents, 0);
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

test("a capped browser sample is counted only as a partial latest-events sample", () => {
  const rows = Array.from({ length: 5_000 }, (_, index) => event(index));
  const result = summarizeBrowserEvents(traffic(rows, { truncated: true, coverage: "partial_latest_events" }), 7);
  assert.equal(result.totalEvents, 5_000); assert.equal(result.metadata.truncated, true); assert.equal(result.metadata.coverage, "partial_latest_events");
});

test("new auth and selection instrumentation has separate event counts without inferred conversion", () => {
  const events = ["auth_started", "auth_code_sent", "auth_verified", "auth_failed", "product_selection_changed"];
  const result = summarizeBrowserEvents(traffic(events.map((event_type, index) => event(index, { event_type }))), 7);
  assert.equal(result.totalEvents, 5);
  assert.deepEqual(result.events.map(row => row.event).sort(), [...events].sort());
  assert.equal(result.conversion, undefined); assert.equal(result.customers, undefined);
});

for (const [name, mutate] of [
  ["missing metadata", value => { delete value.metadata; }],
  ["unlabeled sample", value => { value.metadata.truncated = true; }],
  ["incorrect returned count", value => { value.metadata.returned_events = 10; }],
  ["incorrect legacy count", value => { value.metadata.legacy_events = 0; }],
  ["duplicated event", value => { value.events[1].id = value.events[0].id; }],
  ["missing browser ID", value => { value.events[0].session_id = null; }],
  ["out-of-window event", value => { value.events[0].created_at = "2020-01-01T00:00:00Z"; }],
  ["out-of-order event", value => { value.events.reverse(); }],
]) test(`browser ${name} remains unknown`, () => { const value = traffic(); mutate(value); assert.throws(() => summarizeBrowserEvents(value, 7)); });
