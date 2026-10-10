import test from "node:test";
import assert from "node:assert/strict";
import { validateAndPriceItems, findCatalogProduct } from "../api/_catalog.js";
import { publicProductName } from "../api/_public-product-name.js";

test("public names cover historical cart names without changing the original item", () => {
  for (const [internal, display] of [
    ["Semaglutide", "GLP-1-S"],
    ["Tirzepatide / GLP-2", "GLP-2-T"],
    ["Retatrutide / GLP-3", "GLP-3-R"],
    ["Cagrilintide + Semaglutide", "Cagrilintide + GLP-1-S"],
  ]) {
    const item = { name: internal, dose: "10 mg", quantity: 2, price: 100 };
    assert.equal(publicProductName(item.name), display);
    assert.equal(item.name, internal);
    assert.equal(item.price, 100);
  }
  assert.equal(publicProductName("BPC-157"), "BPC-157");
  assert.equal(publicProductName("GLP-1-S"), "GLP-1-S");
});

test("email-only display labels do not replace canonical checkout catalog selectors", () => {
  for (const [display, internal, dose] of [
    ["GLP-1-S", "Semaglutide", "10 mg"],
    ["GLP-2-T", "Tirzepatide / GLP-2", "10 mg"],
    ["GLP-3-R", "Retatrutide / GLP-3", "10 mg"],
    ["Cagrilintide + GLP-1-S", "Cagrilintide + Semaglutide", "10 mg each"],
  ]) {
    const item = { name: display, dose, quantity: 2, price: 0 };
    assert.equal(findCatalogProduct(item), null);
    assert.ok(findCatalogProduct({ ...item, name: internal }));
    assert.throws(() => validateAndPriceItems([item]), /no longer available/);
  }
});
