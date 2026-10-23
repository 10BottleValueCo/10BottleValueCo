import assert from "node:assert/strict";
import { test } from "node:test";
import { legacyCheckoutQuote, assertExpectedTotal } from "./_legacy-checkout-quote.js";

test("legacy request amounts remain subject to independent server price comparison", () => {
  for (const legacyAmount of [1012.4, "1012.40"]) {
    assert.doesNotThrow(() => assertExpectedTotal(undefined, 1012.4, legacyAmount));
    assert.throws(() => assertExpectedTotal(undefined, 1013.4, legacyAmount),
      error => error.status === 409 && error.code === "CHECKOUT_QUOTE_CHANGED" && error.total === 1013.4);
  }
  assert.doesNotThrow(() => assertExpectedTotal(1012.4, 1012.4));
  assert.throws(() => assertExpectedTotal(1000, 1012.4, 1012.4),
    error => error.code === "CHECKOUT_QUOTE_CHANGED");
  for (const expected of [null, "1012.40", 0, -1, NaN, Infinity, true, {}]) {
    assert.throws(() => assertExpectedTotal(expected, 1012.4, 1012.4),
      error => error.status === 409 && error.code === "CHECKOUT_REFRESH_REQUIRED");
  }
  for (const legacyAmount of [undefined, null, "", " ", "not-money", "1e3", "0x10", 0, -1, NaN, Infinity, true, {}, []]) {
    assert.throws(() => assertExpectedTotal(undefined, 1012.4, legacyAmount),
      error => error.status === 409 && error.code === "CHECKOUT_REFRESH_REQUIRED");
  }
});

test("signed-in checkout without affiliate rules preserves the reported crypto total", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.VITE_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.VITE_SUPABASE_URL = "https://checkout-fixture.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.VITE_SUPABASE_URL;
    else process.env.VITE_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });
  const requests = [];
  globalThis.fetch = async (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://checkout-fixture.invalid");
    assert.ok(["/rest/v1/affiliate_customers", "/rest/v1/orders"].includes(url.pathname));
    assert.equal(options.method, "GET", "quote must not create an invoice or mutate an order");
    requests.push(url.pathname);
    return Response.json([]);
  };
  const body = {
    shippingType: "express",
    items: [
      { name: "Tirzepatide / GLP-2", dose: "60 mg", quantity: 2 },
      { name: "Tirzepatide / GLP-2", dose: "20 mg", quantity: 1 },
      { name: "Retatrutide / GLP-3", dose: "20 mg", quantity: 1 },
      { name: "BAC Water", dose: "3 ml", quantity: 2 },
    ],
  };
  for (const crypto of [true, false]) {
    const quote = await legacyCheckoutQuote(body, "buyer@example.invalid", {
      crypto, customerId: "00000000-0000-4000-8000-000000000001",
    });
    assert.equal(quote.subtotal, 1124);
    assert.equal(quote.finalAutomaticDiscount, 112.4);
    assert.equal(quote.shipping, 0);
    assert.equal(quote.total, crypto ? 986.31 : 1011.6);
    assert.equal(quote.affiliateRuleVersion, null);
    assert.equal(quote.affiliateCode, "");
    assert.equal(quote.affiliateCommission, 0);
    assert.equal(quote.finalAffiliateDiscount, 0);
    assertExpectedTotal(crypto ? 986.31 : 1011.6, quote.total);
  }
  assert.equal(requests.length, 4);
});
