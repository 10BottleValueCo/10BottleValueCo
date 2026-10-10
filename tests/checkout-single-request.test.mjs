import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
Object.assign(process.env, {
  SUPABASE_URL: 'https://single-checkout.test', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service',
  PAYLIO_API_KEY: 'synthetic-provider', PAYLIO_PAYOUT_ADDRESS: '0x' + '1'.repeat(40),
  CATALYSTPAY_MERCHANT_ID: 'fixture-store', CATALYSTPAY_API_TOKEN: 'synthetic-token',
  CATALYSTPAY_WEBHOOK_SECRET: 'synthetic-webhook', CATALYSTPAY_ENV: 'production',
});
const line = { name: 'Fixture', dose: '1 mg', quantity: 1, price: 100 };
mock.module('../api/_catalog.js', { namedExports: {
  validateAndPriceItems: () => ({ pricedItems: [line], subtotal: 100, regularSubtotal: 100 }),
  getShippingPrice: () => 10, getAutomaticDiscountRate: () => 0,
} });
const handler = (await import('../api/order-checkout.js')).default;
const orderId = 'INV-SINGLE123', email = 'buyer@example.test', userId = '11111111-1111-4111-8111-111111111111';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const response = () => ({ statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } });
function request(kind = 'paylio', cookie = '') {
  return { method: 'POST', headers: { authorization: 'Bearer synthetic-session', 'content-type': 'application/json', cookie }, body: {
    order: { id: orderId, email, status: 'checkout', total: 110, metadata: {
      subtotal: 100, shipping: 10, automaticDiscount: 0, promoDiscount: 0, affiliateDiscount: 0, cryptoDiscount: 0, shippingType: 'standard', total: 110, storeCreditUsed: 0, items: [line],
      firstName: 'Fixture', paymentProvider: kind === 'paylio' ? 'Paylio' : 'CatalystPay BTC',
      purchaserAttestation: { policiesAccepted: true }, paymentId: 'untrusted-payment',
    } },
    payment: { kind, body: { order_id: orderId, email, customer_email: email, expectedTotal: 110, items: [line], shippingType: 'standard', firstName: 'Fixture', storeCreditUsed: 0 } },
  } };
}
function fixture(t, { failInsert = false, failUpdate = false, providerFailure = false, bindFailure = false } = {}) {
  let row, attempt, invoice;
  const calls = [], timings = [];
  t.mock.method(console, 'info', (...args) => timings.push(args));
  t.mock.method(console, 'error', () => {});
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(input), method = options.method || 'GET', body = options.body ? JSON.parse(options.body) : null;
    calls.push({ path: url.pathname, method, body });
    if (url.pathname === '/auth/v1/user') return json({ id: userId, email, email_confirmed_at: '2026-10-08T00:00:00Z' });
    if (url.pathname === '/rest/v1/orders') {
      if (method === 'GET') return json(row ? [row] : []);
      if (method === 'POST') {
        if (failInsert) return json({}, 503);
        if (row) return json({}, 409);
        row = { payment_id: null, payment_provider: null, ...body };
        return json([row]);
      }
      if (method === 'PATCH') {
        if (failUpdate || (bindFailure && body.metadata?.legacyInvoiceAttempt?.state === 'ready')) return json({}, 503);
        const expectedStatus = url.searchParams.get('status');
        if (!row || (expectedStatus?.startsWith('eq.') && row.status !== expectedStatus.slice(3))) return json([]);
        if (url.searchParams.has('checkout_access_hash') && url.searchParams.get('checkout_access_hash') !== `eq.${row.checkout_access_hash}`) return json([]);
        Object.assign(row, body); return json([row]);
      }
    }
    if (url.pathname === '/rest/v1/paylio_payment_attempts') return json(attempt ? [attempt] : []);
    if (url.pathname === '/rest/v1/affiliate_customers') return json([]);
    if (url.pathname === '/rest/v1/rpc/reserve_paylio_checkout') {
      assert.ok(row, 'save must precede reservation');
      if (attempt) return json({ created: false, attempt });
      attempt = { id: body.p_id, order_id: row.id, customer_id: userId, email, fingerprint: body.p_fingerprint,
        account_fingerprint: body.p_account_fingerprint, payout_address: body.p_payout_address, amount_cents: body.p_amount_cents,
        currency: 'USD', state: 'reserved', quote: body.p_quote, created_at: new Date().toISOString() };
      row.status = 'checkout (clicked pay)'; row.payment_provider = 'Paylio Card'; row.metadata = { ...row.metadata, ...body.p_quote };
      return json({ created: true, attempt });
    }
    if (url.pathname === '/rest/v1/rpc/bind_paylio_checkout') {
      if (bindFailure) return json({}, 503);
      Object.assign(attempt, { state: 'ready', payment_id: body.p_payment_id, ipn_token: body.p_ipn_token, checkout_url: body.p_checkout_url });
      return json(attempt);
    }
    if (url.pathname === '/api/v1/wallet') {
      assert.equal(attempt?.state, 'reserved');
      if (providerFailure) return json({}, 502);
      return json({ payment_id: 'provider_fixture', ipn_token: 'synthetic-provider-token', checkout_url: 'https://paylio.org/pay/provider_fixture', amount: body.amount, status: 'unpaid' });
    }
    if (url.pathname === '/api/v1/stores/fixture-store/invoices' && method === 'POST') {
      assert.equal(row.metadata.legacyInvoiceAttempt?.state, 'reserved');
      if (providerFailure) return json({}, 502);
      invoice = { id: 'invoice_fixture', storeId: 'fixture-store', amount: body.amount, currency: 'USD', status: 'New', additionalStatus: 'None', metadata: body.metadata, checkoutLink: 'https://checkout.example.test/invoice_fixture' };
      return json(invoice);
    }
    if (url.pathname === '/api/v1/stores/fixture-store/invoices/invoice_fixture') return json(invoice);
    assert.fail(`Unexpected synthetic request ${method} ${url.pathname}`);
  });
  return { calls, timings, row: () => row, attempt: () => attempt, setRow: value => { row = value; } };
}
const creates = calls => calls.filter(c => c.method === 'POST' && ['/api/v1/wallet', '/api/v1/stores/fixture-store/invoices'].includes(c.path));
const mutations = calls => calls.filter(c => c.method !== 'GET');
const cookieOf = res => res.headers['Set-Cookie'].split(';')[0];
for (const kind of ['paylio', 'catalystpay']) {
  test(`${kind}: one request authenticates once, saves before reserve, returns only a bound URL, and keeps the cookie path`, async t => {
    const f = fixture(t), req = request(kind), originalBody = req.body, res = response();
    await handler(req, res);
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.ok(res.body.payment_url || res.body.checkoutLink);
    assert.equal(f.calls.filter(c => c.path === '/auth/v1/user').length, 1);
    assert.equal(creates(f.calls).length, 1);
    const insert = f.calls.find(c => c.path === '/rest/v1/orders' && c.method === 'POST');
    assert.equal(insert.body.metadata.purchaserAttestation.policiesAccepted, true);
    assert.equal(insert.body.metadata.paymentId, undefined);
    assert.match(res.headers['Set-Cookie'], /HttpOnly; Secure; SameSite=Lax; Path=\/api\/order-checkout;/);
    assert.equal(req.body, originalBody, 'provider dispatch restores the request body');
    assert.match(res.headers['Server-Timing'], /^save;dur=/);
    assert.match(res.headers['Server-Timing'], /provider;dur=.*bind;dur=/);
    assert.equal(f.timings.length, 1);
    assert.doesNotMatch(JSON.stringify(f.timings), /buyer@|INV-SINGLE|synthetic-service|synthetic-provider|Fixture/);
  });
  test(`${kind}: resume preserves the cookie and frozen order with no second provider creation`, async t => {
    const f = fixture(t), first = response(); await handler(request(kind), first);
    assert.equal(first.statusCode, 200, JSON.stringify(first.body));
    const saved = structuredClone(f.row()), mutationCount = mutations(f.calls).length, second = response();
    await handler(request(kind, cookieOf(first)), second);
    assert.equal(second.statusCode, 200, JSON.stringify(second.body));
    assert.deepEqual(second.body, first.body);
    assert.deepEqual(f.row(), saved);
    assert.equal(creates(f.calls).length, 1);
    assert.equal(mutations(f.calls).length, kind === 'paylio' ? mutationCount + 1 : mutationCount); // read-only RPC reuse for Paylio
    assert.equal(f.calls.filter(c => c.path === '/auth/v1/user').length, 2, 'each HTTP request reauthenticates');
  });
  test(`${kind}: failed insert cannot reserve or contact a provider`, async t => {
    const f = fixture(t, { failInsert: true }), res = response(); await handler(request(kind), res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.headers['X-Checkout-Saved'], undefined);
    assert.equal(creates(f.calls).length, 0);
    assert.equal(f.calls.some(c => c.path.includes('/rpc/')), false);
    assert.equal(f.row(), undefined);
  });
  test(`${kind}: a lost provider response stays reserved and is not recreated`, async t => {
    const f = fixture(t, { providerFailure: true }), first = response(); await handler(request(kind), first);
    assert.equal(first.statusCode, 503);
    assert.equal(first.headers['X-Checkout-Saved'], '1');
    assert.ok(f.row(), 'provider failure preserves the acknowledged checkout');
    assert.equal(creates(f.calls).length, 1);
    const second = response(); await handler(request(kind, cookieOf(first)), second);
    assert.equal(second.statusCode, 409);
    assert.equal(creates(f.calls).length, 1);
    assert.equal(f.row().status, 'checkout (clicked pay)');
  });
}
test('mismatched order IDs, identities, kinds and credit claims stop before any storage write', async t => {
  for (const mutate of [
    req => { req.body.payment.body.order_id = 'INV-OTHER123'; },
    req => { req.body.payment.body.orderId = 'INV-OTHER123'; },
    req => { req.body.payment.body.email = 'foreign@example.test'; },
    req => { req.body.order.email = 'foreign@example.test'; },
    req => { req.body.payment.kind = 'unsupported'; },
    req => { req.body.payment.body.storeCreditUsed = 1; },
  ]) {
    const f = fixture(t), req = request(), res = response(); mutate(req); await handler(req, res);
    assert.ok([400, 403, 409].includes(res.statusCode), JSON.stringify(res.body));
    assert.equal(mutations(f.calls).length, 0);
  }
});
test('anonymous combined requests cannot perform private reads or writes', async t => {
  const f = fixture(t), req = request(), res = response(); req.headers.authorization = ''; await handler(req, res);
  assert.equal(res.statusCode, 401); assert.deepEqual(f.calls, []);
});
test('existing checkout requires its original capability, even for the same signed-in owner', async t => {
  const f = fixture(t), req = request(), initial = response(); delete req.body.payment; await handler(req, initial);
  const writes = mutations(f.calls).length;
  for (const cookie of ['', 'tbv_checkout_access=invalid']) {
    const res = response(); await handler(request('paylio', cookie), res);
    assert.equal(res.statusCode, 403); assert.equal(mutations(f.calls).length, writes);
  }
});
test('failed existing-order update never reaches the provider', async t => {
  const f = fixture(t, { failUpdate: true }), req = request(), initial = response(); delete req.body.payment; await handler(req, initial);
  const res = response(); await handler(request('paylio', cookieOf(initial)), res);
  assert.equal(res.statusCode, 503); assert.equal(creates(f.calls).length, 0);
});
test('concurrent new-order submissions create at most one provider invoice', async t => {
  const f = fixture(t), first = response(), second = response();
  await Promise.all([handler(request(), first), handler(request(), second)]);
  assert.deepEqual([first.statusCode, second.statusCode].sort(), [200, 409]);
  assert.equal(creates(f.calls).length, 1);
});
test('identity reuse ends after dispatch and cannot authenticate a later call with an expired session', async t => {
  const f = fixture(t), req = request(), first = response(); await handler(req, first);
  assert.equal(first.statusCode, 200); req.headers.authorization = ''; req.headers.cookie = cookieOf(first);
  const second = response(); await handler(req, second);
  assert.equal(second.statusCode, 401); assert.equal(creates(f.calls).length, 1);
});

for (const kind of ['paylio', 'catalystpay']) {
  test(`${kind}: failed binding never returns an invoice link or permits a second creation`, async t => {
    const f = fixture(t, { bindFailure: true }), first = response(); await handler(request(kind), first);
    assert.ok([409,503].includes(first.statusCode));
    assert.equal(first.body.payment_url || first.body.checkoutLink, undefined);
    const second = response(); await handler(request(kind, cookieOf(first)), second);
    assert.equal(second.statusCode, 409); assert.equal(creates(f.calls).length, 1);
  });
}
test('combined dispatch cannot switch a reserved Paylio order into Cash App', async t => {
  const f = fixture(t), first = response(); await handler(request('paylio'), first);
  const second = response(); await handler(request('catalystpay', cookieOf(first)), second);
  assert.equal(second.statusCode, 409); assert.equal(creates(f.calls).length, 1);
});
