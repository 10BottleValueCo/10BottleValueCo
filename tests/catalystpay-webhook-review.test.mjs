process.env.RESEND_API_KEY = 'synthetic-mail-key';
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL = 'https://db.example.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-service';
process.env.CATALYSTPAY_MERCHANT_ID = 'merchant_fixture';
process.env.CATALYSTPAY_API_TOKEN = 'synthetic-provider-token';
process.env.CATALYSTPAY_ENV = 'production';
delete process.env.CATALYSTPAY_WEBHOOK_SECRET;
const handler = (await import('../api/catalystpay-webhook.js?review-no-secret')).default;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const response = () => ({ statusCode: 200, setHeader() {}, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } });
const invoice = { id: 'invoice_fixture', storeId: 'merchant_fixture', amount: '100.00', currency: 'USD', metadata: { OrderId: 'INV-FIXTURE' }, status: 'Settled', additionalStatus: 'None' };

function fixture(t, { provider = invoice, providerStatus = 200, patchStatus = 200, patchRows, orderStatus = 'checkout', savedInvoice = invoice.id } = {}) {
  const calls = [];
  const row = { id: 'INV-FIXTURE', email: 'buyer@example.test', status: orderStatus, total: 100, payment_id: null, payment_provider: null, metadata: { total: 100, subtotal: 100, storeCreditUsed: 0, catalystpay_invoice_id: savedInvoice, items: [] } };
  if (orderStatus === 'paid') { row.payment_id = invoice.id; row.payment_provider = 'CatalystPay BTC'; }
  t.mock.method(console, 'error', () => {});
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(input), method = options.method || 'GET', body = options.body ? JSON.parse(options.body) : null;
    calls.push({ url, method, body });
    if (url.hostname === 'api.paidlyinteractive.com') {
      assert.equal(method, 'GET');
      assert.equal(options.headers.Authorization, 'token synthetic-provider-token');
      return json(provider, providerStatus);
    }
    if (url.pathname === '/rest/v1/orders' && method === 'GET') {
      assert.equal(url.searchParams.get('metadata->>catalystpay_invoice_id'), 'eq.invoice_fixture');
      assert.equal(url.searchParams.get('limit'), '2');
      return json([row]);
    }
    if (url.pathname === '/rest/v1/orders' && body?.status === 'paid') {
      assert.equal(url.searchParams.get('total'), 'eq.100');
      assert.equal(url.searchParams.get('metadata->>catalystpay_invoice_id'), 'eq.invoice_fixture');
      if (patchRows) return json(patchRows, patchStatus);
      Object.assign(row, body); return json([row], patchStatus);
    }
    if (url.pathname === '/emails') return json({ ok: true });
    return json([]);
  });
  return { calls, row, invoke: async (body = { type: 'InvoiceSettled', invoiceId: invoice.id }) => {
    const res = response(); await handler({ method: 'POST', headers: {}, body: JSON.stringify(body) }, res); return res;
  } };
}

test('unsigned Catalyst callback is only a hint; verified provider settlement and acknowledged binding precede receipt', async t => {
  const f = fixture(t), result = await f.invoke({ type: 'InvoiceSettled', invoiceId: invoice.id, amount: 1, email: 'attacker@example.test' });
  assert.equal(result.statusCode, 200); assert.equal(f.row.status, 'paid');
  const provider = f.calls.findIndex(c => c.url.hostname === 'api.paidlyinteractive.com');
  const paid = f.calls.findIndex(c => c.body?.status === 'paid');
  const receipt = f.calls.findIndex(c => c.url.pathname === '/emails');
  assert.ok(provider >= 0 && paid > provider && receipt > paid);
  assert.equal(f.calls[receipt].url.hostname, 'api.resend.com'); assert.equal(f.calls[receipt].body.to, 'buyer@example.test'); assert.match(f.calls[receipt].body.html, /100\.00/);
});

test('unsigned Catalyst callback cannot settle unknown, foreign, unpaid, partial or manually marked invoices', async t => {
  for (const opts of [
    { providerStatus: 403 }, { savedInvoice: 'other' }, { provider: { ...invoice, id: 'other' } },
    { provider: { ...invoice, storeId: 'other' } }, { provider: { ...invoice, amount: '99.99' } },
    { provider: { ...invoice, currency: 'EUR' } }, { provider: { ...invoice, metadata: { OrderId: 'INV-OTHER' } } },
    { provider: { ...invoice, status: 'Processing' } }, { provider: { ...invoice, additionalStatus: 'PaidPartial' } },
    { provider: { ...invoice, additionalStatus: 'Marked' } }, { orderStatus: 'refunded' },
  ]) {
    const f = fixture(t, opts), result = await f.invoke(); assert.ok(result.statusCode >= 400);
    assert.equal(f.calls.some(c => c.method !== 'GET'), false);
  }
});

test('unacknowledged Catalyst paid write cannot send receipt and exact paid replay has no effects', async t => {
  for (const opts of [{ patchRows: [] }, { patchStatus: 500 }, { patchRows: [{ id: 'INV-OTHER' }] }]) {
    const f = fixture(t, opts), result = await f.invoke(); assert.ok(result.statusCode >= 400);
    assert.equal(f.calls.some(c => c.url.pathname === '/emails'), false);
  }
  const f = fixture(t, { orderStatus: 'paid' }), result = await f.invoke();
  assert.equal(result.statusCode, 200); assert.equal(result.body.alreadyPaidInDb, true); assert.equal(f.calls.some(c => c.method !== 'GET'), false);
});

test('Catalyst rejects malformed bodies and manual marking; unrelated event names never trigger lookup', async t => {
  const f = fixture(t);
  for (const body of [null, [], 4]) assert.equal((await f.invoke(body)).statusCode, 400);
  assert.equal((await f.invoke({ type: 'InvoiceSettled', invoiceId: invoice.id, manuallyMarked: true })).statusCode, 409);
  assert.equal((await f.invoke({ type: 'NotInvoiceSettled', invoiceId: invoice.id })).body.skipped, 'not_settled');
  assert.deepEqual(f.calls, []);
});
