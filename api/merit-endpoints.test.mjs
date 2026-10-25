import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { PassThrough, Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createMeritProvider } from './_merit-provider.js';
import { createMeritCheckoutHandler } from './merit-checkout.js';
import { createMeritWebhookHandler, verifyMeritSignature } from './attestly-webhook.js';
import { requireMeritProof } from './_merit-core.js';
import { invoiceNumberFromUuid } from './_invoice-number.js';

const env = { MERIT_ENABLED: 'true', ATTESTLY_API_KEY: 'fixture-private-key', ATTESTLY_WEBHOOK_SECRET: 'awhsec_fixture', MERIT_MODE: 'live', MERIT_RULE_VERSION: 'fixture-v1', MERIT_CARD_SURCHARGE_BPS: '300', MERIT_CARD_SURCHARGE_SOURCE: 'Fixture customer rule', MERIT_CARD_SURCHARGE_EFFECTIVE_AT: '2026-10-08T00:00:00Z', MERIT_PROCESSOR_FEE_BPS: '750', MERIT_PROCESSOR_FEE_SOURCE: 'Fixture dashboard reported rate', MERIT_PROCESSOR_FEE_EFFECTIVE_AT: '2026-10-08T00:00:00Z' };
const customer = { id: 'abcdefab-cdef-4abc-8abc-defabcdefabc', email: 'buyer@example.com' };
const checkoutKey = '12345678-abcd-4abc-8abc-123456789abc';
const orderId = invoiceNumberFromUuid(checkoutKey);
const providerConfig = { publishableKey: 'pk_live_fixture', stripeAccount: 'acct_fixture', live: true };
const session = { ...providerConfig, intentId: 'pi_fixture', clientSecret: 'pi_fixture_secret_fixture' };
const priced = { amountCents: 10300, currency: 'usd', userPromoId: null, snapshot: { email: customer.email, items: [{ name: 'Canonical fixture item', dose: '10mg', quantity: 1, price: 100 }], subtotal: 100, shipping: 0, automaticDiscount: 0, promoDiscount: 0, affiliateDiscount: 0, total: 103, customerCardSurcharge: 3, customerCardSurchargeBps: 300, shippingType: 'standard', promoCode: '', affiliateOwnerEmail: 'private-affiliate@example.com' } };
const readyAttempt = { id: '11111111-1111-4111-8111-111111111111', customer_id: customer.id, email: customer.email, checkout_key: checkoutKey, order_id: orderId, amount_cents: 10300, currency: 'usd', expected_account: 'acct_fixture', expected_live: true, state: 'ready', snapshot: { ...priced.snapshot, paymentRules: { private: true }, costSnapshot: { secretCost: 1 } }, intent_id: session.intentId, client_secret: session.clientSecret, publishable_key: session.publishableKey, stripe_account: session.stripeAccount, livemode: true };
const verified = (attempt = readyAttempt, paid = true) => ({ source: 'merit_authenticated_verify', request: { intentId: attempt.intent_id }, verified: { paid, amountCents: Number(attempt.amount_cents), currency: 'usd' }, context: { source: 'authenticated_provider_config', stripeAccount: attempt.expected_account, live: attempt.expected_live } });
function responseRecorder() { return { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } }; }
async function run(handler, body, method = 'POST', headers = {}) { const res = responseRecorder(); await handler({ method, body, headers }, res); return res; }
function checkoutFixture(options = {}) {
  const saved = options.existing ? structuredClone(options.existing) : null;
  const calls = [];
  const authCalls = [];
  const unsupported = name => async (...args) => { calls.push([name, ...args]); throw Error('new checkout must remain retired'); };
  const store = {
    ready: unsupported('ready'),
    findByCheckoutKey: unsupported('findByCheckoutKey'),
    reserve: unsupported('reserve'),
    reserveCredit: unsupported('reserveCredit'),
    bind: unsupported('bind'),
    findByOrder: async (...args) => { calls.push(['findByOrder', ...args]); return saved; },
    finalize: async params => { calls.push(['finalize', params]); return { ok: true, paid: true, order: { id: saved.order_id, status: 'paid' } }; },
    ...options.store,
  };
  const provider = {
    configuration: unsupported('configuration'),
    create: unsupported('create'),
    verify: async args => { calls.push(['verify', args]); return verified(saved); },
    ...options.provider,
  };
  const authenticate = async (req, res, opts) => {
    authCalls.push(opts);
    if (options.customer === null) { res.status(401).json({ ok: false, error: 'Sign in.' }); return null; }
    return options.customer || customer;
  };
  const handler = createMeritCheckoutHandler({ env: options.env || env, provider, store, authenticate, notify: async () => {} });
  return { handler, calls, authCalls, saved };
}
const createBody = { action: 'create', checkoutKey, otpToken: 'fixture-otp', verifiedEmail: customer.email, amountCents: 1, orderId: 'ATTACKER-ORDER', clientSecret: 'attacker-secret' };

for (const flags of [
  {},
  { MERIT_ENABLED: 'true', MERIT_CHECKOUT_PAUSED: 'false' },
  { MERIT_ENABLED: 'false', MERIT_CHECKOUT_PAUSED: 'true' },
]) {
  test('GET permanently advertises retirement without authentication or external I/O ' + JSON.stringify(flags), async () => {
    const fixture = checkoutFixture({ env: { ...env, ...flags } });
    const result = await run(fixture.handler, undefined, 'GET');
    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body, { ok: true, enabled: false, retired: true });
    assert.deepEqual(fixture.calls, []);
    assert.deepEqual(fixture.authCalls, []);
    assert.equal(result.headers['Cache-Control'], 'private, no-store');
    assert.equal(result.headers.Vary, 'Authorization');
    assert.equal(result.headers['X-Content-Type-Options'], 'nosniff');
  });
}

test('enabled flags, stale checkout keys and credit requests cannot create or resume a payment', async () => {
  for (const body of [
    { action: 'create' },
    createBody,
    { ...createBody, useStoreCredit: true, storeCreditUsed: 9999999 },
    { action: 'create', checkoutKey: 'old-stale-key', useStoreCredit: true },
  ]) {
    const fixture = checkoutFixture({ existing: readyAttempt, env: { ...env, MERIT_ENABLED: 'true', MERIT_CHECKOUT_PAUSED: 'false' } });
    const before = structuredClone(fixture.saved);
    for (let retry = 0; retry < 2; retry++) {
      const result = await run(fixture.handler, body);
      assert.equal(result.statusCode, 410);
      assert.equal(result.body.code, 'MERIT_CHECKOUT_RETIRED');
      assert.match(result.body.error, /another payment method/);
      for (const secret of ['fixture-private-key', session.clientSecret, 'paymentRules', 'costSnapshot']) {
        assert.equal(JSON.stringify(result.body).includes(secret), false, secret);
      }
    }
    assert.deepEqual(fixture.calls, []);
    assert.deepEqual(fixture.saved, before);
    assert.deepEqual(fixture.authCalls, [{ purpose: 'payment status' }, { purpose: 'payment status' }]);
  }
});

test('configured preview origins retain authentication while hostile origins fail before authentication or I/O', async () => {
  const origin = 'https://merchant-preview.replit.dev';
  const fixture = checkoutFixture({ env: { ...env, MERIT_ALLOWED_ORIGINS: origin } });
  const result = await run(fixture.handler, { action: 'create' }, 'POST', { origin });
  assert.equal(result.statusCode, 410);
  assert.equal(result.body.code, 'MERIT_CHECKOUT_RETIRED');
  assert.deepEqual(fixture.authCalls, [{ purpose: 'payment status' }]);
  assert.deepEqual(fixture.calls, []);

  const unlisted = checkoutFixture();
  const denied = await run(unlisted.handler, createBody, 'POST', { origin });
  assert.equal(denied.statusCode, 403);
  assert.equal(denied.body.code, 'MERIT_ORIGIN_REJECTED');
  assert.deepEqual(unlisted.authCalls, []);
  assert.deepEqual(unlisted.calls, []);
});

test('retired creation and reconciliation still require a verified valid customer identity', async () => {
  for (const identity of [null, { ...customer, id: '' }, { ...customer, id: 'not-a-uuid' }, { ...customer, email: 'INVALID' }, { ...customer, email: ' Buyer@example.com ' }]) {
    for (const body of [createBody, { action: 'reconcile', orderId }]) {
      const fixture = checkoutFixture({ customer: identity, existing: readyAttempt });
      const result = await run(fixture.handler, body);
      assert.equal(result.statusCode, 401);
      assert.deepEqual(fixture.calls, []);
    }
  }
});

test('invalid bodies and methods fail without provider or storage access', async () => {
  for (const body of [undefined, null, [], 'create', { action: 'reconcile', padding: 'x'.repeat(65537) }]) {
    const fixture = checkoutFixture();
    const result = await run(fixture.handler, body);
    assert.equal(result.statusCode, 400);
    assert.equal(result.body.code, 'MERIT_INVALID_REQUEST');
    assert.deepEqual(fixture.authCalls, []);
    assert.deepEqual(fixture.calls, []);
  }
  const fixture = checkoutFixture();
  assert.equal((await run(fixture.handler, { action: 'unexpected' })).statusCode, 400);
  const wrongMethod = await run(fixture.handler, undefined, 'DELETE');
  assert.equal(wrongMethod.statusCode, 405);
  assert.equal(wrongMethod.headers.Allow, 'GET, POST');
  assert.deepEqual(fixture.calls, []);
});

test('reconciliation enforces order identity and ownership before provider verification', async () => {
  for (const existing of [null, { ...readyAttempt, customer_id: '22222222-2222-4222-8222-222222222222' }, { ...readyAttempt, order_id: 'INV-00000000000000000000000000000000' }]) {
    const fixture = checkoutFixture({ existing });
    const result = await run(fixture.handler, { action: 'reconcile', orderId });
    assert.equal(result.statusCode, 404);
    assert.equal(result.body.code, 'MERIT_ORDER_NOT_FOUND');
    assert.deepEqual(fixture.calls, [['findByOrder', orderId, customer.id]]);
  }
  const malformed = checkoutFixture({ existing: readyAttempt });
  const result = await run(malformed.handler, { action: 'reconcile', orderId: 'ATTACKER-ORDER' });
  assert.equal(result.statusCode, 400);
  assert.equal(result.body.code, 'MERIT_INVALID_ORDER');
  assert.deepEqual(malformed.calls, []);
});

test('retirement and invalid current pricing cannot block an existing frozen payment', async () => {
  for (const flags of [
    { MERIT_ENABLED: 'false', MERIT_CHECKOUT_PAUSED: 'true' },
    { MERIT_ENABLED: 'true', MERIT_CHECKOUT_PAUSED: 'false', MERIT_CARD_SURCHARGE_SOURCE: '' },
  ]) {
    const fixture = checkoutFixture({ env: { ...env, ...flags }, existing: readyAttempt });
    const before = structuredClone(fixture.saved);
    assert.equal((await run(fixture.handler, createBody)).statusCode, 410);
    const result = await run(fixture.handler, { action: 'reconcile', orderId, amountCents: 1, useStoreCredit: true });
    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body, { ok: true, paid: true, status: 'paid', orderId, order: { id: orderId, status: 'paid' } });
    assert.deepEqual(fixture.calls.map(call => call[0]), ['findByOrder', 'verify', 'finalize']);
    assert.deepEqual(fixture.calls[1][1], { intentId: readyAttempt.intent_id, orderId });
    assert.equal(fixture.calls[2][1].p_amount_cents, readyAttempt.amount_cents);
    assert.equal(fixture.calls[2][1].p_email, readyAttempt.email);
    assert.deepEqual(fixture.saved, before);
  }
});

test('legacy UUID invoices reconcile their original payment without creating another payment', async () => {
  const legacyId = 'INV-' + checkoutKey.replaceAll('-', '').toUpperCase();
  const fixture = checkoutFixture({ existing: { ...readyAttempt, order_id: legacyId } });
  const result = await run(fixture.handler, { action: 'reconcile', orderId: legacyId });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.paid, true);
  assert.equal(result.body.orderId, legacyId);
  assert.deepEqual(fixture.calls.map(call => call[0]), ['findByOrder', 'verify', 'finalize']);
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

// Vercel consumes IncomingMessage, then restores only read and data/end events.
// https://github.com/vercel/vercel/blob/main/packages/node/src/serverless-functions/helpers.ts
// An optional installed runtime path exercises its actual compiled helpers.
let vercelRestoreBody = (req, body) => {
  const replay = new PassThrough();
  const originalOn = req.on.bind(req);
  req.read = replay.read.bind(replay);
  req.on = req.addListener = (name, cb) => name === 'data' || name === 'end' ? replay.on(name, cb) : originalOn(name, cb);
  replay.end(body);
};
let vercelSetLazyProp = (req, name, getter) => Object.defineProperty(req, name, { configurable: true, get: getter });
if (process.env.MERIT_TEST_VERCEL_HELPERS) {
  const source = readFileSync(process.env.MERIT_TEST_VERCEL_HELPERS, 'utf8');
  const extract = (start, end) => {
    const from = source.indexOf(start); const to = source.indexOf(end, from);
    assert.ok(from >= 0 && to > from, 'installed Vercel helper source shape');
    return source.slice(from, to);
  };
  ({ restoreBody: vercelRestoreBody, setLazyProp: vercelSetLazyProp } = runInNewContext(
    extract('function restoreBody(req, body)', 'async function readBody(req)')
      + extract('function setLazyProp(req, prop, getter)', 'function createETag(body, encoding)')
      + '\n({ restoreBody, setLazyProp })', { PassThrough, Buffer }, { timeout: 1000 }));
}
async function replayRequest(raw, header = sign(raw)) {
  const req = Readable.from([raw]);
  for await (const ignored of req) {} // Original stream is already ended/destroyed.
  let bodyReads = 0;
  vercelRestoreBody(req, raw);
  vercelSetLazyProp(req, 'body', () => { bodyReads++; throw Error('parsed body getter must remain unread'); });
  req.method = 'POST'; req.complete = true;
  req.headers = { 'content-type': 'application/json', 'merit-signature': header };
  return { req, bodyReads: () => bodyReads };
}

test('Vercel raw replay authenticates exact whitespace and Unicode without accessing its parsed body getter', async () => {
  const fixture = webhookFixture();
  const raw = Buffer.from(JSON.stringify({ ...event, note: 'Привет 🧪' }, null, 2) + '\r\n');
  const replay = await replayRequest(raw);
  assert.equal(replay.req.readableEnded, true);
  assert.equal(replay.req.destroyed, true);
  const res = responseRecorder();
  await fixture.handler(replay.req, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { received: true });
  assert.equal(replay.bodyReads(), 0);
  assert.deepEqual(fixture.calls, [['find', 'pi_fixture'], 'verify', 'finalize']);
});
test('Vercel replay refuses equivalent reserialized JSON signed with different original bytes', async () => {
  const fixture = webhookFixture();
  const original = Buffer.from(JSON.stringify(event, null, 2));
  const changed = Buffer.from(JSON.stringify(event));
  const replay = await replayRequest(changed, sign(original));
  const res = responseRecorder();
  await fixture.handler(replay.req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(replay.bodyReads(), 0);
  assert.deepEqual(fixture.calls, []);
});
test('Vercel replay rejects oversized bodies before provider or storage work', async () => {
  const fixture = webhookFixture();
  const raw = Buffer.from(JSON.stringify({ type: 'unrelated', padding: 'x'.repeat(65537) }));
  const replay = await replayRequest(raw);
  const res = responseRecorder();
  await fixture.handler(replay.req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(replay.bodyReads(), 0);
  assert.deepEqual(fixture.calls, []);
});
test('raw request stream abort, error, premature close and decoded string chunks fail closed', async () => {
  for (const failure of ['aborted', 'error', 'close', 'string']) {
    const fixture = webhookFixture();
    const req = new EventEmitter();
    req.method = 'POST'; req.headers = { 'merit-signature': sign(Buffer.from(JSON.stringify(event))) };
    const res = responseRecorder();
    const pending = fixture.handler(req, res);
    req.emit('data', Buffer.from('{'));
    if (failure === 'string') req.emit('data', 'decoded bytes');
    else req.emit(failure, failure === 'error' ? Error('transport detail') : undefined);
    req.emit('data', Buffer.alloc(65537));
    req.emit('end');
    await pending;
    assert.equal(res.statusCode, 400, failure);
    assert.deepEqual(fixture.calls, [], failure);
  }
});
test('non-stream adapters cannot invoke a parsed body getter', async () => {
  const fixture = webhookFixture();
  let reads = 0;
  const req = { method: 'POST', headers: {} };
  Object.defineProperty(req, 'body', { get() { reads++; return event; } });
  const res = responseRecorder();
  await fixture.handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(reads, 0);
  assert.deepEqual(fixture.calls, []);
});

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
