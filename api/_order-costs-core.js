const record = value => value !== null && typeof value === "object" && !Array.isArray(value);

export function parseCostAmount(raw) {
  const text = String(raw ?? "").trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(text)) {
    throw new Error("Enter a non-negative amount with up to 2 decimal places.");
  }
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount > 1000000) {
    throw new Error("Enter an amount between 0 and 1,000,000.");
  }
  return Math.round(amount * 100) / 100;
}

export function unitCostToLineCost(amount, quantity) {
  const unitCost = parseCostAmount(amount);
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("This order has an invalid quantity.");
  return parseCostAmount((Math.round(unitCost * 100) * qty / 100).toFixed(2));
}

function storageError(error) {
  const code = /^[A-Z0-9_]+$/.test(error?.code || "") ? error.code : "STORAGE_ERROR";
  const message = error?.code === "42501"
    ? "The database denied saving the cost."
    : "The database could not save the cost.";
  return Object.assign(new Error(`${message} [Code: ${code}]`), { code, status: 503 });
}

export function validateCostChange(orderId, change) {
  if (typeof orderId !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(orderId) ||
      !["line", "shipping"].includes(change?.kind)) {
    throw Object.assign(new Error("Invalid cost change."), { status: 400 });
  }
  if (change.kind === "line" &&
      (!Number.isSafeInteger(change.index) || change.index < 0 || change.index > 9999)) {
    throw Object.assign(new Error("Invalid order line."), { status: 400 });
  }
  try { return parseCostAmount(change.amount); }
  catch (error) { throw Object.assign(error, { status: 400 }); }
}

// Server-only caller: authorization must run before using its database client.
// Preserve concurrent metadata changes with a bounded compare-and-swap retry.
export function createDatabaseOrderCostSaver(client) {
  const pending = new Map();

  async function write(orderId, change) {
    if (!client?.from) throw new Error("Order storage is unavailable.");
    const amount = validateCostChange(orderId, change);
    for (let attempt = 0; attempt < 3; attempt++) {
      const read = await client.from("orders").select("id,metadata,items").eq("id", orderId).single();
      if (read.error?.code === "PGRST116") {
        throw Object.assign(new Error("Order not found or no longer accessible."), { status: 404 });
      }
      if (read.error) throw storageError(read.error);
      if (!read.data || String(read.data.id) !== String(orderId)) throw new Error("Order not found.");
      const rawMetadata = read.data.metadata;
      if (rawMetadata != null && !record(rawMetadata)) throw new Error("Order metadata is invalid. No changes were saved.");
      const base = rawMetadata ?? {};
      const items = Array.isArray(base.items) && base.items.length > 0 ? base.items : read.data.items;
      if (change.kind === "line" && (!Array.isArray(items) || change.index >= items.length)) {
        throw Object.assign(new Error("This order line no longer exists. Refresh the order."), { status: 400 });
      }
      let metadata;
      if (change.kind === "line") {
        if (base.lineCostOverrides != null && !record(base.lineCostOverrides)) {
          throw new Error("Saved line costs are invalid. No changes were saved.");
        }
        metadata = { ...base, lineCostOverrides: { ...base.lineCostOverrides, [change.index]: amount } };
      } else {
        metadata = { ...base, supplierShippingOverride: amount };
      }
      let query = client.from("orders").update({ metadata }).eq("id", orderId);
      query = rawMetadata == null
        ? query.is("metadata", null)
        : query.eq("metadata", JSON.stringify(rawMetadata));
      const saved = await query.select("id,metadata").maybeSingle();
      // PostgREST can return PGRST116 (rather than data:null) for a PATCH
      // that matched zero rows. Refresh metadata before a bounded retry.
      if (saved.error?.code === "PGRST116" && /\b0 rows\b/i.test(saved.error.details || "")) continue;
      if (saved.error) throw storageError(saved.error);
      if (!saved.data) continue; // Metadata changed, or RLS rejected the write.
      const persisted = change.kind === "line"
        ? saved.data.metadata?.lineCostOverrides?.[change.index]
        : saved.data.metadata?.supplierShippingOverride;
      if (String(saved.data.id) !== String(orderId) || persisted !== amount) {
        throw new Error("The saved cost could not be verified. Refresh the order and retry.");
      }
      return saved.data;
    }
    throw Object.assign(new Error("The order changed or saving was denied. Refresh and retry; this cost was not saved."), { status: 409 });
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

