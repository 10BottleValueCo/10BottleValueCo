import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCatalystVerificationReady, readCatalystInvoice, verifyCatalystSettlement } from '../api/_catalystpay-provider.js';

const env = { CATALYSTPAY_ENV: 'production', CATALYSTPAY_MERCHANT_ID: 'merchant_fixture', CATALYSTPAY_API_TOKEN: 'synthetic-provider-token', SUPABASE_URL: 'https://db.example.test', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service' };
const invoice = { id: 'invoice_fixture', storeId: env.CATALYSTPAY_MERCHANT_ID, amount: '100.00', currency: 'USD', metadata: { OrderId: 'INV-FIXTURE' }, status: 'Settled', additionalStatus: 'None' };
const order = { id: 'INV-FIXTURE', total: 100, metadata: { total: 100, catalystpay_invoice_id: invoice.id } };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('Paidly lookup binds a fixed provider origin, configured store and exact invoice', async () => {
  let calls = 0;
  const deps = { env, fetcher: async (input, options) => {
    calls++;
    assert.equal(input, 'https://api.paidlyinteractive.com/api/v1/stores/merchant_fixture/invoices/invoice_fixture');
    assert.equal(options.headers.Authorization, 'token synthetic-provider-token');
    assert.equal(options.redirect, 'error');
    return json(invoice);
  } };
  assert.deepEqual(await readCatalystInvoice(invoice.id, deps), invoice);
  for (const id of ['../../other', 'https://evil.example', '', null]) await assert.rejects(readCatalystInvoice(id, deps));
  assert.equal(calls, 1);
  for (const body of [null, [], { ...invoice, id: 'other' }, { ...invoice, storeId: 'other' }, { ...invoice, amount: 'NaN' }, { ...invoice, metadata: null }, { ...invoice, status: 'Unknown' }])
    await assert.rejects(readCatalystInvoice(invoice.id, { env, fetcher: async () => json(body) }), { code: 'PAYMENT_VERIFICATION_UNAVAILABLE' });
  for (const status of [401, 403, 404, 500])
    await assert.rejects(readCatalystInvoice(invoice.id, { env, fetcher: async () => json({ secret: 'must not surface' }, status) }), { message: 'Payment verification is temporarily unavailable.' });
});

test('Paidly settlement requires exact amount, currency, order, invoice, store and unambiguous paid state', async () => {
  for (const additionalStatus of ['None', 'PaidOver'])
    assert.equal((await verifyCatalystSettlement(order, invoice.id, { env, fetcher: async () => json({ ...invoice, additionalStatus }) })).id, invoice.id);
  for (const change of [
    { amount: '99.99' }, { amount: '100.001' }, { currency: 'EUR' }, { metadata: { OrderId: 'INV-OTHER' } },
    ...['New', 'Processing', 'Expired'].map(status => ({ status })),
    ...['Marked', 'PaidPartial', 'PaidLate', 'Invalid', undefined].map(additionalStatus => ({ additionalStatus })),
  ]) await assert.rejects(verifyCatalystSettlement(order, invoice.id, { env, fetcher: async () => json({ ...invoice, ...change }) }));
  for (const change of [{ total: 99 }, { metadata: { ...order.metadata, total: 99 } }, { metadata: { ...order.metadata, catalystpay_invoice_id: 'other' } }])
    await assert.rejects(verifyCatalystSettlement({ ...order, ...change }, invoice.id, { env, fetcher: async () => json(invoice) }));
});

test('Paidly readiness reads only one saved invoice identifier, proves provider access and caches for a minute', async () => {
  let calls = 0, now = 1000;
  const deps = { env: { ...env }, now: () => now, fetcher: async input => {
    calls++;
    const url = new URL(input);
    if (url.hostname === 'db.example.test') {
      assert.equal(url.searchParams.get('select'), 'invoice_id:metadata->>catalystpay_invoice_id');
      assert.equal(url.searchParams.get('limit'), '1');
      assert.equal(url.searchParams.get('order'), 'created_at.desc');
      return json([{ invoice_id: invoice.id }]);
    }
    return json(invoice);
  } };
  await assertCatalystVerificationReady(deps); await assertCatalystVerificationReady(deps);
  assert.equal(calls, 2);
  now += 60001; await assertCatalystVerificationReady(deps); assert.equal(calls, 4);
  deps.env.CATALYSTPAY_API_TOKEN = 'rotated-synthetic-token';
  await assertCatalystVerificationReady(deps); assert.equal(calls, 6);
});

test('readiness fails closed without a saved invoice or authenticated read permission and never caches failure', async () => {
  for (const rows of [[], {}, [{ invoice_id: 'bad/id' }], [{ invoice_id: invoice.id }, { invoice_id: 'other' }]]) {
    let calls = 0;
    const deps = { env, fetcher: async input => { calls++; assert.equal(new URL(input).hostname, 'db.example.test'); return json(rows); } };
    await assert.rejects(assertCatalystVerificationReady(deps)); assert.equal(calls, 1);
  }
  let calls = 0;
  const deps = { env: { ...env, CATALYSTPAY_VERIFICATION_INVOICE_ID: invoice.id }, fetcher: async () => { calls++; return json({}, 403); } };
  await assert.rejects(assertCatalystVerificationReady(deps)); await assert.rejects(assertCatalystVerificationReady(deps)); assert.equal(calls, 2);
});
