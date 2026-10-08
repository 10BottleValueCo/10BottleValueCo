import test from "node:test";
import assert from "node:assert/strict";
import { buildMeritReceipt, sendMeritReceipt } from "./_merit-receipt.js";
import { renderPaymentConfirmationEmail } from "./_payment-confirmation-email.js";
import { reconcileMeritAttempt, reconcileMeritOrder } from "./_merit-reconcile.js";

const ORDER_ID = "INV-123456789ABCDEF0123456789ABCDEF0";
const PRIVATE = "PRIVATE_RECEIPT_SENTINEL";
const clone = value => structuredClone(value);
const attemptFixture = () => ({
  id: "abcdefab-cdef-4abc-8abc-defabcdefabc",
  customer_id: "abcdefab-cdef-4abc-8abc-defabcdefabc",
  order_id: ORDER_ID, intent_id: "pi_testReceipt123", email: "buyer@example.com",
  amount_cents: 11330, currency: "usd", expected_account: "acct_test123", expected_live: true,
  client_secret: PRIVATE, publishable_key: PRIVATE,
  snapshot: {
    email: "buyer@example.com", total: 113.30, subtotal: 100, shipping: 20,
    automaticDiscount: 5, promoDiscount: 5, affiliateDiscount: 0, storeCreditUsed: 0,
    customerCardSurcharge: 3.30, customerCardSurchargeBps: 300,
    firstName: "Ada", lastName: "Lovelace", address: "1 Example Way", address2: "Suite 2",
    city: "Example City", state: "CA", postalCode: "90001", country: "United States",
    phone: "+15551234567", shippingType: "standard",
    items: [{ name: "Semaglutide", dose: "10mg", quantity: 2, price: 50, supplierCost: PRIVATE }],
    paymentRules: { source: PRIVATE, merchantProcessingExpense: { rate: 9999 } },
    costSnapshot: { supplier: PRIVATE }, affiliateOwnerEmail: PRIVATE,
    orderNotes: PRIVATE, cardProcessingFee: 999, paymentId: "pi_untrusted", paymentProvider: "untrusted",
  },
});
const proofFor = attempt => ({
  intentId: attempt.intent_id, orderId: attempt.order_id, email: attempt.email,
  amountCents: attempt.amount_cents, amountReceivedCents: attempt.amount_cents,
  currency: attempt.currency, stripeAccount: attempt.expected_account, live: attempt.expected_live,
  status: "succeeded",
});
const paidResult = (attempt, alreadyPaid = false) => ({
  ok: true, paid: true, alreadyPaid,
  order: { id: attempt.order_id, status: "paid", total: attempt.amount_cents / 100 },
});
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

test("receipt whitelists immutable attempt identity and canonical snapshot fields", () => {
  const attempt = attemptFixture();
  const before = clone(attempt);
  const receipt = buildMeritReceipt(attempt);
  assert.deepEqual(receipt, {
    email: "buyer@example.com", orderId: ORDER_ID, paymentId: "pi_testReceipt123", paymentProvider: "Merit",
    total: 113.30, subtotal: 100, shipping: 20, automaticDiscount: 5, promoDiscount: 5,
    affiliateDiscount: 0, storeCreditUsed: 0, customerCardSurcharge: 3.30, customerCardSurchargeBps: 300,
    firstName: "Ada", lastName: "Lovelace", address: "1 Example Way", address2: "Suite 2",
    city: "Example City", state: "CA", postalCode: "90001", country: "United States",
    phone: "+15551234567", shippingType: "standard",
    items: [{ name: "Semaglutide", dose: "10mg", quantity: 2, price: 50 }],
  });
  assert.equal(JSON.stringify(receipt).includes(PRIVATE), false);
  assert.deepEqual(attempt, before);
});

test("shared receipt preserves branded content, display names and the exact stored surcharge", () => {
  const html = renderPaymentConfirmationEmail(buildMeritReceipt(attemptFixture()), { escapeValues: true });
  for (const content of ["Payment confirmed", "Shipping address", "Total paid", "What happens next:",
    "Go to account", "Review on Trustpilot", "For laboratory research use only.",
    "20 vials × GLP-1-S 10mg", "Card surcharge (3%)", "+$3.30", "$113.30"]) {
    assert.ok(html.includes(content), content);
  }
  for (const excluded of [PRIVATE, "Card processing fee (5%)", "$999.00", "Semaglutide"]) {
    assert.equal(html.includes(excluded), false, excluded);
  }
});

test("missing historical surcharge rate remains unlabeled and zero surcharge stays hidden", () => {
  const attempt = attemptFixture();
  delete attempt.snapshot.customerCardSurchargeBps;
  const receipt = buildMeritReceipt(attempt);
  assert.equal(Object.hasOwn(receipt, "customerCardSurchargeBps"), false);
  const html = renderPaymentConfirmationEmail(receipt);
  assert.match(html, />Card surcharge<\/td>/);
  assert.doesNotMatch(html, /Card surcharge \(|Card processing fee/);
  attempt.amount_cents = 11000;
  Object.assign(attempt.snapshot, { total: 110, customerCardSurcharge: 0, customerCardSurchargeBps: 0 });
  assert.doesNotMatch(renderPaymentConfirmationEmail(buildMeritReceipt(attempt)), /Card surcharge|Card processing fee/);
});

test("a legacy receipt retains its existing fee label and original field contract", () => {
  const html = renderPaymentConfirmationEmail({
    email: "buyer@example.com", orderId: ORDER_ID, paymentProvider: "Legacy", cardProcessingFee: 5,
    total: 105, subtotal: 100, shippingType: "express", items: [{ name: "Tirzepatide", dose: "10mg", price: 100, quantity: 1 }],
  });
  assert.match(html, /Card processing fee \(5%\)/);
  assert.match(html, /\+\$5\.00/);
  assert.match(html, /GLP-2-T/);
  assert.match(html, /Express delivery: 5–7 business days/);
  assert.doesNotMatch(html, /Card surcharge/);
});

test("all dynamic template text is escaped for server receipts", () => {
  const order = buildMeritReceipt(attemptFixture());
  const hostile = '<img src=x onerror="bad">&\'payload';
  const escaped = "&lt;img src=x onerror=&quot;bad&quot;&gt;&amp;&#39;payload";
  for (const key of ["firstName", "lastName", "address", "address2", "city", "state", "postalCode", "phone", "country", "orderId", "paymentProvider", "paymentId"]) order[key] = `${key}:${hostile}`;
  order.items = [{ name: `name:${hostile}`, dose: `dose:${hostile}`, quantity: 1, price: 100 }];
  const html = renderPaymentConfirmationEmail(order, { escapeValues: true });
  assert.equal(html.includes(hostile), false);
  for (const key of ["firstName", "lastName", "address", "address2", "city", "state", "postalCode", "phone", "country", "orderId", "paymentProvider", "paymentId", "name", "dose"]) {
    assert.ok(html.includes(`${key}:${escaped}`), key);
  }
});

test("malformed identities, amounts, arithmetic and item values fail before delivery", () => {
  const cases = [
    value => { value.snapshot = null; },
    value => { value.order_id = "INV-forged"; },
    value => { value.intent_id = "other"; },
    value => { value.email = "bad"; },
    value => { value.snapshot.email = "another@example.com"; },
    value => { value.currency = "eur"; },
    value => { value.amount_cents = 11331; },
    value => { value.snapshot.total = "113.30"; },
    value => { value.snapshot.shipping = NaN; },
    value => { value.snapshot.subtotal = -1; },
    value => { value.snapshot.promoDiscount = 5.001; },
    value => { value.snapshot.automaticDiscount = 6; },
    value => { value.snapshot.customerCardSurchargeBps = 500; },
    value => { value.snapshot.customerCardSurchargeBps = "300"; },
    value => { value.snapshot.items = []; },
    value => { value.snapshot.items[0].quantity = 0; },
    value => { value.snapshot.items[0].price = Infinity; },
  ];
  for (const mutate of cases) {
    const value = attemptFixture(); mutate(value);
    assert.throws(() => buildMeritReceipt(value), { message: "Canonical payment receipt is unavailable." });
  }
});

test("sender ignores mutable public order data, forces escaping and emits no private snapshot", async () => {
  const attempt = attemptFixture();
  attempt.snapshot.firstName = "<b>Stored & buyer</b>";
  const calls = [];
  const result = await sendMeritReceipt({ attempt, order: {
    email: "attacker@example.com", total: 0.01, firstName: "PUBLIC_ORDER_SENTINEL", paymentId: "pi_forged",
  } }, {
    env: { RESEND_API_KEY: "synthetic-mail-key" }, escapeValues: false,
    fetcher: async (url, request) => { calls.push({ url, request }); return { ok: true, json: async () => ({ id: "synthetic-mail-id" }) }; },
  });
  assert.deepEqual(result, { sent: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.equal(calls[0].request.method, "POST");
  assert.equal(calls[0].request.redirect, "error");
  assert.ok(calls[0].request.signal instanceof AbortSignal);
  assert.equal(calls[0].request.headers.Authorization, "Bearer synthetic-mail-key");
  const payload = JSON.parse(calls[0].request.body);
  assert.equal(payload.from, "10BottleValueCo <support@10bottlevalue.co>");
  assert.equal(payload.to, attempt.email);
  assert.equal(payload.subject, `Order confirmed — ${ORDER_ID}`);
  assert.match(payload.html, /&lt;b&gt;Stored &amp; buyer&lt;\/b&gt;/);
  for (const excluded of [PRIVATE, "PUBLIC_ORDER_SENTINEL", "attacker@example.com", "pi_forged", "<b>Stored"]) {
    assert.equal(calls[0].request.body.includes(excluded), false, excluded);
  }
});

test("delivery failures are sanitized and never expose provider responses or credentials", async () => {
  for (const fetcher of [
    async () => ({ ok: false, json: async () => ({ error: PRIVATE }) }),
    async () => { throw new Error(PRIVATE); },
    async () => ({ ok: true, json: async () => { throw new Error(PRIVATE); } }),
  ]) {
    await assert.rejects(sendMeritReceipt({ attempt: attemptFixture() }, {
      env: { RESEND_API_KEY: "synthetic-mail-key" }, fetcher,
    }), { message: "Payment receipt delivery failed." });
  }
});

test("only a first paid transition notifies, after database acknowledgement", async () => {
  const attempt = attemptFixture();
  const events = [];
  let paid = false;
  const provider = { verify: async () => { events.push("verify"); return proofFor(attempt); } };
  const store = {
    findByOrder: async (id, customerId) => { assert.equal(id, attempt.order_id); assert.equal(customerId, attempt.customer_id); return attempt; },
    finalize: async () => { events.push("commit"); const alreadyPaid = paid; paid = true; return paidResult(attempt, alreadyPaid); },
  };
  const notify = async payload => { assert.equal(paid, true); assert.equal(payload.attempt, attempt); assert.equal(payload.order.id, ORDER_ID); events.push("notify"); };
  for (let retry = 0; retry < 2; retry++) {
    const result = await reconcileMeritOrder({ orderId: ORDER_ID, customerId: attempt.customer_id, provider, store, notify });
    assert.equal(result.paid, true);
    assert.equal(Object.hasOwn(result, "alreadyPaid"), false);
  }
  assert.deepEqual(events, ["verify", "commit", "notify", "verify", "commit"]);
});

test("concurrent browser and webhook reconciliation use the database winner for one notification", async () => {
  const attempt = attemptFixture();
  const barrier = deferred();
  let verifications = 0, finalized = false, notifications = 0;
  const provider = { verify: async () => {
    if (++verifications === 2) barrier.resolve();
    await barrier.promise;
    return proofFor(attempt);
  } };
  // This models the database's atomic winner acknowledgement; native SQL tests
  // independently verify that transaction behavior under real row-lock races.
  const store = { finalize: async () => {
    const alreadyPaid = finalized; finalized = true;
    return paidResult(attempt, alreadyPaid);
  } };
  const notify = async () => { assert.equal(finalized, true); notifications++; };
  const results = await Promise.all([
    reconcileMeritAttempt({ attempt, provider, store, notify }),
    reconcileMeritAttempt({ attempt: clone(attempt), provider, store, notify }),
  ]);
  assert.ok(results.every(result => result.paid));
  assert.equal(verifications, 2);
  assert.equal(notifications, 1);
});

test("missing or nonboolean first-transition acknowledgements never notify", async () => {
  const attempt = attemptFixture();
  for (const alreadyPaid of [undefined, null, true, "false", 0]) {
    const result = await reconcileMeritAttempt({ attempt,
      provider: { verify: async () => proofFor(attempt) },
      store: { finalize: async () => ({ ...paidResult(attempt), alreadyPaid }) },
      notify: async () => assert.fail("must not send without explicit database winner"),
    });
    assert.equal(result.paid, true);
  }
});

test("pending, failed and mismatched payments never notify", async () => {
  const attempt = attemptFixture();
  const store = { finalize: async () => assert.fail("must not finalize") };
  const notify = async () => assert.fail("must not notify");
  const preparing = await reconcileMeritAttempt({ attempt: { ...attempt, intent_id: null },
    provider: { verify: async () => assert.fail("must not verify") }, store, notify });
  assert.equal(preparing.status, "preparing");
  for (const status of ["processing", "requires_action", "requires_payment_method", "canceled"]) {
    const result = await reconcileMeritAttempt({ attempt,
      provider: { verify: async () => ({ ...proofFor(attempt), status }) }, store, notify });
    assert.equal(result.paid, false);
  }
  await assert.rejects(reconcileMeritAttempt({ attempt,
    provider: { verify: async () => ({ ...proofFor(attempt), intentId: "pi_unrelated" }) }, store, notify }),
  { code: "MERIT_PROOF_MISMATCH" });
  await assert.rejects(reconcileMeritAttempt({ attempt,
    provider: { verify: async () => { throw new Error(PRIVATE); } }, store, notify }),
  { code: "MERIT_VERIFICATION_PENDING" });
});

test("unsuccessful database acknowledgements never send a receipt", async () => {
  const attempt = attemptFixture();
  for (const result of [null, { ok: false }, { ok: true, paid: false },
    { ok: true, paid: true, alreadyPaid: false }, { ...paidResult(attempt), order: { id: "wrong-order" } }]) {
    await assert.rejects(reconcileMeritAttempt({ attempt,
      provider: { verify: async () => proofFor(attempt) }, store: { finalize: async () => result },
      notify: async () => assert.fail("must not notify"),
    }), { code: "MERIT_RECORDING_PENDING" });
  }
  await assert.rejects(reconcileMeritAttempt({ attempt,
    provider: { verify: async () => proofFor(attempt) },
    store: { finalize: async () => { throw new Error(PRIVATE); } },
    notify: async () => assert.fail("must not notify"),
  }), { code: "MERIT_RECORDING_PENDING" });
});

test("failed receipt leaves payment paid; repeated status checks do not retry email", async () => {
  const attempt = attemptFixture();
  let finalized = false, notifications = 0;
  const store = { finalize: async () => { const alreadyPaid = finalized; finalized = true; return paidResult(attempt, alreadyPaid); } };
  for (let retry = 0; retry < 2; retry++) {
    const result = await reconcileMeritAttempt({ attempt, provider: { verify: async () => proofFor(attempt) }, store,
      notify: async () => { notifications++; throw new Error(PRIVATE); },
    });
    assert.equal(result.paid, true);
    assert.equal(result.status, "paid");
    assert.equal(JSON.stringify(result).includes(PRIVATE), false);
  }
  assert.equal(notifications, 1);
});
