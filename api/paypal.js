import {
  validateAndPriceItems,
  getShippingPrice,
  getAutomaticDiscountRate,
} from "./_catalog.js";
import { verifyPromoCode } from "./_promo.js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";

function paypalConfig() {
  const clientId = process.env.PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID || "";
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) {
    const error = new Error("VITE_PAYPAL_CLIENT_ID (or PAYPAL_CLIENT_ID) and PAYPAL_CLIENT_SECRET must be set");
    error.publicMessage = error.message;
    throw error;
  }

  const configuredMode = String(process.env.PAYPAL_MODE || "").toLowerCase();
  if (!configuredMode) {
    const error = new Error("PAYPAL_MODE must be explicitly set to sandbox or live");
    error.publicMessage = error.message;
    throw error;
  }
  if (!["sandbox", "live"].includes(configuredMode)) {
    const error = new Error("PAYPAL_MODE must be either sandbox or live");
    error.publicMessage = error.message;
    throw error;
  }
  if (configuredMode === "live" &&
      (process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV !== "production")) {
    const error = new Error("Live PayPal payments are enabled only in the Vercel production environment");
    error.publicMessage = error.message;
    throw error;
  }

  return {
    clientId,
    clientSecret,
    baseUrl: configuredMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
  };
}

function getSupabaseKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    const error = new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    error.publicMessage = error.message;
    throw error;
  }
  if (!SUPABASE_URL) {
    const error = new Error("SUPABASE_URL is not set");
    error.publicMessage = error.message;
    throw error;
  }
  return key;
}

async function supabaseRequest(path, options = {}) {
  const key = getSupabaseKey();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try { detail = JSON.parse(text)?.message || text; } catch {}
    throw new Error(`Supabase error ${response.status}: ${detail}`);
  }
  return text ? JSON.parse(text) : null;
}

async function loadOrder(orderId) {
  const rows = await supabaseRequest(
    `orders?id=eq.${encodeURIComponent(orderId)}&select=id,email,status,total,metadata&limit=1`
  );
  const order = Array.isArray(rows) ? rows[0] : null;
  if (!order || String(order.id) !== orderId) return null;

  const metadata = order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
    ? order.metadata
    : {};
  if (metadata.id != null && String(metadata.id) !== orderId) {
    throw new Error("Order record does not match its internal order ID");
  }
  const rowEmail = String(order.email || "").trim().toLowerCase();
  const metadataEmail = String(metadata.email || "").trim().toLowerCase();
  if (rowEmail && metadataEmail && rowEmail !== metadataEmail) {
    throw new Error("Order record customer association is inconsistent");
  }

  const items = metadata.items;
  let priced;
  try {
    priced = validateAndPriceItems(items);
  } catch (error) {
    throw new Error(`Order items cannot be verified against the server catalog: ${error.message}`);
  }

  const affiliateDiscount = parseStoredMoney(metadata.affiliateDiscount, "affiliate discount");
  const storeCreditUsed = parseStoredMoney(metadata.storeCreditUsed, "store credit");
  const cryptoDiscount = parseStoredMoney(metadata.cryptoDiscount, "crypto discount");
  const paypalFee = parseStoredMoney(metadata.paypalFee, "PayPal fee");
  if (affiliateDiscount !== 0) {
    throw new Error("PayPal cannot verify this order's affiliate discount; checkout is unavailable");
  }
  if (storeCreditUsed !== 0) {
    throw new Error("PayPal cannot verify this order's store credit; checkout is unavailable");
  }
  if (cryptoDiscount !== 0 || paypalFee !== 0) {
    throw new Error("Order contains an unsupported PayPal discount or fee");
  }

  const subtotal = priced.subtotal;
  const automaticDiscount = Math.round(subtotal * getAutomaticDiscountRate(subtotal) * 100) / 100;
  const email = rowEmail || metadataEmail;
  let promoDiscount = 0;
  let promoFreeShipping = false;
  const promoCode = String(metadata.promoCode || "").trim();
  if (promoCode) {
    // _promo.js permits a no-email fallback for other payment methods. PayPal
    // must not apply another customer's personal discount to this order.
    if (!["REVIEW10", "OWNERFREESHIP"].includes(promoCode.toUpperCase())) {
      throw new Error("Personal promo codes cannot be verified for PayPal checkout");
    }
    const verifiedPromo = await verifyPromoCode({
      code: promoCode,
      email,
      sbUrl: SUPABASE_URL,
      sbKey: getSupabaseKey(),
    });
    if (!verifiedPromo) throw new Error("Promo code cannot be verified for this order");
    promoDiscount = Math.round(subtotal * verifiedPromo.rate * 100) / 100;
    promoFreeShipping = !!verifiedPromo.freeShipping;
  }

  const regularSubtotal = priced.regularSubtotal;
  const shippingType = String(metadata.shippingType || "standard").toLowerCase() === "express"
    ? "express"
    : "standard";
  const shipping = priced.pricedItems.length === 0
    ? 0
    : promoFreeShipping || regularSubtotal === 0
      ? 0
      : getShippingPrice(regularSubtotal, shippingType);
  const expectedAmount = Math.round((subtotal - promoDiscount - (promoDiscount > 0 ? 0 : automaticDiscount) + shipping) * 100) / 100;
  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
    throw new Error("Order has no positive server-verified payable total");
  }

  // The stored amount fields are client-writable, so they are never used to
  // calculate a charge. Requiring them to agree with the catalog-derived total
  // additionally makes stale or inconsistent order records fail closed.
  for (const [label, rawAmount] of [["order total", order.total], ["metadata total", metadata.total]]) {
    if (rawAmount == null || rawAmount === "") continue;
    const storedAmount = Number(rawAmount);
    if (!Number.isFinite(storedAmount) || Math.round(storedAmount * 100) !== Math.round(expectedAmount * 100)) {
      throw new Error(`Stored ${label} does not match the server-verified order total`);
    }
  }

  return { ...order, metadata, amount: expectedAmount.toFixed(2) };
}

function parseStoredMoney(value, label) {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Order has invalid ${label}`);
  return Math.round(parsed * 100) / 100;
}

async function saveOrder(orderId, updates) {
  // Reload immediately before writing so unrelated metadata written since the
  // initial read is retained. Never accept metadata supplied by the browser.
  const current = await loadOrder(orderId);
  if (!current) throw new Error("Order not found");
  const metadata = { ...current.metadata, ...updates.metadata };
  const patch = { ...updates, metadata };
  delete patch.metadataPatch;
  await supabaseRequest(`orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  return { ...current, ...patch, metadata };
}

async function paypalRequest(path, { method = "GET", body, config } = {}) {
  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await getAccessToken(config)}`,
      "Content-Type": "application/json",
      ...(method === "POST" ? { Prefer: "return=representation" } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {
    throw new Error("PayPal returned an invalid response");
  }
  if (!response.ok) {
    const issue = data?.details?.[0]?.issue || data?.name || "PayPal request failed";
    const error = new Error(issue);
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

async function getAccessToken(config) {
  if (config.accessToken && config.accessTokenExpiresAt > Date.now() + 30_000) {
    return config.accessToken;
  }
  const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!response.ok || !data.access_token) {
    const error = new Error(`PayPal authentication failed${response.status ? ` (${response.status})` : ""}`);
    error.status = response.status >= 400 && response.status < 500 ? 502 : undefined;
    throw error;
  }
  // Keep one token for the duration of this invocation; do not persist secrets
  // or credentials between serverless instances.
  config.accessToken = data.access_token;
  config.accessTokenExpiresAt = Date.now() + Number(data.expires_in || 300) * 1000;
  return data.access_token;
}

function readMoney(value, currencyCode, expectedCurrency) {
  if (!value || String(currencyCode || "").toUpperCase() !== expectedCurrency) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? (Math.round(parsed * 100) / 100).toFixed(2) : null;
}

function checkPayPalOrder(order, orderId, expectedAmount) {
  if (!order || !Array.isArray(order.purchase_units) || order.purchase_units.length !== 1) {
    throw new Error("PayPal order does not contain the expected order details");
  }
  const unit = order.purchase_units[0];
  if (String(unit.custom_id || "") !== orderId || String(unit.invoice_id || "") !== orderId) {
    throw new Error("PayPal order is not associated with this customer order");
  }
  const currency = String(unit.amount?.currency_code || "").toUpperCase();
  if (currency !== "USD" || readMoney(unit.amount?.value, currency, "USD") !== expectedAmount) {
    throw new Error("PayPal order amount does not match the verified order total");
  }
  return unit;
}

function getCompletedCapture(unit, expectedAmount) {
  const captures = unit?.payments?.captures;
  if (!Array.isArray(captures) || captures.length !== 1) return null;
  const capture = captures[0];
  if (String(capture.status || "").toUpperCase() !== "COMPLETED") {
    throw new Error("PayPal capture is not completed");
  }
  const amount = readMoney(capture.amount?.value, capture.amount?.currency_code, "USD");
  if (amount !== expectedAmount) throw new Error("Captured PayPal amount does not match the verified order total");
  return capture;
}

async function createOrder(req, res, config) {
  const { amount: clientAmount, currency, orderId, description } = req.body || {};
  const normalizedId = typeof orderId === "string" ? orderId.trim() : "";
  if (!normalizedId || normalizedId.length > 200) {
    return res.status(400).json({ error: "Missing or invalid orderId" });
  }
  if (String(currency || "").toUpperCase() !== "USD") {
    return res.status(400).json({ error: "Only USD PayPal orders are supported" });
  }

  const order = await loadOrder(normalizedId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (String(order.status || "").toLowerCase() === "paid") {
    return res.status(409).json({ error: "Order is already paid" });
  }
  const parsedClientAmount = Number(clientAmount);
  if (!Number.isFinite(parsedClientAmount) ||
      Math.round(parsedClientAmount * 100) !== Math.round(Number(order.amount) * 100)) {
    return res.status(400).json({ error: "Submitted amount does not match the verified order total" });
  }

  // Reuse a previously-created PayPal order only after independently checking
  // its server-side association and amount. This makes client retries safe.
  const storedPaypalId = String(order.metadata.paypalOrderId || "");
  if (storedPaypalId) {
    try {
      const existingPaypalOrder = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(storedPaypalId)}`, { config });
      const unit = checkPayPalOrder(existingPaypalOrder, normalizedId, order.amount);
      if (["CREATED", "APPROVED"].includes(String(existingPaypalOrder.status || "").toUpperCase())) {
        return res.status(200).json({ id: existingPaypalOrder.id });
      }
      if (String(existingPaypalOrder.status || "").toUpperCase() === "COMPLETED" &&
          getCompletedCapture(unit, order.amount)) {
        return res.status(409).json({ error: "Order is already paid" });
      }
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  }

  const paypalOrder = await paypalRequest("/v2/checkout/orders", {
    method: "POST",
    config,
    body: {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: normalizedId,
        custom_id: normalizedId,
        invoice_id: normalizedId,
        description: String(description || `Order ${normalizedId}`).slice(0, 127),
        amount: { currency_code: "USD", value: order.amount },
      }],
    },
  });
  if (!paypalOrder.id) throw new Error("PayPal did not return an order ID");

  await saveOrder(normalizedId, {
    metadata: {
      paypalOrderId: paypalOrder.id,
      paypalAmount: order.amount,
      paypalCurrency: "USD",
      paymentProvider: "PayPal",
    },
  });
  return res.status(200).json({ id: paypalOrder.id });
}

async function captureOrder(req, res, config) {
  const orderIdFromBody = req.body?.orderId;
  const paypalOrderId = String(req.query?.orderID || req.body?.orderID || "").trim();
  if (!paypalOrderId || paypalOrderId.length > 200) {
    return res.status(400).json({ error: "Missing or invalid PayPal orderID" });
  }
  if (orderIdFromBody && typeof orderIdFromBody !== "string") {
    return res.status(400).json({ error: "Invalid orderId" });
  }

  // The internal order ID is not trusted from a query parameter: resolve it
  // from the server-persisted PayPal-order association.
  const rows = await supabaseRequest(
    `orders?metadata->>paypalOrderId=eq.${encodeURIComponent(paypalOrderId)}&select=id,email,status,total,metadata&limit=2`
  );
  if (!Array.isArray(rows) || rows.length !== 1) {
    return res.status(404).json({ error: "PayPal order is not associated with a payable customer order" });
  }
  const orderId = String(rows[0].id || "");
  if (!orderId || (orderIdFromBody && orderIdFromBody !== orderId)) {
    return res.status(400).json({ error: "PayPal order does not match the requested customer order" });
  }
  const order = await loadOrder(orderId);
  if (!order || String(order.metadata.paypalOrderId || "") !== paypalOrderId) {
    return res.status(404).json({ error: "Order not found for this PayPal payment" });
  }
  if (order.metadata.paypalCurrency && String(order.metadata.paypalCurrency).toUpperCase() !== "USD") {
    return res.status(400).json({ error: "Stored PayPal currency does not match the order" });
  }
  if (order.metadata.paypalAmount != null &&
      readMoney(order.metadata.paypalAmount, "USD", "USD") !== order.amount) {
    return res.status(400).json({ error: "Stored PayPal amount does not match the verified order total" });
  }

  const paypalOrder = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, { config });
  const unit = checkPayPalOrder(paypalOrder, orderId, order.amount);
  const paypalStatus = String(paypalOrder.status || "").toUpperCase();
  const alreadyPaid = String(order.status || "").toLowerCase() === "paid";
  if (alreadyPaid &&
      (String(order.metadata.paymentProvider || "").toLowerCase() !== "paypal" ||
       String(order.metadata.paypalOrderId || "") !== paypalOrderId)) {
    return res.status(409).json({ error: "Order has already been paid by another payment" });
  }

  if (paypalStatus === "COMPLETED") {
    const capture = getCompletedCapture(unit, order.amount);
    if (!capture) throw new Error("Completed PayPal order has no verified capture");
    const paidAt = capture.create_time || new Date().toISOString();
    await saveOrder(orderId, {
      status: "paid",
      payment_provider: "PayPal",
      paid_at: paidAt,
      metadata: {
        paymentProvider: "PayPal",
        paypalOrderId,
        paypalCaptureId: capture.id,
        paypalAmount: order.amount,
        paypalCurrency: "USD",
        paidAt,
        status: "paid",
      },
    });
    return res.status(200).json(paypalOrder);
  }
  if (paypalStatus !== "APPROVED") {
    return res.status(409).json({ error: `PayPal order cannot be captured (status: ${paypalStatus || "unknown"})` });
  }
  if (String(order.status || "").toLowerCase() === "paid") {
    return res.status(409).json({ error: "Order is already marked paid but this PayPal payment is not completed" });
  }

  let capturedOrder;
  try {
    capturedOrder = await paypalRequest(
      `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
      { method: "POST", body: {}, config }
    );
  } catch (captureError) {
    // Concurrent/retried requests may receive ORDER_ALREADY_CAPTURED after a
    // different invocation completed the capture. Re-fetch and verify it rather
    // than reporting a false failure or issuing a second capture.
    const refreshed = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, { config });
    if (String(refreshed.status || "").toUpperCase() !== "COMPLETED") throw captureError;
    capturedOrder = refreshed;
  }
  const capturedUnit = capturedOrder?.purchase_units?.[0];
  if (!capturedUnit) throw new Error("PayPal capture response has no purchase unit");
  if (String(capturedOrder.status || "").toUpperCase() !== "COMPLETED") {
    return res.status(409).json({ error: "PayPal capture has not completed", details: capturedOrder });
  }
  const capture = getCompletedCapture(capturedUnit, order.amount);
  if (!capture) throw new Error("PayPal returned a completed order without a verified capture");
  const paidAt = capture.create_time || new Date().toISOString();
  await saveOrder(orderId, {
    status: "paid",
    payment_provider: "PayPal",
    paid_at: paidAt,
    metadata: {
      paymentProvider: "PayPal",
      paypalOrderId,
      paypalCaptureId: capture.id,
      paypalAmount: order.amount,
      paypalCurrency: "USD",
      paidAt,
      status: "paid",
    },
  });
  return res.status(200).json(capturedOrder);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const config = paypalConfig();
    const action = String(req.query?.action || "");
    if (action === "create-order") return await createOrder(req, res, config);
    if (action === "capture-order") return await captureOrder(req, res, config);
    return res.status(400).json({ error: "Unsupported PayPal action" });
  } catch (error) {
    console.error("PayPal API error:", error.message);
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
      ? error.status
      : 500;
    return res.status(status).json({
      error: error.publicMessage || (status === 500 ? "PayPal payment could not be processed" : error.message),
      ...(error.details ? { details: error.details } : {}),
    });
  }
}