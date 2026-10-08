import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { createHmac } from 'node:crypto';
import { assertLegacyCreditPaidAcknowledgement, debitLegacyOrderCredit, legacyCreditStartError, legacyExistingCreditOrderError } from '../api/_legacy-store-credit.js';

const env = { SUPABASE_URL: 'https://db.example.test', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service', STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: 'fixture-webhook', NOWPAYMENTS_API_KEY: 'fixture-now', PAYLIO_API_KEY: 'fixture-paylio', PAYLIO_PAYOUT_ADDRESS: 'fixture-address', CATALYSTPAY_MERCHANT_ID: 'fixture-merchant', CATALYSTPAY_API_TOKEN: 'fixture-catalyst', CATALYSTPAY_WEBHOOK_SECRET: 'fixture-catalyst-signature', BASE_URL: 'https://shop.example.test' };
Object.assign(process.env, env);
delete process.env.VITE_SUPABASE_URL;
delete process.env.RESEND_API_KEY;
let stripeCreates = [];
let verifiedIntent;
mock.module('stripe', { defaultExport: class {
  checkout = { sessions: { create: async data => { stripeCreates.push(data); return { id: 'cs_fixture', client_secret: 'fixture-secret' }; }, listLineItems: async () => ({ data: [] }) } };
  paymentIntents = { create: async data => { stripeCreates.push(data); return { id: 'pi_fixture', client_secret: 'fixture-secret' }; }, retrieve: async () => verifiedIntent, search: async () => ({ data: [verifiedIntent] }) };
  webhooks = { constructEvent: raw => JSON.parse(raw.toString()) };
} });
mock.module('../api/_catalog.js', { namedExports: {
  validateAndPriceItems: () => ({ pricedItems: [{ name: 'Fixture', dose: '10 mg', quantity: 1, price: 100 }], subtotal: 100, regularSubtotal: 100, usSubtotal: 0 }),
  getShippingPrice: () => 10,
  getAutomaticDiscountRate: () => 0,
} });
const starts = await Promise.all(['create-payment', 'create-paylio-payment', 'create-stripe-session', 'create-payment-intent', 'create-catalystpay-session'].map(async name => [name, (await import(`../api/${name}.js`)).default]));
const paylio = (await import('../api/paylio-callback.js')).default;
const now = (await import('../api/_nowpayments-shared.js')).processNowPaymentsStatus;
const catalyst = (await import('../api/catalystpay-webhook.js')).default;
delete process.env.CATALYSTPAY_WEBHOOK_SECRET;
const catalystWithoutSecret = (await import('../api/catalystpay-webhook.js?without-secret')).default;
process.env.CATALYSTPAY_WEBHOOK_SECRET = env.CATALYSTPAY_WEBHOOK_SECRET;
const stripe = (await import('../api/stripe-webhook.js')).default;
const confirm = (await import('../api/confirm-stripe-payment.js')).default;
const orderId = 'INV-FIXTURE';
const email = 'buyer@example.test';
const response = () => ({ statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; }, send(v) { this.body = v; return this; } });
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const receipt = overrides => ({ ok: true, orderId, email, creditCents: 1000, provider: 'stripe', alreadyDebited: true, balanceCents: 9000, ...overrides });

for (const [name, handler] of starts) {
  test(`${name}: partial credit rejected before any IO; zero credit still creates existing provider invoice`, async t => {
    stripeCreates = [];
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
      calls.push([String(url), options]);
      if (String(url).includes('/rest/v1/orders?')) return json([{ metadata: { storeCreditUsed: 0 } }]);
      if (String(url).includes('/rest/v1/')) return json([]);
      return json({ id: 'invoice_fixture', payment_url: 'https://provider.example.test/pay' });
    });
    const base = { orderId, order_id: orderId, email, customer_email: email, items: [{}] };
    for (const credit of [10, '10.00', 0.001, 999999]) {
      const res = response();
      await handler({ method: 'POST', headers: {}, body: { ...base, storeCreditUsed: credit } }, res);
      assert.equal(res.statusCode, 409);
      assert.equal(res.body.code, 'STORE_CREDIT_REQUIRES_MERIT');
      assert.match(res.body.error, /Merit.*fully/);
    }
    assert.deepEqual(calls, []);
    assert.deepEqual(stripeCreates, []);
    const res = response();
    await handler({ method: 'POST', headers: {}, body: { ...base, storeCreditUsed: 0 } }, res);
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(calls.filter(([url]) => !url.includes('/rest/v1/')).length + stripeCreates.length, 1);
  });
}

test('start guard rejects malformed values and permits omitted or exact zero', () => {
  for (const value of [-1, 'NaN', Infinity, {}, [], true]) assert.equal(legacyCreditStartError({ storeCreditUsed: value }).status, 400);
  for (const value of [undefined, null, '', 0, '0.00']) assert.equal(legacyCreditStartError({ storeCreditUsed: value }), null);
});

test('RPC wrapper sends service-only exact cents and accepts only reconciled ledger replay receipts', async () => {
  for (const alreadyDebited of [true]) {
    const calls = [];
    const result = await debitLegacyOrderCredit({ orderId, email: ' Buyer@Example.Test ', creditAmount: '10.00', provider: 'Stripe' }, {
      env, fetchImpl: async (url, options) => { calls.push([url, options]); return json(receipt({ alreadyDebited })); },
    });
    assert.equal(result.alreadyDebited, alreadyDebited);
    assert.equal(calls[0][0], `${env.SUPABASE_URL}/rest/v1/rpc/debit_legacy_order_credit`);
    assert.deepEqual(JSON.parse(calls[0][1].body), { p_order_id: orderId, p_email: email, p_credit_cents: 1000, p_provider: 'stripe' });
    assert.equal(calls[0][1].headers.apikey, env.SUPABASE_SERVICE_ROLE_KEY);
  }
});

test('RPC wrapper fails closed on missing service role, failed/malformed receipts and connection uncertainty', async () => {
  const input = { orderId, email, creditAmount: 10, provider: 'stripe' };
  const failures = [
    async () => json({ ok: false, error: 'insufficient_credit' }),
    async () => json(receipt(), 503),
    async () => { throw Error('private network detail'); },
    async () => new Response('bad-json'),
    ...[{ orderId: 'wrong' }, { email: 'wrong@example.test' }, { creditCents: 999 }, { creditCents: '1000' }, { provider: 'paylio' }, { balanceCents: -1 }, { alreadyDebited: undefined }, { alreadyDebited: false }].map(change => async () => json(receipt(change))),
  ];
  for (const fetchImpl of failures) await assert.rejects(debitLegacyOrderCredit(input, { env, fetchImpl }), { code: 'CREDIT_RECONCILIATION_REQUIRED', status: 503 });
  await assert.rejects(debitLegacyOrderCredit(input, { env: { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_ANON_KEY: 'anon' }, fetchImpl: () => assert.fail('must not fetch') }), { code: 'CREDIT_RECONCILIATION_REQUIRED' });
  for (const creditAmount of [-1, 'bad', 1.001, Infinity, true, [], {}]) await assert.rejects(debitLegacyOrderCredit({ ...input, creditAmount }, { env, fetchImpl: () => assert.fail('must not fetch') }), { code: 'CREDIT_RECONCILIATION_REQUIRED' });
  assert.deepEqual(await debitLegacyOrderCredit({ creditAmount: 0 }, { env: {}, fetchImpl: () => assert.fail('zero credit must not fetch') }), { ok: true, skipped: true });
});

const callbackNames = ['paylio', 'nowpayments', 'catalystpay', 'stripe-session', 'stripe-intent', 'stripe-confirm'];
function callbackFixture(t, { name, amount = 10, paid = false, rpcFailure = false, paidWriteFails = false, providerVerified = true, signature = true, noCatalystSecret = false, intentOverride = {}, callbackBody = {}, orderReadMode = 'ok', paidReceiptMode = 'ok' } = {}) {
  const calls = [];
  const provider = name.startsWith('stripe') ? 'stripe' : name;
  const paymentId = name === 'stripe-session' ? 'cs_fixture' : 'pi_fixture';
  const row = { id: orderId, email, total: 90, metadata: { email, storeCreditUsed: amount, confirmationEmailSentAt: paid ? '2026-10-01T00:00:00Z' : undefined, total: 90, subtotal: 100, items: [{ name: 'Fixture', price: 100 }] }, items: [], status: paid ? 'paid' : 'checkout', payment_id: paymentId };
  let debitCount = 0; // A pre-existing private consumed receipt never debits again.
  let failPaid = paidWriteFails;
  t.mock.method(console, 'error', () => {});
  t.mock.method(console, 'log', () => {});
  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ url: String(url), method, body });
    if (String(url).includes('/rpc/debit_legacy_order_credit')) {
      if (rpcFailure) return json({ ok: false, error: 'insufficient_credit' });
      const alreadyDebited = true;
      return json(receipt({ provider, creditCents: Math.round(amount * 100), alreadyDebited }));
    }
    if (method === 'GET' && String(url).includes('/orders?')) {
      if (orderReadMode === 'http') return json({ error: 'fixture failure' }, 503);
      if (orderReadMode === 'network') throw new Error('fixture failure');
      if (orderReadMode === 'malformed') return new Response('bad-json');
      if (orderReadMode === 'empty') return json([]);
      return json([row]);
    }
    if (method === 'GET') return json([]);
    if (body?.status === 'paid' && failPaid) return json({ error: 'fixture failure' }, 503);
    if (body?.status === 'paid') {
      if (paidReceiptMode === 'empty') return json([]);
      if (paidReceiptMode === 'malformed') return new Response('bad-json');
      if (paidReceiptMode === 'wrong-order') return json([{ ...row, ...body, id: 'INV-OTHER' }]);
      Object.assign(row, body);
      row.payment_id = body.payment_id || paymentId;
      return json([row]);
    }
    return json({ ok: true });
  });
  verifiedIntent = { id: 'pi_fixture', status: 'succeeded', currency: 'usd', amount: 9000, amount_received: 9000, ...intentOverride, metadata: { orderId, email, total: '90.00', storeCreditUsed: String(amount), ...intentOverride.metadata } };
  const invoke = async () => {
    const res = response();
    if (name === 'paylio') await paylio({ method: 'POST', body: { status: 'paid', order_id: orderId, email }, query: {} }, res);
    if (name === 'nowpayments') {
      try { res.body = await now({ payment_status: 'finished', order_id: orderId, email, ...callbackBody }, { providerVerified }); }
      catch (error) { res.statusCode = error.status || 500; res.body = { error: error.message }; }
    }
    if (name === 'catalystpay') {
      const body = JSON.stringify({ type: 'settled', invoiceId: 'invoice_fixture', metadata: { OrderId: orderId } });
      const headers = signature ? { 'x-signature': createHmac('sha256', env.CATALYSTPAY_WEBHOOK_SECRET).update(body).digest('hex') } : {};
      await (noCatalystSecret ? catalystWithoutSecret : catalyst)({ method: 'POST', headers, body }, res);
    }
    if (name.startsWith('stripe-') && name !== 'stripe-confirm') {
      const req = new PassThrough(); req.method = 'POST'; req.headers = { 'stripe-signature': 'fixture-signature' };
      const entity = name === 'stripe-session' ? { id: 'cs_fixture', amount_total: 9000, customer_email: email, metadata: { orderId, email, storeCreditUsed: String(amount) } } : verifiedIntent;
      const promise = stripe(req, res);
      req.end(JSON.stringify({ type: name === 'stripe-session' ? 'checkout.session.completed' : 'payment_intent.succeeded', data: { object: entity } }));
      await promise;
    }
    if (name === 'stripe-confirm') await confirm({ method: 'POST', body: { orderId, paymentIntentId: 'pi_fixture' } }, res);
    return res;
  };
  return { calls, invoke, get debitCount() { return debitCount; }, allowPaidWrite() { failPaid = false; } };
}

for (const name of callbackNames) {
  test(`${name}: failed credit debit prevents paid transition and every write side effect`, async t => {
    const fixture = callbackFixture(t, { name, rpcFailure: true });
    const result = await fixture.invoke();
    assert.ok(result.statusCode >= 500);
    assert.equal(fixture.calls.filter(call => call.url.includes('/rpc/debit_legacy_order_credit')).length, name === 'paylio' ? 0 : 1);
    assert.deepEqual(fixture.calls.filter(call => call.method !== 'GET' && !call.url.includes('/rpc/debit_legacy_order_credit')), []);
  });
  if (name !== 'paylio') test(`${name}: exact consumed-ledger receipt precedes paid state; no balance writes`, async t => {
    const fixture = callbackFixture(t, { name });
    const result = await fixture.invoke();
    assert.equal(result.statusCode, 200, JSON.stringify(result.body));
    const rpcIndex = fixture.calls.findIndex(call => call.url.includes('/rpc/debit_legacy_order_credit'));
    const paidIndex = fixture.calls.findIndex(call => call.body?.status === 'paid');
    assert.ok(rpcIndex >= 0 && paidIndex > rpcIndex);
    assert.equal(fixture.calls.some(call => call.url.includes('/user_credits')), false);
    assert.equal(fixture.debitCount, 0);
  });
  if (name !== 'paylio') test(`${name}: retry after paid-write failure reuses consumed-ledger receipt without another debit`, async t => {
    const fixture = callbackFixture(t, { name, paidWriteFails: true });
    await fixture.invoke();
    assert.equal(fixture.debitCount, 0);
    fixture.allowPaidWrite();
    const result = await fixture.invoke();
    assert.equal(result.statusCode, 200, JSON.stringify(result.body));
    assert.equal(fixture.calls.filter(call => call.url.includes('/rpc/debit_legacy_order_credit')).length, 2);
    assert.equal(fixture.debitCount, 0);
  });
  test(`${name}: zero-credit and previously paid invoices never debit`, async t => {
    for (const scenario of [{ amount: 0 }, { paid: true }]) {
      const fixture = callbackFixture(t, { name, ...scenario });
      assert.equal((await fixture.invoke()).statusCode, name === 'paylio' && scenario.paid ? 503 : 200);
      assert.equal(fixture.calls.some(call => call.url.includes('/rpc/') || call.url.includes('/user_credits')), false);
    }
  });
}

for (const payment_status of ['waiting', 'failed', 'expired']) {
  test(`NOWPayments ${payment_status}: no debit, paid transition or side effects`, async t => {
    t.mock.method(console, 'error', () => {});
    t.mock.method(globalThis, 'fetch', () => assert.fail('Nonpayment status must not perform IO'));
    const result = await now({ payment_status, order_id: orderId, email, order_description: JSON.stringify({ storeCreditUsed: 10 }) });
    assert.equal(result.skipped, 'not_relevant');
  });
}

for (const options of [
  { name: 'paylio' }, { name: 'paylio', paid: true },
  { name: 'catalystpay', noCatalystSecret: true },
  { name: 'catalystpay', noCatalystSecret: true, paid: true },
  { name: 'catalystpay', signature: false },
  { name: 'nowpayments', providerVerified: false, callbackBody: { providerVerified: true } },
  { name: 'nowpayments', providerVerified: false, paid: true },
]) {
  test(`unverified positive-credit notification fails without financial side effects: ${JSON.stringify(options)}`, async t => {
    const fixture = callbackFixture(t, options);
    assert.ok((await fixture.invoke()).statusCode >= 400);
    assert.deepEqual(fixture.calls.filter(call => call.method !== 'GET'), []);
  });
}
for (const intentOverride of [
  { metadata: { orderId: undefined } }, { metadata: { orderId: 'INV-OTHER' } },
  { metadata: { email: 'other@example.test' } }, { metadata: { email: undefined } },
  { metadata: { storeCreditUsed: '0.00' } }, { metadata: { storeCreditUsed: '9.99' } },
  { metadata: { total: '89.99' } }, { amount: 8999 }, { amount_received: 8999 },
  { amount_received: undefined }, { currency: 'eur' },
]) {
  test(`Stripe confirmation requires exact private-provider credit binding: ${JSON.stringify(intentOverride)}`, async t => {
    const fixture = callbackFixture(t, { name: 'stripe-confirm', intentOverride });
    assert.ok((await fixture.invoke()).statusCode >= 400);
    assert.deepEqual(fixture.calls.filter(call => call.method !== 'GET'), []);
  });
}

for (const name of callbackNames) {
  for (const orderReadMode of ['http', 'network', 'malformed', 'empty']) {
    test(`${name}: ${orderReadMode} canonical order lookup cannot hide credit or produce writes`, async t => {
      const fixture = callbackFixture(t, { name, orderReadMode, amount: 0 });
      assert.ok((await fixture.invoke()).statusCode >= 500);
      assert.deepEqual(fixture.calls.filter(call => call.method !== 'GET'), []);
    });
  }
}
for (const name of callbackNames.filter(value => value !== 'paylio')) {
  for (const options of [{ paidWriteFails: true }, ...['empty', 'malformed', 'wrong-order'].map(paidReceiptMode => ({ paidReceiptMode }))]) {
    test(`${name}: rejected paid acknowledgement blocks all later credit side effects ${JSON.stringify(options)}`, async t => {
      const fixture = callbackFixture(t, { name, ...options });
      assert.ok((await fixture.invoke()).statusCode >= 500);
      assert.deepEqual(fixture.calls.filter(call => call.method !== 'GET' && !call.url.includes('/rpc/debit_legacy_order_credit') && call.body?.status !== 'paid'), []);
    });
  }
}
test('paid acknowledgement accepts equivalent PostgreSQL timestamps and rejects altered saved fields', () => {
  const expected = { id: orderId, email, status: 'paid', payment_provider: 'Stripe', payment_id: 'pi_fixture', paid_at: '2026-10-08T22:00:00.123Z' };
  assert.doesNotThrow(() => assertLegacyCreditPaidAcknowledgement([{ ...expected, paid_at: '2026-10-08T22:00:00.123+00:00' }], expected));
  for (const fields of [{ id: 'other' }, { email: 'other@example.test' }, { status: 'checkout' }, { payment_provider: 'Paylio' }, { payment_id: 'other' }, { paid_at: null }]) {
    assert.throws(() => assertLegacyCreditPaidAcknowledgement([{ ...expected, ...fields }], expected), { code: 'CREDIT_RECONCILIATION_REQUIRED' });
  }
});

for (const [name, handler] of starts) {
  test(`${name}: zero or omitted credit cannot start another payable for an existing credit claim or failed lookup`, async t => {
    for (const storeCreditUsed of [undefined, 0]) {
      for (const mode of ['positive', 'http', 'network', 'malformed', 'wrong-shape', 'invalid-credit', 'empty']) {
        stripeCreates = [];
        const calls = [];
        t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
          calls.push({ url: String(url), method: options.method || 'GET' });
          assert.ok(String(url).includes('/rest/v1/orders?'), 'must not reach provider or other database IO');
          if (mode === 'network') throw Error('fixture failure');
          if (mode === 'http') return json({}, 503);
          if (mode === 'malformed') return new Response('bad-json');
          if (mode === 'wrong-shape') return json({});
          if (mode === 'empty') return json([]);
          return json([{ metadata: { storeCreditUsed: mode === 'positive' ? 10 : 'unknown' } }]);
        });
        const res = response();
        await handler({ method: 'POST', headers: {}, body: { orderId, order_id: orderId, email, customer_email: email, items: [{}], storeCreditUsed } }, res);
        assert.equal(res.statusCode, mode === 'positive' ? 409 : 503, `${name} ${mode}`);
        assert.equal(res.body.code, 'CREDIT_RECONCILIATION_REQUIRED');
        assert.deepEqual(stripeCreates, []);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].method, 'GET');
      }
    }
  });
}
test('existing credit preflight never falls back to a public database key', async () => {
  const result = await legacyExistingCreditOrderError({ orderId }, { env: { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_ANON_KEY: 'fixture-anon' }, fetchImpl: () => assert.fail('must not read as anonymous') });
  assert.equal(result.status, 503);
});

for (const [name, handler] of starts.filter(([name]) => ['create-stripe-session', 'create-payment-intent'].includes(name))) {
  test(`${name}: preflight uses the same orderId as the provider when aliases disagree`, async t => {
    stripeCreates = [];
    t.mock.method(globalThis, 'fetch', async url => {
      assert.equal(new URL(String(url)).searchParams.get('id'), `eq.${orderId}`);
      return json([{ metadata: { storeCreditUsed: 10 } }]);
    });
    const res = response();
    await handler({ method: 'POST', headers: {}, body: { orderId, order_id: 'INV-NO-CREDIT', email, items: [{}] } }, res);
    assert.equal(res.statusCode, 409);
    assert.deepEqual(stripeCreates, []);
  });
}

test('NOWPayments numeric payment IDs are normalized before positive-credit paid acknowledgement', async t => {
  const fixture = callbackFixture(t, { name: 'nowpayments', callbackBody: { payment_id: 123456789 } });
  const result = await fixture.invoke();
  assert.equal(result.statusCode, 200);
  const paid = fixture.calls.find(call => call.body?.status === 'paid');
  assert.equal(paid.body.payment_id, '123456789');
});
