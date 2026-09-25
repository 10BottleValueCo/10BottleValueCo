import assert from "node:assert/strict";
import { test } from "node:test";
import { publicProductName } from "../api/_public-product-name.js";
import sendPaymentConfirmedEmail from "../api/send-payment-confirmed-email.js";

const expected = [
  ["Semaglutide", "GLP-1-S"],
  ["Tirzepatide / GLP-2", "GLP-2-T"],
  ["Retatrutide / GLP-3", "GLP-3-R"],
  ["Cagrilintide + Semaglutide", "Cagrilintide + GLP-1-S"],
];

test("product names change only in email display", async () => {
  const items = expected.map(([name]) => ({ name, dose: "10 mg", quantity: 1, price: 100 }));
  assert.equal(publicProductName("BPC-157"), "BPC-157");
  assert.equal(publicProductName("GLP-1-S"), "GLP-1-S");

  // The request is intercepted locally: no message is sent and no payment is created.
  process.env.RESEND_API_KEY = "test-only-key";
  const originalFetch = globalThis.fetch;
  let renderedHtml = "";
  globalThis.fetch = async (_url, options) => {
    renderedHtml = JSON.parse(options.body).html;
    return { ok: true, json: async () => ({ id: "local-test" }) };
  };
  try {
    let status;
    const response = {
      status(code) { status = code; return this; },
      json(body) { return body; },
    };
    await sendPaymentConfirmedEmail({
      method: "POST",
      body: { email: "test@example.invalid", orderId: "TEST-ORDER", total: 400, items },
    }, response);
    assert.equal(status, 200);
    for (const [original, renamed] of expected) {
      assert.ok(renderedHtml.includes(`vials × ${renamed} 10 mg`), renamed);
      assert.ok(!renderedHtml.includes(`vials × ${original} 10 mg`), original);
    }
    assert.deepEqual(items.map((item) => item.name), expected.map(([original]) => original));
    assert.ok(renderedHtml.includes("$100.00"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});