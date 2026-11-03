import assert from "node:assert/strict";
import { test } from "node:test";
import { catalogProductName, matchesProductSearch, productSlug, productSlugs, publicProductName } from "./productNames.js";

const restored = [
  ["Semaglutide", "Semaglutide", "5 mg", "semaglutide-5mg", ["GLP-1-S", "GLP SG-1"]],
  ["Tirzepatide / GLP-2", "Tirzepatide", "20 mg", "tirzepatide-20mg", ["Tirzepatide / GLP-2", "GLP-2-T", "GLP TZ-2"]],
  ["Retatrutide / GLP-3", "Retatrutide", "10 mg", "retatrutide-10mg", ["Retatrutide / GLP-3", "GLP-3-R", "GLP RT-3"]],
  ["Cagrilintide + Semaglutide", "Cagrilintide + Semaglutide", "10 mg each", "cagrilintide-semaglutide-10mgeach", ["Cagrilintide + GLP-1-S", "Cagrilintide + GLP SG-1"]],
];

for (const [catalogName, compoundName, dose, canonicalSlug, previousNames] of restored) {
  test(`${compoundName} restores its display and preserves every previous name and route`, () => {
    const product = { name: catalogName, dose };
    assert.equal(publicProductName(catalogName), compoundName);
    assert.equal(catalogProductName(compoundName), catalogName);
    assert.equal(productSlug(product), canonicalSlug);
    assert.ok(productSlugs(product).includes(canonicalSlug));
    assert.equal(productSlug(product, true), `${catalogName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${dose.replace(/\s+/g, "")}`);
    for (const previous of previousNames) {
      const oldSlug = `${previous.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${dose.replace(/\s+/g, "")}`;
      assert.equal(publicProductName(previous), compoundName);
      assert.equal(catalogProductName(previous), catalogName);
      assert.ok(productSlugs(product).includes(oldSlug), oldSlug);
      assert.equal(matchesProductSearch(product, `${previous} ${dose}`), true);
    }
    assert.deepEqual(product, { name: catalogName, dose });
  });
}

test("legacy short names and unrelated products remain compatible", () => {
  assert.equal(publicProductName("Retatrutide"), "Retatrutide");
  assert.equal(catalogProductName("Retatrutide"), "Retatrutide / GLP-3");
  assert.equal(catalogProductName("Tirzepatide"), "Tirzepatide / GLP-2");
  assert.equal(publicProductName("BPC-157"), "BPC-157");
});

test("Melanotan-1 keeps its full name and still matches the MT1 search", () => {
  const product = { name: "Melanotan-1", dose: "10 mg" };
  assert.equal(publicProductName(product.name), "Melanotan-1");
  assert.equal(catalogProductName("MT1"), "Melanotan-1");
  assert.equal(catalogProductName("Melanotan I"), "Melanotan-1");
  assert.equal(productSlug(product), "melanotan-1-10mg");
  assert.equal(matchesProductSearch(product, "MT1"), true);
  assert.equal(matchesProductSearch(product, "MT-1"), true);
  assert.equal(matchesProductSearch(product, "Melanotan I"), true);
});

test("Melanotan-2 keeps its full name and still matches the MT-2 search", () => {
  const product = { name: "Melanotan-2", dose: "10 mg" };
  assert.equal(publicProductName(product.name), "Melanotan-2");
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

test("search matches restored and historical names immediately followed by the selected dose", () => {
  const reta = { name: "Retatrutide / GLP-3", dose: "50 mg", total: "500 mg total" };
  assert.equal(matchesProductSearch(reta, "Retatrutide 50 mg"), true);
  assert.equal(matchesProductSearch(reta, "GLP RT-3 50 mg"), true);
  assert.equal(matchesProductSearch(reta, "GLP-3-R 50 mg"), true);
  assert.equal(matchesProductSearch(reta, "GLP-3-R 5 mg"), false);
  assert.equal(matchesProductSearch(reta, "Retatrutide / GLP-3 50 mg"), true);
  assert.equal(matchesProductSearch({ name: "Semaglutide", dose: "5 mg" }, "GLP-1-S 5 mg"), true);
  assert.equal(matchesProductSearch({ name: "Tirzepatide / GLP-2", dose: "20 mg" }, "GLP-2-T 20 mg"), true);
  assert.equal(matchesProductSearch({ name: "Melanotan2", dose: "10 mg" }, "mt2"), true);
});
