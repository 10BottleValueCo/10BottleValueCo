import assert from "node:assert/strict";
import { test } from "node:test";

test("Paylio accepts a legacy request amount but blocks changed prices before reserving payment", async t => {
  const keys = ["SUPABASE_URL", "VITE_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY",
    "PAYLIO_API_KEY", "PAYLIO_PAYOUT_ADDRESS", "MERIT_AFFILIATE_RULES_JSON"];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    SUPABASE_URL: "https://checkout-fixture.invalid",
    VITE_SUPABASE_URL: "https://checkout-fixture.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "test-only",
    PAYLIO_API_KEY: "test-only",
    PAYLIO_PAYOUT_ADDRESS: `0x${"1".repeat(40)}`,
  });
  delete process.env.MERIT_AFFILIATE_RULES_JSON;
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  console.error = () => {};
  t.after(() => {
    globalThis.fetch = originalFetch;
    console.error = originalError;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
  const { default: handler } = await import("./create-paylio-payment.js?legacy-total-fixture");
  const customerId = "00000000-0000-4000-8000-000000000001";
  const email = "buyer@example.invalid";
  const orderId = "INV-TEST1234";
  const items = [
    { name: "Tirzepatide / GLP-2", dose: "60 mg", quantity: 2 },
    { name: "Tirzepatide / GLP-2", dose: "20 mg", quantity: 1 },
    { name: "Retatrutide / GLP-3", dose: "20 mg", quantity: 1 },
    { name: "BAC Water", dose: "3 ml", quantity: 2 },
  ];
  for (const scenario of [
    { name: "legacy numeric amount", amount: 1011.6, status: 200 },
    { name: "legacy decimal amount", amount: "1011.60", status: 200 },
    { name: "changed amount", amount: 1000, status: 409, code: "CHECKOUT_QUOTE_CHANGED" },
    { name: "saved total cannot replace missing request amounts", status: 409, code: "CHECKOUT_REFRESH_REQUIRED" },
    { name: "explicit mismatch is not overridden", amount: 1011.6, expectedTotal: 1000,
      status: 409, code: "CHECKOUT_QUOTE_CHANGED" },
    { name: "explicit invalid amount is not overridden", amount: 1011.6, expectedTotal: null,
      status: 409, code: "CHECKOUT_REFRESH_REQUIRED" },
  ]) await t.test(scenario.name, async () => {
    let reservations = 0;
    globalThis.fetch = async (input, options = {}) => {
      const url = new URL(input);
      assert.equal(url.origin, "https://checkout-fixture.invalid",
        "test must never contact a payment provider or a real database");
      if (url.pathname === "/auth/v1/user") return Response.json({
        id: customerId, email, email_confirmed_at: "2026-10-01T00:00:00Z",
      });
      if (url.pathname === "/rest/v1/orders") return Response.json(
        url.searchParams.get("id") === `eq.${orderId}`
          ? [{ id: orderId, user_id: customerId, email, status: "checkout", total: 1011.6, metadata: {} }]
          : []);
      if (["/rest/v1/paylio_payment_attempts", "/rest/v1/affiliate_customers"].includes(url.pathname))
        return Response.json([]);
      if (url.pathname === "/rest/v1/rpc/reserve_paylio_checkout") {
        reservations++;
        const body = JSON.parse(options.body);
        assert.equal(body.p_amount_cents, 101160);
        // Reuse a fixture reservation so no new external invoice is created.
        return Response.json({ created: false, attempt: {
          id: body.p_id, order_id: orderId, customer_id: customerId, email,
          fingerprint: body.p_fingerprint, account_fingerprint: body.p_account_fingerprint,
          amount_cents: body.p_amount_cents, currency: "USD", state: "ready",
          checkout_url: "https://paylio.org/pay/test_fixture",
        } });
      }
      assert.fail(`Unexpected fixture request: ${url.pathname}`);
    };
    const res = {
      statusCode: 200, body: null,
      setHeader() {},
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await handler({ method: "POST", headers: { authorization: "Bearer test-only" },
      body: { orderId, email, items, shippingType: "express",
        ...(Object.hasOwn(scenario, "amount") ? { amount: scenario.amount } : {}),
        ...(Object.hasOwn(scenario, "expectedTotal") ? { expectedTotal: scenario.expectedTotal } : {}) } }, res);
    assert.equal(res.statusCode, scenario.status, JSON.stringify(res.body));
    if (scenario.code) assert.equal(res.body.code, scenario.code);
    assert.equal(reservations, scenario.status === 200 ? 1 : 0);
    if (scenario.status === 200) assert.match(res.body.payment_url, /^https:\/\/paylio\.org\/pay\/test_fixture/);
  });
});
