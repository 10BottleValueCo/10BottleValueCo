import assert from "node:assert/strict";
import { test } from "node:test";
import { catalogProductName, matchesProductSearch, productSlug, publicProductName } from "./productNames.js";

const renamed = [
  ["Semaglutide", "GLP SG-1", "5 mg", "semaglutide-5mg", "glp-1-s-5mg"],
  ["Tirzepatide / GLP-2", "GLP TZ-2", "20 mg", "tirzepatide-glp-2-20mg", "glp-2-t-20mg"],
  ["Retatrutide / GLP-3", "GLP RT-3", "10 mg", "retatrutide-glp-3-10mg", "glp-3-r-10mg"],
  ["Cagrilintide + Semaglutide", "Cagrilintide + GLP SG-1", "10 mg each", "cagrilintide-semaglutide-10mgeach", "cagrilintide-glp-1-s-10mgeach"],
];

for (const [catalogName, displayName, dose, oldSlug, newSlug] of renamed) {
  test(`${catalogName} keeps its catalog identity while displaying ${displayName}`, () => {
    assert.equal(publicProductName(catalogName), displayName);
    assert.equal(catalogProductName(displayName), catalogName);
    assert.equal(productSlug({ name: catalogName, dose }), newSlug);
    assert.equal(productSlug({ name: catalogName, dose }, true), oldSlug);
  });
}

test("legacy short names and unrelated products remain compatible", () => {
  assert.equal(publicProductName("Retatrutide"), "GLP RT-3");
  assert.equal(catalogProductName("Retatrutide"), "Retatrutide / GLP-3");
  assert.equal(catalogProductName("Tirzepatide"), "Tirzepatide / GLP-2");
  assert.equal(publicProductName("BPC-157"), "BPC-157");
});

test("Melanotan-2 displays as MT-2 while preserving its catalog identity and route", () => {
  const product = { name: "Melanotan-2", dose: "10 mg" };
  assert.equal(publicProductName(product.name), "MT-2");
  assert.equal(publicProductName("Melanotan2"), "MT-2");
  assert.equal(publicProductName("Melanotan 2"), "MT-2");
  assert.equal(catalogProductName("MT-2"), "Melanotan-2");
  assert.equal(productSlug(product), "melanotan-2-10mg");
  assert.equal(matchesProductSearch(product, "MT-2"), true);
  assert.equal(matchesProductSearch(product, "mt2"), true);
  assert.equal(matchesProductSearch(product, "Melanotan 2"), true);
});

test("Epitalon keeps its catalog name while matching the popularity ranking spelling", () => {
  assert.equal(publicProductName("Epitalon"), "Epithalon");
  assert.equal(catalogProductName("Epithalon"), "Epitalon");
});

test("search matches the displayed GLP name immediately followed by the dose", () => {
  const reta = { name: "Retatrutide / GLP-3", dose: "50 mg", total: "500 mg total" };
  assert.equal(matchesProductSearch(reta, "GLP-3-R 50 mg"), true);
  assert.equal(matchesProductSearch(reta, "GLP-3-R 5 mg"), false);
  assert.equal(matchesProductSearch(reta, "Retatrutide / GLP-3 50 mg"), true);
  assert.equal(matchesProductSearch({ name: "Semaglutide", dose: "5 mg" }, "GLP-1-S 5 mg"), true);
  assert.equal(matchesProductSearch({ name: "Tirzepatide / GLP-2", dose: "20 mg" }, "GLP-2-T 20 mg"), true);
  assert.equal(matchesProductSearch({ name: "Melanotan2", dose: "10 mg" }, "mt2"), true);
});