const unknownHistory = () =>
  new Error("Order history could not be verified. Please refresh.");
const validAmount = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

// Ownership and pagination belong to the API. The expected email only prevents
// a session switch from delivering one account's response into another view.
export async function loadAccountOrders({
  supabase,
  expectedEmail,
  isCurrent = () => true,
  fetcher = fetch,
}) {
  const { data, error } = await supabase.auth.getSession();
  if (!isCurrent()) return null;
  const session = data?.session;
  const email = String(expectedEmail || "")
    .trim()
    .toLowerCase();
  if (
    error ||
    !session?.access_token ||
    !email ||
    String(session.user?.email || "")
      .trim()
      .toLowerCase() !== email
  ) {
    throw new Error("Sign in again to load your order history.");
  }
  const response = await fetcher("/api/account-orders", {
    method: "GET",
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });
  if (!isCurrent()) return null;
  if (!response.ok) throw unknownHistory();
  const body = await response.json();
  if (!isCurrent()) return null;
  if (
    body?.ok !== true ||
    body.complete !== true ||
    !Array.isArray(body.orders) ||
    !Number.isSafeInteger(body.total) ||
    body.total < 0 ||
    body.total !== body.orders.length
  )
    throw unknownHistory();
  const ids = new Set();
  for (const order of body.orders) {
    if (
      !order ||
      typeof order.id !== "string" ||
      !order.id ||
      ids.has(order.id) ||
      order.status !== "paid" ||
      (order.total !== null && !validAmount(order.total)) ||
      !Array.isArray(order.items)
    )
      throw unknownHistory();
    ids.add(order.id);
    for (const item of order.items) {
      if (
        !item ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        (item.price !== null && !validAmount(item.price))
      )
        throw unknownHistory();
    }
  }
  return body.orders;
}

export function canViewAccountOrderConfirmation(order) {
  return (
    order?.status === "paid" &&
    validAmount(order.total) &&
    Array.isArray(order.items) &&
    order.items.length > 0 &&
    order.items.every(
      (item) =>
        validAmount(item?.price) &&
        Number.isSafeInteger(item?.quantity) &&
        item.quantity > 0,
    )
  );
}

export function isAccountHistoryConfirmation(state) {
  return (
    state?.origin === "account-history" &&
    state.status === "success" &&
    !state.provider
  );
}

export function clearAccountHistoryConfirmation(state) {
  return state?.origin === "account-history"
    ? { status: "", order: "", provider: "", piId: "" }
    : state;
}
