import test from "node:test";
import assert from "node:assert/strict";
import { getMeritConfig, publicMeritConfig, meritRuleSnapshot, requireMeritProof, readMeritCheckoutKey, assertCheckoutOrigin } from "./_merit-core.js";

const attempt = { intent_id: "pi_test123", order_id: "INV-123456789ABCDEF0123456789ABCDEF0", email: "buyer@example.com", amount_cents: 12450, currency: "usd", expected_account: "acct_test123", expected_live: true };
const proof = { intentId: attempt.intent_id, orderId: attempt.order_id, email: attempt.email, amountCents: 12450, amountReceivedCents: 12450, currency: "usd", stripeAccount: attempt.expected_account, live: true, status: "succeeded" };
const configEnv = { MERIT_ENABLED: "true", ATTESTLY_API_KEY: "server-test-key", ATTESTLY_WEBHOOK_SECRET: "server-test-webhook", MERIT_STRIPE_ACCOUNT: "acct_test123", MERIT_MODE: "live", MERIT_RULE_VERSION: "unit-test-v1", MERIT_CARD_SURCHARGE_BPS: "295", MERIT_CARD_SURCHARGE_SOURCE: "Existing checkout rule for test fixture", MERIT_CARD_SURCHARGE_EFFECTIVE_AT: "2026-10-08T00:00:00Z" };

test("only a matching successful full payment is paid", () => {
  assert.deepEqual(requireMeritProof(attempt, proof), { paid: true, status: "succeeded" });
  for (const status of ["processing", "requires_action", "requires_capture", "canceled", "requires_payment_method"]) {
    assert.equal(requireMeritProof(attempt, { ...proof, status }).paid, false);
  }
});

test("a paid redirect or incomplete provider result is not proof", () => {
  for (const value of [null, {}, { paid: true }, { status: "succeeded" }, { ...proof, amountCents: "12450" }]) {
    assert.throws(() => requireMeritProof(attempt, value), { code: "MERIT_PROOF_MISMATCH" });
  }
});

test("missing both stored and asserted identity fields cannot compare equal as proof", () => {
  for (const [stored, asserted] of [["order_id", "orderId"], ["currency", "currency"], ["expected_account", "stripeAccount"]]) {
    const brokenAttempt = { ...attempt }, brokenProof = { ...proof };
    delete brokenAttempt[stored]; delete brokenProof[asserted];
    assert.throws(() => requireMeritProof(brokenAttempt, brokenProof), { code: "MERIT_PROOF_MISMATCH" });
  }
});

for (const [field, value] of Object.entries({ intentId: "pi_other", orderId: "INV-OTHER", email: "another@example.com", amountCents: 1, amountReceivedCents: 1, currency: "eur", stripeAccount: "acct_other", live: false, status: "paid" })) {
  test(`reject mismatched ${field}`, () => assert.throws(() => requireMeritProof(attempt, { ...proof, [field]: value }), { code: "MERIT_PROOF_MISMATCH" }));
}

test("missing private configuration keeps cards disabled", () => {
  assert.deepEqual(publicMeritConfig(getMeritConfig({})), { ok: true, enabled: false });
  for (const field of ["ATTESTLY_API_KEY", "ATTESTLY_WEBHOOK_SECRET", "MERIT_MODE", "MERIT_RULE_VERSION", "MERIT_CARD_SURCHARGE_BPS", "MERIT_CARD_SURCHARGE_SOURCE", "MERIT_CARD_SURCHARGE_EFFECTIVE_AT"]) {
    const env = { ...configEnv }; delete env[field];
    assert.equal(getMeritConfig(env).enabled, false, field);
  }
});

test("static account pin is optional and validated when supplied", () => {
  const env = { ...configEnv }; delete env.MERIT_STRIPE_ACCOUNT;
  assert.equal(getMeritConfig(env).enabled, true);
  assert.equal(getMeritConfig({ ...env, MERIT_STRIPE_ACCOUNT: "wrong" }).enabled, false);
});

test("public configuration never exposes credentials or merchant expense", () => {
  const env = { ...configEnv, MERIT_PROCESSOR_FEE_BPS: "750", MERIT_PROCESSOR_FEE_SOURCE: "Dashboard test fixture", MERIT_PROCESSOR_FEE_EFFECTIVE_AT: "2026-10-08T00:00:00Z" };
  const config = getMeritConfig(env);
  assert.deepEqual(publicMeritConfig(config), { ok: true, enabled: true, currency: "usd", surchargeBps: 295 });
  const snapshot = meritRuleSnapshot(config);
  assert.equal(snapshot.customerCardSurcharge.rate, 295);
  assert.equal(snapshot.merchantProcessingExpense.rate, 750);
  assert.equal(snapshot.merchantProcessingExpense.status, "reported_rate_not_actual_settlement");
  assert.equal(JSON.stringify(snapshot).includes("server-test"), false);
});

test("invalid rate and unrecorded merchant rate fail closed; missing expense remains unknown", () => {
  for (const rate of ["", "-1", "10001", "NaN", "2.95", "295x"]) {
    assert.equal(getMeritConfig({ ...configEnv, MERIT_CARD_SURCHARGE_BPS: rate }).enabled, false);
  }
  assert.equal(getMeritConfig({ ...configEnv, MERIT_PROCESSOR_FEE_BPS: "750" }).enabled, false);
  assert.equal(meritRuleSnapshot(getMeritConfig(configEnv)).merchantProcessingExpense, null);
});

test("merchant expense basis remains unknown unless explicitly configured to the supported basis", () => {
  const expense = { ...configEnv, MERIT_PROCESSOR_FEE_BPS: "750", MERIT_PROCESSOR_FEE_SOURCE: "Fixture reported rate", MERIT_PROCESSOR_FEE_EFFECTIVE_AT: "2026-10-08T00:00:00Z" };
  for (const basis of [undefined, "", "subtotal", "guessed"]) {
    const config = getMeritConfig({ ...expense, MERIT_PROCESSOR_FEE_BASIS: basis });
    assert.equal(config.enabled, true);
    assert.equal(Object.hasOwn(meritRuleSnapshot(config).merchantProcessingExpense, "basis"), false);
  }
  const confirmed = meritRuleSnapshot(getMeritConfig({ ...expense, MERIT_PROCESSOR_FEE_BASIS: "charged_amount" }));
  assert.equal(confirmed.merchantProcessingExpense.basis, "charged_amount");
  assert.equal(confirmed.customerCardSurcharge.status, "owner_approved");
});

test("secure attempt key is required", () => {
  assert.equal(readMeritCheckoutKey("ABCDEFAB-CDEF-4ABC-8ABC-DEFABCDEFABC"), "abcdefab-cdef-4abc-8abc-defabcdefabc");
  for (const value of ["", "order-123", null, "abcdefab-cdef-1abc-8abc-defabcdefabc"]) assert.throws(() => readMeritCheckoutKey(value));
});

test("unrelated browser origins are rejected", () => {
  assert.doesNotThrow(() => assertCheckoutOrigin({ headers: { origin: "https://10bottlevalue.co" } }));
  assert.doesNotThrow(() => assertCheckoutOrigin({ headers: {} }));
  for (const origin of ["https://10bottlevalue.co.attacker.example", "null", "http://10bottlevalue.co"]) assert.throws(() => assertCheckoutOrigin({ headers: { origin } }));
});

test("additional checkout origins require explicit exact HTTPS configuration", () => {
  const preview = "https://merchant-preview.replit.dev";
  const env = { MERIT_ALLOWED_ORIGINS: ` ${preview},https://merchant.example:8443 ` };
  assert.throws(() => assertCheckoutOrigin({ headers: { origin: preview } }, {}), { code: "MERIT_ORIGIN_REJECTED" });
  for (const origin of [preview, "https://merchant.example:8443", "https://10bottlevalue.co", "https://www.10bottlevalue.co"]) {
    assert.doesNotThrow(() => assertCheckoutOrigin({ headers: { origin } }, env));
  }
  for (const origin of ["https://other.replit.dev", `${preview}.attacker.example`, "http://merchant-preview.replit.dev", "null"]) {
    assert.throws(() => assertCheckoutOrigin({ headers: { origin, host: "merchant-preview.replit.dev", "x-forwarded-host": "merchant-preview.replit.dev" } }, env), { code: "MERIT_ORIGIN_REJECTED" });
  }
});

test("malformed additional origins never widen the checkout allowlist", () => {
  const origin = "https://merchant-preview.replit.dev";
  for (const value of [`${origin}/`, `${origin}/checkout`, `${origin}?x=1`, `${origin}#x`, "https://user:password@merchant-preview.replit.dev", "https://*.replit.dev", "http://merchant-preview.replit.dev", "null", `${origin},`.repeat(11), " ".repeat(2049) + origin]) {
    const env = { MERIT_ALLOWED_ORIGINS: value };
    assert.throws(() => assertCheckoutOrigin({ headers: { origin } }, env), { code: "MERIT_ORIGIN_REJECTED" }, value);
    assert.doesNotThrow(() => assertCheckoutOrigin({ headers: { origin: "https://10bottlevalue.co" } }, env));
  }
});
