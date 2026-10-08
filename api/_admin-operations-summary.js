export const OPERATIONS_PAGE_SIZE = 500;
export const MAX_OPERATIONS_ORDERS = 5_000;
const MAX_PAGE_BYTES = 1_000_000;
const ORDER_FIELDS = "id,status,created_at,payment_id,paid_at,total";
const KNOWN_STATUSES = new Set([
  "paid", "pending", "checkout", "checkout (clicked pay)", "cancelled",
  "canceled", "failed", "refunded", "expired", "processing", "shipped", "delivered",
]);

export class OperationsSummaryError extends Error {
  constructor(code = "OPERATIONS_READ_INCOMPLETE", status = 502) {
    super("The order summary could not be read completely.");
    this.code = code;
    this.status = status;
  }
}

export function operationsDays(query = {}) {
  if (Object.keys(query).some(key => key !== "days")) return null;
  const raw = query.days ?? "30";
  return typeof raw === "string" && /^(1|7|30|90)$/.test(raw) ? Number(raw) : null;
}

function timestamp(value) {
  if (typeof value !== "string" || value.length > 64
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function knownAmount(value) {
  if (!["number", "string"].includes(typeof value)
    || !/^(?:0|[1-9]\d{0,12})(?:\.\d{1,2})?$/.test(String(value))) return false;
  const [whole, fraction = ""] = String(value).split(".");
  return Number.isSafeInteger(Number(whole) * 100 + Number(fraction.padEnd(2, "0")));
}

async function page(config, window, offset, signal, fetcher) {
  const url = new URL(`${config.url.replace(/\/+$/, "")}/rest/v1/orders`);
  url.searchParams.set("select", ORDER_FIELDS);
  url.searchParams.set("and", `(created_at.gte.${window.since},created_at.lte.${window.until})`);
  url.searchParams.set("order", "created_at.desc,id.asc");
  url.searchParams.set("limit", String(OPERATIONS_PAGE_SIZE));
  url.searchParams.set("offset", String(offset));
  const response = await fetcher(url, {
    method: "GET",
    headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}`, Prefer: "count=exact" },
    signal,
  });
  if (!response.ok) throw new OperationsSummaryError();
  const range = /^(?:(\d+)-(\d+)|\*)\/(\d+)$/.exec(response.headers.get("content-range") || "");
  if (!range) throw new OperationsSummaryError();
  const total = Number(range[3]);
  if (!Number.isSafeInteger(total) || total < 0) throw new OperationsSummaryError();
  if (total > MAX_OPERATIONS_ORDERS) throw new OperationsSummaryError("OPERATIONS_WINDOW_TOO_LARGE", 503);
  const body = await response.text();
  if (Buffer.byteLength(body) > MAX_PAGE_BYTES) throw new OperationsSummaryError();
  let rows;
  try { rows = JSON.parse(body); } catch { throw new OperationsSummaryError(); }
  const expected = Math.min(OPERATIONS_PAGE_SIZE, Math.max(0, total - offset));
  if (!Array.isArray(rows) || rows.length !== expected
    || (expected === 0 ? range[1] !== undefined
      : Number(range[1]) !== offset || Number(range[2]) !== offset + expected - 1)) throw new OperationsSummaryError();
  return { rows, total };
}

// Aggregate on the server and return no order IDs, payment IDs, customer fields
// or metadata. These are current database states grouped by creation time,
// never processor settlements, paid-day revenue or a transactional snapshot.
export async function readOperationsSummary(config, days, {
  now = new Date(), fetcher = fetch, signal = AbortSignal.timeout(15_000),
} = {}) {
  if (![1, 7, 30, 90].includes(days) || !Number.isFinite(now.getTime())) throw new OperationsSummaryError();
  const end = now.getTime();
  const start = end - days * 86_400_000;
  const window = { since: new Date(start).toISOString(), until: now.toISOString() };
  const summary = { totalOrders: 0, paidStatusOrders: 0, paidMissingPaymentId: 0, paidMissingPaidAt: 0, paidMissingTotal: 0 };
  const statuses = new Map();
  const daily = new Map();
  const ids = new Set();
  let expectedTotal;
  let previousTime = Infinity;
  for (let offset = 0; offset < MAX_OPERATIONS_ORDERS; offset += OPERATIONS_PAGE_SIZE) {
    const result = await page(config, window, offset, signal, fetcher);
    if (expectedTotal !== undefined && result.total !== expectedTotal) throw new OperationsSummaryError();
    expectedTotal = result.total;
    for (const row of result.rows) {
      const time = timestamp(row?.created_at);
      if (!row || typeof row.id !== "string" || !row.id || row.id.length > 160 || ids.has(row.id)
        || time === null || time < start || time > end || time > previousTime
        || (row.status !== null && typeof row.status !== "string")
        || (typeof row.status === "string" && row.status.length > 128)
        || (row.payment_id !== null && typeof row.payment_id !== "string")) throw new OperationsSummaryError();
      ids.add(row.id);
      previousTime = time;
      const statusValue = String(row.status || "").trim().toLowerCase();
      const status = KNOWN_STATUSES.has(statusValue) ? statusValue : "other";
      const isPaid = status === "paid";
      summary.totalOrders += 1;
      summary.paidStatusOrders += Number(isPaid);
      if (isPaid) {
        summary.paidMissingPaymentId += Number(!row.payment_id?.trim());
        summary.paidMissingPaidAt += Number(timestamp(row.paid_at) === null);
        summary.paidMissingTotal += Number(!knownAmount(row.total));
      }
      statuses.set(status, (statuses.get(status) || 0) + 1);
      const date = new Date(time).toISOString().slice(0, 10);
      const day = daily.get(date) || { date, orders: 0, paidStatusOrders: 0 };
      day.orders += 1;
      day.paidStatusOrders += Number(isPaid);
      daily.set(date, day);
    }
    if (summary.totalOrders === expectedTotal) return {
      ok: true,
      summary: {
        ...summary,
        statuses: [...statuses].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count || a.status.localeCompare(b.status)),
        daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
      },
      metadata: {
        schemaVersion: 1, source: "orders_recorded_state", days, ...window,
        fetchedAt: new Date().toISOString(), timezone: "UTC", dateBasis: "order_created_at",
        complete: true, rowCount: expectedTotal, limit: MAX_OPERATIONS_ORDERS,
        snapshot: "bounded_nontransactional_read",
        money: "unavailable_currency_and_settlement_not_verified",
      },
    };
  }
  throw new OperationsSummaryError();
}
