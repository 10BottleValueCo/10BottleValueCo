import assert from "node:assert/strict";
import { test } from "node:test";
import { createMeritCheckoutClient, formatMeritAmount, meritCheckoutMessages, meritReturnUrl, validateMeritSession } from "../artifacts/10-bottle-value/src/merit-checkout-client.js";

const session = {
  clientSecret: "pi_Test123_secret_Secret123", publishableKey: "pk_live_Public123",
  stripeAccount: "acct_Merchant123", orderId: "INV-ABC123456789", amountCents: 17899, currency: "usd",
};
function deferred() {
  let resolve, reject;
  const promise = new Promise((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}
function harness(overrides = {}) {
  const calls = [];
  const paid = [];
  const states = [];
  const elements = { submit: async () => { calls.push("submit"); return {}; } };
  const stripe = { confirmPayment: async parameters => { calls.push(["confirm", parameters]); return { paymentIntent: { status: "succeeded", id: "pi_Test123" } }; } };
  const onReconcile = async request => { calls.push(["reconcile", request]); return { ok: true, paid: true, orderId: session.orderId }; };
  const client = createMeritCheckoutClient({
    session, origin: "https://10bottlevalue.test", getStripe: () => stripe, getElements: () => elements,
    onReconcile, onPaid: result => paid.push(result), onState: state => states.push(state),
    ...overrides,
  });
  return { client, calls, paid, states, elements, stripe };
}

test("requires an explicit connected account, valid public config and authoritative USD cents", () => {
  assert.deepEqual(validateMeritSession({ ...session, privateKey: "discard" }), session);
  for (const invalid of [null, {}, { ...session, stripeAccount: "" }, { ...session, publishableKey: "sk_live_private" },
    { ...session, clientSecret: "" }, { ...session, amountCents: 0 }, { ...session, amountCents: 1.5 },
    { ...session, currency: "eur" }, { ...session, orderId: "bad?payment=success" }]) {
    assert.throws(() => validateMeritSession(invalid), /unavailable/);
  }
  assert.throws(() => harness({ onReconcile: undefined }), /unavailable/);
});

test("redirect carries only pending order/provider and never success or a payment secret", () => {
  const url = new URL(meritReturnUrl(session, "https://10bottlevalue.test/old?payment=success&pi=forged"));
  assert.equal(url.origin, "https://10bottlevalue.test");
  assert.equal(url.pathname, "/");
  assert.deepEqual(Object.fromEntries(url.searchParams), { payment: "pending", provider: "merit", order: session.orderId });
  assert.doesNotMatch(url.toString(), /secret|success|pi=/);
  assert.throws(() => meritReturnUrl(session, "javascript:alert(1)"), /unavailable/);
});

test("English and Russian expose the same amount and complete status messages", () => {
  assert.equal(formatMeritAmount(session), "$178.99");
  assert.match(formatMeritAmount(session, "ru"), /178,99/);
  assert.deepEqual(Object.keys(meritCheckoutMessages.en).sort(), Object.keys(meritCheckoutMessages.ru).sort());
  for (const language of ["en", "ru"]) {
    assert.ok(Object.values(meritCheckoutMessages[language]).every(message => typeof message === "string" && message.length > 0));
  }
});

test("card confirmation submits Elements then confirms Stripe then reconciles the order", async () => {
  const f = harness();
  await f.client.confirm();
  assert.equal(f.calls[0], "submit");
  assert.equal(f.calls[1][0], "confirm");
  assert.equal(f.calls[1][1].elements, f.elements);
  assert.equal(f.calls[1][1].redirect, "if_required");
  assert.equal(new URL(f.calls[1][1].confirmParams.return_url).searchParams.get("payment"), "pending");
  assert.deepEqual(f.calls[2], ["reconcile", { orderId: session.orderId }]);
  assert.deepEqual(f.paid, [{ ok: true, paid: true, orderId: session.orderId }]);
  assert.equal(f.client.getState().phase, "paid");
  assert.equal(f.client.getState().busy, false);
});

test("wallet confirmation uses the identical submit/confirm/reconcile path", async () => {
  const f = harness();
  const walletFailures = [];
  await f.client.confirm({ paymentFailed: payload => walletFailures.push(payload) });
  assert.deepEqual(f.calls.map(call => Array.isArray(call) ? call[0] : call), ["submit", "confirm", "reconcile"]);
  assert.deepEqual(walletFailures, []);
  assert.equal(f.paid.length, 1);
});

test("synchronous lock prevents concurrent manual and wallet confirmations", async () => {
  const submission = deferred();
  const f = harness();
  f.elements.submit = () => { f.calls.push("submit"); return submission.promise; };
  const first = f.client.confirm();
  let walletFailed = 0;
  assert.deepEqual(await f.client.confirm({ paymentFailed: () => walletFailed++ }), { ignored: true });
  assert.equal(walletFailed, 1);
  assert.equal(f.calls.length, 1);
  submission.resolve({});
  await first;
  assert.equal(f.calls.filter(call => call?.[0] === "confirm").length, 1);
  assert.equal(f.paid.length, 1);
});

test("browser Stripe success alone remains pending and cannot confirm again", async () => {
  let confirmations = 0;
  let statusChecks = 0;
  const f = harness({
    getStripe: () => ({ confirmPayment: async () => { confirmations++; return { paymentIntent: { status: "succeeded" } }; } }),
    onReconcile: async () => { statusChecks++; return { ok: true, paid: statusChecks > 1, orderId: session.orderId }; },
  });
  await f.client.confirm();
  assert.equal(f.client.getState().phase, "pending");
  assert.equal(f.client.getState().submitted, true);
  assert.equal(f.client.getState().busy, false);
  assert.equal(f.paid.length, 0);
  await f.client.confirm();
  assert.equal(confirmations, 1);
  await f.client.checkStatus();
  assert.equal(f.paid.length, 1);
  assert.equal(statusChecks, 2);
  await f.client.checkStatus();
  await f.client.confirm();
  assert.equal(f.paid.length, 1);
  assert.equal(confirmations, 1);
});

test("processing response stays pending without payment retries", async () => {
  const f = harness({ onReconcile: async () => ({ ok: true, paid: false }) });
  f.stripe.confirmPayment = async () => ({ paymentIntent: { status: "processing" } });
  await f.client.confirm();
  assert.equal(f.client.getState().phase, "pending");
  assert.equal(f.paid.length, 0);
  assert.deepEqual(await f.client.confirm(), { ignored: true });
});

test("only an explicit successful server result for this order can call onPaid", async () => {
  for (const result of [{ paid: true }, { ok: false, paid: true }, { ok: true, paid: "true" }, { ok: true, paid: true },
    { ok: true, paid: true, orderId: "INV-OTHERORDER" }, null]) {
    const f = harness({ onReconcile: async () => result });
    await f.client.confirm();
    assert.equal(f.client.getState().phase, "pending");
    assert.equal(f.paid.length, 0);
  }
});

test("Element validation failure stops before confirm and releases the spinner for retry", async () => {
  const f = harness();
  f.elements.submit = async () => ({ error: { message: session.clientSecret } });
  let walletFailed = 0;
  await f.client.confirm({ paymentFailed: () => walletFailed++ });
  assert.equal(f.client.getState().phase, "error");
  assert.equal(f.client.getState().busy, false);
  assert.equal(f.client.getState().submitted, false);
  assert.equal(f.calls.length, 0);
  assert.equal(walletFailed, 1);
  assert.doesNotMatch(JSON.stringify(f.states), /Secret123/);
  f.elements.submit = async () => ({});
  await f.client.confirm();
  assert.equal(f.paid.length, 1);
});

test("thrown pre-confirm error resets spinner and permits retry without exposing details", async () => {
  const f = harness();
  f.elements.submit = async () => { throw new Error(session.clientSecret); };
  await f.client.confirm();
  assert.equal(f.client.getState().phase, "error");
  assert.equal(f.client.getState().busy, false);
  assert.equal(f.client.getState().submitted, false);
  assert.doesNotMatch(JSON.stringify(f.states), /Secret123/);
  f.elements.submit = async () => ({});
  await f.client.confirm();
  assert.equal(f.paid.length, 1);
});

test("known card decline is retryable on the same session and never reported paid", async () => {
  const f = harness();
  f.stripe.confirmPayment = async () => ({ error: { type: "card_error", message: "private detail" } });
  await f.client.confirm();
  assert.equal(f.client.getState().phase, "error");
  assert.equal(f.client.getState().submitted, false);
  assert.equal(f.paid.length, 0);
  assert.doesNotMatch(JSON.stringify(f.states), /private detail/);
});

test("uncertain confirm transport errors reconcile and lock resubmission", async () => {
  for (const confirmPayment of [async () => { throw new Error("network lost after confirmation"); },
    async () => ({ error: { type: "api_error" } }), async () => ({})]) {
    let reconciled = 0;
    const f = harness({ getStripe: () => ({ confirmPayment }), onReconcile: async () => { reconciled++; throw new Error("offline"); } });
    await f.client.confirm();
    assert.equal(reconciled, 1);
    assert.equal(f.client.getState().phase, "pending");
    assert.equal(f.client.getState().messageKey, "statusUnavailable");
    assert.equal(f.client.getState().busy, false);
    assert.equal(f.client.getState().submitted, true);
    assert.deepEqual(await f.client.confirm(), { ignored: true });
    assert.equal(f.paid.length, 0);
  }
});

test("reconciliation failures can be checked again without invoking Stripe again", async () => {
  let checks = 0;
  const f = harness({ onReconcile: async () => { if (++checks === 1) throw new Error("offline"); return { ok: true, paid: true, orderId: session.orderId }; } });
  await f.client.confirm();
  assert.equal(f.client.getState().busy, false);
  await f.client.checkStatus();
  assert.equal(f.client.getState().phase, "paid");
  assert.equal(f.calls.filter(call => call?.[0] === "confirm").length, 1);
  assert.equal(f.paid.length, 1);
});

test("missing Elements or Stripe fails without submitting and status cannot be checked before a submission", async () => {
  for (const override of [{ getStripe: () => null }, { getElements: () => null }]) {
    const f = harness(override);
    await f.client.confirm();
    assert.equal(f.calls.length, 0);
    assert.equal(f.client.getState().messageKey, "unavailable");
    assert.equal(f.client.getState().busy, false);
  }
  assert.deepEqual(await harness().client.checkStatus(), { ignored: true });
});

test("dispose before Element submission finishes prevents confirmation", async () => {
  const submission = deferred();
  const f = harness({ getElements: () => ({ submit: () => submission.promise }) });
  const confirming = f.client.confirm();
  f.client.dispose();
  submission.resolve({});
  await confirming;
  assert.equal(f.calls.length, 0);
  assert.equal(f.paid.length, 0);
  assert.equal(f.states.length, 1);
});

test("late reconciliation after session invalidation cannot report paid or update the view", async () => {
  const reconcileResult = deferred();
  const started = deferred();
  const f = harness({ onReconcile: () => { started.resolve(); return reconcileResult.promise; } });
  const confirming = f.client.confirm();
  await started.promise;
  const stateCount = f.states.length;
  f.client.dispose();
  reconcileResult.resolve({ ok: true, paid: true, orderId: session.orderId });
  await confirming;
  assert.equal(f.paid.length, 0);
  assert.equal(f.states.length, stateCount);
  assert.deepEqual(await f.client.confirm(), { ignored: true });
});

test("a failing paid callback cannot release the payment lock or undo confirmed state", async () => {
  for (const onPaid of [() => { throw new Error("navigation failed"); }, async () => { throw new Error("navigation failed"); }]) {
    const f = harness({ onPaid });
    await f.client.confirm();
    assert.equal(f.client.getState().phase, "paid");
    assert.equal(f.client.getState().busy, false);
    assert.deepEqual(await f.client.confirm(), { ignored: true });
  }
});

const {
  buildMeritCheckoutPayload, meritCheckoutBusinessError, createMeritApiClient, meritPayloadDigest, readMeritAttempt,
  saveMeritAttempt, verifyMeritCheckoutBuyer, MERIT_ATTEMPT_STORAGE_KEY,
  meritOrderCardSurcharge, meritCartMatchesOrder,
} = await import('../artifacts/10-bottle-value/src/merit-checkout-client.js');
const { webcrypto } = await import('node:crypto');

const checkoutPayload = () => buildMeritCheckoutPayload({
  items: [{ name: 'BPC-157', dose: '5 mg', quantity: 2, fromWarehouse: 'us', price: 1, noteLabel: '10 vials' }],
  checkoutForm: { firstName: 'Test', lastName: 'Buyer', email: 'ignored@example.test', address: 'One Road', city: 'City', country: 'United States', state: 'CA', postalCode: '90210' },
  shippingType: 'us-warehouse', promoCode: 'PROMO', affiliateCode: 'AFF', ownerFreeShipping: false, affiliateDiscountDisabled: false,
  purchaserAttestation: { over21AndResearchUseOnly: true, qualifiedResearcherOrLicensedProfessional: true, noHumanOrAnimalUse: true, policiesAccepted: true },
});
const apiResponse = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('Merit checkout sends product selectors and contact data without client prices or claimed credit', () => {
  const payload = checkoutPayload();
  assert.deepEqual(payload.items[0], { name: 'BPC-157', dose: '5 mg', quantity: 2, fromWarehouse: 'us', noteLabel: '10 vials' });
  assert.equal(payload.checkoutForm.email, undefined);
  assert.equal(payload.storeCreditUsed, undefined);
  assert.equal(payload.total, undefined);
});

test('checkout digest changes with buyer, warehouse, quantity, contact, shipping or configured surcharge', async () => {
  const payload = checkoutPayload();
  const digest = await meritPayloadDigest(payload, 'buyer@example.test', 300, webcrypto);
  assert.equal(digest, await meritPayloadDigest(payload, ' BUYER@example.test ', 300, webcrypto));
  for (const changed of [
    { ...payload, items: [{ ...payload.items[0], quantity: 3 }] },
    { ...payload, items: [{ ...payload.items[0], fromWarehouse: '' }] },
    { ...payload, checkoutForm: { ...payload.checkoutForm, address: 'Other Road' } },
    { ...payload, shippingType: 'express' },
  ]) assert.notEqual(digest, await meritPayloadDigest(changed, 'buyer@example.test', 300, webcrypto));
  assert.notEqual(digest, await meritPayloadDigest(payload, 'other@example.test', 300, webcrypto));
  assert.notEqual(digest, await meritPayloadDigest(payload, 'buyer@example.test', 400, webcrypto));
});

test('attempt storage recovers the same idempotency key without storing secrets or buyer information', () => {
  const map = new Map();
  const storage = { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value) };
  const attempt = { key: 'a5b0038e-82f1-48ed-b041-1a413f2061ac', digest: 'a'.repeat(64), orderId: 'INV-ABCDEF123', submitted: true, clientSecret: 'never', otpToken: 'never', email: 'never' };
  saveMeritAttempt(storage, attempt);
  assert.equal(map.get(MERIT_ATTEMPT_STORAGE_KEY).includes('never'), false);
  assert.deepEqual(readMeritAttempt(storage), { key: attempt.key, digest: attempt.digest, orderId: attempt.orderId, submitted: true });
  storage.setItem(MERIT_ATTEMPT_STORAGE_KEY, '{bad');
  assert.equal(readMeritAttempt(storage), null);
  saveMeritAttempt(storage, { ...attempt, key: 'not-a-key' });
  assert.equal(readMeritAttempt(storage), null);
});

test('OTP cancellation, skip, missing proof and identity mismatch cannot start a checkout', async () => {
  assert.equal(await verifyMeritCheckoutBuyer('buyer@example.test', { verify: async () => ({ verified: false }) }), null);
  for (const result of [
    { verified: true, skipped: true, token: 'proof', email: 'buyer@example.test' },
    { verified: true, token: '', email: 'buyer@example.test' },
    { verified: true, token: 'proof', email: 'other@example.test' },
    { verified: 'true', token: 'proof', email: 'buyer@example.test' },
  ]) await assert.rejects(verifyMeritCheckoutBuyer('buyer@example.test', { verify: async () => result }));
  assert.deepEqual(await verifyMeritCheckoutBuyer(' BUYER@example.test ', { verify: async () => ({ verified: true, token: 'proof', captureId: 'capture-123', email: 'buyer@example.test' }) }),
    { otpToken: 'proof', captureId: 'capture-123', verifiedEmail: 'buyer@example.test' });
});

test('public configuration is fail-closed and does not supply a hardcoded surcharge fallback', async () => {
  for (const body of [{ ok: true, enabled: true }, { ok: true, enabled: true, currency: 'usd', surchargeBps: '300' }, { ok: true, enabled: true, currency: 'eur', surchargeBps: 300 }]) {
    const api = createMeritApiClient({ getAccessToken: async () => '', fetchImpl: async () => apiResponse(body) });
    await assert.rejects(api.configuration());
  }
  const api = createMeritApiClient({ getAccessToken: async () => '', fetchImpl: async () => apiResponse({ ok: true, enabled: true, currency: 'usd', surchargeBps: 300, privateFee: 'never forwarded' }) });
  assert.deepEqual(await api.configuration(), { enabled: true, currency: 'usd', surchargeBps: 300 });
});

test('create request requires authentication and validates the server total and order binding', async () => {
  let calls = [];
  let reply = { ok: true, session: { ...session, baseAmountCents: 17378, surchargeCents: 521 }, order: { id: session.orderId, items: checkoutPayload().items.map(item => ({ ...item, price: 86.89 })), subtotal: 173.78, shipping: 0, automaticDiscount: 0, promoDiscount: 0, affiliateDiscount: 0, total: 178.99, customerCardSurcharge: 5.21, customerCardSurchargeBps: 300 } };
  const api = createMeritApiClient({ getAccessToken: async () => 'access-proof', fetchImpl: async (url, options) => { calls.push({ url, options }); return apiResponse(reply); } });
  const payload = checkoutPayload();
  const result = await api.create({ checkoutKey: 'same-key', payload, proof: { otpToken: 'verification-proof', verifiedEmail: 'buyer@example.test' } });
  assert.equal(result.session.amountCents, session.amountCents);
  assert.equal(calls[0].url, '/api/merit-checkout');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer access-proof');
  assert.deepEqual(JSON.parse(calls[0].options.body), { ...payload, otpToken: 'verification-proof', verifiedEmail: 'buyer@example.test', action: 'create', checkoutKey: 'same-key' });
  reply = { ...reply, order: { id: 'INV-OTHER123' } };
  await assert.rejects(api.create({ checkoutKey: 'same-key', payload, proof: {} }));
  reply = { ...reply, order: { id: session.orderId }, session: { ...reply.session, surchargeCents: 301 } };
  await assert.rejects(api.create({ checkoutKey: 'same-key', payload, proof: {} }));
  calls = [];
  const unauthenticated = createMeritApiClient({ getAccessToken: async () => '', fetchImpl: async () => { calls.push('unexpected'); } });
  await assert.rejects(unauthenticated.create({ checkoutKey: 'same-key', payload, proof: {} }), error => error.code === 'authentication_required');
  assert.equal(calls.length, 0);
});

test('server reconciliation rejects a different or unbound paid order', async () => {
  let reply = { ok: true, paid: true, orderId: session.orderId, order: { id: session.orderId } };
  const api = createMeritApiClient({ getAccessToken: async () => 'token', fetchImpl: async () => apiResponse(reply) });
  assert.equal((await api.reconcile({ orderId: session.orderId })).paid, true);
  reply = { ...reply, orderId: 'INV-OTHER123' };
  await assert.rejects(api.reconcile({ orderId: session.orderId }));
  reply = { ...reply, orderId: session.orderId, order: null };
  await assert.rejects(api.reconcile({ orderId: session.orderId }));
});

test('Merit admin surcharge uses recorded customer amount and preserves unknown values', () => {
  assert.deepEqual(meritOrderCardSurcharge({ payment_provider: 'merit', total: 103, subtotal: 100 }), { isMerit: true, amount: null });
  assert.deepEqual(meritOrderCardSurcharge({ metadata: { paymentProvider: 'Merit', customerCardSurcharge: 3 } }), { isMerit: true, amount: 3 });
  assert.deepEqual(meritOrderCardSurcharge({ paymentProvider: 'Merit', customerCardSurcharge: 0 }), { isMerit: true, amount: 0 });
  assert.deepEqual(meritOrderCardSurcharge({ paymentProvider: 'Stripe', customerCardSurcharge: 3 }), { isMerit: false, amount: null });
});

test('paid order clears only a matching cart, preserving later warehouse, strength and quantity edits', () => {
  const items = checkoutPayload().items;
  assert.equal(meritCartMatchesOrder(items, { items: items.map(item => ({ ...item, price: 100 })) }), true);
  for (const field of [{ quantity: 3 }, { dose: '10 mg' }, { fromWarehouse: '' }, { noteLabel: '5 vials' }]) {
    assert.equal(meritCartMatchesOrder([{ ...items[0], ...field }], { items }), false);
  }
  assert.equal(meritCartMatchesOrder([], { items }), false);
});

test('unverified promo and affiliate errors provide matching English and Russian escape instructions', async () => {
  const expected = {
    MERIT_PROMO_UNVERIFIED: {
      en: 'This promo code cannot be verified for card payment. Remove it or contact support.',
      ru: 'Этот промокод не удаётся проверить для оплаты картой. Удалите его или обратитесь в поддержку.',
    },
    MERIT_AFFILIATE_UNVERIFIED: {
      en: 'This affiliate code cannot be verified for card payment. Choose another payment method or contact support.',
      ru: 'Этот партнёрский код не удаётся проверить для оплаты картой. Выберите другой способ оплаты или обратитесь в поддержку.',
    },
  };
  for (const [code, messages] of Object.entries(expected)) {
    let requests = 0;
    const api = createMeritApiClient({ getAccessToken: async () => 'token', fetchImpl: async () => {
      requests += 1;
      return apiResponse({ ok: false, code, error: 'Untrusted backend detail is not displayed' }, 409);
    } });
    await assert.rejects(api.create({ checkoutKey: 'same-key', payload: checkoutPayload(), proof: {} }), error => {
      assert.equal(error.code, code);
      assert.equal(meritCheckoutBusinessError(error, 'EN'), messages.en);
      assert.equal(meritCheckoutBusinessError(error, 'RU'), messages.ru);
      assert.equal(meritCheckoutBusinessError(error, 'de'), messages.en);
      return true;
    });
    assert.equal(requests, 1);
  }
  assert.equal(meritCheckoutBusinessError({ code: 'UNKNOWN', message: 'untrusted detail' }, 'en'), '');
});

test('mixed credit quote has exact credit, uncovered base, surcharge and final card parity', async () => {
  const payload = { ...checkoutPayload(), useStoreCredit: true };
  const good = { ok: true, session: { ...session, baseAmountCents: 6000, storeCreditUsedCents: 5000,
    appliedCreditCents: 5000, cardBaseAmountCents: 1000, surchargeCents: 180, amountCents: 1180 },
    order: { id: session.orderId, items: [{ name: 'BPC-157', dose: '5 mg', price: 40, quantity: 1 }],
      subtotal: 40, shipping: 20, automaticDiscount: 0, promoDiscount: 0, affiliateDiscount: 0,
      storeCreditUsed: 50, total: 11.80, customerCardSurcharge: 1.80, customerCardSurchargeBps: 300 } };
  let reply = structuredClone(good);
  let sent;
  const api = createMeritApiClient({ getAccessToken: async () => 'token', fetchImpl: async (_url, options) => {
    sent = JSON.parse(options.body); return apiResponse(reply);
  } });
  const result = await api.create({ checkoutKey: 'same-key', payload, proof: {} });
  assert.equal(result.session.amountCents, 1180);
  assert.equal(result.session.storeCreditUsedCents, 5000);
  assert.equal(sent.useStoreCredit, true);
  assert.equal(sent.storeCreditUsed, undefined);
  assert.equal(sent.storeCreditUsedCents, undefined);
  for (const change of [
    r => { delete r.session.storeCreditUsedCents; }, r => { delete r.session.cardBaseAmountCents; },
    r => { r.session.storeCreditUsedCents = 4999; }, r => { r.order.storeCreditUsed = 49.99; },
    r => { r.session.appliedCreditCents = 4900; },
    r => { r.session.surchargeCents = 30; r.session.amountCents = 1030; r.order.total = 10.3; r.order.customerCardSurcharge = .3; },
    r => { delete r.order.storeCreditUsed; },
  ]) {
    reply = structuredClone(good); change(reply);
    await assert.rejects(api.create({ checkoutKey: 'same-key', payload, proof: {} }));
  }
});

test('credit intent changes the digest and cannot be inferred from a browser supplied amount', async () => {
  const withCredit = buildMeritCheckoutPayload({ ...checkoutPayload(), useStoreCredit: true, storeCreditUsed: 500, storeCreditUsedCents: 50000 });
  assert.equal(withCredit.useStoreCredit, true);
  assert.equal(withCredit.storeCreditUsed, undefined);
  assert.equal(withCredit.storeCreditUsedCents, undefined);
  assert.notEqual(await meritPayloadDigest(withCredit, 'buyer@example.test', 300, webcrypto),
    await meritPayloadDigest({ ...withCredit, useStoreCredit: false }, 'buyer@example.test', 300, webcrypto));
});

test('card preview charges surcharge on the full pre-credit order and preserves the full-credit route', async () => {
  const { estimateMeritCreditSplit } = await import('../artifacts/10-bottle-value/src/merit-checkout-client.js');
  assert.deepEqual(estimateMeritCreditSplit(60, 50, 300), { baseAmountCents: 6000, storeCreditUsedCents: 5000,
    cardBaseAmountCents: 1000, surchargeCents: 180, amountCents: 1180 });
  assert.deepEqual(estimateMeritCreditSplit(60, 100, 300), { baseAmountCents: 6000, storeCreditUsedCents: 6000,
    cardBaseAmountCents: 0, surchargeCents: 0, amountCents: 0 });
  assert.equal(estimateMeritCreditSplit(60, 0, 300).amountCents, 6180);
  assert.equal(estimateMeritCreditSplit(60.01, 60, 300).amountCents, 181);
});
