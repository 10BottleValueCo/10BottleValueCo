process.env.RESEND_API_KEY = 'synthetic-mail-key';
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertCatalystVerificationReady, readCatalystInvoice, verifyCatalystSettlement } from '../api/_catalystpay-provider.js';

const env = { SUPABASE_URL: 'https://db.example.test', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service', CATALYSTPAY_MERCHANT_ID: 'store_fixture', CATALYSTPAY_API_TOKEN: 'fixture-private-token', CATALYSTPAY_ENV: 'production' };
Object.assign(process.env, env);
delete process.env.CATALYSTPAY_WEBHOOK_SECRET;
delete process.env.VITE_SUPABASE_URL;
let currentOrder;
mock.module('../api/_order-access.js', { namedExports: { requireLegacyOrderAccess: async () => ({ identity: { id: '11111111-1111-4111-8111-111111111111', email: 'buyer@example.test' }, order: structuredClone(currentOrder) }) } });
mock.module('../api/_catalog.js', { namedExports: { validateAndPriceItems: () => ({ pricedItems: [{ name: 'Fixture', dose: '10 mg', quantity: 1, price: 100 }], subtotal: 100, regularSubtotal: 100 }), getShippingPrice: () => 10, getAutomaticDiscountRate: () => 0 } });
const create = (await import('../api/create-catalystpay-session.js')).default;
const callback = (await import('../api/catalystpay-webhook.js')).default;
const id = 'INV-CATALYST', invoiceId = 'invoice_fixture';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const res = () => ({ statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const invoice = (patch = {}) => ({ id: invoiceId, storeId: env.CATALYSTPAY_MERCHANT_ID, amount: '110.00', currency: 'USD', status: 'Settled', additionalStatus: 'None', metadata: { OrderId: id }, checkoutLink: `https://checkout.example.test/i/${invoiceId}`, ...patch });
const order = (patch = {}) => ({ id, email: 'buyer@example.test', status: 'checkout (clicked pay)', total: 110, payment_id: null, payment_provider: null, items: [], metadata: { catalystpay_invoice_id: invoiceId, total: 110, subtotal: 100, shipping: 10, storeCreditUsed: 0, shippingType: 'standard', items: [{ name: 'Fixture', dose: '10 mg', quantity: 1, price: 100 }] }, ...patch });

test('Paidly verification authenticates the fixed account URL and binds exact stored invoice, order, amount and currency', async () => {
  const calls = [], fetcher = async (url, options) => { calls.push({ url, options }); return json(invoice()); };
  await verifyCatalystSettlement(order(), invoiceId, { env, fetcher });
  assert.equal(calls[0].url, 'https://api.paidlyinteractive.com/api/v1/stores/store_fixture/invoices/invoice_fixture');
  assert.equal(calls[0].options.headers.Authorization, 'token fixture-private-token');
  assert.equal(calls[0].options.redirect, 'error');
  for (const patch of [{ id: 'other' }, { storeId: 'other' }, { amount: '109.99' }, { currency: 'EUR' }, { metadata: { OrderId: 'INV-OTHER' } }, { status: 'New' }, { status: 'Processing' }, { status: 'Expired' }, { status: 'Canceled' }, { additionalStatus: 'Marked' }, { additionalStatus: 'PaidPartial' }, { additionalStatus: 'Invalid' }, { additionalStatus: 'PaidLate' }, { additionalStatus: undefined }])
    await assert.rejects(verifyCatalystSettlement(order(), invoiceId, { env, fetcher: async () => json(invoice(patch)) }), undefined, JSON.stringify(patch));
  for (const changed of [order({ total: 99 }), order({ metadata: { total: 110 } }), order({ metadata: { catalystpay_invoice_id: 'other', total: 110 } })])
    await assert.rejects(verifyCatalystSettlement(changed, invoiceId, { env, fetcher }));
  await verifyCatalystSettlement(order(), invoiceId, { env, fetcher: async () => json(invoice({ additionalStatus: 'PaidOver' })) });
});

test('unavailable, malformed and oversized provider responses cannot become settlement proof', async () => {
  for (const response of [json({}, 403), json({}, 404), new Response('bad-json'), json([]), json({ ...invoice(), padding: 'x'.repeat(100001) })])
    await assert.rejects(readCatalystInvoice(invoiceId, { env, fetcher: async () => response }));
  await assert.rejects(readCatalystInvoice('../other', { env, fetcher: () => assert.fail('invalid id must not fetch') }));
  await assert.rejects(readCatalystInvoice(invoiceId, { env: {}, fetcher: () => assert.fail('missing credentials must not fetch') }));
});

test('readiness uses only a bounded private saved ID and caches the proven account capability for at most one minute', async () => {
  const calls = []; let now = 1000;
  const fetcher = async (input, options) => {
    const url = new URL(input); calls.push({ url, options });
    if (url.hostname === 'db.example.test') {
      assert.equal(url.searchParams.get('select'), 'invoice_id:metadata->>catalystpay_invoice_id');
      assert.equal(url.searchParams.get('limit'), '1');
      return json([{ invoice_id: invoiceId }]);
    }
    return json(invoice({ status: 'Expired' }));
  };
  const deps = { env, fetcher, now: () => now };
  await assertCatalystVerificationReady(deps); assert.equal(calls.length, 2);
  now += 59999; await assertCatalystVerificationReady(deps); assert.equal(calls.length, 2);
  now++; await assertCatalystVerificationReady(deps); assert.equal(calls.length, 4);
  await assertCatalystVerificationReady({ ...deps, env: { ...env, CATALYSTPAY_API_TOKEN: 'changed-token' } }); assert.equal(calls.length, 6);
});

function fixture(t, { providerPatch = {}, creationPatch = {}, creationStatus = 200, verificationStatus = 200, saved = true, ackMode = 'ok', duplicate = false } = {}) {
  currentOrder = order();
  if (!saved) { currentOrder.metadata = { storeCreditUsed: 0 }; currentOrder.status = 'checkout'; }
  const calls = [];
  t.mock.method(console, 'error', () => {});
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(input), method = options.method || 'GET', body = options.body ? JSON.parse(options.body) : null;
    calls.push({ url, method, body });
    if (url.hostname === 'api.paidlyinteractive.com') {
      if (method === 'POST') {
        assert.equal(options.redirect, 'error');
        return json(invoice({ status: 'New', ...creationPatch }), creationStatus);
      }
      return json(invoice(providerPatch), verificationStatus);
    }
    if (url.pathname === '/rest/v1/orders') {
      if (url.searchParams.get('select')?.startsWith('invoice_id:')) return json([{ invoice_id: invoiceId }]);
      if (method === 'GET') return json(duplicate ? [currentOrder, currentOrder] : [currentOrder]);
      if (ackMode === 'http') return json({}, 503);
      if (ackMode === 'empty') return json([]);
      const updated = { ...currentOrder, ...body };
      if (ackMode === 'changed') updated.metadata = { ...updated.metadata, total: 1 };
      if (updated.metadata) updated.metadata = Object.fromEntries(Object.entries(updated.metadata).reverse()); // JSONB does not preserve key order.
      currentOrder = updated;
      return json([updated]);
    }
    if (url.pathname === '/emails') return json({ ok: true });
    if (url.pathname.startsWith('/rest/v1/')) return method === 'GET' ? json([]) : json({ ok: true });
    assert.fail(`Unexpected request ${url.pathname}`);
  });
  return { calls };
}
const start = () => ({ method: 'POST', body: { order_id: id, customer_email: 'buyer@example.test', email: 'buyer@example.test', items: [{}], storeCreditUsed: 0 } });
const settledHint = (patch = {}) => ({ method: 'POST', headers: {}, body: JSON.stringify({ type: 'InvoiceSettled', invoiceId, ...patch }) });

test('unsigned callback without event metadata resolves saved invoice, verifies provider, then acknowledges paid once', async t => {
  const f = fixture(t), first = res();
  await callback(settledHint(), first); assert.equal(first.statusCode, 200); assert.equal(first.body.dbMarkedPaid, true);
  const lookup = f.calls.find(call => call.url.pathname === '/rest/v1/orders');
  assert.equal(lookup.url.searchParams.get('metadata->>catalystpay_invoice_id'), `eq.${invoiceId}`);
  const proof = f.calls.findIndex(call => call.url.hostname === 'api.paidlyinteractive.com');
  const paid = f.calls.findIndex(call => call.body?.status === 'paid');
  assert.ok(proof >= 0 && paid > proof);
  const second = res(); await callback(settledHint(), second); assert.equal(second.statusCode, 200);
  assert.equal(f.calls.filter(call => call.body?.status === 'paid').length, 1);
});

test('unsigned pending, mismatched, cancelled or unverifiable invoices never write, send receipts or debit credit', async t => {
  for (const options of [{ verificationStatus: 403 }, { providerPatch: { amount: '1.00' } }, { providerPatch: { metadata: { OrderId: 'INV-OTHER' } } }, { providerPatch: { status: 'New' } }, { providerPatch: { status: 'Expired' } }, { providerPatch: { status: 'Canceled' } }, { providerPatch: { additionalStatus: 'Marked' } }, { duplicate: true }, { saved: false }]) {
    const f = fixture(t, options), response = res(); await callback(settledHint(), response);
    assert.ok(response.statusCode >= 400, JSON.stringify(options)); assert.equal(f.calls.some(call => call.method !== 'GET'), false);
  }
  const f = fixture(t), forged = res(); await callback(settledHint({ metadata: { OrderId: 'INV-OTHER' } }), forged);
  assert.equal(forged.statusCode, 409); assert.equal(f.calls.some(call => call.url.hostname === 'api.paidlyinteractive.com' || call.method !== 'GET'), false);
});

test('unsigned callback never resurrects refunded or cancelled orders after independent settled proof', async t => {
  for (const status of ['refunded', 'cancelled']) {
    const f = fixture(t); currentOrder.status = status;
    const response = res(); await callback(settledHint(), response); assert.equal(response.statusCode, 409);
    assert.equal(f.calls.some(call => call.method !== 'GET'), false);
  }
});

test('Cash App creation proves read permission before provider creation and acknowledges JSONB binding before exposing a link', async t => {
  const f = fixture(t, { saved: false }), response = res(); await create(start(), response);
  assert.equal(response.statusCode, 200, JSON.stringify(response.body)); assert.equal(response.body.invoice_id, invoiceId);
  const read = f.calls.findIndex(call => call.url.hostname === 'api.paidlyinteractive.com' && call.method === 'GET');
  const creation = f.calls.findIndex(call => call.url.hostname === 'api.paidlyinteractive.com' && call.method === 'POST');
  const binding = f.calls.findIndex(call => call.body?.metadata?.catalystpay_invoice_id === invoiceId);
  assert.ok(read >= 0 && creation > read && binding > creation);
  assert.equal(currentOrder.metadata.catalystpay_invoice_id, invoiceId); assert.equal(currentOrder.total, 110);
  assert.equal(f.calls[binding].url.searchParams.get('payment_provider'), 'is.null');
  assert.equal(f.calls[binding].url.searchParams.get('total'), 'eq.110');
});

test('unavailable invoice-read readiness prevents payment creation', async t => {
  const f = fixture(t, { saved: false, verificationStatus: 403 }), response = res(); await create(start(), response);
  assert.equal(response.statusCode, 503); assert.equal(response.body.code, 'PAYMENT_VERIFICATION_UNAVAILABLE');
  assert.equal(f.calls.some(call => call.method === 'POST' || call.method === 'PATCH'), false);
});

test('failed, empty or altered binding acknowledgements never expose a new checkout URL', async t => {
  for (const ackMode of ['http', 'empty', 'changed']) {
    fixture(t, { saved: false, ackMode }); const response = res(); await create(start(), response);
    assert.equal(response.statusCode, 503); assert.equal(response.body.code, 'PAYMENT_BINDING_UNACKNOWLEDGED');
    assert.equal(response.body.checkoutLink, undefined);
  }
});

test('wrong or incomplete provider creation responses never become a stored invoice or customer link', async t => {
  for (const creationPatch of [
    { id: undefined }, { storeId: 'other' }, { storeId: undefined }, { amount: '109.99' }, { amount: undefined },
    { currency: 'EUR' }, { currency: undefined }, { metadata: { OrderId: 'INV-OTHER' } }, { metadata: undefined },
    { status: 'Settled' }, { status: undefined }, { additionalStatus: 'Marked' },
    { checkoutLink: 'http://checkout.example.test/i/invoice_fixture' }, { checkoutLink: 'javascript:alert(1)' },
  ]) {
    const f = fixture(t, { saved: false, creationPatch }), response = res(); await create(start(), response);
    assert.equal(response.statusCode, 503, JSON.stringify(creationPatch));
    assert.equal(response.body.checkoutLink, undefined);
    assert.equal(f.calls.some(call => call.method === 'PATCH'), false);
  }
  const f = fixture(t, { saved: false, creationStatus: 500, creationPatch: { error: 'private-provider-detail', ipn_token: 'private-token' } }), response = res();
  await create(start(), response); assert.equal(response.statusCode, 503);
  assert.doesNotMatch(JSON.stringify(response.body), /private-provider-detail|private-token|checkoutLink/);
  assert.equal(f.calls.some(call => call.method === 'PATCH'), false);
});

test('a saved unpaid invoice resumes without creating another invoice; changed amount or settled status cannot restart payment', async t => {
  const f = fixture(t, { providerPatch: { status: 'New' } }), response = res(); await create(start(), response);
  assert.equal(response.statusCode, 200, JSON.stringify(response.body)); assert.equal(f.calls.some(call => call.method !== 'GET'), false);
  for (const patch of [{ amount: '1.00' }, { status: 'Settled' }, { status: 'Expired' }]) {
    const next = fixture(t, { providerPatch: patch }), result = res(); await create(start(), result);
    assert.equal(result.statusCode, 409); assert.equal(next.calls.some(call => call.method !== 'GET'), false);
  }
});

test('resume cannot silently change recipient, destination, notes or referral context for an existing invoice', async t => {
  for (const field of ['firstName', 'lastName', 'country', 'address', 'address2', 'city', 'state', 'postalCode', 'phone', 'taxId', 'orderNotes', 'affiliateCode', 'affiliateOwnerEmail']) {
    const f = fixture(t, { providerPatch: { status: 'New' } }), response = res(), request = start();
    request.body[field] = 'changed';
    await create(request, response); assert.equal(response.statusCode, 409, field); assert.equal(response.body.code, 'PAYMENT_BINDING_CONFLICT');
    assert.equal(f.calls.some(call => call.method !== 'GET'), false);
  }
  for (const [field, value] of [['subtotal', 99], ['automaticDiscount', 5], ['cryptoDiscount', 5]]) {
    const f = fixture(t, { providerPatch: { status: 'New' } }), response = res(); currentOrder.metadata[field] = value;
    await create(start(), response); assert.equal(response.statusCode, 409, field); assert.equal(f.calls.some(call => call.method !== 'GET'), false);
  }
});
