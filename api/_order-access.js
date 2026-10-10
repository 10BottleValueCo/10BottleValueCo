import { requireUser } from "./_auth.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ORDER_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/;
const PAYABLE = new Set(["pending", "checkout", "checkout (clicked pay)", "wire_pending"]);
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const reject = (res, status, code, error) => { res.status(status).json({ ok: false, code, error }); return null; };
export function orderIdentity(user) {
  const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  if (!UUID.test(user?.id || "") || !user.email_confirmed_at || email.length > 320
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { id: user.id.toLowerCase(), email };
}
export function ownsOrder(order, identity) {
  return record(order) && (typeof order.user_id === "string"
    ? order.user_id.toLowerCase() === identity.id
    : order.user_id === null && typeof order.email === "string" && order.email.trim().toLowerCase() === identity.email);
}
export async function requireOrderIdentity(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  const user = await requireUser(req, res);
  if (!user) return null;
  const identity = orderIdentity(user);
  if (!identity) return reject(res, 403, "VERIFIED_ACCOUNT_REQUIRED", "Sign in with a confirmed email to continue.");
  return identity;
}
// Only recorded ownership and access are established here. This is not a
// settlement receipt or a new immutable payment-attempt implementation.
export async function requireLegacyOrderAccess(req, res, { orderId, payable = true, allowAdmin = false, provider = "" } = {}) {
  const identity = await requireOrderIdentity(req, res);
  if (!identity) return null;
  if (typeof orderId !== "string" || !ORDER_ID.test(orderId))
    return reject(res, 400, "INVALID_ORDER_ID", "Enter a valid order number.");
  const body = req.body;
  if (!record(body)) return reject(res, 400, "INVALID_CHECKOUT", "Invalid checkout request.");
  for (const claim of [body.email, body.customer_email, body.metadata?.email]) {
    if (claim != null && claim !== "" && (typeof claim !== "string" || claim.trim().toLowerCase() !== identity.email))
      return reject(res, 403, "CHECKOUT_IDENTITY_MISMATCH", "Checkout email must match your signed-in account.");
  }
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    if (!url || !key) throw new Error("Missing private storage configuration");
    const endpoint = new URL(`${url}/rest/v1/orders`);
    endpoint.searchParams.set("id", `eq.${orderId}`);
    endpoint.searchParams.set("select", "id,user_id,email,status,metadata,payment_provider,total");
    endpoint.searchParams.set("limit", "2");
    const bindingUrl = new URL(`${url}/rest/v1/paylio_payment_attempts`);
    bindingUrl.searchParams.set("order_id", `eq.${orderId}`);
    bindingUrl.searchParams.set("select", "order_id");
    bindingUrl.searchParams.set("limit", "2");
    const read = endpoint => fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
    // Independent private reads start only after authentication and claim checks.
    // Inspect ownership first so reservation errors cannot disclose other orders.
    const readBindings = async () => {
      const response = await read(bindingUrl);
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error("Payment reservation lookup failed");
      }
      return response.json();
    };
    const [orderRead, bindingRead] = await Promise.allSettled([
      read(endpoint), payable ? readBindings() : Promise.resolve(null),
    ]);
    if (orderRead.status !== "fulfilled") throw new Error("Order lookup failed");
    const response = orderRead.value;
    if (!response.ok) throw new Error("Order lookup failed");
    const text = await response.text();
    if (Buffer.byteLength(text) > 250000) throw new Error("Oversized order response");
    const rows = JSON.parse(text);
    if (!Array.isArray(rows) || rows.length > 1) throw new Error("Ambiguous order response");
    const order = rows[0];
    const admin = allowAdmin && identity.email === "support@10bottlevalue.co";
    if (!record(order) || order.id !== orderId || (!admin && !ownsOrder(order, identity)))
      return reject(res, 404, "ORDER_NOT_FOUND", "Order not found for this account.");
    if ((order.metadata != null && !record(order.metadata)) || typeof order.email !== "string") throw new Error("Invalid order");
    if (payable && (order.email.trim().toLowerCase() !== identity.email || !PAYABLE.has(order.status)
      || String(order.payment_provider || order.metadata?.paymentProvider || "").toLowerCase() === "merit"))
      return reject(res, 409, "CHECKOUT_ORDER_CHANGED", "This order has changed. Refresh checkout before continuing.");
    if (payable) {
      if (order.metadata?.legacyInvoiceAttempt && order.metadata.legacyInvoiceAttempt.provider !== provider)
        return reject(res, 409, "PAYMENT_ALREADY_RESERVED", "A payment has already started for this order. Return to that payment or contact support.");
      // A privately reserved Paylio attempt must not be paid a second time via
      // another provider. Its immutable binding is checked independently of
      // editable public metadata. Missing private schema fails closed.
      if (bindingRead.status !== "fulfilled") throw new Error("Payment reservation lookup failed");
      const bindings = bindingRead.value;
      if (!Array.isArray(bindings) || bindings.length > 1 || (bindings.length && bindings[0]?.order_id !== orderId)) throw new Error("Invalid payment reservation");
      if (bindings.length && provider !== "paylio")
        return reject(res, 409, "PAYMENT_ALREADY_RESERVED", "A payment has already started for this order. Return to that payment or contact support.");
    }
    return { identity, order };
  } catch {
    return reject(res, 503, "ORDER_UNAVAILABLE", "Order information is unavailable. Please try again.");
  }
}
