import { requireOrderIdentity, ownsOrder } from "./_order-access.js";
import { paylioResumeMatchesOrder } from "./_paylio-binding.js";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const ACCESS_COOKIE = "tbv_checkout_access";
const ALLOWED_STATUSES = new Set(["pending", "checkout", "wire_pending"]);
const AUTHORITY_FIELDS = new Set([
  "checkout_access_hash",
  "checkoutaccesstoken",
  "paid",
  "ispaid",
  "paidat",
  "paymentid",
  "paypalcaptureid",
  "capturedat",
  "confirmationemailsentat",
]);

class CheckoutError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function getSupabaseConfig() {
  return {
    url: String(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    ).replace(/\/+$/, ""),
    key: String(process.env.SUPABASE_SERVICE_ROLE_KEY || ""),
  };
}

function safeJsonValue(value, depth = 0) {
  if (depth > 8) throw new CheckoutError(400, "Order details are too complex.");
  if (
    value === null ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  if (typeof value === "string") {
    if (value.length > 10000) {
      throw new CheckoutError(400, "Order details are too long.");
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 100) {
      throw new CheckoutError(400, "Order details contain too many items.");
    }
    return value.map((item) => safeJsonValue(item, depth + 1));
  }
  if (typeof value !== "object") {
    throw new CheckoutError(400, "Order details are invalid.");
  }

  const entries = Object.entries(value);
  if (entries.length > 100) {
    throw new CheckoutError(400, "Order details contain too many fields.");
  }
  const result = {};
  for (const [key, item] of entries) {
    if (
      key.length > 100 ||
      key === "__proto__" ||
      key === "constructor" ||
      key === "prototype" ||
      AUTHORITY_FIELDS.has(key.toLowerCase())
    ) {
      continue;
    }
    result[key] = safeJsonValue(item, depth + 1);
  }
  return result;
}

function validateOrder(body) {
  const order = body?.order;
  if (!order || typeof order !== "object" || Array.isArray(order)) {
    throw new CheckoutError(400, "Order details are required.");
  }

  const id = String(order.id || "").trim().toUpperCase();
  if (!/^INV-[A-Z0-9]{6,32}$/.test(id)) {
    throw new CheckoutError(400, "The order number is invalid.");
  }

  const email = String(order.email || "").trim().toLowerCase();
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new CheckoutError(400, "A valid checkout email is required.");
  }

  const status = String(order.status || "").trim().toLowerCase();
  if (!ALLOWED_STATUSES.has(status)) {
    throw new CheckoutError(400, "That order status cannot be set at checkout.");
  }

  const total = Number(order.total);
  if (!Number.isFinite(total) || total < 0 || total > 100000) {
    throw new CheckoutError(400, "The order total is invalid.");
  }

  const rawMetadata =
    order.metadata &&
    typeof order.metadata === "object" &&
    !Array.isArray(order.metadata)
      ? order.metadata
      : order;
  const metadata = safeJsonValue(rawMetadata);
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new CheckoutError(400, "Order details are invalid.");
  }
  metadata.id = id;
  metadata.email = email;
  metadata.status = status;
  metadata.total = total;

  return { id, email, status, total, metadata };
}

function readAccessCookie(req) {
  const cookieHeader = String(req.headers?.cookie || "");
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== ACCESS_COOKIE) {
      continue;
    }
    try {
      const value = decodeURIComponent(part.slice(separator + 1).trim());
      const splitAt = value.indexOf(".");
      if (splitAt < 1) return null;
      return {
        id: value.slice(0, splitAt),
        token: value.slice(splitAt + 1),
      };
    } catch {
      return null;
    }
  }
  return null;
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function matchesAccessHash(storedHash, token) {
  if (!/^[a-f0-9]{64}$/i.test(String(storedHash || "")) || !token) {
    return false;
  }
  const stored = Buffer.from(storedHash, "hex");
  const supplied = Buffer.from(hashToken(token), "hex");
  return stored.length === supplied.length && timingSafeEqual(stored, supplied);
}

function orderQuery(id) {
  const query = new URLSearchParams({
    id: `eq.${id}`,
    select: "id,user_id,email,status,metadata,checkout_access_hash,total",
    limit: "1",
  });
  return `orders?${query.toString()}`;
}

async function supabaseJson(path, options = {}) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    throw new CheckoutError(503, "Checkout order storage is unavailable.");
  }

  let response;
  try {
    response = await fetch(`${url}/rest/v1/${path}`, {
      method: options.method || "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    console.error("Checkout order storage connection failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw new CheckoutError(503, "Checkout order storage is unavailable.");
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!response.ok) {
    const responseCode =
      data &&
      typeof data === "object" &&
      typeof data.code === "string" &&
      /^[A-Z0-9_]{1,24}$/i.test(data.code)
        ? data.code
        : undefined;
    console.error("Checkout order storage request failed", {
      status: response.status,
      code: responseCode,
    });
    const error = new CheckoutError(
      response.status === 409 ? 409 : 503,
      response.status === 409
        ? "This order is already being processed. Refresh and try again."
        : "Checkout order storage is unavailable.",
    );
    throw error;
  }
  return data;
}

function setAccessCookie(res, id, token) {
  const value = encodeURIComponent(`${id}.${token}`);
  res.setHeader(
    "Set-Cookie",
    `${ACCESS_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/api/order-checkout; Max-Age=604800`,
  );
}

function readOrderIdFromUrl(req) {
  const rawUrl = String(req.originalUrl || req.url || "/");
  return new URL(rawUrl, "http://localhost").searchParams.get("orderId") || "";
}

async function getOrderStatus(req, res) {
  const identity = await requireOrderIdentity(req, res);
  if (!identity) return;
  const id = readOrderIdFromUrl(req).trim().toUpperCase();
  if (!/^INV-[A-Z0-9]{6,32}$/.test(id)) {
    throw new CheckoutError(400, "The order number is invalid.");
  }
  const rows = await supabaseJson(orderQuery(id));
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row || !ownsOrder(row, identity)) {
    throw new CheckoutError(404, "Order status is unavailable.");
  }
  res.status(200).json({
    ok: true,
    id: row.id,
    status: String(row.status || ""),
  });
}

async function saveOrder(req, res) {
  const identity = await requireOrderIdentity(req, res);
  if (!identity) return;
  const contentType = String(req.headers?.["content-type"] || "");
  if (contentType && !contentType.toLowerCase().includes("application/json")) {
    throw new CheckoutError(415, "Checkout order data must be JSON.");
  }

  const order = validateOrder(req.body);
  if (order.email !== identity.email) throw new CheckoutError(403, "Checkout email must match your signed-in account.");
  const rows = await supabaseJson(orderQuery(order.id));
  const existing = Array.isArray(rows) ? rows[0] : null;
  const access = readAccessCookie(req);
  let token;

  if (existing) {
    if (
      !ownsOrder(existing, identity) ||
      !access ||
      access.id !== order.id ||
      !matchesAccessHash(existing.checkout_access_hash, access.token)
    ) {
      throw new CheckoutError(403, "This checkout session cannot update that order.");
    }
    if (String(existing.email || "").toLowerCase() !== order.email) {
      throw new CheckoutError(403, "This checkout session cannot update that order.");
    }
    const existingStatus = String(existing.status || "").toLowerCase();
    if (!ALLOWED_STATUSES.has(existingStatus) && existingStatus !== "checkout (clicked pay)") {
      throw new CheckoutError(409, "A completed order cannot be changed at checkout.");
    }

    // Resume a privately frozen payment without rewriting its quote. The next
    // provider request rechecks the saved fingerprint before reusing its URL.
    const bindings = await supabaseJson(`paylio_payment_attempts?${new URLSearchParams({
      order_id: `eq.${order.id}`,
      select: "order_id,customer_id,email,state,amount_cents,quote",
      limit: "2",
    })}`);
    if (!Array.isArray(bindings) || bindings.length > 1) {
      throw new CheckoutError(503, "Checkout payment information is unavailable.");
    }
    if (bindings.length) {
      if (!paylioResumeMatchesOrder(bindings[0], identity, order)) {
        throw new CheckoutError(409, "This payment has already started. Restore its original checkout or contact support.");
      }
      setAccessCookie(res, order.id, access.token);
      res.status(200).json({ ok: true, id: existing.id, status: existing.status, locked: true, saved: false });
      return;
    }
    if (!ALLOWED_STATUSES.has(existingStatus)) {
      throw new CheckoutError(409, "This payment has already started. Contact support before changing it.");
    }

    const currentMetadata =
      existing.metadata &&
      typeof existing.metadata === "object" &&
      !Array.isArray(existing.metadata)
        ? existing.metadata
        : {};
    const mergedMetadata = {
      ...currentMetadata,
      ...order.metadata,
      id: order.id,
      email: order.email,
      status: order.status,
      total: order.total,
    };
    const query = new URLSearchParams({
      id: `eq.${order.id}`,
      email: `eq.${existing.email}`,
      user_id: existing.user_id === null ? "is.null" : `eq.${existing.user_id}`,
      status: "in.(pending,checkout,wire_pending)",
      checkout_access_hash: `eq.${existing.checkout_access_hash}`,
      select: "id,status",
    });
    const updated = await supabaseJson(`orders?${query.toString()}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: {
        status: order.status,
        total: order.total,
        metadata: mergedMetadata,
      },
    });
    if (!Array.isArray(updated) || updated.length !== 1 || updated[0].id !== order.id || updated[0].status !== order.status) {
      throw new CheckoutError(409, "A completed order cannot be changed at checkout.");
    }
    token = access.token;
  } else {
    token = randomBytes(32).toString("base64url");
    const inserted = await supabaseJson("orders", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: {
        id: order.id,
        user_id: identity.id,
        email: identity.email,
        status: order.status,
        total: order.total,
        metadata: order.metadata,
        checkout_access_hash: hashToken(token),
      },
    });
    if (!Array.isArray(inserted) || inserted.length !== 1 || inserted[0].id !== order.id
      || inserted[0].user_id !== identity.id || inserted[0].email !== identity.email
      || inserted[0].status !== order.status || Number(inserted[0].total) !== order.total) {
      throw new CheckoutError(503, "The checkout order could not be saved.");
    }
  }

  setAccessCookie(res, order.id, token);
  res.status(200).json({ ok: true, id: order.id, status: order.status });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      await getOrderStatus(req, res);
      return;
    }
    if (req.method === "POST") {
      await saveOrder(req, res);
      return;
    }
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ ok: false, error: "Method not allowed." });
  } catch (error) {
    const status =
      error instanceof CheckoutError ? error.status : 503;
    const message =
      error instanceof CheckoutError
        ? error.message
        : "Checkout order storage is unavailable.";
    res.status(status).json({ ok: false, error: message });
  }
}
