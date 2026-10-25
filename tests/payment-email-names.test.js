import assert from "node:assert/strict";
import { test } from "node:test";
import { publicProductName } from "../api/_public-product-name.js";
import { renderPaymentConfirmationEmail } from "../api/_payment-confirmation-email.js";

const expected = [
  ["Semaglutide", "Semaglutide"],
  ["Tirzepatide / GLP-2", "Tirzepatide"],
  ["Retatrutide / GLP-3", "Retatrutide"],
  ["Cagrilintide + Semaglutide", "Cagrilintide + Semaglutide"],
];

test("restored compound names render without mutating stored email items", async () => {
  const items = expected.map(([name]) => ({ name, dose: "10 mg", quantity: 1, price: 100 }));
  assert.equal(publicProductName("BPC-157"), "BPC-157");
  assert.equal(publicProductName("GLP-1-S"), "Semaglutide");

  const renderedHtml = renderPaymentConfirmationEmail({ email: "test@example.invalid", orderId: "TEST-ORDER", total: 400, items });
    for (const [original, renamed] of expected) {
      assert.ok(renderedHtml.includes(`vials × ${renamed} 10 mg`), renamed);
      if (original !== renamed) assert.ok(!renderedHtml.includes(`vials × ${original} 10 mg`), original);
    }
    assert.deepEqual(items.map((item) => item.name), expected.map(([original]) => original));
    assert.ok(renderedHtml.includes("$100.00"));
});