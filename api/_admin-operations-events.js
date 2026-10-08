export const EVENT_PAGE_SIZE = 1000;
export const MAX_OPERATIONS_EVENTS = 50_000;
const MAX_PAGE_BYTES = 750_000;
const EVENTS = new Set(["page_view", "page_exit", "product_view", "add_to_cart", "checkout_started", "checkout_step", "order_placed", "ui_click", "form_submit", "auth_started", "auth_code_sent", "auth_verified", "auth_failed", "product_selection_changed"]);

export class OperationsEventsError extends Error {
  constructor(code = "OPERATIONS_READ_INCOMPLETE", status = 502) {
    super("Browser activity could not be read completely.");
    this.code = code;
    this.status = status;
  }
}

// Read only the fields needed to count events. Browser IDs never leave the
// server. Exact counts detect partial pages/drift but are not a DB snapshot.
export async function readOperationsEvents(config, days, {
  now = new Date(), fetcher = fetch, signal = AbortSignal.timeout(20_000),
} = {}) {
  if (![1, 7, 30, 90].includes(days) || !Number.isFinite(now.getTime())) throw new OperationsEventsError();
  const end = now.getTime();
  const start = end - days * 86_400_000;
  const since = new Date(start).toISOString();
  const until = now.toISOString();
  const ids = new Set();
  const browserIds = new Set();
  const counts = new Map();
  let legacyEvents = 0;
  let missingIdentifiers = 0;
  let expectedTotal;
  let previousTime = Infinity;
  for (let offset = 0; offset < MAX_OPERATIONS_EVENTS; offset += EVENT_PAGE_SIZE) {
    const url = new URL(`${config.url.replace(/\/+$/, "")}/rest/v1/analytics_events`);
    url.searchParams.set("select", "id,session_id,event_type,created_at,schema_version:properties->schema_version");
    url.searchParams.set("and", `(created_at.gte.${since},created_at.lte.${until})`);
    url.searchParams.set("order", "created_at.desc,id.asc");
    url.searchParams.set("limit", String(EVENT_PAGE_SIZE));
    url.searchParams.set("offset", String(offset));
    const response = await fetcher(url, {
      method: "GET", signal,
      headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}`, Prefer: "count=exact" },
    });
    if (!response.ok) throw new OperationsEventsError();
    const range = /^(?:(\d+)-(\d+)|\*)\/(\d+)$/.exec(response.headers.get("content-range") || "");
    if (!range) throw new OperationsEventsError();
    const total = Number(range[3]);
    if (!Number.isSafeInteger(total) || total < 0) throw new OperationsEventsError();
    if (total > MAX_OPERATIONS_EVENTS) throw new OperationsEventsError("OPERATIONS_WINDOW_TOO_LARGE", 503);
    if (expectedTotal !== undefined && total !== expectedTotal) throw new OperationsEventsError();
    expectedTotal = total;
    const text = await response.text();
    if (Buffer.byteLength(text) > MAX_PAGE_BYTES) throw new OperationsEventsError();
    let rows;
    try { rows = JSON.parse(text); } catch { throw new OperationsEventsError(); }
    const expected = Math.min(EVENT_PAGE_SIZE, Math.max(0, total - offset));
    if (!Array.isArray(rows) || rows.length !== expected
      || (expected === 0 ? range[1] !== undefined : Number(range[1]) !== offset || Number(range[2]) !== offset + expected - 1)) throw new OperationsEventsError();
    for (const row of rows) {
      const time = typeof row?.created_at === "string" && row.created_at.length <= 64 ? Date.parse(row.created_at) : NaN;
      if (!row || typeof row.id !== "string" || !row.id || row.id.length > 160 || ids.has(row.id)
        || typeof row.event_type !== "string" || !row.event_type || row.event_type.length > 100
        || !Number.isFinite(time) || time < start || time > end || time > previousTime) throw new OperationsEventsError();
      ids.add(row.id);
      if (typeof row.session_id === "string" && row.session_id.trim() && row.session_id.length <= 200) browserIds.add(row.session_id);
      else missingIdentifiers += 1;
      previousTime = time;
      legacyEvents += Number(row.schema_version !== 2);
      const event = EVENTS.has(row.event_type) ? row.event_type : "other";
      counts.set(event, (counts.get(event) || 0) + 1);
    }
    if (ids.size === expectedTotal) return {
      ok: true,
      summary: {
        totalEvents: ids.size, browserIdentifiers: browserIds.size, legacyEvents, missingIdentifiers,
        events: [...counts].map(([event, count]) => ({ event, count })).sort((a, b) => b.count - a.count || a.event.localeCompare(b.event)),
      },
      metadata: {
        schemaVersion: 1, source: "browser_events_untrusted", complete: true, days,
        since, until, fetchedAt: new Date().toISOString(), timezone: "UTC",
        rowCount: expectedTotal, limit: MAX_OPERATIONS_EVENTS,
        snapshot: "bounded_nontransactional_read", orderingBasis: "server_received_created_at",
        identifiersDefinition: "mixed_legacy_browser_ids_and_v2_tab_sessions_not_people",
      },
    };
  }
  throw new OperationsEventsError();
}
