import test from "node:test";
import assert from "node:assert/strict";
import { reconcileMeritAttempt, reconcileMeritOrder } from "./_merit-reconcile.js";
const attempt = { id: "attempt-1", customer_id: "abcdefab-cdef-4abc-8abc-defabcdefabc", order_id: "INV-123456789ABCDEF0123456789ABCDEF0", intent_id: "pi_test123", amount_cents: 12450, currency: "usd", email: "buyer@example.com", expected_account: "acct_test123", expected_live: true };
const proof = { intentId: attempt.intent_id, orderId: attempt.order_id, amountCents: 12450, amountReceivedCents: 12450, currency: "usd", email: attempt.email, stripeAccount: attempt.expected_account, live: true, status: "succeeded" };
function fixture(overrides = {}) {
  const calls = [];
  const store = {
    findByOrder: async (...args) => { calls.push(["find", ...args]); return attempt; },
    finalize: async params => { calls.push(["finalize", params]); return { ok: true, paid: true, order: { id: attempt.order_id, status: "paid", total: 124.50 }, privateInternal: "not-for-browser" }; },
    ...overrides.store,
  };
  const provider = { verify: async args => { calls.push(["verify", args]); return { ...proof, ...overrides.proof }; }, ...overrides.provider };
  return { store, provider, calls };
}

test("verification uses private bound intent and finalizes exact verified proof", async () => {
  const deps = fixture();
  const result = await reconcileMeritOrder({ orderId: attempt.order_id, customerId: attempt.customer_id, ...deps });
  assert.equal(result.paid, true);
  assert.deepEqual(deps.calls.map(call => call[0]), ["find", "verify", "finalize"]);
  assert.deepEqual(deps.calls[1][1], { intentId: attempt.intent_id, orderId: attempt.order_id });
  assert.equal(deps.calls[2][1].p_amount_cents, 12450);
  assert.equal(result.privateInternal, undefined);
});

test("an unknown or another customer's order never contacts the payment provider", async () => {
  for (const found of [null, { ...attempt, customer_id: "other-account" }]) {
    const deps = fixture({ store: { findByOrder: async () => found } });
    await assert.rejects(reconcileMeritOrder({ orderId: attempt.order_id, customerId: attempt.customer_id, ...deps }), { status: 404 });
    assert.deepEqual(deps.calls, []);
  }
});

test("a preparing attempt is pending and cannot finalize", async () => {
  const deps = fixture();
  const result = await reconcileMeritAttempt({ attempt: { ...attempt, intent_id: null }, ...deps });
  assert.equal(result.paid, false);
  assert.equal(result.status, "preparing");
  assert.deepEqual(deps.calls, []);
});

test("processing, action required and cancellation never mark paid", async () => {
  for (const status of ["processing", "requires_action", "requires_payment_method", "canceled"]) {
    const deps = fixture({ proof: { status } });
    const result = await reconcileMeritAttempt({ attempt, ...deps });
    assert.equal(result.paid, false);
    assert.equal(deps.calls.some(call => call[0] === "finalize"), false);
  }
});

test("an unrelated successful intent cannot mark this order paid", async () => {
  const deps = fixture({ proof: { intentId: "pi_other" } });
  await assert.rejects(reconcileMeritAttempt({ attempt, ...deps }), { code: "MERIT_PROOF_MISMATCH" });
  assert.equal(deps.calls.some(call => call[0] === "finalize"), false);
});

test("provider timeout stays pending and does not leak provider errors", async () => {
  const deps = fixture({ provider: { verify: async () => { throw new Error("private-api-key"); } } });
  await assert.rejects(reconcileMeritAttempt({ attempt, ...deps }), error => error.code === "MERIT_VERIFICATION_PENDING" && !error.message.includes("private-api-key"));
  assert.equal(deps.calls.some(call => call[0] === "finalize"), false);
});

test("captured payment with unsuccessful storage asks to reconcile, not charge again", async () => {
  for (const result of [{ ok: false }, { ok: true, paid: false }, { ok: true, paid: true, order: { id: "wrong" } }]) {
    const deps = fixture({ store: { finalize: async () => result } });
    await assert.rejects(reconcileMeritAttempt({ attempt, ...deps }), { code: "MERIT_RECORDING_PENDING" });
  }
});

test("captured payment with storage timeout remains pending recording", async () => {
  const deps = fixture({ store: { finalize: async () => { throw new Error("DB timeout"); } } });
  await assert.rejects(reconcileMeritAttempt({ attempt, ...deps }), { code: "MERIT_RECORDING_PENDING" });
});
