import test from "node:test";
import assert from "node:assert/strict";
import { validateAndPriceItems } from "../api/_catalog.js";
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

test("public names and internal names resolve to the same server-priced SKU", () => {
  for (const [display, internal, dose] of [
    ["GLP-1-S", "Semaglutide", "10 mg"],
    ["GLP-2-T", "Tirzepatide / GLP-2", "10 mg"],
    ["GLP-3-R", "Retatrutide / GLP-3", "10 mg"],
    ["Cagrilintide + GLP-1-S", "Cagrilintide + Semaglutide", "10 mg each"],
  ]) {
    const item = { name: display, dose, quantity: 2, price: 0 };
    const internalItem = { ...item, name: internal };
    assert.deepEqual(validateAndPriceItems([item]), validateAndPriceItems([internalItem]));
  }
  assert.deepEqual(
    validateAndPriceItems([{ name: "GLP-2-T", dose: "10 mg", quantity: 1, fromWarehouse: "us", price: 0 }]),
    validateAndPriceItems([{ name: "Tirzepatide / GLP-2", dose: "10 mg", quantity: 1, fromWarehouse: "us", price: 0 }])
  );
  assert.throws(() => validateAndPriceItems([{ name: "GLP-1-S", dose: "999 mg", quantity: 1 }]), /Unknown product/);
  assert.throws(() => validateAndPriceItems([{ name: "GLP-4-X", dose: "10 mg", quantity: 1 }]), /Unknown product/);
});
