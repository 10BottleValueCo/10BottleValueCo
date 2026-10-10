import { signSettlementAffiliate } from "./_settlement-affiliate.js";
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

const pending = () => Object.assign(new Error('Payment setup is pending. Contact support before trying another payment.'), { status: 409, code: 'PAYMENT_RECONCILIATION_REQUIRED' });
const headers = () => ({ apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' });
const endpoint = query => `${String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/+$/, '')}/rest/v1/orders?${query}`;

// A conditional status transition claims the single create call. A lost provider
// response leaves it locked. This is never released merely because time passed.
export async function reserveLegacyInvoice(order, provider, total, metadata, items) {
  if (!['pending', 'checkout', 'wire_pending'].includes(order.status) || order.metadata?.legacyInvoiceAttempt
    || order.payment_id || order.payment_provider || order.metadata?.catalystpay_invoice_id) throw pending();
  const attempt = { id: randomUUID(), provider, state: 'reserved' };
  const snapshot = { ...order.metadata, ...metadata, legacyInvoiceAttempt: attempt };
  if (snapshot.affiliateAttributionCode) snapshot.affiliateQuoteProof = signSettlementAffiliate(snapshot, order.email, snapshot.subtotal, order.id);
  const patch = { status: 'checkout (clicked pay)', total, items, metadata: snapshot };
  const query = new URLSearchParams({ id: `eq.${order.id}`, email: `eq.${order.email}`, status: `eq.${order.status}`,
    payment_id: 'is.null', payment_provider: 'is.null', 'metadata->>legacyInvoiceAttempt': 'is.null', 'metadata->>catalystpay_invoice_id': 'is.null' });
  if (order.total != null) query.set('total', `eq.${order.total}`);
  if (order.user_id != null) query.set('user_id', `eq.${order.user_id}`);
  try {
    const response = await fetch(endpoint(query), { method: 'PATCH', headers: headers(), body: JSON.stringify(patch), signal: AbortSignal.timeout(10000), redirect: 'error' });
    const rows = response.ok ? await response.json() : null;
    const saved = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
    if (!saved || saved.id !== order.id || saved.email !== order.email || saved.user_id !== order.user_id || saved.payment_id || saved.payment_provider || saved.status !== patch.status || Number(saved.total) !== total
      || !isDeepStrictEqual(saved.metadata, snapshot) || !isDeepStrictEqual(saved.items, items)) throw pending();
    return saved;
  } catch { throw pending(); }
}

export async function bindLegacyInvoice(order, provider, invoiceId, checkoutUrl, extraMetadata = {}) {
  const attempt = order.metadata?.legacyInvoiceAttempt;
  if (!attempt || attempt.provider !== provider || attempt.state !== 'reserved') throw pending();
  const metadata = { ...order.metadata, ...extraMetadata,
    legacyInvoiceAttempt: { ...attempt, state: 'ready', invoiceId, checkoutUrl } };
  const query = new URLSearchParams({ id: `eq.${order.id}`, email: `eq.${order.email}`, status: 'eq.checkout (clicked pay)',
    total: `eq.${order.total}`, 'metadata->legacyInvoiceAttempt->>id': `eq.${attempt.id}`,
    'metadata->legacyInvoiceAttempt->>state': 'eq.reserved', payment_id: 'is.null', payment_provider: 'is.null' });
  try {
    const response = await fetch(endpoint(query), { method: 'PATCH', headers: headers(), body: JSON.stringify({ metadata }), signal: AbortSignal.timeout(10000), redirect: 'error' });
    const rows = response.ok ? await response.json() : null;
    const saved = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
    if (!saved || saved.id !== order.id || saved.email !== order.email || saved.user_id !== order.user_id || saved.payment_id || saved.payment_provider || saved.status !== order.status || Number(saved.total) !== Number(order.total)
      || !isDeepStrictEqual(saved.metadata, metadata)) throw pending();
    return saved;
  } catch { throw pending(); }
}
export { pending as legacyInvoicePending };
