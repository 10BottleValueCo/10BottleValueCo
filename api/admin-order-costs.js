import { requireAdmin } from "./_require-admin.js";
import { createDatabaseOrderCostSaver, validateCostChange } from "./_order-costs-core.js";

export const config = { maxDuration: 60 };

// Minimal PostgREST adapter: the only writable column is order metadata.
// Service credentials stay in this server module and are never returned.
export function createCostStorageClient(base, key, fetcher = globalThis.fetch) {
  if (!base || !key) throw Object.assign(new Error("Order storage is not configured."), { status: 503 });
  return {
    from(table) {
      if (table !== "orders") throw new Error("Invalid cost storage table.");
      const url = new URL(`${base.replace(/\/+$/, "")}/rest/v1/orders`);
      let method = "GET", body;
      const execute = async required => {
        const response = await fetcher(url, {
          method, redirect: "error",
          headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
            Prefer: "return=representation" },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: AbortSignal.timeout(6000),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) return { data: null, error: {
          code: data?.code || `HTTP_${response.status}`, details: data?.details || "",
        } };
        if (!Array.isArray(data)) return { data: null, error: { code: "INVALID_RESPONSE" } };
        if (data.length === 0 && !required) return { data: null, error: null };
        if (data.length !== 1) return { data: null, error: {
          code: "PGRST116", details: `The result contains ${data.length} rows`,
        } };
        return { data: data[0], error: null };
      };
      const query = {
        select(fields) { url.searchParams.set("select", fields); return query; },
        eq(field, value) { url.searchParams.set(field, `eq.${value}`); return query; },
        is(field, value) { url.searchParams.set(field, `is.${value}`); return query; },
        update(value) { method = "PATCH"; body = value; return query; },
        single() { return execute(true); },
        maybeSingle() { return execute(false); },
      };
      return query;
    },
  };
}

export function createOrderCostHandler({ authorize = requireAdmin, client } = {}) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Authorization");
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, error: "Method not allowed." });
    }
    if (!await authorize(req, res)) return;
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== "object" || Array.isArray(body) ||
          Buffer.byteLength(JSON.stringify(body)) > 2000) {
        return res.status(400).json({ ok: false, error: "Invalid cost change." });
      }
      const { orderId, kind, index, amount } = body;
      const validated = validateCostChange(orderId, { kind, index, amount });
      const storage = client || createCostStorageClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://danpkqqzcptamojrnrmk.supabase.co",
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );
      const save = createDatabaseOrderCostSaver(storage);
      const order = await save(orderId, { kind, index, amount: validated });
      return res.status(200).json({ ok: true, order: { id: order.id, metadata: order.metadata } });
    } catch (error) {
      const status = error instanceof SyntaxError ? 400 : error.status || 503;
      // Do not log metadata, customer details, authorization or provider keys.
      console.warn("Order cost save failed", { code: error.code || "COST_SAVE_ERROR", status });
      return res.status(status).json({ ok: false, error: status === 400
        ? error.message
        : error.status ? error.message : "Order cost storage is unavailable. Please retry." });
    }
  };
}

export default createOrderCostHandler();
