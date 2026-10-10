process.env.RESEND_API_KEY = 'synthetic-mail-key';
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

Object.assign(process.env, { SUPABASE_URL: 'https://quote-fixture.test', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service', NOWPAYMENTS_API_KEY: 'synthetic-provider', BASE_URL: 'https://shop-fixture.test' });
delete process.env.VITE_SUPABASE_URL;
mock.module('../api/_catalog.js', { namedExports: {
  validateAndPriceItems: () => ({ pricedItems: [{ name: 'Fixture', dose: '10 mg', quantity: 1, price: 100 }], subtotal: 100, regularSubtotal: 100 }),
  getShippingPrice: () => 10,
  getAutomaticDiscountRate: () => 0,
} });
const create = (await import('../api/create-payment.js')).default;
const { processNowPaymentsStatus } = await import('../api/_nowpayments-shared.js');
const id = 'INV-QUOTEFIXTURE', buyer = '11111111-1111-4111-8111-111111111111', email = 'buyer@example.test';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const res = () => ({ statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const request = () => ({ method: 'POST', headers: { authorization: 'Bearer synthetic-session' }, body: { expectedTotal: 107.25, order_id: id, email, customer_email: email, pay_currency: 'btc', storeCreditUsed: 0, items: [{ name: 'Fixture', quantity: 1, price: 999 }] } });

function fixture(t, { patchMode = 'ok', changed = null } = {}) {
  const row = { id, user_id: buyer, email, status: 'checkout', total: 107.25, metadata: { total: 107.25, storeCreditUsed: 0, address: 'Saved fixture address' }, payment_id: null, payment_provider: null };
  const calls = [];
  t.mock.method(console, 'error', () => {});
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(input), method = options.method || 'GET', body = options.body ? JSON.parse(options.body) : null;
    calls.push({ url, method, body });
    if (url.pathname === '/auth/v1/user') return json({ id: buyer, email, email_confirmed_at: '2026-10-09T00:00:00Z' });
    if (url.pathname === '/rest/v1/paylio_payment_attempts') return json([]);
    if (url.pathname === '/rest/v1/orders' && method === 'GET') {
      if (url.searchParams.get('select')?.includes('paid_at')) return json([]);
      const freshQuoteRead = url.searchParams.get('select') === 'id,user_id,email,status,total,metadata,payment_id,payment_provider';
      return json([{ ...row, ...(freshQuoteRead ? changed : {}) }]);
    }
    if (url.pathname === '/rest/v1/orders' && method === 'PATCH') {
      if (body.status === 'checkout (clicked pay)') {
        assert.equal(url.searchParams.get('id'), `eq.${id}`);
        assert.equal(url.searchParams.get('email'), `eq.${email}`);
        assert.equal(url.searchParams.get('user_id'), `eq.${buyer}`);
        assert.equal(url.searchParams.get('status'), 'eq.checkout');
        assert.equal(url.searchParams.get('total'), 'eq.107.25');
        assert.equal(url.searchParams.get('payment_id'), 'is.null');
        assert.equal(url.searchParams.get('payment_provider'), 'is.null');
        assert.equal(options.headers.Prefer, 'return=representation');
        if (patchMode === 'http') return json({}, 503);
        if (patchMode === 'network') throw new Error('synthetic interrupted quote acknowledgement');
        if (patchMode === 'empty') return json([]);
        if (patchMode === 'malformed') return new Response('not-json');
        const saved = { ...row, ...body };
        if (patchMode === 'wrong-owner') saved.user_id = '22222222-2222-4222-8222-222222222222';
        if (patchMode === 'wrong-total') saved.total = 999;
        if (patchMode === 'wrong-items') saved.items = [{ ...body.items[0], quantity: 10 }];
        if (patchMode === 'wrong-metadata') saved.metadata = { ...body.metadata, total: 999 };
        if (patchMode === 'wrong-binding') saved.payment_provider = 'Stripe';
        Object.assign(row, saved);
        return json([saved]);
      }
      Object.assign(row, body);
      return json([row]);
    }
    if (url.hostname === 'api.nowpayments.io') {
      assert.equal(row.total, 107.25);
      assert.equal(row.metadata.total, 107.25);
      assert.deepEqual(row.items, row.metadata.items);
      assert.equal(body.price_amount, '107.25');
      return json({ id: 'invoice_fixture', invoice_url: 'https://nowpayments.io/payment/fixture' });
    }
    if (url.pathname === '/rest/v1/affiliate_customers') return json([]);
    if (url.pathname === '/emails') return json({ success: true });
    assert.fail(`Unexpected fixture request ${method} ${url.href}`);
  });
  return { row, calls };
}

test('NOWPayments acknowledges the server quote matching the reviewed total before provider creation and its finished callback accepts that amount', async t => {
  const f = fixture(t), response = res();
  await create(request(), response);
  assert.equal(response.statusCode, 200, JSON.stringify(response.body));
  assert.equal(f.row.total, 107.25);
  const saveIndex = f.calls.findIndex(c => c.body?.status === 'checkout (clicked pay)');
  const createIndex = f.calls.findIndex(c => c.url.hostname === 'api.nowpayments.io');
  assert.ok(saveIndex >= 0 && createIndex > saveIndex);
  const result = await processNowPaymentsStatus({ payment_status: 'finished', order_id: id, payment_id: 'fixture_payment', price_amount: '107.25', price_currency: 'usd', pay_currency: 'btc' }, { providerVerified: true });
  assert.equal(result.dbMarkedPaid, true);
  assert.equal(f.row.status, 'paid');
  assert.equal(f.row.payment_id, 'fixture_payment');
  assert.equal(f.calls.filter(c => c.url.hostname === 'api.nowpayments.io').length, 1);
});

for (const patchMode of ['empty', 'http', 'network', 'malformed', 'wrong-owner', 'wrong-total', 'wrong-items', 'wrong-metadata', 'wrong-binding']) {
  test(`NOWPayments ${patchMode} quote acknowledgement prevents every provider create`, async t => {
    const f = fixture(t, { patchMode }), response = res();
    await create(request(), response);
    assert.equal(response.statusCode, 409);
    assert.equal(response.body.code, 'PAYMENT_RECONCILIATION_REQUIRED');
    assert.equal(f.calls.some(c => c.url.hostname === 'api.nowpayments.io'), false);
  });
}

for (const changed of [{ status: 'refunded' }, { user_id: '22222222-2222-4222-8222-222222222222' }, { metadata: { storeCreditUsed: 10 } }, { payment_id: 'already-bound' }]) {
  test(`NOWPayments fresh canonical change blocks quote rewrite and provider create ${JSON.stringify(changed)}`, async t => {
    const f = fixture(t, { changed }), response = res();
    await create(request(), response);
    assert.equal(response.statusCode, 409);
    assert.equal(response.body.code, 'CHECKOUT_ORDER_CHANGED');
    assert.equal(f.calls.some(c => c.method !== 'GET'), false);
  });
}

test('NOWPayments binds one hosted invoice and reopens it without creating another', async t => {
  const f = fixture(t), first = res(), req = request();
  req.body.address = 'Saved fixture address'; req.body.shippingType = 'standard';
  await create(req, first); assert.equal(first.statusCode, 200);
  assert.equal(f.row.metadata.legacyInvoiceAttempt.state, 'ready');
  const second = res(); await create(req, second); assert.equal(second.statusCode, 200, JSON.stringify(second.body));
  assert.deepEqual(second.body, first.body); assert.equal(f.calls.filter(c=>c.url.hostname==='api.nowpayments.io').length,1);
});
