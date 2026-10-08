import test from "node:test";
import assert from "node:assert/strict";
import { readOperationsEvents, EVENT_PAGE_SIZE } from "../api/_admin-operations-events.js";

const config = { url: "https://database.invalid", serviceKey: "synthetic-service-key" };
const now = new Date("2026-10-08T12:00:00.000Z");
const row = (index = 0, extra = {}) => ({ id: `event-${index}`, session_id: `browser-${index % 20}`, event_type: index % 2 ? "product_view" : "page_view", created_at: new Date(now.getTime() - index * 1000 - 1000).toISOString(), schema_version: index % 2 ? 2 : null, ...extra });
const page = (rows, total = rows.length, offset = 0, range) => new Response(JSON.stringify(rows), { headers: { "Content-Range": range || (rows.length ? `${offset}-${offset + rows.length - 1}/${total}` : `*/${total}`) } });

test("a complete 10249-event period is aggregated server-side without leaking browser IDs", async () => {
  const all = Array.from({ length: 10_249 }, (_, index) => row(index));
  const calls = [];
  let sharedSignal;
  const result = await readOperationsEvents(config, 30, { now, fetcher: async (url, options) => {
    const query = new URL(url).searchParams;
    assert.equal(query.get("select"), "id,session_id,event_type,created_at,schema_version:properties->schema_version");
    assert.equal(query.get("order"), "created_at.desc,id.asc");
    assert.equal(query.get("and"), "(created_at.gte.2026-09-08T12:00:00.000Z,created_at.lte.2026-10-08T12:00:00.000Z)");
    assert.equal(options.method, "GET"); assert.equal(options.headers.Prefer, "count=exact");
    assert.equal(options.headers.Authorization, "Bearer synthetic-service-key");
    if (sharedSignal) assert.equal(options.signal, sharedSignal); else sharedSignal = options.signal;
    const offset = Number(query.get("offset")); calls.push(offset);
    return page(all.slice(offset, offset + EVENT_PAGE_SIZE), all.length, offset);
  } });
  assert.equal(calls.length, 11); assert.equal(result.summary.totalEvents, 10_249);
  assert.equal(result.summary.browserIdentifiers, 20); assert.equal(result.summary.legacyEvents, 5125);
  assert.deepEqual(result.summary.events, [{ event: "page_view", count: 5125 }, { event: "product_view", count: 5124 }]);
  const encoded = JSON.stringify(result);
  for (const value of ["browser-", "event-0", "session_id", "properties", "service-key"]) assert.ok(!encoded.includes(value));
  assert.ok(encoded.length < 2000); assert.equal(result.metadata.complete, true);
});

test("complete zero and unknown event names are explicit", async () => {
  const zero = await readOperationsEvents(config, 7, { now, fetcher: async () => page([]) });
  assert.equal(zero.summary.totalEvents, 0); assert.deepEqual(zero.summary.events, []);
  const unknown = await readOperationsEvents(config, 7, { now, fetcher: async () => page([row(0, { event_type: "private@example.invalid" })]) });
  assert.deepEqual(unknown.summary.events, [{ event: "other", count: 1 }]); assert.ok(!JSON.stringify(unknown).includes("private@example"));
});

for (const [name, fetcher] of [
  ["missing range", async () => new Response(JSON.stringify([row()]))],
  ["incorrect range", async () => page([row()], 1, 0, "1-1/1")],
  ["short page", async () => page([row()], 2)],
  ["duplicate record", async () => page([row(), row()])],
  ["reverse date order", async () => page([row(1), row(0)])],
  ["future date", async () => page([row(0, { created_at: "2030-01-01T00:00:00Z" })])],
  ["old date", async () => page([row(0, { created_at: "2020-01-01T00:00:00Z" })])],
  ["numeric DB identity", async () => page([row(0, { id: 123 })])],
  ["invalid row", async () => page([null])],
  ["DB denial", async () => new Response("denied", { status: 403 })],
  ["malformed JSON", async () => new Response("[", { headers: { "Content-Range": "0-0/1" } })],
  ["oversized body", async () => page([row(0, { ignored: "x".repeat(750_001) })])],
]) test(`events ${name} fails without returning partial data`, async () => {
  await assert.rejects(readOperationsEvents(config, 7, { now, fetcher }));
});

test("count drift on the second page is rejected", async () => {
  await assert.rejects(readOperationsEvents(config, 7, { now, fetcher: async url => {
    const offset = Number(new URL(url).searchParams.get("offset"));
    return offset ? page([row(1000), row(1001)], 1002, offset) : page(Array.from({ length: 1000 }, (_, index) => row(index)), 1001);
  } }));
});

test("events over the complete-read limit produce a shorter-range error", async () => {
  await assert.rejects(readOperationsEvents(config, 90, { now, fetcher: async () => page([], 50_001) }), error => error.code === "OPERATIONS_WINDOW_TOO_LARGE" && error.status === 503);
});

test("distinct microsecond timestamps in one millisecond are not falsely reordered by rounded JS dates", async () => {
  const result = await readOperationsEvents(config, 7, { now, fetcher: async () => page([
    row(0, { id: "z", created_at: "2026-10-08T11:59:59.123999Z" }), row(1, { id: "a", created_at: "2026-10-08T11:59:59.123001Z" }),
  ]) });
  assert.equal(result.summary.totalEvents, 2);
});

test("missing historic browser identifiers preserve event counts and expose their coverage gap", async () => {
  const rows = [null, "", " ", 123, "known-browser", "known-browser"].map((session_id, index) => row(index, { session_id }));
  const result = await readOperationsEvents(config, 7, { now, fetcher: async () => page(rows) });
  assert.equal(result.summary.totalEvents, 6); assert.equal(result.summary.missingIdentifiers, 4); assert.equal(result.summary.browserIdentifiers, 1);
});

test("UUID event IDs and equal timestamps remain valid while duplicate/no-progress pages fail", async () => {
  const first = row(0, { id: "019a53d7-2020-7000-8000-000000000001" });
  const second = { ...first, id: "019a53d7-2020-7000-8000-000000000002" };
  const result = await readOperationsEvents(config, 7, { now, fetcher: async () => page([first, second]) });
  assert.equal(result.summary.totalEvents, 2);
  await assert.rejects(readOperationsEvents(config, 7, { now, fetcher: async () => page([first, first]) }));
  await assert.rejects(readOperationsEvents(config, 7, { now, fetcher: async url => {
    const offset = Number(new URL(url).searchParams.get("offset"));
    return offset ? page([row(0)], 1001, offset) : page(Array.from({ length: 1000 }, (_, index) => row(index)), 1001);
  } }));
});

test("the exact 50000-event boundary completes without an extra sentinel read", async () => {
  let requests = 0;
  const result = await readOperationsEvents(config, 1, { now, fetcher: async url => {
    requests += 1;
    const offset = Number(new URL(url).searchParams.get("offset"));
    return page(Array.from({ length: 1000 }, (_, index) => row(offset + index)), 50_000, offset);
  } });
  assert.equal(requests, 50); assert.equal(result.summary.totalEvents, 50_000); assert.equal(result.metadata.complete, true);
});
