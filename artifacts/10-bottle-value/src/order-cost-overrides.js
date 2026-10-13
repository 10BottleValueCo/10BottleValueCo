import { validateCostChange } from "../../../api/_order-costs-core.js";
export { parseCostAmount, unitCostToLineCost, validateCostChange, createDatabaseOrderCostSaver } from "../../../api/_order-costs-core.js";

// Financial writes go through the authorized server, never the browser's RLS
// permissions. The server credential is not sent to or bundled in the browser.
export function createOrderCostSaver(client, options = {}) {
  const pending = new Map();
  const fetcher = options.fetch || globalThis.fetch;
  const base = (import.meta.env?.BASE_URL || "/").replace(/\/$/, "");
  const endpoint = options.endpoint || `${base}/api/admin-order-costs`;
  async function write(orderId, change) {
    const amount = validateCostChange(orderId, change);
    const sessionResult = await client.auth.getSession();
    const token = sessionResult.data?.session?.access_token;
    if (sessionResult.error || !token) throw new Error("Sign in as an administrator and retry.");
    const response = await fetcher(endpoint, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderId, kind: change.kind, amount,
        ...(change.kind === "line" ? { index: change.index } : {}) }),
      signal: AbortSignal.timeout(45000),
    });
    const result = await response.json().catch(() => null);
    if (response.status === 401) throw new Error("Your session expired. Sign in again and retry.");
    if (response.status === 403) throw new Error("Administrator access is required to save costs.");
    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || "The server could not save the cost. Retry.");
    }
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
