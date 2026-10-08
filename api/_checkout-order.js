const PAYABLE = new Set(["pending", "checkout", "checkout (clicked pay)"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const failure = (res, status, code, error) => {
  res.status(status).json({ code, error });
  return null;
};
const unavailable = (res) =>
  failure(
    res,
    503,
    "CHECKOUT_ORDER_UNAVAILABLE",
    "Your order could not be verified or saved. Please try again.",
  );
const refresh = (res) =>
  failure(
    res,
    409,
    "CHECKOUT_ORDER_CHANGED",
    "This order has changed. Refresh checkout before continuing.",
  );

async function rowsFrom(response) {
  if (!response.ok) throw new Error("Order storage unavailable");
  const text = await response.text();
  if (text.length > 250_000) throw new Error("Unexpected order response size");
  const rows = JSON.parse(text);
  if (!Array.isArray(rows) || rows.length > 1) throw new Error("Ambiguous order response");
  return rows;
}

// This validates the recorded owner, not the provenance of browser-writable
// columns. The server-created immutable quote and RLS cutover remain required.
export async function requireCheckoutOrder({ orderId, identity, sbUrl, sbKey }, res) {
  if (typeof orderId !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(orderId)) {
    return failure(res, 400, "CHECKOUT_ORDER_ID_INVALID", "Invalid order identifier.");
  }
  if (!sbUrl || !sbKey) return unavailable(res);
  const url = new URL(`${sbUrl.replace(/\/+$/, "")}/rest/v1/orders`);
  url.searchParams.set("id", `eq.${orderId}`);
  url.searchParams.set("select", "id,user_id,email,status,metadata");
  url.searchParams.set("limit", "2");
  const headers = {
    apikey: sbKey,
    Authorization: `Bearer ${sbKey}`,
    "Content-Type": "application/json",
  };
  try {
    const rows = await rowsFrom(
      await fetch(url.toString(), { headers, signal: AbortSignal.timeout(8_000) }),
    );
    const order = rows[0];
    const ownedById =
      record(order) &&
      typeof order.user_id === "string" &&
      UUID.test(order.user_id) &&
      order.user_id.toLowerCase() === identity.id;
    const ownedLegacy =
      record(order) &&
      order.user_id === null &&
      typeof order.email === "string" &&
      order.email.toLowerCase() === identity.email;
    if (!record(order) || order.id !== orderId || (!ownedById && !ownedLegacy)) {
      return failure(
        res,
        404,
        "CHECKOUT_ORDER_NOT_FOUND",
        "This order is not available for your account.",
      );
    }
    // Provider reconciliation uses this email as well as ownership. Do not
    // silently rewrite the historical contact of an existing order.
    if (
      typeof order.email !== "string" ||
      order.email.toLowerCase() !== identity.email ||
      !PAYABLE.has(order.status)
    )
      return refresh(res);
    if (order.metadata != null && !record(order.metadata)) return unavailable(res);
    return {
      order: { ...order, metadata: order.metadata || {} },
      identity,
      baseUrl: url.origin + url.pathname,
      headers,
    };
  } catch {
    return unavailable(res);
  }
}

// Commit and check the canonical price before returning a payable provider
// object. Owner/status conditions prevent a stale read from overwriting a
// concurrently paid or reassigned row. This is not an immutable quote lock.
export async function persistCheckoutPricing(
  context,
  { total, items, metadata },
  res,
  { providerCreated = false } = {},
) {
  const failed = () =>
    providerCreated
      ? failure(
          res,
          503,
          "CHECKOUT_INVOICE_BINDING_FAILED",
          "A payment invoice was created but could not be linked. Contact support before retrying.",
        )
      : unavailable(res);
  const changed = () => (providerCreated ? failed() : refresh(res));
  const { order, identity, baseUrl, headers } = context;
  if (
    typeof total !== "number" ||
    !Number.isFinite(total) ||
    total <= 0 ||
    !Number.isSafeInteger(Math.round(total * 100)) ||
    Math.abs(total * 100 - Math.round(total * 100)) > 0.000001 ||
    !Array.isArray(items) ||
    items.length === 0 ||
    !record(metadata)
  )
    return failed();
  const url = new URL(baseUrl);
  url.searchParams.set("id", `eq.${order.id}`);
  url.searchParams.set("user_id", order.user_id === null ? "is.null" : `eq.${order.user_id}`);
  url.searchParams.set("email", `eq.${order.email}`);
  url.searchParams.set("status", `eq.${order.status}`);
  url.searchParams.set("select", "id,user_id,email,status,total");
  const nextMetadata = { ...order.metadata, ...metadata, id: order.id, email: order.email, status: "checkout (clicked pay)", total, items };
  const next = {
    user_id: identity.id,
    status: "checkout (clicked pay)",
    total,
    items,
    metadata: nextMetadata,
  };
  try {
    const rows = await rowsFrom(
      await fetch(url.toString(), {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(next),
        signal: AbortSignal.timeout(8_000),
      }),
    );
    if (rows.length === 0) return changed();
    const saved = rows[0];
    if (
      !record(saved) ||
      saved.id !== order.id ||
      saved.user_id !== identity.id ||
      saved.email !== order.email ||
      saved.status !== next.status ||
      (typeof saved.total !== "number" && typeof saved.total !== "string") ||
      !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(saved.total)) ||
      Number(saved.total) !== total
    )
      return failed();
    context.order = { ...order, ...saved, metadata: nextMetadata };
    return context.order;
  } catch {
    return failed();
  }
}
