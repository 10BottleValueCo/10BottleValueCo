import { createHash } from 'node:crypto';
const ID = /^[A-Za-z0-9_-]{1,160}$/;
const readinessCache = new WeakMap();
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const unavailable = () => Object.assign(new Error('Payment verification is temporarily unavailable.'), { status: 503, code: 'PAYMENT_VERIFICATION_UNAVAILABLE' });
const mismatch = () => Object.assign(new Error('Payment reconciliation is pending.'), { status: 409, code: 'PAYMENT_RECONCILIATION_REQUIRED' });
export function catalystPayConfigured(env = process.env) {
  return ID.test(env.CATALYSTPAY_MERCHANT_ID || '') && typeof env.CATALYSTPAY_API_TOKEN === 'string' && !!env.CATALYSTPAY_API_TOKEN.trim();
}
function cents(value) {
  if (!['number', 'string'].includes(typeof value) || !/^\d+(?:\.\d+)?$/.test(String(value))) return null;
  const amount = Number(value), result = Math.round(amount * 100);
  return Number.isFinite(amount) && amount > 0 && Number.isSafeInteger(result) && result <= 10000000 && Math.abs(amount * 100 - result) < 1e-7 ? result : null;
}
export async function readCatalystInvoice(invoiceId, { env = process.env, fetcher = globalThis.fetch } = {}) {
  if (!catalystPayConfigured(env) || !ID.test(invoiceId || '')) throw unavailable();
  const origin = env.CATALYSTPAY_ENV === 'production' ? 'https://api.paidlyinteractive.com' : 'https://api-staging.paidlyinteractive.com';
  try {
    const response = await fetcher(`${origin}/api/v1/stores/${encodeURIComponent(env.CATALYSTPAY_MERCHANT_ID)}/invoices/${encodeURIComponent(invoiceId)}`, {
      headers: { Authorization: `token ${env.CATALYSTPAY_API_TOKEN}`, accept: 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(8000),
    });
    const raw = await response.text();
    if (!response.ok || Buffer.byteLength(raw) > 100000) throw unavailable();
    const invoice = JSON.parse(raw);
    if (!record(invoice) || invoice.id !== invoiceId || invoice.storeId !== env.CATALYSTPAY_MERCHANT_ID
      || cents(invoice.amount) === null || typeof invoice.currency !== 'string' || !record(invoice.metadata)
      || !['New', 'Processing', 'Expired', 'Settled'].includes(invoice.status)) throw unavailable();
    return invoice;
  } catch { throw unavailable(); }
}

// Paidly's published API has no token-scope or invoice-list endpoint. Prove canviewinvoices with
// a known invoice before accepting a checkout that relies on status polling.
// This read requests only a saved invoice identifier, never customer details.
export async function assertCatalystVerificationReady(deps = {}) {
  const env = deps.env || process.env, fetcher = deps.fetcher || globalThis.fetch;
  const cacheKey = createHash('sha256').update(JSON.stringify([env.CATALYSTPAY_MERCHANT_ID, env.CATALYSTPAY_API_TOKEN, env.CATALYSTPAY_ENV, env.CATALYSTPAY_VERIFICATION_INVOICE_ID, env.SUPABASE_URL || env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY])).digest('hex');
  const now = deps.now || Date.now, cached = readinessCache.get(fetcher);
  if (cached?.key === cacheKey && cached.until > now()) return;
  let invoiceId = env.CATALYSTPAY_VERIFICATION_INVOICE_ID;
  if (!invoiceId) {
    const base = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) throw unavailable();
    try {
      const query = new URLSearchParams({ select: 'invoice_id:metadata->>catalystpay_invoice_id', 'metadata->>catalystpay_invoice_id': 'neq.', order: 'created_at.desc', limit: '1' });
      const response = await fetcher(`${base}/rest/v1/orders?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, redirect: 'error', signal: AbortSignal.timeout(8000) });
      const raw = await response.text();
      if (!response.ok || Buffer.byteLength(raw) > 2000) throw unavailable();
      const rows = JSON.parse(raw);
      if (!Array.isArray(rows) || rows.length !== 1) throw unavailable();
      invoiceId = rows[0]?.invoice_id;
    } catch { throw unavailable(); }
  }
  await readCatalystInvoice(invoiceId, deps);
  readinessCache.set(fetcher, { key: cacheKey, until: now() + 60000 });
}

export function catalystCheckoutUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw unavailable(); }
  if (url.protocol !== 'https:' || url.username || url.password) throw unavailable();
  return url.href;
}
export function verifyCatalystCreatedInvoice(invoice, { orderId, amount, env = process.env }) {
  // Validate the documented InvoiceData response before persisting its ID or
  // exposing a payment link. A successful HTTP status alone is not a binding.
  if (!record(invoice) || !ID.test(invoice.id || '') || invoice.storeId !== env.CATALYSTPAY_MERCHANT_ID
    || cents(amount) === null || cents(invoice.amount) !== cents(amount)
    || typeof invoice.currency !== 'string' || invoice.currency.toUpperCase() !== 'USD'
    || !record(invoice.metadata) || invoice.metadata.OrderId !== orderId || invoice.status !== 'New'
    || (invoice.additionalStatus !== undefined && invoice.additionalStatus !== 'None'))
    throw Object.assign(new Error('Payment setup is pending. Please contact support before trying another payment.'), { status: 503, code: 'PAYMENT_CREATION_MISMATCH' });
  return catalystCheckoutUrl(invoice.checkoutLink);
}
export async function verifyCatalystInvoiceBinding(order, invoiceId, deps = {}) {
  if (!record(order) || !record(order.metadata) || order.metadata.catalystpay_invoice_id !== invoiceId
    || !ID.test(invoiceId || '') || cents(order.metadata.total) === null) throw mismatch();
  const invoice = await readCatalystInvoice(invoiceId, deps);
  if (invoice.metadata.OrderId !== order.id || invoice.currency.toUpperCase() !== 'USD'
    || cents(invoice.amount) !== cents(order.metadata.total)
    || (order.total != null && cents(order.total) !== cents(invoice.amount))) throw mismatch();
  return invoice;
}
export async function verifyCatalystSettlement(order, invoiceId, deps = {}) {
  const invoice = await verifyCatalystInvoiceBinding(order, invoiceId, deps);
  if (invoice.status !== 'Settled' || !['None', 'PaidOver'].includes(invoice.additionalStatus)) throw mismatch();
  return invoice;
}
