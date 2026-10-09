const PAID = new Set(["paid", "done", "completed"]);
const UNPAID = new Set(["refunded", "cancelled", "canceled", "failed", "expired"]);
const PENDING = new Set(["pending", "checkout", "checkout (clicked pay)", "wire_pending"]);
const emailOf = value => String(value || "").trim().toLowerCase();
const idOf = value => String(value || "").trim().toUpperCase();

export function isLegacyPaidStatus(status) {
  return PAID.has(String(status || "").trim().toLowerCase());
}

export function readPaymentReturn(search) {
  const params = new URLSearchParams(search || "");
  const requestedStatus = (params.get("payment") || "").trim().toLowerCase();
  if (!["success", "pending", "cancelled", "cancel", "failed"].includes(requestedStatus)) {
    return { status: "", order: "", provider: "", piId: "" };
  }
  // Every provider's return URL is a lookup hint, including cancellation.
  return {
    status: "pending", origin: "provider-return", requestedStatus,
    order: idOf(params.get("order")), provider: (params.get("provider") || "").trim().toLowerCase(),
    piId: (params.get("pi") || params.get("payment_intent") || "").trim(),
    paymentId: (params.get("NP_id") || params.get("payment_id") || "").trim(),
  };
}

class CheckoutIdentityError extends Error {
  constructor() {
    super("Sign in with the account used for this order and use its email at checkout.");
    this.code = "authentication_required";
  }
}

async function checkoutSession(supabase, expectedEmail, expectedUserId) {
  const { data, error } = await supabase.auth.getSession();
  const session = data?.session;
  if (error || !session?.access_token || !session.user?.id || !emailOf(expectedEmail)
    || emailOf(session.user.email) !== emailOf(expectedEmail)
    || (expectedUserId && session.user.id !== expectedUserId)) throw new CheckoutIdentityError();
  return session;
}

export async function legacyCheckoutHeaders(supabase, expectedEmail) {
  const session = await checkoutSession(supabase, expectedEmail);
  return { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` };
}

// Only the authenticated canonical order read can confirm payment. Provider
// reconciliation may update it, but its response never becomes a receipt.
export async function checkLegacyPaymentReturn({
  supabase, expectedEmail, paymentReturn, attempt = 1,
  isCurrent = () => true, signal, fetcher = fetch, timeoutMs = 15_000,
}) {
  const controller = new AbortController();
  const current = () => !controller.signal.aborted && !signal?.aborted && isCurrent();
  let timer;
  let stop;
  const stopped = new Promise(resolve => { stop = () => { controller.abort(); resolve(null); }; });
  signal?.addEventListener("abort", stop, { once: true });
  const deadline = new Promise(resolve => {
    timer = setTimeout(() => {
      const stale = signal?.aborted || !isCurrent();
      controller.abort();
      resolve(stale ? null : { status: "unavailable", order: null });
    }, timeoutMs);
  });
  const task = async () => {
    if (!current()) return null;
    const orderId = idOf(paymentReturn.order);
    if (!/^[A-Z0-9][A-Z0-9_-]{0,159}$/.test(orderId)) return { status: "not-found", order: null };
    const initial = await checkoutSession(supabase, expectedEmail);
    if (!current()) return null;
    const sessionForRequest = () => checkoutSession(supabase, expectedEmail, initial.user.id);
    const read = async () => {
      const session = await sessionForRequest();
      if (!current()) return null;
      const response = await fetcher(`/api/order-checkout?orderId=${encodeURIComponent(orderId)}`, {
        method: "GET", headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: "same-origin", cache: "no-store", signal: controller.signal,
      });
      if (!current()) return null;
      if (response.status === 401 || response.status === 403) throw new CheckoutIdentityError();
      if (response.status === 404) return { status: "not-found", order: null };
      if (!response.ok) throw new Error("Order status unavailable.");
      const body = await response.json();
      if (!current()) return null;
      await sessionForRequest();
      if (!current()) return null;
      if (body?.ok !== true || body.id !== orderId || typeof body.status !== "string") throw new Error("Invalid order status.");
      const status = body.status.trim().toLowerCase();
      if (PAID.has(status)) return { status: "paid", order: { id: body.id, status } };
      if (UNPAID.has(status)) return { status: "unconfirmed", order: null };
      if (!PENDING.has(status)) throw new Error("Unknown order status.");
      return { status: "pending", order: null };
    };
    const first = await read();
    if (!current()) return null;
    if (!first || first.status !== "pending") return first;
    let request;
    if ([1, 3, 6].includes(attempt) && paymentReturn.provider === "stripe") {
      request = ["/api/confirm-stripe-payment", { orderId, paymentIntentId: paymentReturn.piId || "" }];
    } else if ([1, 3, 6].includes(attempt) && paymentReturn.provider === "nowpayments") {
      request = ["/api/verify-nowpayments-payment", { order_id: orderId, payment_id: paymentReturn.paymentId || undefined }];
    }
    if (!request) return first;
    const session = await sessionForRequest();
    if (!current()) return null;
    try {
      const response = await fetcher(request[0], {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        credentials: "same-origin", cache: "no-store", body: JSON.stringify(request[1]), signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) throw new CheckoutIdentityError();
    } catch (error) {
      if (error?.code === "authentication_required") throw error;
      // Lost provider responses remain ambiguous; re-read recorded state.
    }
    if (!current()) return null;
    return read();
  };
  try { return await Promise.race([task(), deadline, stopped]); }
  catch (error) {
    if (!current()) return null;
    return { status: error?.code === "authentication_required" ? "signin" : "unavailable", order: null };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", stop);
    controller.abort();
  }
}

// Local presentation cache only. Do not invent payment IDs/timestamps, send
// emails, debit credit, or write promo/affiliate ledgers from a return page.
export function syncVerifiedLegacyOrder(orders, verified, expectedEmail) {
  let receipt = null;
  if (!verified || !PAID.has(verified.status) || !emailOf(expectedEmail)) return { orders, receipt };
  const next = (Array.isArray(orders) ? orders : []).map(order => {
    if (idOf(order?.id) !== verified.id || emailOf(order?.email) !== emailOf(expectedEmail)) return order;
    receipt = { ...order, status: verified.status };
    return receipt;
  });
  return { orders: next, receipt };
}
