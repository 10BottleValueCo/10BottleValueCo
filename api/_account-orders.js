export const ACCOUNT_ORDER_PAGE_SIZE = 200;
export const MAX_ACCOUNT_ORDERS = 1_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_ITEMS_PER_ORDER = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SELECT = "id,user_id,email,total,status,created_at,paid_at,payment_provider,items,metadata";

export class AccountOrdersError extends Error {
  constructor(code = "ACCOUNT_ORDERS_UNAVAILABLE", status = 502) {
    super("Order history could not be loaded completely. Please try again.");
    this.code = code;
    this.status = status;
  }
}

export function accountIdentity(user) {
  if (typeof user?.id !== "string" || !UUID.test(user.id)
    || !user.email_confirmed_at || typeof user.email !== "string"
    || !user.email.trim() || user.email.length > 320 || /[\u0000-\u001f\u007f]/.test(user.email)) return null;
  return { id: user.id.toLowerCase(), email: user.email.trim().toLowerCase() };
}

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value, maxLength = 320) {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string" || value.length > maxLength) throw new AccountOrdersError();
  return value;
}

function date(value) {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 64 || !Number.isFinite(Date.parse(value))) throw new AccountOrdersError();
  return value;
}

function money(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" && typeof value !== "string") throw new AccountOrdersError();
  const valueText = String(value);
  if (!/^(?:0|[1-9]\d{0,13})(?:\.\d{1,2})?$/.test(valueText)) throw new AccountOrdersError();
  const [whole, fraction = ""] = valueText.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) throw new AccountOrdersError();
  return cents / 100;
}

function items(value) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_ITEMS_PER_ORDER) throw new AccountOrdersError();
  return value.map(item => {
    if (!record(item)) throw new AccountOrdersError();
    const name = text(item.name, 320);
    const quantityValue = item.quantity ?? item.qty;
    if (!name.trim() || !["string", "number"].includes(typeof quantityValue)
      || !/^[1-9]\d{0,5}$/.test(String(quantityValue))) throw new AccountOrdersError();
    return {
      name,
      dose: text(item.dose, 120),
      quantity: Number(quantityValue),
      price: money(item.price),
      fromWarehouse: text(item.fromWarehouse, 80),
      noteLabel: text(item.noteLabel, 320),
    };
  });
}

// This is a customer presentation of current recorded paid state, not a
// settlement ledger. Ownership columns themselves remain untrusted until the
// coordinated orders/RLS/quote migration prevents browser reassignment.
export function projectAccountOrder(row, identity) {
  if (!record(row) || typeof row.id !== "string" || !row.id.trim() || row.id.length > 160
    || typeof row.email !== "string" || !row.email.trim() || row.email.length > 320
    || typeof row.status !== "string" || row.status.toLowerCase() !== "paid") throw new AccountOrdersError();
  const ownedById = typeof row.user_id === "string" && UUID.test(row.user_id)
    && row.user_id.toLowerCase() === identity.id;
  const ownedLegacy = row.user_id === null && row.email.toLowerCase() === identity.email;
  if (!ownedById && !ownedLegacy) throw new AccountOrdersError("ACCOUNT_ORDER_OWNERSHIP_INVALID");

  if (row.metadata !== null && row.metadata !== undefined && !record(row.metadata)) throw new AccountOrdersError();
  const meta = row.metadata || {};
  if (row.items !== null && row.items !== undefined && !Array.isArray(row.items)) throw new AccountOrdersError();
  // Do not join item lines by name+dose: separate warehouse variants can share
  // those strings. Prefer the structured snapshot, then legacy metadata items.
  const orderItems = Array.isArray(row.items) && row.items.length > 0 ? row.items : meta.items;
  return {
    id: row.id,
    email: row.email,
    status: row.status.toLowerCase(),
    total: money(row.total),
    createdAt: date(row.created_at),
    paidAt: date(row.paid_at),
    items: items(orderItems),
    paymentProvider: text(row.payment_provider ?? meta.paymentProvider, 120),
    subtotal: money(meta.subtotal),
    shipping: money(meta.shipping),
    shippingType: text(meta.shippingType, 120),
    trackingNumber: text(meta.trackingNumber ?? meta.tracking_number, 160),
    trackingNumber2: text(meta.trackingNumber2 ?? meta.tracking_number_2, 160),
    firstName: text(meta.firstName),
    lastName: text(meta.lastName),
    address: text(meta.address, 1_000),
    address2: text(meta.address2, 1_000),
    city: text(meta.city),
    state: text(meta.state),
    postalCode: text(meta.postalCode, 80),
    country: text(meta.country),
    phone: text(meta.phone, 100),
    taxId: text(meta.taxId, 160),
    orderNotes: text(meta.orderNotes, 4_000),
  };
}

async function readPage(config, identity, offset) {
  const endpoint = new URL(`${config.url}/rest/v1/orders`);
  endpoint.searchParams.set("select", SELECT);
  // Anchored, entirely escaped regex preserves legacy email casing without
  // ILIKE's %/_ wildcards or PostgREST's * alias. Quote separately for the
  // logical-filter grammar; URL encoding alone does not escape that grammar.
  const emailPattern = `^${identity.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
  endpoint.searchParams.set("or", `(user_id.eq.${identity.id},and(user_id.is.null,email.imatch.${JSON.stringify(emailPattern)}))`);
  endpoint.searchParams.set("status", "ilike.paid");
  endpoint.searchParams.set("order", "created_at.desc.nullslast,id.asc");
  endpoint.searchParams.set("limit", String(ACCOUNT_ORDER_PAGE_SIZE));
  endpoint.searchParams.set("offset", String(offset));
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}`, Prefer: "count=exact" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new AccountOrdersError();
  let rows;
  try { rows = await response.json(); } catch { throw new AccountOrdersError(); }
  if (!Array.isArray(rows)) throw new AccountOrdersError();
  const match = /^(?:(\d+)-(\d+)|\*)\/(\d+)$/.exec(response.headers.get("content-range") || "");
  if (!match) throw new AccountOrdersError();
  const total = Number(match[3]);
  if (!Number.isSafeInteger(total) || total < 0) throw new AccountOrdersError();
  if (total > MAX_ACCOUNT_ORDERS) throw new AccountOrdersError("ACCOUNT_ORDERS_TOO_LARGE", 503);
  const expected = Math.min(ACCOUNT_ORDER_PAGE_SIZE, Math.max(0, total - offset));
  if (rows.length !== expected || (expected === 0 ? match[1] !== undefined
    : Number(match[1]) !== offset || Number(match[2]) !== offset + expected - 1)) throw new AccountOrdersError();
  return { rows, total };
}

export async function readAccountOrders(config, identity) {
  const orders = [];
  const ids = new Set();
  let expectedTotal;
  let previousDate = Infinity;
  let previousId = null;
  let bytes = 0;
  for (let offset = 0; offset < MAX_ACCOUNT_ORDERS; offset += ACCOUNT_ORDER_PAGE_SIZE) {
    const { rows, total } = await readPage(config, identity, offset);
    if (expectedTotal !== undefined && total !== expectedTotal) throw new AccountOrdersError();
    expectedTotal = total;
    for (const row of rows) {
      const order = projectAccountOrder(row, identity);
      const currentDate = order.createdAt === null ? -Infinity : Date.parse(order.createdAt);
      if (ids.has(order.id) || currentDate > previousDate
        || (currentDate === previousDate && previousId !== null && order.id <= previousId)) throw new AccountOrdersError();
      previousDate = currentDate;
      previousId = order.id;
      ids.add(order.id);
      bytes += Buffer.byteLength(JSON.stringify(order)) + 1;
      if (bytes > MAX_RESPONSE_BYTES) throw new AccountOrdersError("ACCOUNT_ORDERS_TOO_LARGE", 503);
      orders.push(order);
    }
    if (orders.length === total) return { orders, total };
  }
  throw new AccountOrdersError();
}
