import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import { test } from 'node:test';
import { buildMeritCheckoutPayload, estimateMeritCreditSplit, meritCheckoutBusinessError, meritPayloadDigest, saveMeritAttempt, readMeritAttempt } from '../artifacts/10-bottle-value/src/merit-checkout-client.js';

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
const initializer = (name, context) => {
  const decl = appBody.filter(node => node.type === 'VariableDeclaration').flatMap(node => node.declarations)
    .find(node => node.id.type === 'Identifier' && node.id.name === name);
  assert.ok(decl, `App initializer ${name} exists`);
  return vm.runInNewContext(`(${source.slice(decl.init.start, decl.init.end)})`, context);
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

test('Merit still applies partial credit before surcharge and keeps zero-credit and full-credit totals', () => {
  for(const [credit,applied,total,fee] of [[0,0,61.8,1.8],[50,50,10.3,.3],[60,60,0,0]]) {
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
