import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import { test } from 'node:test';
import { buildMeritCheckoutPayload, meritCheckoutBusinessError, meritPayloadDigest, saveMeritAttempt, readMeritAttempt } from '../artifacts/10-bottle-value/src/merit-checkout-client.js';

// Exercise the actual App event handlers with isolated I/O. Parsing the source
// keeps these tests independent of browser/Stripe credentials and of hook order.
const appRequire = createRequire(new URL('../artifacts/10-bottle-value/package.json', import.meta.url));
const reactPluginRequire = createRequire(appRequire.resolve('@vitejs/plugin-react'));
const babelRequire = createRequire(reactPluginRequire.resolve('@babel/core'));
const { parse } = babelRequire('@babel/parser');
const source = await readFile(new URL('../artifacts/10-bottle-value/src/App.jsx', import.meta.url), 'utf8');
const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
const appBody = ast.program.body.find(node => node.type === 'ExportDefaultDeclaration' && node.declaration.id?.name === 'App').declaration.body.body;
const handler = (name, context) => {
  const node = appBody.find(node => node.type === 'FunctionDeclaration' && node.id.name === name);
  assert.ok(node, `App handler ${name} exists`);
  return vm.runInNewContext(`(${source.slice(node.start, node.end)})`, context);
};
const initialState = (name, context) => {
  const decl = appBody.filter(node => node.type === 'VariableDeclaration').flatMap(node => node.declarations)
    .find(node => node.id.type === 'ArrayPattern' && node.id.elements[0]?.name === name);
  const init = decl.init.arguments[0];
  return vm.runInNewContext(`(${source.slice(init.start, init.end)})()`, context);
};
function storageFixture() {
  const map = new Map();
  return { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) };
}
function fixture() {
  const calls = [];
  const form = { email: 'buyer@example.test', firstName: 'Test', lastName: 'Buyer', address: 'One Road', country: 'United States', city: 'City', state: 'CA', postalCode: '90210', phone: '+15555555555' };
  const context = {
    Date, Math, Number, Object, JSON, URLSearchParams, Promise, console, setTimeout: () => 0,
    currentUser: { email: 'buyer@example.test' }, researchAccepted: true, qualifiedAccepted: true, termsAccepted: true,
    cart: [{ name: 'BPC-157', dose: '5 mg', quantity: 1, price: 100 }],
    readCheckoutSnapshot: () => ({ ...form }), validateCheckoutForm: () => ({}),
    deferredLegacyOrderRef: { current: null }, meritAttemptRef: { current: null },
    meritCreateBusyRef: { current: false }, meritInputsRef: { current: '' },
    meritSelectionRef: { current: { method: 'stripe', step: 'payment' } },
    checkoutInputRefs: { current: {} }, formSectionRef: { current: null }, termsSectionRef: { current: null },
    effectiveShippingType: 'standard', subtotal: 100, shipping: 39.99, automaticDiscount: 0, promoDiscount: 0,
    appliedPromo: null, affiliateDiscount: 0, cryptoDiscountAmount: 0, storeCreditApplied: 0, finalTotal: 139.99,
    affiliateTrackingCode: '', affiliateTrackingOwnerEmail: '', affiliateCommission: 0, paymentMethod: 'stripe', checkoutStep: 'payment',
    normalizeEmail: value => String(value || '').trim().toLowerCase(), getCheckoutOrderNotes: () => '',
    tx: value => value, t: value => value, requestAnimationFrame: () => 0,
    track: (...args) => calls.push(['track', ...args]),
    window: { innerWidth: 1280, scrollTo: () => {}, sessionStorage: storageFixture(), crypto: webcrypto },
    localStorage: { getItem: () => { throw new Error('unexpected legacy localStorage'); }, setItem: () => { throw new Error('unexpected legacy localStorage'); } },
    persistOrderToServer: () => { throw new Error('unexpected legacy server save'); },
    openMeritPending: () => calls.push(['pending']), stripeTemporarilyDisabled: false,
    meritConfig: { enabled: true, currency: 'usd', surchargeBps: 300 },
    buildMeritCheckoutPayload, meritCheckoutBusinessError, meritPayloadDigest, saveMeritAttempt, language: 'EN',
    verifyMeritCheckoutBuyer: async () => ({ otpToken: 'otp', verifiedEmail: 'buyer@example.test' }),
    meritApi: { create: async () => { throw new Error('unexpected create'); } },
  };
  for (const name of ['setPendingCheckoutAfterAuth', 'setAuthMode', 'setAccountMessage', 'setCheckoutMessage', 'setPage', 'setCheckoutForm', 'setCountrySearch', 'setCheckoutErrors', 'setCheckboxHighlight', 'setOrderNumber', 'setCurrentUser', 'setRegisteredUsers', 'setPaymentTimer', 'setNowPaymentData', 'setNowPaymentStatus', 'setNowPaymentError', 'setPaypalPaymentError', 'setCheckoutStep', 'setStripeLoading', 'setStripeError', 'setMeritSession', 'setPaymentMethodState']) context[name] = value => calls.push([name, value]);
  context.meritPayload = buildMeritCheckoutPayload({ items: context.cart, checkoutForm: form, shippingType: 'standard', purchaserAttestation: { over21AndResearchUseOnly: true, qualifiedResearcherOrLicensedProfessional: true, noHumanOrAnimalUse: true, policiesAccepted: true } });
  context.meritInputsRef.current = JSON.stringify({ payload: context.meritPayload, email: context.currentUser.email, surchargeBps: 300 });
  return { context, calls, form };
}

test('Merit success/cancel URL claims all initialize as pending, never paid', () => {
  for (const payment of ['success', 'pending', 'cancelled', 'failed']) {
    const state = initialState('paymentReturn', { URLSearchParams, window: { location: { search: `?provider=merit&payment=${payment}&order=INV-ABCDEF123` } } });
    assert.equal(state.status, 'pending');
    assert.equal(state.provider, 'merit');
    assert.equal(state.order, 'INV-ABCDEF123');
  }
});

test('details-to-payment transition validates registration but only keeps its legacy draft in memory', async () => {
  const { context, calls } = fixture();
  await handler('handleCheckout', context)();
  assert.equal(context.deferredLegacyOrderRef.current.email, 'buyer@example.test');
  assert.equal(context.deferredLegacyOrderRef.current.purchaserAttestation.policiesAccepted, true);
  assert.ok(calls.some(([name, value]) => name === 'setCheckoutStep' && value === 'payment'));
  const unauthenticated = fixture();
  unauthenticated.context.currentUser = null;
  await handler('handleCheckout', unauthenticated.context)();
  assert.equal(unauthenticated.context.deferredLegacyOrderRef.current, null);
  assert.ok(unauthenticated.calls.some(([name, value]) => name === 'setPage' && value === 'account'));
});

test('a real legacy payment start materializes the deferred draft with its attestation and current provider fields', async () => {
  const { context } = fixture();
  await handler('handleCheckout', context)();
  const draft = context.deferredLegacyOrderRef.current;
  let orders = [];
  const requests = [];
  context.fetch = async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return { ok: true, json: async () => ({ ok: true }) }; };
  context.getStoredOrders = () => orders;
  context.saveStoredOrders = next => { orders = next; };
  context.setAllOrders = () => {};
  context.setUserOrders = () => {};
  context.getPaidOrdersForEmail = () => [];
  context.persistOrderToServer = handler('persistOrderToServer', context);
  await handler('markOrderCheckoutStartedById', context)(draft.id, 'PayPal');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, '/api/order-checkout');
  assert.equal(requests[1].body.order.metadata.purchaserAttestation.policiesAccepted, true);
  assert.equal(orders[0].paymentProvider, 'PayPal');
  assert.equal(orders[0].status, 'checkout');
});

test('switching away from unsubmitted Merit restores the legacy order id; submitted payment blocks method changes', () => {
  const { context, calls } = fixture();
  context.deferredLegacyOrderRef.current = { id: 'INV-LEGACY123' };
  context.meritSession = { orderId: 'INV-MERIT123' };
  handler('setPaymentMethod', context)('paypal');
  assert.ok(calls.some(([name, value]) => name === 'setOrderNumber' && value === 'INV-LEGACY123'));
  calls.length = 0;
  context.meritAttemptRef.current = { orderId: 'INV-MERIT123', submitted: true };
  handler('setPaymentMethod', context)('paypal');
  assert.deepEqual(calls, [['pending']]);
});

test('a lost Merit create response retries the same persisted key and never calls a legacy payment endpoint', async () => {
  const { context, calls } = fixture();
  const requests = [];
  context.meritApi.create = async request => {
    requests.push(request);
    if (requests.length === 1) throw new Error('lost response');
    return { session: { orderId: 'INV-MERIT123', amountCents: 14419 }, order: { id: 'INV-MERIT123' } };
  };
  const start = handler('handleStripePayment', context);
  await start();
  await start();
  assert.equal(requests.length, 2);
  assert.equal(requests[0].checkoutKey, requests[1].checkoutKey);
  assert.equal(readMeritAttempt(context.window.sessionStorage).orderId, 'INV-MERIT123');
  assert.ok(calls.some(([name, value]) => name === 'setOrderNumber' && value === 'INV-MERIT123'));
});

test('cart changes during OTP prevent creating a stale payment', async () => {
  const { context } = fixture();
  let requests = 0;
  context.verifyMeritCheckoutBuyer = async () => { context.meritInputsRef.current = 'edited checkout'; return { otpToken: 'otp' }; };
  context.meritApi.create = async () => { requests += 1; };
  await handler('handleStripePayment', context)();
  assert.equal(requests, 0);
});

test('switching payment methods during create preserves recovery but cannot take over the legacy order', async () => {
  const { context, calls } = fixture();
  context.meritApi.create = async () => {
    context.meritSelectionRef.current = { method: 'paypal', step: 'payment' };
    return { session: { orderId: 'INV-MERIT123', amountCents: 14419 }, order: { id: 'INV-MERIT123' } };
  };
  await handler('handleStripePayment', context)();
  assert.equal(readMeritAttempt(context.window.sessionStorage).orderId, 'INV-MERIT123');
  assert.equal(calls.filter(([name]) => name === 'setOrderNumber' || name === 'setMeritSession').length, 0);
});

test('double clicks cannot start concurrent verification or create requests', async () => {
  const { context } = fixture();
  let resolveProof;
  let verifies = 0;
  context.verifyMeritCheckoutBuyer = () => { verifies += 1; return new Promise(resolve => { resolveProof = resolve; }); };
  const start = handler('handleStripePayment', context);
  const first = start();
  await start();
  while (!resolveProof) await new Promise(resolve => setTimeout(resolve, 1));
  resolveProof(null);
  await first;
  assert.equal(verifies, 1);
  assert.equal(context.meritCreateBusyRef.current, false);
});

test('paid create replay reconciles immediately and never mounts another confirmation form', async () => {
  for (const outcome of ['paid', 'pending', 'unavailable']) {
    const { context, calls } = fixture();
    context.meritBuyerEmailRef = { current: context.currentUser.email };
    context.meritReturnBusyRef = { current: false };
    context.setMeritReturnChecking = value => calls.push(['returnChecking', value]);
    context.setMeritReturnError = value => calls.push(['returnError', value]);
    context.acceptMeritPaid = async (result, orderId) => calls.push(['paid', result.orderId, orderId]);
    context.meritApi.create = async () => ({ ok: true, paid: true, session: { orderId: 'INV-MERIT123' }, order: { id: 'INV-MERIT123' } });
    context.meritApi.reconcile = async request => {
      calls.push(['reconcile', request.orderId]);
      if (outcome === 'unavailable') throw new Error('temporary network failure');
      return { ok: true, paid: outcome === 'paid', orderId: request.orderId, order: { id: request.orderId } };
    };
    await handler('handleStripePayment', context)();
    assert.equal(readMeritAttempt(context.window.sessionStorage).submitted, true);
    assert.ok(calls.some(([name]) => name === 'pending'));
    assert.deepEqual(calls.find(([name]) => name === 'reconcile'), ['reconcile', 'INV-MERIT123']);
    assert.equal(calls.filter(([name]) => name === 'setMeritSession').length, 0);
    assert.equal(calls.filter(([name]) => name === 'paid').length, outcome === 'paid' ? 1 : 0);
  }
});

test('unverified codes show the specific error without dropping attribution, auto-retrying, or generating a replacement key', async () => {
  for (const [code, field, value] of [['MERIT_PROMO_UNVERIFIED', 'promoCode', 'DYNAMIC'], ['MERIT_AFFILIATE_UNVERIFIED', 'affiliateCode', 'PARTNER']]) {
    for (const language of ['EN', 'RU']) {
      const { context, calls } = fixture();
      context.language = language;
      context.meritPayload = { ...context.meritPayload, [field]: value };
      context.meritInputsRef.current = JSON.stringify({ payload: context.meritPayload, email: context.currentUser.email, surchargeBps: 300 });
      const requests = [];
      context.meritApi.create = async request => { requests.push(request); const error = new Error('Rejected code'); error.code = code; throw error; };
      const start = handler('handleStripePayment', context);
      await start();
      assert.equal(requests.length, 1);
      assert.equal(requests[0].payload[field], value);
      const firstKey = readMeritAttempt(context.window.sessionStorage).key;
      assert.equal(calls.findLast(([name]) => name === 'setStripeError')[1], meritCheckoutBusinessError({ code }, language));
      assert.equal(context.meritPayload[field], value);
      assert.equal(calls.filter(([name]) => name === 'setMeritSession' || name === 'setPaymentMethodState').length, 0);
      assert.equal(context.meritCreateBusyRef.current, false);
      await start(); // An explicit retry still uses this same attempt and input.
      assert.equal(requests.length, 2);
      assert.equal(requests[1].checkoutKey, firstKey);
      assert.equal(readMeritAttempt(context.window.sessionStorage).key, firstKey);
      assert.equal(requests[1].payload[field], value);
    }
  }
});

test('Merit receipts remain server-only while the legacy manual receipt path stays available', async () => {
  const { context } = fixture();
  const requests = [];
  context.fetch = async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return { ok: true }; };
  context.publicProductName = value => value;
  context.getStoredOrders = () => [];
  context.saveStoredOrders = () => {};
  context.setUserOrders = () => {};
  context.getPaidOrdersForEmail = () => [];
  const send = handler('sendPaymentConfirmedEmail', context);
  const order = { id: 'INV-MERIT123', email: 'buyer@example.test', total: 103, items: [] };
  for (const paymentProvider of ['Merit', 'merit', 'MERIT', 'Stripe']) {
    await send({ ...order, paymentProvider });
  }
  assert.equal(requests.length, 0);
  await send({ ...order, paymentProvider: 'Wire Transfer' });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/send-payment-confirmed-email');
  assert.equal(requests[0].body.paymentProvider, 'Wire Transfer');
});
