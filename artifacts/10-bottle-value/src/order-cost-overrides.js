import { validateCostChange } from "../../../api/_order-costs-core.js";
export { parseCostAmount, unitCostToLineCost, validateCostChange } from "../../../api/_order-costs-core.js";

async function requestCosts(client, options, query = "", body) {
  const session = await client.auth.getSession();
  const token = session.data?.session?.access_token;
  if (session.error || !token) throw new Error("Sign in as an administrator and retry.");
  const base = (import.meta.env?.BASE_URL || "/").replace(/\/$/, "");
  const response = await (options.fetch || globalThis.fetch)((options.endpoint || `${base}/api/admin-order-costs`) + query, {
    method: body ? "POST" : "GET", cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(45000),
  });
  const result = await response.json().catch(() => null);
  if (response.status === 401) throw new Error("Your session expired. Sign in again and retry.");
  if (response.status === 403) throw new Error("Administrator access is required to save or load costs.");
  if (!response.ok || !result?.ok) throw new Error(result?.error || "The server could not save or load costs. Retry.");
  return result;
}

export async function loadOrderCostOverrides(client, options = {}) {
  const costs = Object.create(null);
  let cursor = null;
  const seen = new Set();
  for (let page = 0; page < 100; page++) {
    const result = await requestCosts(client, options, cursor ? `?cursor=${encodeURIComponent(cursor)}` : "");
    if (!Array.isArray(result.orders)) throw new Error("Saved cost response is invalid.");
    for (const row of result.orders) {
      if (!row?.id || !row.metadata || typeof row.metadata !== "object" || Array.isArray(row.metadata)) throw new Error("Saved cost response is invalid.");
      costs[row.id] = row.metadata;
    }
    if (result.nextCursor == null) return costs;
    if (typeof result.nextCursor !== "string" || seen.has(result.nextCursor)) throw new Error("Saved cost pagination is invalid.");
    seen.add(result.nextCursor);
    cursor = result.nextCursor;
  }
  throw new Error("Saved cost pagination exceeded its limit.");
}

// Financial writes go through the authorized server, never the browser's RLS
// permissions. The server credential is not sent to or bundled in the browser.
export function createOrderCostSaver(client, options = {}) {
  const pending = new Map();
  async function write(orderId, change) {
    const amount = validateCostChange(orderId, change);
    const result = await requestCosts(client, options, "", { orderId, kind: change.kind, amount,
      ...(change.kind === "line" ? { index: change.index } : {}) });
    const saved = result.order;
    const persisted = change.kind === "line"
      ? saved?.metadata?.lineCostOverrides?.[change.index]
      : saved?.metadata?.supplierShippingOverride;
    if (saved?.id !== orderId || persisted !== amount) {
      throw new Error("The saved cost could not be verified. Refresh the order and retry.");
    }
    return saved;
  }
  return function saveOrderCost(orderId, change) {
    const previous = pending.get(orderId) || Promise.resolve();
    const job = previous.catch(() => {}).then(() => write(orderId, change));
    pending.set(orderId, job);
    const cleanup = () => { if (pending.get(orderId) === job) pending.delete(orderId); };
    job.then(cleanup, cleanup);
    return job;
  };
}
