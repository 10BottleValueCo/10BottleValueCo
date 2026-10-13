import { requireAdmin } from "./_require-admin.js";
import { validateCostChange } from "./_order-costs-core.js";

export const config = { maxDuration: 60 };
const validId = id => typeof id === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(id);

// Only the private corrections table and its atomic RPC are accessible here.
// Never PATCH orders or provider payment snapshots.
export function createCostStorageClient(base, key, fetcher = globalThis.fetch) {
  if (!base || !key) throw Object.assign(new Error("Cost storage is not configured."), { status: 503 });
  async function request(path, init = {}) {
    const response = await fetcher(`${base.replace(/\/+$/, "")}/rest/v1/${path}`, {
      ...init, redirect: "error",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const code = /^[A-Z0-9_]+$/.test(data?.code || "") ? data.code : "STORAGE_ERROR";
      const missing = ["42P01", "PGRST202", "PGRST205"].includes(code);
      throw Object.assign(new Error(missing
        ? "Cost correction storage is not ready. Complete the Supabase SQL setup."
        : `The database could not save or load costs. [Code: ${code}]`),
      { code, status: code === "P0002" ? 404 : code === "22023" ? 400 : 503 });
    }
    return data;
  }
  return {
    async list(cursor) {
      const query = new URLSearchParams({
        select: "order_id,line_cost_overrides,supplier_shipping_override,updated_at",
        order: "order_id.asc", limit: "500",
      });
      if (cursor) query.set("order_id", `gt.${cursor}`);
      const rows = await request(`order_cost_overrides?${query}`);
      if (!Array.isArray(rows) || rows.length > 500) throw new Error("Invalid cost storage response.");
      return { rows, nextCursor: rows.length === 500 ? rows.at(-1).order_id : null };
    },
    save(orderId, change, amount) {
      return request("rpc/save_order_cost_override", { method: "POST", body: JSON.stringify({
        p_order_id: orderId, p_kind: change.kind,
        p_line_index: change.kind === "line" ? change.index : null, p_amount: amount,
      }) });
    },
  };
}

export function costRowToOrder(row) {
  if (!validId(row?.order_id) || !row.line_cost_overrides ||
      typeof row.line_cost_overrides !== "object" || Array.isArray(row.line_cost_overrides)) {
    throw new Error("Invalid cost storage response.");
  }
  const metadata = { lineCostOverrides: {} };
  for (const [index, value] of Object.entries(row.line_cost_overrides)) {
    if (String(Number(index)) !== index) throw new Error("Invalid saved line index.");
    const amount = validateCostChange(row.order_id, { kind: "line", index: Number(index), amount: value });
    if (amount !== value) throw new Error("Invalid saved line cost.");
    metadata.lineCostOverrides[index] = amount;
  }
  if (row.supplier_shipping_override != null) {
    const amount = validateCostChange(row.order_id, { kind: "shipping", amount: row.supplier_shipping_override });
    if (amount !== Number(row.supplier_shipping_override)) throw new Error("Invalid saved shipping cost.");
    metadata.supplierShippingOverride = amount;
  }
  return { id: row.order_id, metadata };
}

export function createOrderCostHandler({ authorize = requireAdmin, client } = {}) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Authorization");
    if (!["POST", "GET"].includes(req.method)) {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ ok: false, error: "Method not allowed." });
    }
    if (!await authorize(req, res)) return;
    try {
      const storage = client || createCostStorageClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://danpkqqzcptamojrnrmk.supabase.co",
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );
      if (req.method === "GET") {
        const cursor = req.query?.cursor;
        if (cursor != null && !validId(cursor)) {
          return res.status(400).json({ ok: false, error: "Invalid cost page cursor." });
        }
        const page = await storage.list(cursor);
        return res.status(200).json({ ok: true, orders: page.rows.map(costRowToOrder), nextCursor: page.nextCursor });
      }
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== "object" || Array.isArray(body) ||
          Buffer.byteLength(JSON.stringify(body)) > 2000) {
        return res.status(400).json({ ok: false, error: "Invalid cost change." });
      }
      const { orderId, kind, index, amount } = body;
      const validated = validateCostChange(orderId, { kind, index, amount });
      const order = costRowToOrder(await storage.save(orderId, { kind, index }, validated));
      const persisted = kind === "line" ? order.metadata.lineCostOverrides[index] : order.metadata.supplierShippingOverride;
      if (order.id !== orderId || persisted !== validated) throw new Error("The saved cost could not be verified.");
      return res.status(200).json({ ok: true, order });
    } catch (error) {
      const status = error instanceof SyntaxError ? 400 : error.status || 503;
      console.warn("Order cost storage failed", { code: error.code || "COST_STORAGE_ERROR", status });
      return res.status(status).json({ ok: false, error: error.status ? error.message : "Cost storage is unavailable. Please retry." });
    }
  };
}

export default createOrderCostHandler();
