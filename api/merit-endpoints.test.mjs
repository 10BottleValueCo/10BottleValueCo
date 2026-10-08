import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createMeritProvider } from './_merit-provider.js';
import { createMeritCheckoutHandler } from './merit-checkout.js';
import { createMeritWebhookHandler, verifyMeritSignature } from './attestly-webhook.js';
import { requireMeritProof } from './_merit-core.js';
import { buildMeritQuote } from './_merit-quote.js';

const env = { MERIT_ENABLED: 'true', ATTESTLY_API_KEY: 'fixture-private-key', ATTESTLY_WEBHOOK_SECRET: 'awhsec_fixture', MERIT_MODE: 'live', MERIT_RULE_VERSION: 'fixture-v1', MERIT_CARD_SURCHARGE_BPS: '300', MERIT_CARD_SURCHARGE_SOURCE: 'Fixture customer rule', MERIT_CARD_SURCHARGE_EFFECTIVE_AT: '2026-10-08T00:00:00Z', MERIT_PROCESSOR_FEE_BPS: '750', MERIT_PROCESSOR_FEE_SOURCE: 'Fixture dashboard reported rate', MERIT_PROCESSOR_FEE_EFFECTIVE_AT: '2026-10-08T00:00:00Z' };
const customer = { id: 'abcdefab-cdef-4abc-8abc-defabcdefabc', email: 'buyer@example.com' };
const checkoutKey = '12345678-abcd-4abc-8abc-123456789abc';
const orderId = 'INV-12345678ABCD4ABC8ABC123456789ABC';
const providerConfig = { publishableKey: 'pk_live_fixture', stripeAccount: 'acct_fixture', live: true };
const session = { ...providerConfig, intentId: 'pi_fixture', clientSecret: 'pi_fixture_secret_fixture' };
const priced = { amountCents: 10300, currency: 'usd', userPromoId: null, snapshot: { email: customer.email, items: [{ name: 'Canonical fixture item', dose: '10mg', quantity: 1, price: 100 }], subtotal: 100, shipping: 0, automaticDiscount: 0, promoDiscount: 0, affiliateDiscount: 0, total: 103, customerCardSurcharge: 3, customerCardSurchargeBps: 300, shippingType: 'standard', promoCode: '', affiliateOwnerEmail: 'private-affiliate@example.com' } };
const readyAttempt = { id: '11111111-1111-4111-8111-111111111111', customer_id: customer.id, email: customer.email, checkout_key: checkoutKey, order_id: orderId, amount_cents: 10300, currency: 'usd', expected_account: 'acct_fixture', expected_live: true, state: 'ready', snapshot: { ...priced.snapshot, paymentRules: { private: true }, costSnapshot: { secretCost: 1 } }, intent_id: session.intentId, client_secret: session.clientSecret, publishable_key: session.publishableKey, stripe_account: session.stripeAccount, livemode: true };
const verified = (attempt = readyAttempt, paid = true) => ({ source: 'merit_authenticated_verify', request: { intentId: attempt.intent_id }, verified: { paid, amountCents: Number(attempt.amount_cents), currency: 'usd' }, context: { source: 'authenticated_provider_config', stripeAccount: attempt.expected_account, live: attempt.expected_live } });
function responseRecorder() { return { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } }; }
async function run(handler, body, method = 'POST', headers = {}) { const res = responseRecorder(); await handler({ method, body, headers }, res); return res; }
function checkoutFixture(options = {}) {
  let saved = options.existing || null;
  const calls = [];
  const store = {
    ready: async () => { calls.push(['ready']); return true; },
    findByCheckoutKey: async (...args) => { calls.push(['find', ...args]); return saved; },
    findByOrder: async () => saved,
    reserve: async params => { calls.push(['reserve', params]); saved = { ...readyAttempt, state: 'reserved', intent_id: null, client_secret: null, publishable_key: null, quote_fingerprint: params.p_fingerprint, snapshot: params.p_snapshot }; return { ok: true, created: true, attempt: saved }; },
    bind: async params => { calls.push(['bind', params]); saved = { ...saved, state: 'ready', intent_id: params.p_intent_id, client_secret: params.p_client_secret, publishable_key: params.p_publishable_key }; return { ok: true, attempt: saved }; },
    finalize: async params => { calls.push(['finalize', params]); return { ok: true, paid: true, order: { id: orderId, status: 'paid' } }; },
    ...options.store,
  };
  const provider = { configuration: async () => { calls.push(['configuration']); return providerConfig; }, create: async args => { calls.push(['create', args]); return session; }, verify: async () => { calls.push(['verify']); return verified(); }, ...options.provider };
  const quote = options.quote || (async (body, email, opts) => { calls.push(['quote', body, email, opts]); return priced; });
  const authenticate = async () => options.customer === null ? null : options.customer || customer;
  const handler = createMeritCheckoutHandler({ env: options.env || env, provider, store, quote, authenticate, notify: async () => {} });
  return { handler, calls, store, provider };
}
const createBody = { action: 'create', checkoutKey, otpToken: 'fixture-otp', verifiedEmail: customer.email, amountCents: 1, orderId: 'ATTACKER-ORDER', clientSecret: 'attacker-secret' };

for (const wrong of [{}, { apiKey: 'private' }]) {
  test('missing private config is disabled without contacting provider/storage ' + JSON.stringify(wrong), async () => {
    const fixture = checkoutFixture({ env: wrong });
    const result = await run(fixture.handler, undefined, 'GET');
    assert.deepEqual(result.body, { ok: true, enabled: false });
    assert.deepEqual(fixture.calls, []);
  });
}
test('enabled config requires both provider and storage readiness and exposes only surcharge', async () => {
  const fixture = checkoutFixture();
  assert.deepEqual((await run(fixture.handler, undefined, 'GET')).body, { ok: true, enabled: true, currency: 'usd', surchargeBps: 300 });
  for (const failed of ['store', 'provider']) {
    const broken = checkoutFixture(failed === 'store' ? { store: { ready: async () => { throw Error('private-db'); } } } : { provider: { configuration: async () => { throw Error('private-key'); } } });
    assert.deepEqual((await run(broken.handler, undefined, 'GET')).body, { ok: true, enabled: false });
  }
});
test('new checkout derives amount, order and account from canonical server state', async () => {
  const fixture = checkoutFixture();
  const result = await run(fixture.handler, createBody);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.session.amountCents, 10300);
  assert.equal(result.body.session.baseAmountCents, 10000);
  assert.equal(result.body.session.surchargeCents, 300);
  assert.equal(result.body.order.id, orderId);
  assert.equal(result.body.order.total, 103);
  assert.equal(result.body.order.items[0].name, 'Canonical fixture item');
  assert.deepEqual(fixture.calls.map(call => call[0]), ['find', 'configuration', 'quote', 'reserve', 'create', 'bind']);
  assert.equal(fixture.calls.find(call => call[0] === 'quote')[1].orderId, undefined);
  assert.deepEqual(fixture.calls.find(call => call[0] === 'create')[1], { amountCents: 10300, orderId, otpToken: 'fixture-otp', verifiedEmail: customer.email, organization: undefined });
  assert.equal(fixture.calls.find(call => call[0] === 'reserve')[1].p_snapshot.paymentRules.merchantProcessingExpense.rate, 750);
  for (const secret of ['fixture-private-key', 'private-affiliate', 'paymentRules', 'costSnapshot', 'merchantProcessingExpense', 'quote_fingerprint']) assert.equal(JSON.stringify(result.body).includes(secret), false, secret);
  assert.equal(result.headers['Cache-Control'], 'private, no-store');
});
test('failed or malformed reservation cannot make even one provider create call', async () => {
  for (const reserve of [async () => { throw Error('database trigger rejected canonical order'); }, async () => ({ ok: false }), async () => ({ ok: true, created: true, attempt: null }), async () => ({ ok: true, created: true, attempt: { ...readyAttempt, state: 'reserved' } })]) {
    const fixture = checkoutFixture({ store: { reserve } });
    const result = await run(fixture.handler, createBody);
    assert.equal(result.statusCode, 503);
    assert.equal(fixture.calls.some(call => call[0] === 'create'), false);
  }
});
test('untrusted dynamic discount codes fail before any order reservation or provider create', async () => {
  const details = { checkoutForm: { firstName: 'Fixture', lastName: 'Buyer', country: 'United States', address: '1 Example Street', city: 'Boston', state: 'MA', postalCode: '02108', phone: '+1 212 555 1212' }, items: [{ name: 'BPC-157', dose: '10 mg', quantity: 1 }], shippingType: 'standard', purchaserAttestation: { over21AndResearchUseOnly: true, qualifiedResearcherOrLicensedProfessional: true, noHumanOrAnimalUse: true, policiesAccepted: true } };
  for (const [input, code] of [[{ promoCode: 'UNTRUSTED' }, 'MERIT_PROMO_UNVERIFIED'], [{ affiliateCode: 'UNTRUSTED' }, 'MERIT_AFFILIATE_UNVERIFIED']]) {
    const fixture = checkoutFixture({ quote: buildMeritQuote });
    const result = await run(fixture.handler, { ...createBody, ...details, ...input });
    assert.equal(result.statusCode, 409);
    assert.equal(result.body.code, code);
    assert.equal(fixture.calls.some(call => ['reserve', 'create', 'bind'].includes(call[0])), false);
  }
});
test('same-key retry recovers bound session without re-quoting consumed promo or creating intent', async () => {
  const fixture = checkoutFixture();
  const first = await run(fixture.handler, createBody);
  const second = await run(fixture.handler, { action: 'create', checkoutKey });
  assert.deepEqual(second.body, first.body);
  assert.equal(fixture.calls.filter(call => call[0] === 'create').length, 1);
  assert.equal(fixture.calls.filter(call => call[0] === 'quote').length, 1);
});
test('reserved lost-ack retry remains pending instead of creating another intent', async () => {
  const fixture = checkoutFixture({ existing: { ...readyAttempt, state: 'reserved', intent_id: null, client_secret: null } });
  const result = await run(fixture.handler, createBody);
  assert.equal(result.statusCode, 503);
  assert.equal(result.body.code, 'MERIT_PREPARING');
  assert.deepEqual(fixture.calls.map(call => call[0]), ['find']);
});
test('checkout replay refuses another owner and new checkout rejects mismatched attestation email', async () => {
  const foreign = checkoutFixture({ existing: { ...readyAttempt, customer_id: '22222222-2222-4222-8222-222222222222' } });
  assert.equal((await run(foreign.handler, createBody)).statusCode, 503);
  assert.equal(foreign.calls.some(call => call[0] === 'create'), false);
  const mismatch = checkoutFixture();
  assert.equal((await run(mismatch.handler, { ...createBody, verifiedEmail: 'other@example.com' })).statusCode, 403);
  assert.equal(mismatch.calls.some(call => call[0] === 'create'), false);
});
test('unverified UUID or hostile Origin is rejected before database/provider work', async () => {
  for (const [fixture, headers] of [[checkoutFixture({ customer: { ...customer, id: '' } }), {}], [checkoutFixture(), { origin: 'https://evil.example' }]]) {
    const result = await run(fixture.handler, createBody, 'POST', headers);
    assert.ok([401, 403].includes(result.statusCode));
    assert.deepEqual(fixture.calls, []);
  }
});
test('turning off new checkout still permits reconciliation of prior payment', async () => {
  const fixture = checkoutFixture({ env: { ...env, MERIT_ENABLED: 'false' }, existing: readyAttempt });
  assert.equal((await run(fixture.handler, createBody)).statusCode, 503);
  const result = await run(fixture.handler, { action: 'reconcile', orderId });
  assert.equal(result.body.paid, true);
});
test('invalid current pricing configuration cannot block an existing frozen payment', async () => {
  const fixture = checkoutFixture({ env: { ...env, MERIT_CARD_SURCHARGE_SOURCE: '' }, existing: readyAttempt });
  assert.equal((await run(fixture.handler, createBody)).statusCode, 503);
  assert.equal((await run(fixture.handler, { action: 'reconcile', orderId })).body.paid, true);
});

test('provider uses exact official contract, caches authenticated configuration and binds request facts separately', async () => {
  const calls = [];
  const provider = createMeritProvider({ env, fetcher: async (url, opts) => {
    calls.push([url, opts]);
    if (url.endsWith('/config')) return Response.json({ payments: { publishableKey: 'pk_live_fixture', stripeAccountId: 'acct_fixture' } });
    if (url.endsWith('/create-intent')) return Response.json({ ok: true, clientSecret: session.clientSecret });
    return Response.json({ ok: true, paid: true, amount: 10300, currency: 'usd' });
  } });
  await Promise.all([provider.configuration(), provider.configuration()]);
  assert.deepEqual(await provider.create({ amountCents: 10300, orderId, otpToken: 'fixture-otp', verifiedEmail: customer.email }), session);
  const proof = await provider.verify({ intentId: session.intentId });
  assert.deepEqual(proof, verified());
  assert.equal(proof.orderId, undefined);
  assert.equal(proof.email, undefined);
  assert.deepEqual(requireMeritProof(readyAttempt, proof), { paid: true, status: 'succeeded' });
  assert.equal(calls.filter(call => call[0].endsWith('/config')).length, 1);
  for (const [url, opts] of calls) { assert.equal(new URL(url).origin, 'https://getonmerit.com'); assert.equal(opts.headers.Authorization, 'Bearer fixture-private-key'); assert.equal(opts.redirect, 'error'); }
  assert.deepEqual(JSON.parse(calls.find(call => call[0].endsWith('/create-intent'))[1].body), { amountCents: 10300, currency: 'usd', idempotencyKey: `order_${orderId}`, metadata: { orderId }, otpToken: 'fixture-otp', verifiedEmail: customer.email });
  assert.deepEqual(JSON.parse(calls.find(call => call[0].endsWith('/verify-intent'))[1].body), { paymentIntentId: 'pi_fixture' });
});
test('provider rejects account/mode mismatch, bad data, oversize and timeout without leaking errors', async () => {
  const cases = [
    { env: { ...env, MERIT_STRIPE_ACCOUNT: 'acct_other' }, response: { payments: { publishableKey: 'pk_live_fixture', stripeAccountId: 'acct_fixture' } } },
    { response: { payments: { publishableKey: 'pk_test_fixture', stripeAccountId: 'acct_fixture' } } },
    { response: { payments: { publishableKey: 'pk_live_fixture', stripeAccountId: 'bad' } } },
    { response: 'x'.repeat(65537) },
    { error: true },
  ];
  for (const entry of cases) {
    const provider = createMeritProvider({ env: entry.env || env, fetcher: async () => { if (entry.error) throw Error('fixture-private-key full response'); return Response.json(entry.response); } });
    await assert.rejects(provider.configuration(), error => error.status === 503 && !error.message.includes('fixture-private-key'));
  }
});
test('documented proof rejects wrong intent amount currency account or environment', () => {
  for (const proof of [
    { ...verified(), request: { intentId: 'pi_other' } },
    { ...verified(), verified: { paid: true, amountCents: 1, currency: 'usd' } },
    { ...verified(), verified: { paid: true, amountCents: 10300, currency: 'eur' } },
    { ...verified(), context: { source: 'authenticated_provider_config', stripeAccount: 'acct_other', live: true } },
    { ...verified(), context: { source: 'authenticated_provider_config', stripeAccount: 'acct_fixture', live: false } },
  ]) assert.throws(() => requireMeritProof(readyAttempt, proof), { code: 'MERIT_PROOF_MISMATCH' });
});
test('provider cannot substitute an explicitly returned intent or a malformed paid result', async () => {
  for (const data of [
    { ok: true, paid: true, amount: 10300, currency: 'usd', paymentIntentId: 'pi_other' },
    { ok: true, paid: 'true', amount: 10300, currency: 'usd' },
    { ok: true, paid: true, amount: '10300', currency: 'usd' },
    { ok: true, paid: true, amount: 10300, currency: 'eur' },
    { ok: false, paid: true, amount: 10300, currency: 'usd' },
  ]) {
    const provider = createMeritProvider({ env, fetcher: async url => Response.json(url.endsWith('/config') ? { payments: { publishableKey: 'pk_live_fixture', stripeAccountId: 'acct_fixture' } } : data) });
    await assert.rejects(provider.verify({ intentId: 'pi_fixture' }), { status: 503 });
  }
  for (const data of [{ ok: true, clientSecret: 'pi_fixture_secret_fixture', paymentIntentId: 'pi_other' }, { ok: true, clientSecret: 'not-a-client-secret' }, { ok: false, clientSecret: session.clientSecret }]) {
    const provider = createMeritProvider({ env, fetcher: async url => Response.json(url.endsWith('/config') ? { payments: { publishableKey: 'pk_live_fixture', stripeAccountId: 'acct_fixture' } } : data) });
    await assert.rejects(provider.create({ amountCents: 10300, orderId, otpToken: 'fixture-otp', verifiedEmail: customer.email }), { status: 503 });
  }
});

const now = Date.parse('2026-10-08T20:00:00Z');
const event = { type: 'payment_intent.succeeded', data: { paymentIntentId: 'pi_fixture', amount: 10300, currency: 'usd', metadata: { orderId } } };
function sign(raw, seconds = Math.floor(now / 1000)) { return `t=${seconds},v1=${createHmac('sha256', env.ATTESTLY_WEBHOOK_SECRET).update(`${seconds}.`).update(raw).digest('hex')}`; }
function webhookFixture(options = {}) {
  const calls = [];
  const provider = { verify: async () => { calls.push('verify'); if (options.timeout) throw Error('provider-secret'); return options.proof || verified(); } };
  const store = { findByIntent: async id => { calls.push(['find', id]); return options.missing ? null : readyAttempt; }, finalize: async () => { calls.push('finalize'); return options.finalized || { ok: true, paid: true, alreadyPaid: calls.filter(x => x === 'finalize').length > 1, order: { id: orderId, status: 'paid' } }; } };
  return { calls, handler: createMeritWebhookHandler({ env: { ...env, MERIT_ENABLED: 'false', ...options.env }, provider, store, notify: async () => {} }) };
}
async function deliver(fixture, value = event, header) { const raw = Buffer.from(JSON.stringify(value)); return run(fixture.handler, raw, 'POST', { 'merit-signature': header || sign(raw) }); }

test('signed success performs authoritative verification before idempotent finalize; replay is safe', async () => {
  const fixture = webhookFixture();
  for (let i = 0; i < 2; i++) assert.deepEqual((await deliver(fixture)).body, { received: true });
  assert.deepEqual(fixture.calls, [['find', 'pi_fixture'], 'verify', 'finalize', ['find', 'pi_fixture'], 'verify', 'finalize']);
});
test('webhook can finalize the frozen quote while current pricing configuration is invalid', async () => {
  const fixture = webhookFixture({ env: { MERIT_CARD_SURCHARGE_SOURCE: '' } });
  assert.deepEqual((await deliver(fixture)).body, { received: true });
});
test('forged, altered timestamp, duplicated and changed-body signatures never reach provider or storage', async () => {
  const raw = Buffer.from(JSON.stringify(event));
  for (const header of ['t=1,v1=' + '0'.repeat(64), sign(raw).replace(String(Math.floor(now / 1000)), String(Math.floor(now / 1000) - 1)), sign(raw) + ',t=1234567890', sign(Buffer.from('{}')), `t=${Math.floor(now / 1000)},v1=${'z'.repeat(64)}`]) {
    const fixture = webhookFixture();
    assert.equal((await deliver(fixture, event, header)).statusCode, 400);
    assert.deepEqual(fixture.calls, []);
  }
  assert.equal(verifyMeritSignature(raw, sign(raw), env.ATTESTLY_WEBHOOK_SECRET, now), true);
});
test('delayed authenticated deliveries remain valid and repeated fulfillment is idempotent', async () => {
  const fixture = webhookFixture();
  const raw = Buffer.from(JSON.stringify(event));
  const oldSignature = sign(raw, Math.floor(now / 1000) - 86400 * 30);
  for (let i = 0; i < 2; i++) assert.deepEqual((await deliver(fixture, event, oldSignature)).body, { received: true });
  assert.equal(fixture.calls.filter(call => call === 'finalize').length, 2);
});
test('signed event cannot swap order/amount and still cannot itself mark payment paid', async () => {
  for (const data of [{ ...event.data, amount: 1 }, { ...event.data, metadata: { orderId: 'INV-00000000000000000000000000000000' } }]) {
    const fixture = webhookFixture();
    assert.equal((await deliver(fixture, { ...event, data })).statusCode, 400);
    assert.equal(fixture.calls.includes('verify'), false);
    assert.equal(fixture.calls.includes('finalize'), false);
  }
  for (const options of [{ proof: verified(readyAttempt, false) }, { timeout: true }, { missing: true }, { finalized: { ok: false } }]) {
    const fixture = webhookFixture(options);
    assert.equal((await deliver(fixture)).statusCode, 503);
  }
});
test('parsed bodies and oversize signed bodies are rejected, unrelated valid events acknowledged', async () => {
  const fixture = webhookFixture();
  assert.equal((await run(fixture.handler, event, 'POST')).statusCode, 400);
  assert.equal((await deliver(fixture, { type: 'unrelated', padding: 'x'.repeat(65537) })).statusCode, 400);
  assert.deepEqual((await deliver(fixture, { type: 'unrelated' })).body, { received: true });
  assert.deepEqual(fixture.calls, []);
});
