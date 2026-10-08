const RANGES = [1, 7, 30, 90];
const STATUS_KEYS = new Set(["paid", "pending", "checkout", "checkout (clicked pay)", "cancelled", "canceled", "failed", "refunded", "expired", "processing", "shipped", "delivered", "other"]);
const EVENT_KEYS = new Set(["page_view", "page_exit", "product_view", "add_to_cart", "checkout_started", "checkout_step", "order_placed", "ui_click", "form_submit", "auth_started", "auth_code_sent", "auth_verified", "auth_failed", "product_selection_changed"]);
const count = value => Number.isSafeInteger(value) && value >= 0;
const date = value => typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value));
const invalid = () => new OperationsLoadError("unavailable");

export class OperationsLoadError extends Error {
  constructor(code) {
    super("Operations data could not be verified.");
    this.code = code;
  }
}

// Supabase session refresh and either source can stall independently. The race
// settles even when a mocked or broken transport ignores AbortSignal. All
// timers/listeners are removed; callers can refresh after a bounded failure.
async function withDeadline(work, signal, timeoutMs) {
  const controller = new AbortController();
  let timeout;
  let abort;
  const stopped = new Promise((_, reject) => {
    abort = () => { controller.abort(); reject(new OperationsLoadError("cancelled")); };
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener("abort", abort, { once: true });
    timeout = setTimeout(() => { controller.abort(); reject(invalid()); }, timeoutMs);
  });
  try {
    return await Promise.race([
      stopped,
      Promise.resolve().then(() => {
        if (controller.signal.aborted) throw new OperationsLoadError("cancelled");
        return work(controller.signal);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export function validateOrderSummary(body, days) {
  const meta = body?.metadata;
  const summary = body?.summary;
  if (body?.ok !== true || meta?.schemaVersion !== 1 || meta.source !== "orders_recorded_state"
    || meta.complete !== true || meta.days !== days || meta.timezone !== "UTC"
    || meta.dateBasis !== "order_created_at" || meta.snapshot !== "bounded_nontransactional_read"
    || meta.money !== "unavailable_currency_and_settlement_not_verified"
    || !date(meta.since) || !date(meta.until) || !date(meta.fetchedAt)
    || Date.parse(meta.until) - Date.parse(meta.since) !== days * 86_400_000
    || !count(meta.rowCount) || meta.limit !== 5_000 || meta.rowCount > meta.limit
    || !summary || !["totalOrders", "paidStatusOrders", "paidMissingPaymentId", "paidMissingPaidAt", "paidMissingTotal"].every(key => count(summary[key]))
    || summary.totalOrders !== meta.rowCount || summary.paidStatusOrders > summary.totalOrders
    || [summary.paidMissingPaymentId, summary.paidMissingPaidAt, summary.paidMissingTotal].some(value => value > summary.paidStatusOrders)
    || !Array.isArray(summary.statuses) || !Array.isArray(summary.daily)) throw invalid();
  const statuses = new Set();
  let statusCount = 0;
  for (const row of summary.statuses) {
    if (!STATUS_KEYS.has(row?.status) || statuses.has(row.status) || !count(row.count) || row.count === 0) throw invalid();
    statuses.add(row.status);
    statusCount += row.count;
  }
  const paidCount = summary.statuses.find(row => row.status === "paid")?.count || 0;
  if (statusCount !== summary.totalOrders || paidCount !== summary.paidStatusOrders) throw invalid();
  let priorDay = "";
  let dailyCount = 0;
  let dailyPaid = 0;
  for (const row of summary.daily) {
    if (!row || typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)
      || !date(`${row.date}T00:00:00Z`) || new Date(`${row.date}T00:00:00Z`).toISOString().slice(0, 10) !== row.date
      || row.date <= priorDay || row.date < meta.since.slice(0, 10) || row.date > meta.until.slice(0, 10)
      || !count(row.orders) || row.orders === 0 || !count(row.paidStatusOrders) || row.paidStatusOrders > row.orders) throw invalid();
    priorDay = row.date;
    dailyCount += row.orders;
    dailyPaid += row.paidStatusOrders;
  }
  if (dailyCount !== summary.totalOrders || dailyPaid !== summary.paidStatusOrders) throw invalid();
  return { summary, metadata: meta };
}

// Aggregated on the server: raw browser identifiers never reach this client.
export function validateBrowserSummary(body, days) {
  const meta = body?.metadata;
  const summary = body?.summary;
  if (body?.ok !== true || meta?.schemaVersion !== 1 || meta.source !== "browser_events_untrusted"
    || meta.complete !== true || meta.days !== days || meta.timezone !== "UTC"
    || meta.snapshot !== "bounded_nontransactional_read" || meta.orderingBasis !== "server_received_created_at"
    || meta.identifiersDefinition !== "mixed_legacy_browser_ids_and_v2_tab_sessions_not_people"
    || !date(meta.since) || !date(meta.until) || !date(meta.fetchedAt)
    || Date.parse(meta.until) - Date.parse(meta.since) !== days * 86_400_000
    || meta.limit !== 50_000 || !count(meta.rowCount) || meta.rowCount > meta.limit
    || !summary || !["totalEvents", "browserIdentifiers", "legacyEvents", "missingIdentifiers"].every(key => count(summary[key]))
    || summary.totalEvents !== meta.rowCount || summary.browserIdentifiers > summary.totalEvents
    || summary.missingIdentifiers > summary.totalEvents || summary.browserIdentifiers > summary.totalEvents - summary.missingIdentifiers
    || (summary.totalEvents > summary.missingIdentifiers && summary.browserIdentifiers === 0) || summary.legacyEvents > summary.totalEvents
    || !Array.isArray(summary.events) || summary.events.length > EVENT_KEYS.size + 1) throw invalid();
  let total = 0;
  const seen = new Set();
  const events = summary.events.map(row => {
    if (!row || (!EVENT_KEYS.has(row.event) && row.event !== "other") || seen.has(row.event)
      || !count(row.count) || row.count === 0) throw invalid();
    seen.add(row.event); total += row.count;
    return { event: row.event, count: row.count };
  });
  if (total !== summary.totalEvents) throw invalid();
  return {
    totalEvents: summary.totalEvents, browserIdentifiers: summary.browserIdentifiers, legacyEvents: summary.legacyEvents, missingIdentifiers: summary.missingIdentifiers, events,
    metadata: { since: meta.since, until: meta.until, fetchedAt: meta.fetchedAt, truncated: false, coverage: "complete_for_requested_window", limit: meta.limit },
  };
}

export async function loadOperationsStudio({ supabase, expectedEmail, days = 30, signal, isCurrent = () => true, onSession = () => {}, fetcher = fetch, timeoutMs = 30_000 }) {
  if (!RANGES.includes(days) || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) throw new OperationsLoadError("unavailable");
  if (!isCurrent() || signal?.aborted) return null;
  const email = String(expectedEmail || "").trim().toLowerCase();
  const { data, error } = await withDeadline(() => supabase.auth.getSession(), signal, timeoutMs);
  if (!isCurrent() || signal?.aborted) return null;
  const session = data?.session;
  if (error || !email || !session?.access_token || typeof session.user?.id !== "string" || !session.user.id
    || String(session.user?.email || "").trim().toLowerCase() !== email) {
    throw new OperationsLoadError("auth");
  }
  onSession(session);
  if (!isCurrent() || signal?.aborted) return null;
  const operation = new AbortController();
  const cancel = () => operation.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) operation.abort();
  const request = (path, validate) => withDeadline(async requestSignal => {
    const response = await fetcher(`${path}?days=${days}`, {
      method: "GET", headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store", signal: requestSignal,
    });
    if (!isCurrent() || signal?.aborted) return null;
    if (response.status === 401 || response.status === 403) throw new OperationsLoadError("auth");
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new OperationsLoadError(body?.code === "OPERATIONS_WINDOW_TOO_LARGE" ? "range" : "unavailable");
    }
    const body = await response.json();
    if (!isCurrent() || signal?.aborted) return null;
    return validate(body, days);
  }, operation.signal, timeoutMs);
  const section = async promise => {
    try {
      const value = await promise;
      return value ? { status: "ready", value } : { status: "error", error: "unavailable" };
    } catch (error) {
      // Denial ends the whole read immediately; it must not wait for a stalled
      // sibling to release privileged data or re-enable the refresh control.
      if (error?.code === "auth") throw error;
      return { status: "error", error: error?.code === "range" ? "range" : "unavailable" };
    }
  };
  try {
    const [orders, traffic] = await Promise.all([
      section(request("/api/admin-operations-summary", validateOrderSummary)),
      section(request("/api/admin-operations-events", validateBrowserSummary)),
    ]);
    if (!isCurrent() || signal?.aborted) return null;
    return { orders, traffic };
  } finally {
    operation.abort();
    signal?.removeEventListener("abort", cancel);
  }
}
