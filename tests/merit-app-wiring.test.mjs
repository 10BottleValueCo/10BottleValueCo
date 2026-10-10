import assert from 'node:assert/strict';
import { addAmounts, discountAmount, sumLineAmounts } from '../shared/checkout-money.js';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import { test } from 'node:test';
import { buildMeritCheckoutPayload, estimateMeritCreditSplit, meritCheckoutBusinessError, meritPayloadDigest, saveMeritAttempt, readMeritAttempt } from '../artifacts/10-bottle-value/src/merit-checkout-client.js';

import {createLegacyAttemptManager} from '../artifacts/10-bottle-value/src/legacy-checkout-attempt.js';
import { readPaymentReturn, legacyCheckoutHeaders } from '../artifacts/10-bottle-value/src/legacy-payment-return.js';

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
  const value = vm.runInNewContext(`(${source.slice(init.start, init.end)})`, context);
  return typeof value === 'function' ? value() : value;
};
const initializer = (name, context) => {
  const decl = appBody.filter(node => node.type === 'VariableDeclaration').flatMap(node => node.declarations)
    .find(node => node.id.type === 'Identifier' && node.id.name === name);
  assert.ok(decl, `App initializer ${name} exists`);
  return vm.runInNewContext(`(${source.slice(decl.init.start, decl.init.end)})`, context);
};
const jsxButtons = [];
function collectButtons(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'JSXElement' && node.openingElement.name.name === 'button') jsxButtons.push(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(collectButtons);
    else if (value && typeof value === 'object') collectButtons(value);
  }
}
collectButtons(ast.program);
const buttonAttribute = (button, name, context) => {
  const attribute = button.openingElement.attributes.find(item => item.name?.name === name);
  assert.ok(attribute, `checkout button has ${name}`);
  const expression = attribute.value.expression;
  return vm.runInNewContext(`(${source.slice(expression.start, expression.end)})`, context);
};
const proceedButtons = jsxButtons.filter(button => source.slice(button.start, button.end).includes('t("proceedCheckout")'));
const creditButton = jsxButtons.find(button => source.slice(button.start, button.end).includes('tx("Pay with Credits"'));
function storageFixture() {
  const map = new Map();
  return { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) };
}
function fixture() {
  const calls = [];
  const form = { email: 'buyer@example.test', firstName: 'Test', lastName: 'Buyer', address: 'One Road', country: 'United States', city: 'City', state: 'CA', postalCode: '90210', phone: '+15555555555' };
  const context = {
    Date, Math, Number, Object, JSON, URLSearchParams, Promise, AbortController, console, addAmounts, discountAmount, sumLineAmounts, setTimeout: () => 0,
    legacyCheckoutHeaders, supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'synthetic-token', user: { id: 'buyer-fixture', email: 'buyer@example.test' } } } }) } },
    saveAccountCheckoutDetails: async () => false, checkoutBuyerRef: { current: 'buyer-fixture' },
    rememberValidCheckoutDetails: value => calls.push(['setCheckoutForm', value]),
    currentUser: { id: 'buyer-fixture', email: 'buyer@example.test' }, researchAccepted: true, qualifiedAccepted: true, termsAccepted: true,
    cart: [{ name: 'BPC-157', dose: '5 mg', quantity: 1, price: 100 }],
    readCheckoutSnapshot: () => ({ ...form }), validateCheckoutForm: () => ({}),
    legacyAttemptsRef: { current: createLegacyAttemptManager({cryptoApi:webcrypto}) }, legacyStartLockRef: { current:false },
    deferredLegacyOrderRef: { current: null }, meritAttemptRef: { current: null },
    meritCreateBusyRef: { current: false }, meritVerificationAbortRef: { current: null }, meritInputsRef: { current: '' },
    meritSelectionRef: { current: { method: 'stripe', step: 'payment' } },
    checkoutInputRefs: { current: {} }, formSectionRef: { current: null }, termsSectionRef: { current: null },
    effectiveShippingType: 'standard', subtotal: 100, shipping: 39.99, automaticDiscount: 0, promoDiscount: 0,
    ownerFreeShippingActive: false, appliedPromo: null, affiliateDiscount: 0, cryptoDiscountAmount: 0, storeCreditApplied: 0, finalTotal: 139.99,
    affiliateTrackingCode: '', affiliateTrackingOwnerEmail: '', affiliateCommission: 0, paymentMethod: 'stripe', checkoutStep: 'payment',
    normalizeEmail: value => String(value || '').trim().toLowerCase(), getCheckoutOrderNotes: () => '',
    tx: value => value, t: value => value, requestAnimationFrame: () => 0,
    track: (...args) => calls.push(['track', ...args]),
    window: { innerWidth: 1280, scrollTo: () => {}, sessionStorage: storageFixture(), crypto: webcrypto },
    localStorage: { getItem: () => { throw new Error('unexpected legacy localStorage'); }, setItem: () => { throw new Error('unexpected legacy localStorage'); } },
    persistOrderToServer: () => { throw new Error('unexpected legacy server save'); },
    openMeritPending: () => calls.push(['pending']), showMeritReservedAttempt: () => calls.push(['pending']), stripeTemporarilyDisabled: false,
    meritConfig: { enabled: true, currency: 'usd', surchargeBps: 300 },
    buildMeritCheckoutPayload, meritCheckoutBusinessError, meritPayloadDigest, saveMeritAttempt, language: 'EN',
    loadStoreCredit: async () => {},
    verifyMeritCheckoutBuyer: async () => ({ otpToken: 'otp', verifiedEmail: 'buyer@example.test' }),
    meritApi: { create: async () => { throw new Error('unexpected create'); } },
  };
  for (const name of ['setPendingCheckoutAfterAuth', 'setAuthMode', 'setAccountMessage', 'setCheckoutMessage', 'setPage', 'setCheckoutForm', 'setCountrySearch', 'setCheckoutErrors', 'setCheckboxHighlight', 'setOrderNumber', 'setCurrentUser', 'setRegisteredUsers', 'setPaymentTimer', 'setNowPaymentData', 'setNowPaymentStatus', 'setNowPaymentError', 'setPaypalPaymentError', 'setCheckoutStep', 'setStripeLoading', 'setStripeError', 'setMeritSession', 'setPaymentMethodState']) context[name] = value => calls.push([name, value]);
  context.meritPayload = buildMeritCheckoutPayload({ items: context.cart, checkoutForm: form, shippingType: 'standard', purchaserAttestation: { over21AndResearchUseOnly: true, qualifiedResearcherOrLicensedProfessional: true, noHumanOrAnimalUse: true, policiesAccepted: true } });
  context.meritInputsRef.current = JSON.stringify({ payload: context.meritPayload, email: context.currentUser.email, surchargeBps: 300 });
  context.prepareLegacyPaymentAttempt = handler("prepareLegacyPaymentAttempt", context);
  return { context, calls, form };
}

function checkoutEntryFixture(overrides = {}) {
  const result = fixture();
  Object.assign(result.context, {
    checkoutForm: result.form, checkoutStep: 'details', hasOutOfStockInCart: false,
    researchAccepted: false, qualifiedAccepted: false, termsAccepted: false,
    setPendingAttestationAction: value => result.calls.push(['attestationAction', value]),
    setAttestationModalOpen: value => result.calls.push(['attestationOpen', value]),
    handleCheckout: () => { throw new Error('Checkout must wait for confirmation'); },
    ...overrides,
  });
  // Resolve named JSX handlers from the actual App source, while still exercising
  // older inline handlers when demonstrating the regression before its fix.
  for (const button of [...proceedButtons, creditButton]) {
    const onClick = button.openingElement.attributes.find(item => item.name?.name === 'onClick').value.expression;
    if (onClick.type === 'Identifier') result.context[onClick.name] = handler(onClick.name, result.context);
  }
  return result;
}

test('Card is the initial selection and checkout entry selects Card without starting payment', () => {
  assert.equal(initialState('paymentMethod', {}), 'stripe');
  const effect = appBody.find(node => node.type === 'ExpressionStatement'
    && node.expression.callee?.name === 'useEffect'
    && source.slice(node.start, node.end).includes('finalTotalRef.current > 0'))?.expression;
  assert.ok(effect);
  const calls = [];
  const run = (step, total) => vm.runInNewContext(`(${source.slice(effect.arguments[0].start, effect.arguments[0].end)})()`, {
    checkoutStep: step, finalTotalRef: { current: total }, setPaymentMethod: method => calls.push(method),
  });
  run('details', 100); run('payment', 0); assert.deepEqual(calls, []);
  run('payment', 100); assert.deepEqual(calls, ['stripe']);
});

test('Lightning to Card to Lightning keeps the original legacy order and follows its resumed invoice', async () => {
  const { context, calls } = fixture();
  const requests = [], navigations = [];
  Object.assign(context, {
    affiliateDiscountDisabled: false, paymentMethod: 'cashapp', catalystPayLoading: false, orderNumber: 'INV-LIGHTNING1', meritSession: null,
    deferredLegacyOrderRef: { current: { id: 'INV-LIGHTNING1', email:'buyer@example.test' } },
    setPaymentMethodState: value => { context.paymentMethod = value; },
    setOrderNumber: value => { context.orderNumber = value; },
    setCatalystPayLoading: value => { context.catalystPayLoading = value; },
    setCatalystPayError: value => calls.push(['lightningError', value]),
    getStoredOrders: () => [], saveStoredOrders: () => {}, setAllOrders: () => {}, setUserOrders: () => {}, getPaidOrdersForEmail: () => [],
    fetch: async (url, options) => {
      const body = JSON.parse(options.body); requests.push({ url, body });
      assert.equal(url, '/api/order-checkout');
      assert.equal(body.payment.kind, 'catalystpay');
      assert.equal(body.payment.body.order_id, body.order.id);
      return { ok: true, json: async () => ({ checkoutLink: 'https://checkout.example.test/original-invoice', invoice_id: 'original-invoice', amount: context.finalTotal }) };
    },
  });
  context.window.location = { assign: url => navigations.push(url) };
  context.persistOrderToServer = handler('persistOrderToServer', context);
  const select = handler('setPaymentMethod', context), pay = handler('createCatalystPayment', context);
  context.legacyAttemptsRef.current.begin('INV-LIGHTNING1','buyer-fixture');
  await pay(); const firstId=context.orderNumber; select('stripe'); select('cashapp'); await pay();
  assert.equal(context.orderNumber, firstId); assert.match(firstId,/^INV-[0-9A-F]{32}$/);
  assert.deepEqual(requests.map(request => request.url), ['/api/order-checkout']);
  for (const request of requests) assert.equal(request.body.order?.id || request.body.order_id, firstId);
  assert.deepEqual(navigations, ['https://checkout.example.test/original-invoice', 'https://checkout.example.test/original-invoice']);
  assert.equal(calls.some(([name, value]) => name === 'lightningError' && value), false);
});

test('App unmount disposes the code-field adapter through its signal', () => {
  const effect = appBody.find(node => node.type === 'ExpressionStatement'
    && node.expression.callee?.name === 'useEffect'
    && source.slice(node.start, node.end).includes('meritVerificationAbortRef.current?.abort'))?.expression;
  assert.ok(effect);
  const controller = new AbortController();
  const cleanup = vm.runInNewContext(`(${source.slice(effect.arguments[0].start, effect.arguments[0].end)})()`, {
    meritVerificationAbortRef: { current: controller },
  });
  assert.equal(controller.signal.aborted, false);
  cleanup();
  assert.equal(controller.signal.aborted, true);
});

test('bottom and mobile sticky checkout open confirmations when the closed modal has no terms ref', () => {
  assert.equal(proceedButtons.length, 2);
  for (const button of proceedButtons) {
    for (const currentUser of [{ email: 'buyer@example.test' }, null]) {
      const { context, calls } = checkoutEntryFixture({ currentUser });
      assert.equal(context.termsSectionRef.current, null);
      buttonAttribute(button, 'onClick', context)();
      assert.deepEqual(calls, [['attestationAction', 'checkout'], ['attestationOpen', true]]);
      assert.equal(context.deferredLegacyOrderRef.current, null);
    }
  }
});

test('sticky checkout preserves the full-credit action used by the bottom credit button', () => {
  assert.ok(creditButton);
  const stickyButton = proceedButtons.find(button => source.slice(button.start, button.end).includes('shrink-0'));
  for (const button of [creditButton, stickyButton]) {
    const { context, calls } = checkoutEntryFixture({ finalTotal: 0, storeCreditApplied: 139.99 });
    buttonAttribute(button, 'onClick', context)();
    assert.deepEqual(calls, [['attestationAction', 'credits'], ['attestationOpen', true]]);
    assert.equal(context.deferredLegacyOrderRef.current, null);
  }
});

test('both proceed buttons disable empty or out-of-stock carts', () => {
  for (const button of proceedButtons) {
    for (const patch of [{ cart: [] }, { hasOutOfStockInCart: true }]) {
      const { context } = checkoutEntryFixture(patch);
      assert.equal(buttonAttribute(button, 'disabled', context), true);
    }
    const { context } = checkoutEntryFixture();
    assert.equal(buttonAttribute(button, 'disabled', context), false);
  }
});

test('checkout still requires every confirmation and valid details before creating its draft', async () => {
  for (const key of ['researchAccepted', 'qualifiedAccepted', 'termsAccepted']) {
    const { context, calls } = fixture();
    context[key] = false;
    await handler('handleCheckout', context)();
    assert.equal(context.deferredLegacyOrderRef.current, null);
    assert.equal(calls.some(([name]) => name === 'setCheckoutStep'), false);
  }
  const { context, calls } = fixture();
  context.validateCheckoutForm = () => ({ postalCode: true });
  await handler('handleCheckout', context)();
  assert.equal(context.deferredLegacyOrderRef.current, null);
  assert.equal(calls.some(([name]) => name === 'setCheckoutStep'), false);
});

test('Merit success/cancel URL claims all initialize as pending, never paid', () => {
  for (const payment of ['success', 'pending', 'cancelled', 'failed']) {
    const state = initialState('paymentReturn', { readPaymentReturn, URLSearchParams, window: { location: { search: `?provider=merit&payment=${payment}&order=INV-ABCDEF123` } } });
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
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/order-checkout');
  assert.equal(requests[0].body.order.status, 'checkout');
  assert.equal(requests[0].body.order.metadata.purchaserAttestation.policiesAccepted, true);
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
  for (const [code, field, value] of [['MERIT_PROMO_UNVERIFIED', 'promoCode', 'DYNAMIC'], ['MERIT_AFFILIATE_UNVERIFIED', 'affiliateCode', 'PARTNER'], ['MERIT_AFFILIATE_UNAVAILABLE', 'affiliateCode', 'PARTNER'], ['MERIT_AFFILIATE_RULES_UNAVAILABLE', 'affiliateCode', 'PARTNER'], ['MERIT_AFFILIATE_LOOKUP_UNAVAILABLE', 'affiliateCode', 'PARTNER']]) {
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


test('credit request cannot switch methods or create a replacement key after a lost response and changed checkout', async () => {
  const { context, calls } = fixture();
  context.meritPayload.useStoreCredit = true;
  context.meritInputsRef.current = JSON.stringify({ payload: context.meritPayload, email: context.currentUser.email, surchargeBps: 300 });
  let creates = 0;
  context.meritApi.create = async () => { creates += 1; throw new Error('response lost after credit hold'); };
  const start = handler('handleStripePayment', context);
  await start();
  const original = readMeritAttempt(context.window.sessionStorage);
  assert.equal(original.createRequested, true);
  await start();
  assert.equal(creates, 2);
  assert.equal(readMeritAttempt(context.window.sessionStorage).key, original.key);
  handler('setPaymentMethod', context)('paypal');
  assert.equal(calls.filter(([name]) => name === 'setPaymentMethodState').length, 0);
  context.meritPayload.items[0].quantity = 3;
  context.meritInputsRef.current = JSON.stringify({ payload: context.meritPayload, email: context.currentUser.email, surchargeBps: 300 });
  await start();
  assert.equal(creates, 2);
  assert.equal(readMeritAttempt(context.window.sessionStorage).key, original.key);
  assert.ok(calls.some(([name]) => name === 'pending'));
});

test('full-credit authoritative rejection releases only the unreserved request for the existing credit checkout', async () => {
  const { context, calls } = fixture();
  context.meritPayload.useStoreCredit = true;
  context.meritInputsRef.current = JSON.stringify({ payload: context.meritPayload, email: context.currentUser.email, surchargeBps: 300 });
  context.meritApi.create = async () => { const error = new Error('credit covers order'); error.code = 'MERIT_FULL_CREDIT_AVAILABLE'; throw error; };
  await handler('handleStripePayment', context)();
  assert.equal(readMeritAttempt(context.window.sessionStorage).createRequested, undefined);
  assert.match(calls.findLast(([name]) => name === 'setStripeError')[1], /covers the entire order/);
});

for (const code of ['MERIT_CREDIT_PENDING', 'MERIT_CREDIT_BALANCE_UNAVAILABLE']) {
  test(`${code} releases an explicitly unreserved request so another payment method remains available`, async () => {
    const { context, calls } = fixture();
    context.meritPayload.useStoreCredit = true;
    context.meritInputsRef.current = JSON.stringify({ payload: context.meritPayload, email: context.currentUser.email, surchargeBps: 300 });
    context.meritApi.create = async () => { const error = new Error('request rejected before reservation'); error.code = code; throw error; };
    await handler('handleStripePayment', context)();
    assert.equal(readMeritAttempt(context.window.sessionStorage).createRequested, undefined);
    handler('setPaymentMethod', context)('paypal');
    assert.ok(calls.some(([name, value]) => name === 'setPaymentMethodState' && value === 'paypal'));
  });
}

test('missing full-credit RPC leaves cart, balance and retry id intact without a paid browser order', async () => {
  const { context, calls } = fixture();
  Object.assign(context, {
    finalTotal: 0, storeCreditApplied: 60, hasOutOfStockInCart: false,
    creditCheckoutInFlightRef: { current: false }, isCreditCheckoutSubmitting: false, creditPayAnimating: false,
    storeCreditOrderAttemptRef: { current: null }, ownerFreeShippingActive: false, affiliateDiscountDisabled: false,
    supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'synthetic' } } }) } },
  });
  const requests = [];
  context.fetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return { ok: false, json: async () => ({ ok: false, error: 'Store Credit checkout is temporarily unavailable.' }) };
  };
  for (const name of ['setIsCreditCheckoutSubmitting', 'setStoreCredit', 'setCart', 'setCreditPayAnimating', 'setCreditPayAmount', 'setPaymentReturn']) context[name] = value => calls.push([name, value]);
  const checkout = handler('handlePayWithCredits', context);
  await checkout(); await checkout();
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, '/api/store-credit-checkout');
  assert.equal(requests[0].body.paymentMethod, ''); // No card surcharge on an entirely credit-funded order.
  assert.equal(requests[0].body.orderId, requests[1].body.orderId);
  assert.equal(context.storeCreditOrderAttemptRef.current, requests[0].body.orderId);
  assert.equal(context.creditCheckoutInFlightRef.current, false);
  assert.equal(calls.filter(([name]) => ['setStoreCredit', 'setCart', 'setPaymentReturn', 'setCreditPayAnimating'].includes(name)).length, 0);
  assert.ok(calls.some(([name, value]) => name === 'setCheckoutMessage' && /unavailable/.test(value)));
});

test('prepared credit checkout can restore its Merit method and pass details without generating a different attempt', async () => {
  const { context, calls } = fixture();
  context.meritAttemptRef.current = { key: 'preserved', orderId: 'INV-HELD123', createRequested: true, submitted: false };
  context.paymentMethod = 'cashapp';
  context.meritSession = null;
  handler('setPaymentMethod', context)('stripe');
  assert.ok(calls.some(([name, value]) => name === 'setPaymentMethodState' && value === 'stripe'));
  await handler('handleCheckout', context)();
  assert.ok(calls.some(([name, value]) => name === 'setCheckoutStep' && value === 'payment'));
  assert.equal(context.meritAttemptRef.current.key, 'preserved');
});

test('admin credit double-click uses one delta request and displays a fresh balance after replay', async () => {
  const { context, calls } = fixture();
  let resolveAdjustment; let requests = 0; let selectedEmail;
  Object.assign(context, {
    adminCreditAdjustmentBusyRef: { current: false }, adminCreditEmail: 'buyer@example.test',
    adminCreditAmount: '50', adminCreditNote: '',
    adjustStoreCredit: () => { requests += 1; return new Promise(resolve => { resolveAdjustment = resolve; }); },
    supabase: { from: table => {
      assert.equal(table,'user_credits');
      return { select: () => ({ eq: (field,email) => {
        assert.equal(field,'email'); selectedEmail=email;
        return { maybeSingle: async () => ({ data: { amount: 7, note: null, updated_at: 'fixture' }, error: null }) };
      } }) };
    } },
  });
  for (const name of ['setAdminCreditMessage','setAdminCreditLookup','setStoreCredit','setAdminCreditLoading']) context[name] = value => calls.push([name,value]);
  const submit=handler('adminAddCredit',context); const first=submit('add'); await submit('add');
  assert.equal(requests,1); assert.equal(calls.some(([name]) => name === 'setStoreCredit'),false);
  context.adminCreditEmail='changed@example.test';
  resolveAdjustment({ email: 'buyer@example.test', balance: 50, note: '', replayed: true }); await first;
  assert.equal(selectedEmail,'buyer@example.test');
  assert.equal(calls.findLast(([name])=>name==='setStoreCredit')[1],7);
  assert.equal(calls.findLast(([name])=>name==='setAdminCreditLookup')[1].amount,7);
  assert.match(calls.findLast(([name])=>name==='setAdminCreditMessage')[1],/balance after adjustment: \$50\.00/);
  assert.equal(context.adminCreditAdjustmentBusyRef.current,false);
});

test('unconfirmed admin adjustment cannot update the displayed balance', async () => {
  const { context, calls } = fixture();
  Object.assign(context,{ adminCreditAdjustmentBusyRef:{current:false}, adminCreditEmail:'buyer@example.test', adminCreditAmount:'50', adminCreditNote:'',
    adjustStoreCredit:async()=>{throw Error('Retry the same adjustment');},
    supabase:{from:()=>{throw Error('unexpected balance read');}},
  });
  for (const name of ['setAdminCreditMessage','setAdminCreditLookup','setStoreCredit','setAdminCreditLoading']) context[name]=value=>calls.push([name,value]);
  await handler('adminAddCredit',context)('add');
  assert.equal(calls.some(([name])=>name==='setStoreCredit'||name==='setAdminCreditLookup'),false);
  assert.match(calls.findLast(([name])=>name==='setAdminCreditMessage')[1],/Retry the same adjustment/);
  assert.equal(context.adminCreditAdjustmentBusyRef.current,false);
});

test('a held credit checkout retains the original intent after reload reduces available balance to zero', async () => {
  const { context, form }=fixture();
  Object.assign(context,{ checkoutForm:form, storeCredit:50, affiliateDiscountDisabled:false, ownerFreeShippingActive:false });
  const original=initializer('meritPayload',context);
  assert.equal(original.useStoreCredit,true);
  const digest=await meritPayloadDigest(original,context.currentUser.email,300);
  saveMeritAttempt(context.window.sessionStorage,{ key:webcrypto.randomUUID(), digest, orderId:'INV-HELD123', submitted:false, createRequested:true });
  context.meritAttemptRef.current=readMeritAttempt(context.window.sessionStorage);
  context.storeCredit=0;
  const restored=initializer('meritPayload',context);
  assert.equal(restored.useStoreCredit,true);
  assert.equal(await meritPayloadDigest(restored,context.currentUser.email,300),digest);
  let requests=0;
  context.meritPayload=restored;
  context.meritInputsRef.current=JSON.stringify({ payload:restored,email:context.currentUser.email,surchargeBps:300 });
  context.meritApi.create=async()=>{ requests+=1; return { session:{orderId:'INV-HELD123',storeCreditUsedCents:5000},order:{id:'INV-HELD123'} }; };
  await handler('handleStripePayment',context)();
  assert.equal(requests,1);
  context.meritAttemptRef.current=null;
  assert.equal(initializer('meritPayload',context).useStoreCredit,false);
});

function paymentArithmetic({ method='paypal', credit=0, base=60, step='payment' }={}) {
  const f=fixture();
  Object.assign(f.context,{ paymentMethod:method, checkoutStep:step, storeCredit:credit, subtotal:base, shipping:0,
    meritActiveSession:null, estimateMeritCreditSplit });
  for(const name of ['baseTotal','cryptoDiscountAmount','meritSelected','meritCreditSplit','stripeFeeAmount','totalAfterDiscount','paypalFee','totalWithFee','storeCreditApplied','finalTotal','cashAppEligibleAmount']) {
    f.context[name]=initializer(name,f.context);
  }
  f.context.meritSelectionRef.current={method,step};
  return f;
}

test('non-Merit payments apply no partial credit and preserve their ordinary full payable', () => {
  for(const method of ['paypal','wire','cashapp','paylio']) {
    for(const credit of [0,50,59.99]) {
      const {context}=paymentArithmetic({method,credit});
      assert.equal(context.storeCreditApplied,0,method); assert.equal(context.finalTotal,60,method);
    }
    for(const credit of [60,100]) {
      const {context}=paymentArithmetic({method,credit});
      assert.equal(context.storeCreditApplied,60,method); assert.equal(context.finalTotal,0,method);
    }
  }
  const large=paymentArithmetic({method:'cashapp',credit:500,base:1100}).context;
  assert.equal(large.cashAppEligibleAmount,1100);
});

test('crypto keeps its ordinary discount and full-credit checkout without creating mixed tender', () => {
  for(const credit of [0,50,58.49]) {
    const {context}=paymentArithmetic({method:'crypto',credit});
    assert.equal(context.cryptoDiscountAmount,1.5); assert.equal(context.storeCreditApplied,0); assert.equal(context.finalTotal,58.5);
  }
  for(const credit of [58.5,60]) {
    const {context}=paymentArithmetic({method:'crypto',credit});
    assert.equal(context.storeCreditApplied,58.5); assert.equal(context.finalTotal,0);
  }
  const cents=paymentArithmetic({credit:.3,base:.1+.2}).context;
  assert.equal(cents.finalTotal,0);
});

test('Merit calculates surcharge on the full order before partial credit and keeps zero-credit and full-credit totals', () => {
  for(const [credit,applied,total,fee] of [[0,0,61.8,1.8],[50,50,11.8,1.8],[60,60,0,0]]) {
    const {context}=paymentArithmetic({method:'stripe',credit});
    assert.equal(context.storeCreditApplied,applied); assert.equal(context.finalTotal,total); assert.equal(context.stripeFeeAmount,fee);
  }
});

const paypalNodes=[];
function collectPaypal(node,parents=[]) {
  if(!node || typeof node!=='object')return;
  if(node.type==='JSXElement' && node.openingElement.name.name==='PayPalButton')paypalNodes.push({node,parents});
  for(const value of Object.values(node)) {
    if(Array.isArray(value))for(const child of value)collectPaypal(child,[...parents,node]);
    else if(value && typeof value==='object')collectPaypal(value,[...parents,node]);
  }
}
collectPaypal(ast);
const paypalCreate=context=>{
  assert.equal(paypalNodes.length,1,'only the selected payment button can prepare a PayPal order');
  const expr=paypalNodes[0].node.openingElement.attributes.find(a=>a.name?.name==='createOrder').value.expression;
  return vm.runInNewContext(`(${source.slice(expr.start,expr.end)})`,context);
};

test('PayPal cannot mount during details, another payment method, or full-credit checkout', () => {
  assert.equal(paypalNodes.length,1);
  const container=paypalNodes[0].parents.findLast(node=>node.type==='JSXExpressionContainer' && node.expression.type==='LogicalExpression');
  const expr=container.expression;
  assert.equal(expr.right.type,'JSXElement');
  const condition=source.slice(expr.start,expr.right.start)+'true';
  for(const [method,step,credit,visible] of [['paypal','payment',0,true],['paypal','payment',50,true],['paypal','payment',60,false],['paypal','details',50,false],['stripe','payment',50,false],['wire','payment',50,false]]) {
    const {context}=paymentArithmetic({method,step,credit});
    assert.equal(vm.runInNewContext(condition,context),visible,`${method}/${step}/${credit}`);
  }
});

test('PayPal create uses the full amount and stale hidden callbacks stop before financial I/O', async () => {
  for(const [method,step,credit,held,allowed] of [['paypal','payment',50,false,true],['stripe','payment',50,false,false],['paypal','details',50,false,false],['paypal','payment',60,false,false],['paypal','payment',50,true,false]]) {
    const {context}=paymentArithmetic({method,step,credit}); const writes=[];
    Object.assign(context,{orderNumber:'INV-PAYPAL123',paypalSnapshotRef:{current:null},countryNameToISO:()=> 'US',
      markPaypalCheckoutStarted:async()=>writes.push(['mark']),
      fetch:async(url,options)=>{writes.push(['fetch',url,JSON.parse(options.body)]);return {ok:true,json:async()=>({id:'paypal-test'})};},
    });
    if(held)context.meritAttemptRef.current={createRequested:true};
    context.assertPaypalCheckoutReady=handler('assertPaypalCheckoutReady',context);
    if(allowed){
      assert.equal(await paypalCreate(context)(),'paypal-test');
      assert.equal(writes[1][2].amount,60);assert.equal(context.paypalSnapshotRef.current.total,60);
    } else {
      await assert.rejects(paypalCreate(context)()); assert.equal(writes.length,0); assert.equal(context.paypalSnapshotRef.current,null);
    }
  }
});

test('PayPal approval cannot copy a later Merit credit selection into the saved invoice', async () => {
  const {context,calls,form}=fixture(); const saved=[];
  Object.assign(context,{orderNumber:'INV-PAYPAL123',storeCreditApplied:50,paypalFee:0,shippingType:'standard',
    paypalSnapshotRef:{current:{checkout:form,total:60,subtotal:60,shipping:0,shippingType:'standard',items:context.cart}},
    persistOrderToServer:async order=>saved.push(order),
    fetch:async()=>({ok:false,json:async()=>({error:'synthetic capture stopped'})}),
    setPaypalPaymentLoading:value=>calls.push(['paypalLoading',value]),
  });
  await handler('onPaypalApprove',context)({orderID:'paypal-test'});
  assert.equal(saved.length,1); assert.equal(saved[0].total,60); assert.equal(saved[0].metadata.storeCreditUsed,0);
});

// Exercise the real persistence boundary independently of provider acceptance.
test('validated details save before payment and late account-save responses cannot overwrite another user', async () => {
  const { context, calls, form } = fixture();
  context.currentUser = { id: 'account-a', email: form.email };
  context.checkoutBuyerRef.current = 'account-a';
  context.contactDetails = value => ({ firstName: value.firstName, address: value.address });
  let finish;
  context.saveAccountCheckoutDetails = (user, snapshot) => { calls.push(['saveProfile', user.id, snapshot]); return new Promise(resolve => { finish = resolve; }); };
  handler('rememberValidCheckoutDetails', context)(form);
  assert.equal(calls[0][0], 'setCheckoutForm');
  assert.equal(calls[1][0], 'saveProfile');
  context.checkoutBuyerRef.current = 'account-b';
  finish(true); await Promise.resolve();
  assert.equal(calls.some(call => call[0] === 'setCurrentUser'), false);
});

test('actual checkout preparation isolates provider changes and preserves the original attestation',async()=>{
 const {context}=fixture();await handler('handleCheckout',context)();
 const prepare=handler('prepareLegacyPaymentAttempt',context);
 const lightning=await prepare('catalystpay','lightning',context.readCheckoutSnapshot());
 assert.equal(context.deferredLegacyOrderRef.current.purchaserAttestation.policiesAccepted,true);
 context.cryptoDiscountAmount=3.5;context.finalTotal=136.49;
 const crypto=await prepare('nowpayments','usdtrx',context.readCheckoutSnapshot());
 assert.notEqual(crypto.orderId,lightning.orderId);assert.equal(context.deferredLegacyOrderRef.current.total,136.49);
 context.cryptoDiscountAmount=0;context.finalTotal=139.99;
 assert.equal((await prepare('catalystpay','lightning',context.readCheckoutSnapshot())).orderId,lightning.orderId);
 context.checkoutBuyerRef.current='other';await assert.rejects(prepare('catalystpay','lightning',context.readCheckoutSnapshot()),/Sign in/);
});

test('payment selection waits for the in-flight hosted invoice request',()=>{
 const {context,calls}=fixture();context.legacyStartLockRef.current=true;
 handler('setPaymentMethod',context)('cashapp');assert.deepEqual(calls,[]);
});

test('a changed or mismatched Lightning amount never navigates away from the reviewed checkout', async () => {
 for (const changed of [true,false]) {
  const {context,calls}=fixture();const navigations=[],requests=[];
  Object.assign(context,{ affiliateDiscountDisabled:false,catalystPayLoading:false,
   prepareLegacyPaymentAttempt:async()=>({orderId:'INV-PRICECHECK',url:null}),
   getStoredOrders:()=>[],saveStoredOrders:()=>{},setAllOrders:()=>{},setUserOrders:()=>{},getPaidOrdersForEmail:()=>[],setCatalystPayLoading:()=>{},setCatalystPayError:value=>calls.push(['error',value]),
   setAffiliateEligibilityRefresh:()=>calls.push(['refresh']),
   fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:!changed,json:async()=>changed
    ? {code:'CHECKOUT_QUOTE_CHANGED',error:'Review the changed total.'}
    : {amount:200,checkoutLink:'https://checkout.example.test/wrong-price'}};},
  });context.window.location={assign:url=>navigations.push(url)};
  context.persistOrderToServer=handler('persistOrderToServer',context);
  await handler('createCatalystPayment',context)();
  assert.equal(requests[0].payment.body.expectedTotal,139.99);assert.deepEqual(navigations,[]);
  assert.ok(calls.some(([name,message])=>name==='error'&&message));
  assert.equal(calls.some(([name])=>name==='refresh'),changed);
 }
});

test('first-order preview requires server eligibility for the current account and code',()=>{
 const context={affiliateEligibilityKey:'buyer:CODE',affiliateEligibility:null,userOrders:[]};
 assert.equal(initializer('isFirstTimeAffiliateBuyer',context),false);
 for(const affiliateEligibility of [{key:'buyer:CODE',status:'loading',discountBps:500},{key:'other:CODE',status:'ready',discountBps:500},{key:'buyer:CODE',status:'ready',discountBps:0}])
  assert.equal(initializer('isFirstTimeAffiliateBuyer',{...context,affiliateEligibility}),false);
 assert.equal(initializer('isFirstTimeAffiliateBuyer',{...context,affiliateEligibility:{key:'buyer:CODE',status:'ready',discountBps:500}}),true);
});

test('Paylio starts progress immediately, saves once, blocks double clicks and resumes the same invoice', async () => {
  const { context, calls } = fixture();
  let orders = [], releaseSave;
  const saveGate = new Promise(resolve => { releaseSave = resolve; });
  const requests = [], navigations = [];
  Object.assign(context, {
    affiliateDiscountDisabled: false, ownerFreeShippingActive: false, paymentMethod: 'paylio', paylioPaymentLoading: false,
    setPaylioPaymentLoading: value => { context.paylioPaymentLoading = value; calls.push(['progress', value]); },
    setPaylioPaymentError: value => calls.push(['paylioError', value]),
    setOrderNumber: value => { context.orderNumber = value; },
    getStoredOrders: () => orders, saveStoredOrders: next => { orders = next; },
    setAllOrders: () => {}, setUserOrders: () => {}, getPaidOrdersForEmail: () => [],
    fetch: async (url, options) => {
      const body = JSON.parse(options.body); requests.push({ url, body });
      assert.equal(url, '/api/order-checkout');
      assert.equal(body.payment.kind, 'paylio');
      assert.equal(body.order.id, body.payment.body.orderId);
      await saveGate;
      return { ok: true, json: async () => ({ payment_url: 'https://paylio.org/pay?payment_id=synthetic-latency-fixture', verifiedAmount: context.finalTotal }) };
    },
  });
  context.window.location = { origin: 'https://shop.example.test', assign: url => navigations.push(url) };
  context.persistOrderToServer = handler('persistOrderToServer', context);
  context.markOrderCheckoutStartedById = handler('markOrderCheckoutStartedById', context);
  await handler('handleCheckout', context)();
  const pay = handler('createPaylioPayment', context);
  const pending = pay('paypal');
  assert.equal(context.paylioPaymentLoading, true);
  assert.equal(context.legacyStartLockRef.current, true);
  await pay('paypal'); // Cannot create or navigate while the first save is pending.
  for (let tries = 0; !requests.length && tries < 100; tries++) await new Promise(resolve => setTimeout(resolve, 1));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.order.status, 'checkout');
  assert.equal(requests[0].body.order.metadata.purchaserAttestation.policiesAccepted, true);
  assert.equal(orders.length, 0);
  assert.deepEqual(navigations, []);
  releaseSave(); await pending;
  assert.deepEqual(requests.map(x => x.url), ['/api/order-checkout']);
  assert.equal(context.paylioPaymentLoading, false);
  await pay('paypal');
  assert.equal(requests.length, 1);
  assert.deepEqual(navigations, ['https://paylio.org/pay?payment_id=synthetic-latency-fixture', 'https://paylio.org/pay?payment_id=synthetic-latency-fixture']);
  assert.equal(calls.some(([name, value]) => name === 'paylioError' && value), false);
});

test('failed Paylio save leaves no local checkout, no provider request and clears progress', async () => {
  const { context, calls } = fixture();
  const requests = [];
  let localWrites = 0;
  Object.assign(context, {
    affiliateDiscountDisabled: false, paylioPaymentLoading: false,
    setPaylioPaymentLoading: value => { context.paylioPaymentLoading = value; },
    setPaylioPaymentError: value => calls.push(['error', value]),
    getStoredOrders: () => [], saveStoredOrders: () => { localWrites++; }, setAllOrders: () => {},
    setUserOrders: () => {}, getPaidOrdersForEmail: () => [],
    fetch: async url => { requests.push(url); return { ok: false, json: async () => ({ error: 'Save unavailable' }) }; },
  });
  context.window.location = { assign: () => assert.fail('must not navigate') };
  context.persistOrderToServer = handler('persistOrderToServer', context);
  context.markOrderCheckoutStartedById = handler('markOrderCheckoutStartedById', context);
  await handler('handleCheckout', context)();
  await handler('createPaylioPayment', context)('paypal');
  assert.deepEqual(requests, ['/api/order-checkout']);
  assert.equal(localWrites, 0);
  assert.equal(context.paylioPaymentLoading, false);
  assert.equal(context.legacyStartLockRef.current, false);
  assert.ok(calls.some(([name, value]) => name === 'error' && value === 'Save unavailable'));
});

test('provider failure retains the acknowledged unpaid checkout and its original start time on retry', async () => {
  const { context, calls } = fixture();
  let orders = [];
  const requests = [];
  Object.assign(context, {
    affiliateDiscountDisabled: false, paylioPaymentLoading: false,
    setPaylioPaymentLoading: value => { context.paylioPaymentLoading = value; },
    setPaylioPaymentError: value => calls.push(['error', value]),
    getStoredOrders: () => orders, saveStoredOrders: next => { orders = next; },
    setAllOrders: () => {}, setUserOrders: () => {}, getPaidOrdersForEmail: () => [],
    fetch: async (url, options) => {
      requests.push(JSON.parse(options.body));
      return { ok: false, headers: new Headers({ 'X-Checkout-Saved': '1' }), json: async () => ({ error: 'Provider unavailable' }) };
    },
  });
  context.window.location = { assign: () => assert.fail('must not navigate') };
  context.persistOrderToServer = handler('persistOrderToServer', context);
  await handler('handleCheckout', context)();
  const pay = handler('createPaylioPayment', context);
  await pay('paypal');
  assert.equal(orders.length, 1);
  assert.equal(orders[0].status, 'checkout');
  assert.equal(orders[0].purchaserAttestation.policiesAccepted, true);
  orders[0].checkoutStartedAt = '2026-10-10T01:00:00.000Z';
  await pay('paypal');
  assert.equal(requests[1].order.id, requests[0].order.id);
  assert.equal(requests[1].order.metadata.checkoutStartedAt, '2026-10-10T01:00:00.000Z');
  assert.equal(orders.length, 1);
  assert.equal(context.paylioPaymentLoading, false);
  assert.equal(context.legacyStartLockRef.current, false);
  assert.ok(calls.some(([name, value]) => name === 'error' && value === 'Provider unavailable'));
});
