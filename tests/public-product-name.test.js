import test from "node:test";
import assert from "node:assert/strict";
import { publicProductName, checkoutDescription } from "../api/_public-product-name.js";

test("public names cover historical cart names without changing the original item", () => {
  for (const [internal, display] of [
    ["Semaglutide", "GLP-1-S"],
    ["Tirzepatide / GLP-2", "GLP-2-T"],
    ["Retatrutide / GLP-3", "GLP-3-R"],
    ["Cagrilintide + Semaglutide", "Cagrilintide + GLP-1-S"],
  ]) {
    const item = { name: internal, dose: "10 mg", quantity: 2, price: 100 };
    assert.equal(publicProductName(item.name), display);
    assert.ok(checkoutDescription("TEST", [item]).includes(display));
    assert.equal(item.name, internal);
    assert.equal(item.price, 100);
  }
  assert.equal(publicProductName("BPC-157"), "BPC-157");
  assert.equal(publicProductName("GLP-1-S"), "GLP-1-S");
});
